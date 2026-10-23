
const $ = id => document.getElementById(id);
let lastUpdated = '';
let selectedSessionId = '';
let dashboardChat = null, latestReplies = {};
function updateChatBadges(){
  document.querySelectorAll?.('[data-chat-session]').forEach(badge=>{
    const latest=latestReplies[badge.dataset.chatSession];
    badge.hidden=!latest || SessionChat.seen(badge.dataset.chatSession)===latest.id;
  });
}
async function pollReplyInbox(){
  try {
    const response=await fetch('/api/notifications?action=inbox&t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(12000)});
    const result=await response.json();
    if(response.ok && result.ok){latestReplies=result.latest||{};updateChatBadges();}
  } catch {}
}
const HIDDEN_SESSIONS_KEY = 'quizmaster_hidden_sessions_v1';
function getHiddenSessions(){ try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_SESSIONS_KEY) || '[]')); } catch { return new Set(); } }
function hideSession(sessionId){
  if(!sessionId) return;
  if(!confirm('Ẩn lượt thi này khỏi danh sách dashboard? Dữ liệu gốc trong Redis không bị xóa.')) return;
  const hidden = getHiddenSessions(); hidden.add(sessionId);
  localStorage.setItem(HIDDEN_SESSIONS_KEY, JSON.stringify([...hidden]));
  if(selectedSessionId === sessionId) selectedSessionId = '';
  refresh();
}
function restoreHiddenSessions(){
  localStorage.removeItem(HIDDEN_SESSIONS_KEY);
  refresh();
}
function esc(s){return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
let cachedSessions = [], detailData = null, refreshing = false, sendingNotification = false;
function sessionState(s){
  if(s.eventType === 'SUBMIT') return 'submitted';
  const age = Date.now() - new Date(s.updatedAt || 0).getTime();
  return !Number.isFinite(age) || age > 120000 ? 'idle' : 'active';
}
function clearDetail(){
  detailData = null; selectedSessionId = ''; lastSentNotificationId = '';
  $('quiz-title').textContent = 'Chưa chọn lượt thi';
  $('student').textContent = 'Chọn một học viên trong danh sách để theo dõi.';
  $('event-status').textContent = 'Đang chờ'; $('event-status').className = 'state-badge';
  $('updated').textContent = 'Chưa cập nhật';
  for(const id of ['current','answered','time','correct']) $(id).textContent = '—';
  $('percent').textContent = '0%'; $('bar').style.width = '0%';
  $('activity').textContent = 'Đang chờ học viên…';
  $('notification-recipient').textContent = 'Chưa chọn'; $('send-notification-btn').disabled = true;
  $('notification-send-status').textContent = ''; $('notification-ack-status').textContent = '';
  $('answer-grid').innerHTML = '<div class="empty-state">Chọn một lượt thi để xem đáp án.</div>';
  $('answer-count').textContent = '';
  dashboardChat?.poll();
}
function renderSessions(sessions){
  cachedSessions = Array.isArray(sessions) ? sessions : [];
  const hidden = getHiddenSessions(), all = cachedSessions.filter(s => !hidden.has(String(s.sessionId || '')));
  $('session-count').textContent = `${all.length} lượt`;
  for(const [id,state] of [['online-count','active'],['submitted-count','submitted'],['idle-count','idle']]) $(id).textContent = all.filter(s => sessionState(s) === state).length;
  const query = $('session-search').value.trim().toLocaleLowerCase('vi'), filter = $('session-filter').value;
  const filtered = all.filter(s => (filter === 'all' || sessionState(s) === filter) && [s.playerName,s.quizCode,s.quizTitle].join(' ').toLocaleLowerCase('vi').includes(query));
  const restore = $('restore-hidden-sessions'); restore.hidden = !hidden.size; restore.textContent = `Hiện lại ${hidden.size} lượt đã ẩn`;
  if(!filtered.length){ $('session-list').innerHTML = `<div class="empty-state">${all.length ? 'Không có lượt thi khớp bộ lọc.' : 'Chưa có lượt thi hiển thị.'}</div>`; clearDetail(); return; }
  if(!filtered.some(s => s.sessionId === selectedSessionId)) { selectedSessionId = filtered[0].sessionId; lastSentNotificationId=''; $('notification-ack-status').textContent=''; $('notification-send-status').textContent=''; }
  $('session-list').innerHTML = filtered.map(s => {
    const total=Math.max(0,Number(s.totalQuestions)||0), answered=Math.max(0,Number(s.answeredCount)||0), pct=total?Math.min(100,Math.round(answered/total*100)):0;
    const state=sessionState(s), label={active:'Đang thi',submitted:'Đã nộp',idle:'Tạm ngưng'}[state], active=s.sessionId===selectedSessionId;
    return `<div class="session-wrap"><button type="button" data-session="${esc(s.sessionId||'')}" aria-pressed="${active}" class="session-card ${active?'active':''}"><div class="session-name">${esc(s.playerName||'Ẩn danh')}</div><div class="session-quiz" title="${esc(s.quizTitle||'Đề thi')}">${esc(s.quizCode||'QUIZ')} · ${esc(s.quizTitle||'Đề thi')}</div><div class="session-info"><span class="state-badge ${state}">${label}</span><span>${answered}/${total} câu · ${pct}%</span></div><div class="mini-track"><span style="width:${pct}%"></span></div></button><button type="button" class="hide-session" data-hide-session="${esc(s.sessionId||'')}" title="Ẩn lượt thi" aria-label="Ẩn lượt thi của ${esc(s.playerName||'Ẩn danh')}">×</button></div>`;
  }).join('');
  $('session-list').querySelectorAll('[data-session]').forEach(btn => btn.addEventListener('click', () => { selectedSessionId=btn.dataset.session; lastSentNotificationId=''; $('notification-ack-status').textContent=''; $('notification-send-status').textContent=''; renderSessions(cachedSessions); }));
  $('session-list').querySelectorAll('[data-hide-session]').forEach(btn => btn.addEventListener('click', () => hideSession(btn.dataset.hideSession)));
  document.querySelectorAll?.('.session-name').forEach(name=>{
    const id=name.closest('[data-session]').dataset.session;
    const badge=document.createElement('span');badge.className='chat-unread';badge.dataset.chatSession=id;badge.textContent='Tin mới';badge.hidden=true;name.append(badge);
  });
  updateChatBadges();
  renderDetail(filtered.find(s => s.sessionId === selectedSessionId));
}
function renderDetail(d){
  if(!d) { clearDetail(); return; }
  detailData = d;
  dashboardChat?.poll();
  if(!dashboardChat) $('send-notification-btn').disabled = sendingNotification;
  $('notification-recipient').textContent = d.playerName || 'Ẩn danh';
  $('event-status').className = 'state-badge ' + sessionState(d);
  lastUpdated=d.updatedAt || '';
  const total=Number(d.totalQuestions)||0, answered=Number(d.answeredCount)||0;
  const pct=total?Math.min(100,Math.round(answered/total*100)):0;
  $('quiz-title').textContent=(d.quizCode||'QUIZ')+' — '+(d.quizTitle||'Đề thi');
  $('student').textContent='Thí sinh: '+(d.playerName||'Ẩn danh');
  $('event-status').textContent=d.eventType==='SUBMIT'?'Đã nộp bài':sessionState(d)==='idle'?'Không hoạt động':d.eventType==='START'?'Bắt đầu thi':'Đang làm bài';
  $('updated').textContent='Cập nhật: '+(d.updatedAt ? new Date(d.updatedAt).toLocaleString('vi-VN') : '—');
  $('current').textContent=(d.currentQuestion||0)+' / '+total;
  $('answered').textContent=answered+' / '+total;
  $('time').textContent=d.timeLeft||'—';
  $('correct').textContent=Number(d.correctCount)||0;
  $('percent').textContent=pct+'%';
  $('bar').style.width=pct+'%';
  $('activity').textContent=String(d.actionDetail||'Cập nhật tiến độ').replace(/<[^>]*>/g,'');
  const answers={};
  String(d.answerSheet||'').split('|').forEach(part=>{
    const m=part.trim().match(/Câu\s+(\d+)\s*:\s*([A-F])/i);
    if(m) answers[Number(m[1])]=m[2].toUpperCase();
  });
  const results = d.answerResults && typeof d.answerResults === 'object' ? d.answerResults : {};
  const count=Math.min(total,200);
  const filter = $('answer-filter').value, cells = [];
  for(let i=0;i<count;i++){
    const n=i+1, a=answers[n], result=results[String(n)] || results[n];
    const hasResult=!!a && result && typeof result.isCorrect==='boolean';
    const state=!a?'empty':hasResult?(result.isCorrect?'correct':'wrong'):'selected';
    if(filter!=='all' && state!==filter) continue;
    const label={empty:'Chưa chọn',correct:'Đúng',wrong:'Sai',selected:'Chưa đối chiếu'}[state];
    cells.push(`<div class="answer ${state}" aria-label="Câu ${n}: ${a||'chưa chọn'} · ${label}"><span>CÂU ${n}</span><strong>${a||'—'}</strong></div>`);
  }
  $('answer-grid').innerHTML=cells.join('') || '<div class="empty-state">Không có câu hỏi trong bộ lọc này.</div>';
  $('answer-count').textContent = `Hiển thị ${cells.length}/${total} câu` + (total>200?' · Tối đa 200 câu đầu':'');

}
let lastSentNotificationId = '';
let notificationStatusTimer = null;
async function sendTargetedNotification(){
  const message = $('notification-message').value.trim();
  const status = $('notification-send-status');
  const button = $('send-notification-btn');
  if(!selectedSessionId){
    status.textContent = 'Hãy chọn một thí sinh trong danh sách trước.';
    status.className = 'mt-3 text-sm text-amber-300';
    return;
  }
  if(!message){
    status.textContent = 'Bạn chưa nhập nội dung thông báo.';
    status.className = 'mt-3 text-sm text-amber-300';
    return;
  }
  const notifyKey = prompt('Nhập khóa bảo vệ gửi thông báo (DASHBOARD_NOTIFY_KEY trên Vercel):');
  if(!notifyKey) return;
  if(sendingNotification) return;
  const targetSessionId = selectedSessionId;
  sendingNotification = true;
  button.disabled = true;
  status.textContent = 'Đang gửi thông báo…';
  status.className = 'mt-3 text-sm text-slate-300';
  try{
    const response = await fetch('/api/notifications', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'send',sessionId:targetSessionId,message,notifyKey})
    });
    const result = await response.json();
    if(!response.ok || !result.ok) throw new Error(result.error || 'Không gửi được thông báo');
    if(selectedSessionId !== targetSessionId) return;
    lastSentNotificationId = result.notification.id;
    $('notification-message').value = '';
    status.textContent = 'Đã gửi thông báo cho thí sinh đang chọn.';
    status.className = 'mt-3 text-sm text-emerald-300';
    checkNotificationAcknowledgement();
  }catch(e){
    if(selectedSessionId !== targetSessionId) return;
    status.textContent = e.message || 'Lỗi gửi thông báo.';
    status.className = 'mt-3 text-sm text-rose-300';
  }finally{
    sendingNotification = false;
    button.disabled = !selectedSessionId;
  }
}
async function checkNotificationAcknowledgement(){
  if(!lastSentNotificationId) return;
  try{
    const response = await fetch('/api/notifications?action=status&notificationId='+encodeURIComponent(lastSentNotificationId)+'&t='+Date.now(),{cache:'no-store'});
    const result = await response.json();
    if(response.ok && result.ok){
      const count = Array.isArray(result.acknowledgedBy) ? result.acknowledgedBy.length : 0;
      $('notification-ack-status').textContent = count ? `Đã xác nhận đọc: ${count} thí sinh (lượt nhận hiện tại).` : 'Đang chờ thí sinh bấm “Đã hiểu”…';
      $('notification-ack-status').className = count ? 'mt-2 text-xs text-emerald-300' : 'mt-2 text-xs text-amber-300';
    }
  }catch(_){}
}
if(window.SessionChat) dashboardChat=SessionChat.mount({role:'teacher',getSession:()=>selectedSessionId,isOpen:()=>!$('notification-composer').classList.contains('hidden'),history:$('dashboard-chat-history'),input:$('notification-message'),button:$('send-notification-btn'),status:$('notification-send-status'),badge:$('dashboard-chat-badge'),onRead:updateChatBadges,onSent:notification=>{lastSentNotificationId=notification.id;checkNotificationAcknowledgement();}});
const notificationToggle = $('toggle-notification-composer');
notificationToggle.addEventListener('click', () => {
  const panel = $('notification-composer');
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !willOpen);
  notificationToggle.setAttribute('aria-expanded', String(willOpen));
  $('notification-toggle-chevron').classList.toggle('rotate-180', willOpen);
  if (willOpen) { $('notification-message').focus();dashboardChat?.read();dashboardChat?.poll(); }
});
if(!dashboardChat) $('send-notification-btn').addEventListener('click',sendTargetedNotification);
setInterval(checkNotificationAcknowledgement,4000);
if(window.SessionChat){pollReplyInbox();setInterval(pollReplyInbox,8000);}

