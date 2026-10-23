/* Shared two-way conversation. Each message is scoped to one exam session. */
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seen = (id,role='teacher') => { try { return localStorage.getItem('chat-read-'+role+'-'+id)||''; } catch { return ''; } };
  const mark = (id,value,role) => { try { localStorage.setItem('chat-read-'+role+'-'+id,value); } catch {} };
  window.SessionChat = {escape,seen,mount(options) {
    let current='', messages=[], busy=false, polling=false, signature='';
    const {history,input,button,status,badge}=options;
    const session = () => String(options.getSession() || '');
    function unread() {
      const incoming=messages.filter(m=>(m.sender||'teacher')!==options.role);
      const last=incoming.at(-1);
      if(last && options.isOpen()) mark(current,last.id,options.role);
      const count=last && seen(current,options.role)!==last.id ? incoming.filter(m=>m.createdAt>(messages.find(x=>x.id===seen(current,options.role))?.createdAt||'')).length : 0;
      badge.textContent=count ? `${count} mới` : ''; badge.hidden=!count;
      options.onRead?.();
    }
    function render() {
      const key=JSON.stringify(messages);
      if(key!==signature) {
        signature=key;
        history.innerHTML=messages.length ? messages.map(m=>`<article class="chat-bubble ${(m.sender||'teacher')===options.role?'mine':''}"><small>${(m.sender||'teacher')==='student'?'Thí sinh':'Giáo viên'} · ${escape(new Date(m.createdAt).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}))}</small><p>${escape(m.message)}</p></article>`).join('') : '<p class="chat-empty">Chưa có tin nhắn. Giáo viên có thể bắt đầu trò chuyện.</p>';
        history.scrollTop=history.scrollHeight;
      }
      button.disabled=busy || !current || (options.role==='student' && !messages.some(m=>(m.sender||'teacher')==='teacher'));
      unread();
    }
    async function poll() {
      const id=session();
      if(id!==current) {current=id;messages=[];signature='';input.value='';status.textContent='';render();}
      if(!id || polling) return;
      polling=true;
      try {
        const response=await fetch(`/api/notifications?action=poll&sessionId=${encodeURIComponent(id)}&t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(12000)});
        const result=await response.json();
        if(!response.ok || !result.ok) throw Error('Không tải được trò chuyện.');
        if(session()!==id) return;
        messages=(result.notifications||[]).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
        if(status.textContent.startsWith('Chưa kết nối')) status.textContent='';
        render();
        options.onMessages?.(messages,id);
        if(options.isOpen()) acknowledge();
      } catch { if(session()===id) status.textContent='Chưa kết nối được trò chuyện, đang thử lại…'; }
      finally {polling=false;}
    }
    const acknowledged=new Set();
    function acknowledge() {
      if(options.role!=='student') return;
      for(const m of messages.filter(m=>(m.sender||'teacher')==='teacher' && !acknowledged.has(m.id))) {
        acknowledged.add(m.id);
        fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ack',sessionId:current,notificationId:m.id})}).then(r=>{if(!r.ok) acknowledged.delete(m.id);}).catch(()=>acknowledged.delete(m.id));
      }
    }
    async function send() {
      const id=session(),message=input.value.trim();
      if(!id || !message || busy) return;
      const teacher=messages.filter(m=>(m.sender||'teacher')==='teacher').at(-1);
      if(options.role==='student' && !teacher) return;
      const notifyKey=options.role==='teacher'?prompt('Nhập khóa bảo vệ gửi tin nhắn (DASHBOARD_NOTIFY_KEY):'):undefined;
      if(options.role==='teacher' && !notifyKey) return;
      busy=true;button.disabled=true;status.textContent='Đang gửi…';
      try {
        const response=await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({action:options.role==='teacher'?'send':'reply',sessionId:id,message,notifyKey,replyTo:teacher?.id})});
        const result=await response.json();
        if(!response.ok || !result.ok) throw Error(result.error||'Không gửi được tin nhắn.');
        if(session()!==id) return;
        input.value='';status.textContent='Đã gửi';options.onSent?.(result.notification);
        messages.push(result.notification); render(); await poll();
      } catch(error) { if(session()===id) status.textContent=error.message; }
      finally {busy=false;render();}
    }
    button.addEventListener('click',send);
    const timer=setInterval(poll,4000);poll();
    return {poll,read(){unread();acknowledge();},stop(){clearInterval(timer);}};
  }};
})();
