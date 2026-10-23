const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const engine=fs.readFileSync('assets/exam-engine.js','utf8');const method=engine.slice(engine.indexOf('            async trackProgress('),engine.indexOf('            async init()'));
const payloads=[];let release;
const context={AbortSignal,console,crypto:{randomUUID:()=> 'session'},fetch:async(url,options)=>{payloads.push(JSON.parse(options.body));if(payloads.length===1)await new Promise(resolve=>release=resolve);return {ok:true};}};
vm.createContext(context);const app=vm.runInContext('({'+method+'})',context);
Object.assign(app,{activeQuiz:{code:'PY',title:'Đảo đề',duration:60},examQuestions:[{text:'Question shuffled first',options:['A','B'],correct:1,explain:'First explanation'},{text:'Question shuffled second',options:['X','Y'],correct:0,explain:'Second explanation'}],currentQIndex:1,userAnswers:{1:1},timerSeconds:100,startTime:Date.now()-1000});
(async()=>{
  const first=app.trackProgress('CHANGE_QUESTION','Next');await new Promise(resolve=>setImmediate(resolve));assert.equal(payloads[0].currentQuestionData.text,'Question shuffled second');assert.equal(payloads[0].currentQuestionData.selected,1);assert.equal(payloads[0].currentQuestionData.correct,0);
  await app.trackProgress('PERIODIC');assert.equal(payloads.length,1);
  app.currentQIndex=0;const second=app.trackProgress('SUBMIT','Submitted');release();await Promise.all([first,second]);assert.equal(payloads.length,2);assert.equal(payloads[1].eventType,'SUBMIT');assert.equal(payloads[1].currentQuestionData.text,'Question shuffled first');assert.equal(app.trackingPending,0);
  const calls=[];const sessions=[{sessionId:'one',updatedAt:'2026-10-23T12:00:00Z',currentQuestionData:{text:'Q'}},{sessionId:'two',updatedAt:'2026-10-23T11:00:00Z'}];
  const api={console,process:{env:{UPSTASH_REDIS_REST_URL:'https://mock',UPSTASH_REDIS_REST_TOKEN:'mock'}},fetch:async(url,options)=>{const command=JSON.parse(options.body);calls.push(command);return {ok:true,json:async()=>({result:command[0]==='SMEMBERS'?['one','two']:['null',...sessions.map(x=>JSON.stringify(x))]})}}};
  vm.createContext(api);vm.runInContext(fs.readFileSync('api/dashboard.js','utf8').replace('export default async function handler','async function handler'),api);const response={setHeader(){},status(n){this.statusCode=n;return this},json(value){this.body=value;return this}};await api.handler({method:'GET'},response);assert.equal(response.statusCode,200);assert.equal(calls.length,2);assert.equal(calls[1][0],'MGET');assert.equal(response.body.sessions[0].currentQuestionData.text,'Q');
  assert(engine.includes('}, 2000);'));assert(fs.readFileSync('assets/dashboard.js','utf8').includes('setInterval(refresh,2000)'));
  console.log('PASS: shuffled live question snapshot, serialized progress, heartbeat coalescing, batched dashboard API and 2-second refresh.');
})().catch(error=>{console.error(error);process.exitCode=1;});
