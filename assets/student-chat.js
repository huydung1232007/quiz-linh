(() => {
  const root=document.createElement('section');
  root.className='student-chat';root.hidden=true;root.setAttribute('aria-label','Trò chuyện với giáo viên');
  root.innerHTML=`<div class="student-chat-panel" id="student-chat-panel" hidden><h2>Trò chuyện với giáo viên</h2><p class="chat-empty">Trao đổi riêng trong lượt thi này · Lưu trong 7 ngày</p><div class="chat-history" id="student-chat-history" role="log" aria-label="Lịch sử trò chuyện"></div><label for="student-chat-input" class="chat-empty">Trả lời giáo viên</label><textarea id="student-chat-input" rows="2" maxlength="1200" placeholder="Nhập câu trả lời…"></textarea><button id="student-chat-send" type="button" disabled>Gửi trả lời ↗</button><p id="student-chat-status" role="status"></p></div><button type="button" class="student-chat-toggle" id="student-chat-toggle" aria-expanded="false" aria-controls="student-chat-panel">Nhắn giáo viên <span class="chat-unread" id="student-chat-badge" hidden></span></button>`;
  document.body.append(root);
  const get=id=>document.getElementById(id),panel=get('student-chat-panel');
  const modal=get('teacher-notification-modal'),reply=get('teacher-notification-reply'),send=get('teacher-notification-send'),replyStatus=get('teacher-notification-reply-status'),close=get('teacher-notification-ack');
  let active=null,queue=[],popupSession='',sending=false,previousFocus=null;
  const visible=()=>['view-exam','view-result'].some(id=>get(id)?.getClientRects().length>0 && !get(id).classList.contains('hidden'));
  const readSeen=id=>{try{return new Set(JSON.parse(localStorage.getItem('quizmaster_seen_notifications_'+id)||'[]'));}catch{return new Set();}};
  function showNext(){
    if(active || !visible()) return;
    const next=queue.find(item=>!readSeen(popupSession).has(item.id));
    if(!next) return;
    active=next;previousFocus=document.activeElement;
    get('teacher-notification-message').textContent=next.message||'';reply.value='';replyStatus.textContent='';
    modal.classList.remove('hidden');modal.classList.add('flex');close.disabled=false;send.disabled=false;reply.focus();
  }
  function resetPopup(){
    active=null;queue=[];sending=false;modal.classList.add('hidden');modal.classList.remove('flex');reply.value='';replyStatus.textContent='';close.disabled=false;send.disabled=false;
  }
  async function dismiss(){
    if(!active || sending) return;
    const item=active,id=popupSession,seen=readSeen(id);seen.add(item.id);
    try{localStorage.setItem('quizmaster_seen_notifications_'+id,JSON.stringify([...seen].slice(-200)));}catch{}
    // Acknowledge this message only; the history chat remains available.
    fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ack',sessionId:id,notificationId:item.id})}).catch(()=>{});
    queue=queue.filter(message=>message.id!==item.id);active=null;modal.classList.add('hidden');modal.classList.remove('flex');
    previousFocus?.focus();showNext();
  }
  function receive(messages,id){
    if(id!==popupSession){resetPopup();popupSession=id;}
    const seen=readSeen(id);
    queue=messages.filter(item=>(item.sender||'teacher')==='teacher' && !seen.has(item.id));
    showNext();
  }
  const chat=SessionChat.mount({role:'student',getSession:()=>app.trackingSessionId,isOpen:()=>!root.hidden&&!panel.hidden,history:get('student-chat-history'),input:get('student-chat-input'),button:get('student-chat-send'),status:get('student-chat-status'),badge:get('student-chat-badge'),onMessages:receive});
  close.addEventListener('click',dismiss);
  send.addEventListener('click',async()=>{
    const message=reply.value.trim(),item=active,id=popupSession;
    if(!item || sending) return;
    if(!message){replyStatus.textContent='Nhập nội dung trước khi gửi.';reply.focus();return;}
    sending=true;send.disabled=true;close.disabled=true;replyStatus.textContent='Đang gửi…';
    try{
      const response=await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({action:'reply',sessionId:id,replyTo:item.id,message})});
      const result=await response.json();
      if(id!==app.trackingSessionId || active!==item) return;
      if(!response.ok || !result.ok) throw Error(result.error||'Không gửi được. Vui lòng thử lại.');
      sending=false;await dismiss();chat.poll();
    }catch(error){if(active===item) replyStatus.textContent=error.message;}
    finally{if(id===popupSession){sending=false;send.disabled=false;close.disabled=false;}}
  });
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();dismiss();}
    if(event.key==='Tab'){
      const controls=[reply,send,close].filter(control=>!control.disabled),first=controls[0],last=controls.at(-1);
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  get('student-chat-toggle').addEventListener('click',()=>{panel.hidden=!panel.hidden;get('student-chat-toggle').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){chat.read();chat.poll();get('student-chat-input').focus();}});
  // One poll feeds both the popup for new messages and the history chat.
  app.startTeacherNotificationPolling=function(){ if(this.notificationPollInterval) clearInterval(this.notificationPollInterval); chat.poll(); };
  app.pollTeacherNotifications=()=>chat.poll();
  setInterval(()=>{
    root.hidden=!app.trackingSessionId || !visible();
    if(popupSession && popupSession!==app.trackingSessionId){resetPopup();popupSession='';}
    if(root.hidden && active){modal.classList.add('hidden');modal.classList.remove('flex');active=null;}
    if(!root.hidden) showNext();
  },700);
})();
