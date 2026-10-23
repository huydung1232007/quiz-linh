const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const store=new Map(),requests=[];
let session='one',open=false;
const teacher={id:'t1',sessionId:'one',sender:'teacher',message:'<img src=x onerror=alert(1)>',createdAt:'2026-10-23T10:00:00Z'};
const elements=()=>({innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,scrollTop:0,scrollHeight:100,addEventListener(event,fn){this[event]=fn;}});
const history=elements(),input=elements(),button=elements(),status=elements(),badge=elements();
const context={window:{},console,AbortSignal,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},setInterval(){},clearInterval(){},fetch:async(url,opts)=>{
  if(opts?.method==='POST'){const body=JSON.parse(opts.body);requests.push(body);return {ok:true,json:async()=>({ok:true,notification:{id:'s1',sessionId:session,sender:'student',message:body.message,createdAt:'2026-10-23T10:01:00Z'}})};}
  return {ok:true,json:async()=>({ok:true,notifications:session==='one'?[teacher]:[]})};
}};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/session-chat.js','utf8'),context);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const chat=context.window.SessionChat.mount({role:'student',getSession:()=>session,isOpen:()=>open,history,input,button,status,badge});
  await flush();assert.equal(badge.hidden,false);assert(history.innerHTML.includes('&lt;img'));assert(!history.innerHTML.includes('<img'));assert.equal(button.disabled,false);
  open=true;chat.read();assert.equal(badge.hidden,true);assert.equal(store.get('chat-read-student-one'),'t1');
  input.value='Em cần giúp câu 2';await button.click();assert(requests.some(x=>x.action==='reply'&&x.replyTo==='t1'&&x.sessionId==='one'));assert.equal(input.value,'');
  session='two';await chat.poll();assert.equal(button.disabled,true);assert(history.innerHTML.includes('Chưa có tin nhắn'));assert.equal(status.textContent,'');
  console.log('PASS: student reply UI, escaped messages, unread/read state and conversation switch.');
})().catch(error=>{console.error(error);process.exitCode=1;});
