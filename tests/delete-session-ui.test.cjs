const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let confirmed=false,fail=false,posts=0;const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',style:{},hidden:false,disabled:false,dataset:{},classList:{contains(){return true},toggle(){}},addEventListener(){},setAttribute(){},querySelectorAll(){return[]}});return nodes.get(id);}
const context={window:{},console,AbortSignal,document:{getElementById:node},localStorage:{getItem(){return null}},setInterval(){},confirm:()=>confirmed,prompt:()=> 'secret',fetch:async(url,options)=>{if(options.method!=='POST')return new Promise(()=>{});posts++;return {ok:!fail,json:async()=>({ok:!fail,sessionId:'one',error:'Không xóa được'})};}};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/dashboard.js','utf8'),context);context.sessions=[{sessionId:'one',playerName:'Linh',totalQuestions:1},{sessionId:'two',playerName:'An',totalQuestions:1}];node('session-filter').value='all';node('answer-filter').value='all';
(async()=>{
  vm.runInContext('renderSessions(sessions)',context);await vm.runInContext('hideSession("one")',context);assert.equal(posts,0);
  confirmed=true;fail=true;await vm.runInContext('hideSession("one")',context);assert.equal(node('session-count').textContent,'2 lượt');
  fail=false;await vm.runInContext('hideSession("one")',context);assert.equal(node('session-count').textContent,'1 lượt');assert(!node('session-list').innerHTML.includes('Linh'));assert(node('session-action-status').textContent.includes('Đã xóa vĩnh viễn'));
  vm.runInContext('renderSessions(sessions)',context);assert.equal(node('session-count').textContent,'1 lượt');assert.equal(node('notification-recipient').textContent,'An');
  console.log('PASS: cancel preserves data, failed delete preserves row, confirmed delete removes row and stale refresh cannot restore it.');
})().catch(error=>{console.error(error);process.exitCode=1;});
