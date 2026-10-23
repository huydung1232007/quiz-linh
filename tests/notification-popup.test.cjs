const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const nodes=new Map(),stored=new Map(),requests=[];let options,tick,fail=false;
function node(id){if(!nodes.has(id)){const classes=new Set(['hidden']);nodes.set(id,{id,value:'',textContent:'',hidden:false,disabled:false,className:'',classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute(){},addEventListener(e,fn){this[e]=fn;},focus(){document.activeElement=this;},getClientRects(){return[{}];}});}return nodes.get(id);}
const document={getElementById:node,createElement:()=>node('root'),body:{append(){}},activeElement:{focus(){}}};
node('view-exam').classList.remove('hidden');
const context={document,app:{trackingSessionId:'one'},SessionChat:{mount:o=>{options=o;return {read(){},poll(){}}}},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},setInterval:fn=>{tick=fn;},clearInterval(){},AbortSignal,fetch:async(url,opts)=>{const input=JSON.parse(opts.body);requests.push(input);return {ok:!fail,json:async()=>({ok:!fail,error:'Thử lại'})};}};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/student-chat.js','utf8'),context);
const teacher={id:'t1',sender:'teacher',message:'Tin nhắn mới'},student={id:'s1',sender:'student',message:'Reply'};
(async()=>{
  options.onMessages([teacher,student],'one');
  assert.equal(node('teacher-notification-modal').classList.contains('hidden'),false);assert.equal(node('teacher-notification-message').textContent,'Tin nhắn mới');
  assert.equal(node('teacher-notification-reply-panel').hidden,true);node('teacher-notification-reply-toggle').click();assert.equal(node('teacher-notification-reply-panel').hidden,false);
  node('teacher-notification-reply').value='Nội dung nháp';node('teacher-notification-reply-toggle').click();assert.equal(node('teacher-notification-reply-panel').hidden,true);node('teacher-notification-reply-toggle').click();assert.equal(node('teacher-notification-reply').value,'Nội dung nháp');
  node('teacher-notification-reply').value='Em đã hiểu';fail=true;await node('teacher-notification-send').click();assert.equal(node('teacher-notification-modal').classList.contains('hidden'),false);assert.equal(node('teacher-notification-reply').value,'Em đã hiểu');
  fail=false;await node('teacher-notification-send').click();const reply=requests.find(r=>r.action==='reply');assert.equal(reply.replyTo,'t1');assert.equal(reply.sessionId,'one');assert.equal(node('teacher-notification-modal').classList.contains('hidden'),true);
  options.onMessages([teacher,student],'one');assert.equal(node('teacher-notification-modal').classList.contains('hidden'),true);
  options.onMessages([teacher,{...teacher,id:'t2',message:'Tin thứ hai'}],'one');assert.equal(node('teacher-notification-message').textContent,'Tin thứ hai');await node('teacher-notification-ack').click();assert(requests.some(r=>r.action==='ack'&&r.notificationId==='t2'));
  options.onMessages([{...teacher,id:'t3'}],'one');context.app.trackingSessionId='two';tick();assert.equal(node('teacher-notification-modal').classList.contains('hidden'),true);
  console.log('PASS: new-message popup, inline reply, retry preservation, no duplicate popup, acknowledgement and session switch.');
})().catch(error=>{console.error(error);process.exitCode=1;});
