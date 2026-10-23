const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,style:{},dataset:{},classList:{contains(){return true},toggle(){}},addEventListener(event,callback){this[event]=callback;},setAttribute(){},querySelectorAll(){return[]},scrollIntoView(){}});return nodes.get(id);}
const third={number:3,text:'Câu thứ ba trong đề đã đảo',options:['A','B','C'],correct:1,explain:'Giải thích câu 3'};
const context={window:{},AbortSignal,console,document:{getElementById:node},localStorage:{getItem(){return null}},setInterval(){},fetch:async(url)=>url.includes('question=')?{ok:true,json:async()=>({ok:true,sessionId:'one',question:third})}:new Promise(()=>{})};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/dashboard.js','utf8'),context);
context.session={sessionId:'one',currentQuestion:4,totalQuestions:5,answerSheet:'Câu 3: C',answerResults:{3:{selected:'C',isCorrect:false}},currentQuestionData:{number:4,text:'Câu 4 đang làm',options:['A','B'],correct:0,selected:null,explain:'Giải thích câu 4'}};
node('answer-filter').value='all';
(async()=>{
  vm.runInContext('renderDetail(session)',context);await vm.runInContext('selectReviewQuestion(3)',context);
  assert.equal(node('live-question-heading').textContent,'Xem lại câu hỏi');assert(node('live-question-body').innerHTML.includes('Giải thích câu 3'));assert(node('live-question-body').innerHTML.includes('Học viên đã chọn · Sai'));assert(node('live-question-caption').textContent.includes('đang ở câu 4'));assert.equal(node('follow-current-question').hidden,false);
  context.session.currentQuestion=5;vm.runInContext('renderDetail(session)',context);assert(node('live-question-body').innerHTML.includes('Giải thích câu 3'));assert(node('live-question-caption').textContent.includes('đang ở câu 5'));
  context.session.currentQuestion=4;node('follow-current-question').click();assert.equal(node('follow-current-question').hidden,true);assert(node('live-question-body').innerHTML.includes('Câu 4 đang làm'));
  await vm.runInContext('selectReviewQuestion(3)',context);context.session.sessionId='two';vm.runInContext('renderDetail(session)',context);assert.equal(node('follow-current-question').hidden,true);assert(!node('live-question-body').innerHTML.includes('Giải thích câu 3'));
  const records=new Map([['quizmaster:live:questions:one',JSON.stringify([null,null,third])],['quizmaster:live:session:one',JSON.stringify({currentQuestion:4})]]);
  const api={console,process:{env:{UPSTASH_REDIS_REST_URL:'https://mock',UPSTASH_REDIS_REST_TOKEN:'mock'}},fetch:async(url,options)=>({ok:true,json:async()=>({result:JSON.parse(options.body).slice(1).map(key=>records.get(key)||null)})})};vm.createContext(api);vm.runInContext(fs.readFileSync('api/dashboard.js','utf8').replace('export default async function handler','async function handler'),api);
  const request=async(query)=>{const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};await api.handler({method:'GET',query},res);return res;};
  let result=await request({sessionId:'one',question:'3'});assert.equal(result.code,200);assert.equal(result.data.question.text,third.text);
  result=await request({sessionId:'one',question:'1'});assert.equal(result.code,404);result=await request({sessionId:'../one',question:'3'});assert.equal(result.code,400);result=await request({sessionId:'one',question:'201'});assert.equal(result.code,400);
  console.log('PASS: review earlier question, pinned preview during refresh, follow current, session reset, stored exam order and API validation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
