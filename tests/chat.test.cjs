const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const data=new Map(),sets=new Map();
async function redisFetch(url,options){
  const commands=JSON.parse(options.body);
  return {ok:true,json:async()=>commands.map(([cmd,key,...args])=>{
    let result=null;
    if(cmd==='GET') result=data.get(key)||null;
    if(cmd==='SET'){if(!args.includes('NX')||!data.has(key)){data.set(key,args[0]);result='OK';}}
    if(cmd==='ZADD'){const list=sets.get(key)||[];list.push({score:Number(args[0]),id:args[1]});sets.set(key,list);result=1;}
    if(cmd==='ZREVRANGE')result=(sets.get(key)||[]).slice().sort((a,b)=>b.score-a.score).map(x=>x.id).slice(Number(args[0]),Number(args[1])+1);
    if(cmd==='SADD'){sets.set(key,[{id:args[0]}]);result=1;}
    if(cmd==='SMEMBERS')result=(sets.get(key)||[]).map(x=>x.id);
    return {result};
  })};
}
const context={process:{env:{UPSTASH_REDIS_REST_URL:'https://mock',UPSTASH_REDIS_REST_TOKEN:'mock',DASHBOARD_NOTIFY_KEY:'secret'}},fetch:redisFetch,console};
vm.createContext(context);vm.runInContext(fs.readFileSync('api/notifications.js','utf8').replace('export default async function handler','async function handler'),context);
async function request(method,body,query){const response={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}};await context.handler({method,body,query},response);return response;}
(async()=>{
  data.set('quizmaster:live:session:one',JSON.stringify({playerName:'Linh'}));
  data.set('quizmaster:live:session:two',JSON.stringify({playerName:'An'}));
  assert.equal((await request('POST',{action:'send',sessionId:'one',message:'Hello',notifyKey:'wrong'})).statusCode,401);
  const sent=await request('POST',{action:'send',sessionId:'one',message:'Em có cần hỗ trợ không?',notifyKey:'secret'});
  assert.equal(sent.statusCode,200);assert.equal(sent.body.notification.sender,'teacher');const parent=sent.body.notification.id;
  assert.equal((await request('POST',{action:'reply',sessionId:'two',replyTo:parent,message:'Cross session'})).statusCode,403);
  assert.equal((await request('POST',{action:'reply',sessionId:'one',replyTo:parent,message:'  '})).statusCode,400);
  const reply=await request('POST',{action:'reply',sessionId:'one',replyTo:parent,message:'Em cần giải thích câu 2 <script>'});
  assert.equal(reply.statusCode,200);assert.equal(reply.body.notification.sender,'student');
  assert.equal((await request('POST',{action:'reply',sessionId:'one',replyTo:parent,message:'Flood'})).statusCode,429);
  assert.equal((await request('POST',{action:'reply',sessionId:'one',replyTo:reply.body.notification.id,message:'Invalid parent'})).statusCode,403);
  const poll=await request('GET',null,{action:'poll',sessionId:'one'});assert.equal(poll.body.notifications.length,2);
  const other=await request('GET',null,{action:'poll',sessionId:'two'});assert.equal(other.body.notifications.length,0);
  const inbox=await request('GET',null,{action:'inbox'});assert.equal(inbox.body.latest.one.id,reply.body.notification.id);
  await request('POST',{action:'ack',sessionId:'one',notificationId:parent});
  const ack=await request('GET',null,{action:'status',notificationId:parent});assert.equal(ack.body.acknowledgedBy[0],'one');
  console.log('PASS: chat send/reply, session isolation, validation, throttle, history, unread inbox and acknowledgement.');
})().catch(e=>{console.error(e);process.exitCode=1;});