async function refresh(){
  if(refreshing) return;
  refreshing=true; $('refresh-button').disabled=true;
  try{
    const response=await fetch('/api/dashboard?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok || !result.ok) throw new Error(result.error || 'API error');
    $('status').className='connection online';
    $('status').innerHTML='<i class="fa-solid fa-circle" aria-hidden="true"></i> Đã kết nối';
    renderSessions(Array.isArray(result.sessions)?result.sessions:(result.data?[result.data]:[]));
  }catch(e){
    $('status').className='connection offline';
    $('status').innerHTML='<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Mất kết nối · sẽ thử lại';
    if(!cachedSessions.length){ $('session-list').innerHTML='<div class="empty-state">Chưa tải được dữ liệu. Bấm Làm mới để thử lại.</div>'; clearDetail(); }
  }finally{ refreshing=false; $('refresh-button').disabled=false; }
}
$('refresh-button').addEventListener('click',refresh);
$('restore-hidden-sessions').addEventListener('click',restoreHiddenSessions);
$('session-search').addEventListener('input',()=>renderSessions(cachedSessions));
$('session-filter').addEventListener('change',()=>renderSessions(cachedSessions));
$('answer-filter').addEventListener('change',()=>renderDetail(detailData));
refresh(); setInterval(refresh,5000);
