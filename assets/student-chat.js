(() => {
  const root=document.createElement('section');
  root.className='student-chat';root.hidden=true;root.setAttribute('aria-label','Trò chuyện với giáo viên');
  root.innerHTML=`<div class="student-chat-panel" id="student-chat-panel" hidden><h2>Trò chuyện với giáo viên</h2><p class="chat-empty">Trao đổi riêng trong lượt thi này · Lưu trong 7 ngày</p><div class="chat-history" id="student-chat-history" role="log" aria-label="Lịch sử trò chuyện"></div><label for="student-chat-input" class="chat-empty">Trả lời giáo viên</label><textarea id="student-chat-input" rows="2" maxlength="1200" placeholder="Nhập câu trả lời…"></textarea><button id="student-chat-send" type="button" disabled>Gửi trả lời ↗</button><p id="student-chat-status" role="status"></p></div><button type="button" class="student-chat-toggle" id="student-chat-toggle" aria-expanded="false" aria-controls="student-chat-panel">Nhắn giáo viên <span class="chat-unread" id="student-chat-badge" hidden></span></button>`;
  document.body.append(root);
  const get=id=>document.getElementById(id),panel=get('student-chat-panel');
  const chat=SessionChat.mount({role:'student',getSession:()=>app.trackingSessionId,isOpen:()=>!root.hidden&&!panel.hidden,history:get('student-chat-history'),input:get('student-chat-input'),button:get('student-chat-send'),status:get('student-chat-status'),badge:get('student-chat-badge')});
  get('student-chat-toggle').addEventListener('click',()=>{panel.hidden=!panel.hidden;get('student-chat-toggle').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){chat.read();chat.poll();get('student-chat-input').focus();}});
  // Replace the blocking announcement popup with a compact conversation.
  app.startTeacherNotificationPolling=function(){ if(this.notificationPollInterval) clearInterval(this.notificationPollInterval); chat.poll(); };
  app.pollTeacherNotifications=()=>chat.poll();
  setInterval(()=>{
    const visible=['view-exam','view-result'].some(id=>get(id)?.getClientRects().length>0 && !get(id).classList.contains('hidden'));
    root.hidden=!app.trackingSessionId || !visible;
  },700);
})();
