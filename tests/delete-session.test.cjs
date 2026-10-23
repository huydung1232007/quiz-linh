const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const values=new Map(),sessions=new Set(['one','two']),replies=new Set(['message-one','message-two']);let evalCalls=0;
const env={UPSTASH_REDIS_REST_URL:'https://mock',UPSTASH_REDIS_REST_TOKEN:'mock',DASHBOARD_NOTIFY_KEY:'secret'};
async function fetchMock(url,options){
  const command=JSON.parse(options.body);let result=null;
  if(command[0]==='EVAL'){
    evalCalls++;const script=command[1],count=Number(command[2]),keys=command.slice(3,3+count),args=command.slice(3+count);
    assert(script.includes("redis.call('"));
    if(count===1){
      const id=args[0];values.set(keys[0],'1');
      const messages=JSON.parse(values.get('quizmaster:notifications:session:'+id)||'[]');
      for(const message of messages){values.delete('quizmaster:notifications:item:'+message);values.delete('quizmaster:notifications:ack:'+message);replies.delete(message);}
      for(const key of ['quizmaster:live:session:','quizmaster:live:questions:','quizmaster:notifications:session:','quizmaster:notifications:limit:'])values.delete(key+id);
      values.delete('quizmaster:telegram:event:'+id+':START');values.delete('quizmaster:telegram:event:'+id+':SUBMIT');sessions.delete(id);
      if(JSON.parse(values.get('quizmaster:live:latest')||'null')?.sessionId===id)values.delete('quizmaster:live:latest');result=1;
    }else{
      assert(script.includes("if redis.call('EXISTS', KEYS[1])==1 then return 0 end"));
      if(values.has(keys[0]))result=0;
      else{values.set(keys[1],args[0]);values.set(keys[2],args[0]);sessions.add(args[1]);if(args[2])values.set(keys[4],args[2]);result=1;}
    }
  }
  return {ok:true,json:async()=>({result}),text:async()=>JSON.stringify({result})};
}
const base={console,AbortSignal,process:{env},fetch:fetchMock};const api={...base};vm.createContext(api);vm.runInContext(fs.readFileSync('api/dashboard.js','utf8').replace('export default async function handler','async function handler'),api);
const tracking={...base,module:{exports:{}}};vm.createContext(tracking);vm.runInContext(fs.readFileSync('api/track.js','utf8'),tracking);
async function request(body,handler=api.handler){const res={setHeader(){},status(n){this.code=n;return this},json(value){this.body=value;return this}};await handler({method:'POST',body},res);return res;}
(async()=>{
  for(const id of ['one','two']){values.set('quizmaster:live:session:'+id,JSON.stringify({sessionId:id}));values.set('quizmaster:live:questions:'+id,'[]');values.set('quizmaster:notifications:session:'+id,JSON.stringify(['message-'+id]));values.set('quizmaster:notifications:item:message-'+id,'message');values.set('quizmaster:notifications:ack:message-'+id,id);}
  values.set('quizmaster:live:latest',JSON.stringify({sessionId:'one'}));
  assert.equal((await request({action:'delete',sessionId:'one',notifyKey:'wrong'})).code,401);assert.equal(evalCalls,0);assert(values.has('quizmaster:live:session:one'));
  assert.equal((await request({action:'delete',sessionId:'../one',notifyKey:'secret'})).code,400);
  let result=await request({action:'delete',sessionId:'one',notifyKey:'secret'});assert.equal(result.code,200);assert.equal(result.body.deleted,true);
  for(const key of ['quizmaster:live:session:one','quizmaster:live:questions:one','quizmaster:notifications:item:message-one','quizmaster:notifications:ack:message-one','quizmaster:live:latest'])assert.equal(values.has(key),false,key);
  assert.equal(sessions.has('one'),false);assert.equal(replies.has('message-one'),false);assert(values.has('quizmaster:live:session:two'));assert(replies.has('message-two'));
  result=await request({eventType:'PERIODIC',sessionId:'one',examQuestionSet:[{text:'Q',options:['A'],correct:0}]},tracking.module.exports);assert.equal(result.body.deleted,true);assert.equal(values.has('quizmaster:live:session:one'),false);assert.equal(values.has('quizmaster:live:latest'),false);
  assert.equal((await request({action:'delete',sessionId:'one',notifyKey:'secret'})).code,200);
  console.log('PASS: permanent delete authorization, exam/chat cleanup, other-session isolation, idempotence and blocked late heartbeats.');
})().catch(error=>{console.error(error);process.exitCode=1;});
