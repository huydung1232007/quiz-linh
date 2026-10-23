const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const stored=new Map(),sent=[];let failTelegram=false;
const context={module:{exports:{}},AbortSignal,console:{error(){}},process:{env:{UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test',TELEGRAM_BOT_TOKEN:'test',TELEGRAM_CHAT_ID:'test'}},fetch:async(url,options)=>{
  const body=JSON.parse(options.body);
  if(url.startsWith('https://api.telegram.org/')){sent.push({url,body});return {ok:!failTelegram,json:async()=>({ok:!failTelegram,result:{message_id:sent.length}})};}
  const [cmd,key,...args]=body;let result=1;
  if(cmd==='SET'){if(args.includes('NX')&&stored.has(key))result=null;else{stored.set(key,args[0]);result='OK';}}
  if(cmd==='DEL')stored.delete(key);
  return {ok:true,text:async()=>JSON.stringify({result})};
}};
vm.createContext(context);vm.runInContext(fs.readFileSync('api/track.js','utf8'),context);
async function track(eventType,extra={}){const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(value){this.body=value;return this}};await context.module.exports({method:'POST',body:{sessionId:'one',eventType,playerName:'Linh <b>',quizTitle:'Hàm & module',quizCode:'PY-01',totalQuestions:10,answeredCount:8,correctCount:6,durationMinutes:60,elapsedSeconds:125,...extra}},res);assert.equal(res.statusCode,200);return res;}
(async()=>{
  for(const event of ['ANSWER','HINT','PERIODIC','CHANGE_QUESTION']){await track(event);assert.equal(JSON.parse(stored.get('quizmaster:live:session:one')).eventType,event);}
  assert.equal(sent.length,0);
  await track('PERIODIC',{examQuestionSet:[{text:'Shuffled first',options:['A','B'],correct:1,explain:'Reason'},{text:'Shuffled second',options:['X','Y'],correct:0}]});assert.equal(JSON.parse(stored.get('quizmaster:live:questions:one'))[1].text,'Shuffled second');assert.equal(JSON.parse(stored.get('quizmaster:live:questions:one'))[1].number,2);
  await track('PERIODIC',{currentQuestion:2,currentQuestionData:{number:2,text:'Question',options:['A','B'],correct:1,selected:0,explain:'Explanation'}});assert.equal(JSON.parse(stored.get('quizmaster:live:session:one')).currentQuestionData.explain,'Explanation');
  await track('PERIODIC',{currentQuestion:3,currentQuestionData:{number:2,text:'Old',options:['A'],correct:0}});assert.equal(JSON.parse(stored.get('quizmaster:live:session:one')).currentQuestionData,null);
  await track('START');assert.equal(sent.length,1);assert(sent[0].url.endsWith('/sendMessage'));assert(sent[0].body.text.includes('BẮT ĐẦU LÀM BÀI'));assert(sent[0].body.text.includes('Linh &lt;b&gt;'));assert(sent[0].body.text.includes('Hàm &amp; module'));assert(sent[0].body.text.includes('60 phút'));assert(!sent[0].body.text.includes('BẢNG ĐÁP ÁN'));assert(sent[0].body.reply_markup.inline_keyboard[0][0].url.endsWith('/dashboard.html'));
  await track('START');assert.equal(sent.length,1);
  await track('SUBMIT');assert.equal(sent.length,2);assert(sent[1].body.text.includes('ĐÃ NỘP BÀI'));assert(sent[1].body.text.includes('6.0 / 10'));assert(sent[1].body.text.includes('Sai: <b>2</b>'));assert(sent[1].body.text.includes('Bỏ trống: <b>2</b>'));assert(sent[1].body.text.includes('02:05'));assert(sent[1].body.text.includes('Giờ Việt Nam'));
  await track('SUBMIT');assert.equal(sent.length,2);
  await track('START',{sessionId:'two'});assert.equal(sent.length,3);
  failTelegram=true;await track('SUBMIT',{sessionId:'two'});assert.equal(stored.has('quizmaster:telegram:event:two:SUBMIT'),false);assert.equal(JSON.parse(stored.get('quizmaster:live:session:two')).eventType,'SUBMIT');
  failTelegram=false;await track('SUBMIT',{sessionId:'two'});assert.equal(sent.length,5);
  delete context.process.env.TELEGRAM_BOT_TOKEN;await track('START',{sessionId:'three'});assert.equal(sent.length,5);assert(stored.has('quizmaster:live:session:three'));
  console.log('PASS: Telegram start/submit only, separate messages, deduplication, escaped formatting, score/time, dashboard updates and Telegram failure recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});
