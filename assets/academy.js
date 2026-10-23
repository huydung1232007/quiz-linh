/* Browser-local course workspace. Public MP4 URLs are read from courses-config.json. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const lessons = window.COURSE_LESSONS;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  let completed = new Set(read('academy-completed', []).filter(id => lessons.some(l => l.id === id)));
  let config = read('academy-video-config', {}), publicConfig = window.ACADEMY_VIDEO_CONFIG?.videos || {}, current = lessons[0], mediaUrl, materialUrls = [], renderId = 0;
  const notify = message => { $('toast').textContent = message; $('toast').style.display = 'block'; clearTimeout(notify.timer); notify.timer = setTimeout(() => $('toast').style.display = 'none', 4000); };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { notify('Không thể lưu. Kiểm tra dung lượng và quyền lưu của trình duyệt.'); return false; } };
  const safeUrl = value => { try { const u = new URL(value, location.href); return ['http:', 'https:'].includes(u.protocol) || (location.protocol === 'file:' && u.protocol === 'file:') ? u.href : ''; } catch { return ''; } };
  const dbPromise = new Promise((resolve, reject) => { const r = indexedDB.open('linh-academy', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  dbPromise.catch(() => {});
  async function fileStore(action, key, value) { const db = await dbPromise; return new Promise((resolve, reject) => { const tx = db.transaction('files', action === 'get' ? 'readonly' : 'readwrite'); const store = tx.objectStore('files'); const r = action === 'get' ? store.get(key) : action === 'put' ? store.put(value, key) : store.delete(key); tx.oncomplete = () => resolve(r.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Storage aborted')); }); }
  function rows(active = '') { let section = ''; return lessons.map((l, i) => { const heading = section !== l.section ? `<p class="group-label">${esc(l.section)}</p>` : ''; section = l.section; return heading + `<button class="lesson-row ${completed.has(l.id) ? 'done' : ''} ${active === l.id ? 'active' : ''}" data-lesson="${l.id}" ${active === l.id ? 'aria-current="page"' : ''}><span class="lesson-number">${completed.has(l.id) ? '✓' : String(i + 1).padStart(2,'0')}</span><span class="lesson-name">${esc(l.title)}</span><span class="lesson-time">${l.duration}</span><span aria-hidden="true">↗</span></button>`; }).join(''); }
  function progress() { const n = completed.size, percentage = Math.round(n / lessons.length * 100); $('overall-progress').textContent = percentage + '%'; $('course-progress').style.width = percentage + '%'; $('completed-label').textContent = `${n}/${lessons.length} bài hoàn thành`; $('continue-button').textContent = n ? 'Tiếp tục học ↗' : 'Bắt đầu học ↗'; $('lesson-list').innerHTML = rows(); $('classroom-list').innerHTML = rows(current.id); $('complete-button').textContent = completed.has(current.id) ? '✓ Đã hoàn thành · Bỏ đánh dấu' : 'Đánh dấu hoàn thành'; }
  function theory(body) {
    const inline = text => esc(text).replace(/`([^`]+)`/g,'<code>$1</code>');
    return body.split(/(```python\n[\s\S]*?```)/g).map(block => {
      if (block.startsWith('```')) return `<pre><code>${esc(block.replace(/^```python\n|```$/g, ''))}</code></pre>`;
      const lines = block.split('\n').filter(Boolean), result = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('|') && lines[i+1] && /^\|[\s:|\-]+\|$/.test(lines[i+1])) {
          const cells = row => row.slice(1,-1).split('|').map(s => inline(s.trim()));
          const head = cells(line); i += 2; const rows = [];
          while (i < lines.length && lines[i].startsWith('|')) { rows.push('<tr>'+cells(lines[i]).map(c => `<td>${c}</td>`).join('')+'</tr>'); i++; }
          i--; result.push('<div class="theory-table"><table><thead><tr>'+head.map(c => `<th scope="col">${c}</th>`).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>');
        } else if (line.startsWith('### ')) result.push(`<h3>${inline(line.slice(4))}</h3>`);
        else if (line.startsWith('## ')) result.push(`<h2>${inline(line.slice(3))}</h2>`);
        else result.push(`<p>${inline(line)}</p>`);
      }
      return result.join('');
    }).join('');
  }
  async function renderPractice(lesson) {
    const route = location.hash;
    $('lesson-quiz-card').replaceChildren();
    $('practice-title').textContent = lesson.quiz ? 'Kiểm tra kiến thức bài học' : 'Thực hành xử lý tập tin';
    $('practice-description').textContent = lesson.quiz ? 'Chọn Vào thi trên thẻ đề để bắt đầu. Bạn vẫn có thể xem lại lý thuyết phía trên.' : 'Hoàn thành bài tập TXT, JSON, CSV và Excel trong môi trường Python trên máy.';
    if (!lesson.quiz) { $('inline-quiz-status').textContent = 'Chưa có đề riêng cho bài này. Hãy thực hành theo các bài tập ở trên.'; return; }
    $('inline-quiz-status').textContent = 'Đang tải đề bài học…';
    try {
      await window.examsReady;
      const [loaded] = await window.quizRepository.loadFile(lesson.quiz);
      if (location.hash !== route) return;
      const quiz = app.quizzes.find(q => q.id === loaded.id) || loaded;
      if (!app.quizzes.some(q => q.id === quiz.id)) app.quizzes.push(quiz);
      const card = $('lesson-quiz-card');
      card.innerHTML = app.renderQuizCard(quiz);
      const start = card.querySelector('button');
      start.removeAttribute('onclick');
      start.addEventListener('click', async () => {
        if (!$('lesson-exam').hidden) { $('lesson-exam').scrollIntoView({behavior:'smooth',block:'start'}); return; }
        start.disabled = true;
        try {
          await window.academyOpenQuiz(lesson.quiz);
          if (location.hash === route) $('inline-quiz-status').textContent = 'Làm đề bên dưới. Kết quả và giải thích hiển thị tại đây sau khi nộp.';
        } catch (error) {
          if (location.hash === route) { $('lesson-exam').hidden = true; $('inline-quiz-status').textContent = 'Chưa mở được đề: ' + error.message; }
        } finally { start.disabled = false; }
      });
      card.querySelectorAll('button')[1].setAttribute('aria-label','Chia sẻ đề ' + quiz.title);
      card.querySelectorAll('button')[2].setAttribute('aria-label','Chỉnh sửa đề ' + quiz.title);
      $('inline-quiz-status').textContent = '';
    } catch (error) {
      if (location.hash === route) $('inline-quiz-status').textContent = 'Không tải được thông tin đề: ' + error.message;
    }
  }
  async function media() {
    const id = ++renderId, lesson = current;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl); materialUrls.forEach(URL.revokeObjectURL); materialUrls = [];
    $('video-stage').innerHTML = '<p>Đang chuẩn bị bài giảng…</p>'; $('attachment-list').replaceChildren();
    let video, attachment; try { [video, attachment] = await Promise.all([fileStore('get', 'video:' + lesson.id), fileStore('get', 'material:' + lesson.id)]); } catch { /* Theory and hosted videos work without IndexedDB. */ }
    if (id !== renderId) return;
    const configured = Object.hasOwn(config, lesson.id) ? config[lesson.id] : publicConfig[lesson.id];
    let source = video ? (mediaUrl = URL.createObjectURL(video)) : configured ? safeUrl(configured) : '';
    if (source) { const player = document.createElement('video'); player.controls = true; player.preload = 'metadata'; player.playsInline = true; player.src = source; player.setAttribute('aria-label', lesson.title); player.addEventListener('error', () => { $('video-label').textContent = 'Không tải được video. Hãy kiểm tra file hoặc đường dẫn trong Nội dung.'; }); $('video-stage').replaceChildren(player); $('video-label').textContent = video ? `Video trên máy · ${video.name}` : 'Video bài giảng'; }
    else { $('video-stage').innerHTML = '<div class="video-empty"><span class="play-icon">▷</span><strong>Bài giảng đang chờ video</strong><p>Bạn có thể đọc lý thuyết và luyện đề ngay bên dưới.</p><button class="secondary" id="add-lesson-video">+ Thêm video MP4</button></div>'; $('add-lesson-video').onclick = () => openManager(lesson.id); $('video-label').textContent = 'Chưa thêm video · ' + lesson.duration; }
    if (attachment) { const a = document.createElement('a'); const url = URL.createObjectURL(attachment); materialUrls.push(url); a.href = url; a.download = attachment.name; a.textContent = '↓ Tài liệu bổ sung: ' + attachment.name; $('attachment-list').append(a); }
  }
  function route() {
    const pathOpen = location.hash === '#course/python';
    $('course-path').hidden = !pathOpen;
    $('course-layout').classList.toggle('path-open', pathOpen);
    document.body.classList.toggle('course-open', pathOpen);
    $('course-start').setAttribute('aria-expanded',String(pathOpen));
    $('course-start').textContent = pathOpen ? 'Thu gọn lộ trình' : 'Xem lộ trình';
    for (const link of document.querySelectorAll('header nav a')) {
      const active = link.getAttribute('href') === '#courses' ? location.hash !== '#exams' : location.hash === '#exams';
      if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    }
    if (pathOpen) requestAnimationFrame(() => $('courses').scrollIntoView({block:'start'}));
    if (window.academyLeaveExam) window.academyLeaveExam();
    $('lesson-exam').hidden = true;
    $('inline-quiz-status').textContent = '';
    const examRoute = location.hash === '#exams' || location.hash.startsWith('#share=');
    $('exam-hub').hidden = false;
    if (examRoute) { $('home').hidden = false; $('classroom').hidden = true; progress(); if (location.hash === '#exams') requestAnimationFrame(() => $('exam-hub').scrollIntoView({block:'start'})); return; }
    const id = location.hash.replace('#lesson/', ''), lesson = lessons.find(l => l.id === id);
    $('home').hidden = !!lesson; $('classroom').hidden = !lesson;
    $('exam-hub').hidden = !!lesson;
    if (!lesson) { ++renderId; const player = $('video-stage').querySelector('video'); if (player) player.pause(); progress(); return; }
    current = lesson; save('academy-last-lesson', lesson.id); $('lesson-title').textContent = lesson.title; $('lesson-section').textContent = lesson.section; $('lesson-position').textContent = `Bài ${lessons.indexOf(lesson) + 1} / ${lessons.length}`; $('theory-content').innerHTML = theory(lesson.body); $('lesson-notes').value = read('academy-note:' + lesson.id, ''); $('theory-panel').hidden = false; $('notes-panel').hidden = true; $('theory-tab').setAttribute('aria-pressed','true'); $('notes-tab').setAttribute('aria-pressed','false'); $('next-lesson').textContent = lesson === lessons.at(-1) ? 'Về lộ trình →' : 'Bài tiếp theo →'; renderPractice(lesson); progress(); media(); window.scrollTo(0,0);
  }
  function resume() { const last = read('academy-last-lesson', ''); const target = lessons.find(l => l.id === last && !completed.has(l.id)) || lessons.find(l => !completed.has(l.id)) || lessons[0]; location.hash = 'lesson/' + target.id; }
  function download(blob, name) { const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function openManager(id = current.id) { $('manage-lesson').value = id; $('video-url').value = config[id] || publicConfig[id] || ''; $('manage-status').textContent = ''; $('content-dialog').showModal(); }
  $('manage-lesson').innerHTML = lessons.map(l => `<option value="${l.id}">${esc(l.title)}</option>`).join('');
  $('manage-lesson').onchange = () => { $('video-url').value = config[$('manage-lesson').value] || publicConfig[$('manage-lesson').value] || ''; $('manage-status').textContent = ''; };
  $('manage-button').onclick = () => openManager();
  $('continue-button').onclick = () => { location.hash = 'course/python'; };
  $('course-start').onclick = () => { location.hash = location.hash === '#course/python' ? 'courses' : 'course/python'; };
  $('path-resume').onclick = resume;
  $('course-enter').onclick = resume;
  document.addEventListener('click', e => { const row = e.target.closest('[data-lesson]'); if (row) location.hash = 'lesson/' + row.dataset.lesson; });
  $('complete-button').onclick = () => { const next = new Set(completed); next.has(current.id) ? next.delete(current.id) : next.add(current.id); if (save('academy-completed', [...next])) { completed = next; progress(); } };
  $('next-lesson').onclick = () => { const next = lessons[lessons.indexOf(current) + 1]; location.hash = next ? 'lesson/' + next.id : 'course/python'; };
  for (const name of ['theory','notes']) $(name + '-tab').onclick = () => { for (const n of ['theory','notes']) { $(n + '-panel').hidden = name !== n; $(n + '-tab').setAttribute('aria-pressed', String(name === n)); } };
  $('lesson-notes').oninput = () => save('academy-note:' + current.id, $('lesson-notes').value);
  async function upload(kind, input) { const file = input.files[0], id = $('manage-lesson').value; if (!file) return; if (kind === 'video' && !/\.mp4$/i.test(file.name)) { $('manage-status').textContent = 'Vui lòng chọn file MP4.'; return; } $('manage-status').textContent = 'Đang lưu file, vui lòng chờ…'; try { await fileStore('put', kind + ':' + id, file); $('manage-status').textContent = `Đã lưu ${file.name} cho ${lessons.find(l => l.id === id).title}.`; if (id === current.id && !$('classroom').hidden) media(); } catch { $('manage-status').textContent = 'Không lưu được file. Có thể dung lượng trình duyệt không đủ; hãy dùng đường dẫn video từ hosting.'; } input.value = ''; }
  $('video-file').onchange = e => upload('video', e.target); $('material-file').onchange = e => upload('material', e.target);
  $('save-video-url').onclick = async () => { const id = $('manage-lesson').value, value = $('video-url').value.trim(); if (value && !safeUrl(value)) { $('manage-status').textContent = 'Chỉ chấp nhận đường dẫn HTTP/HTTPS hoặc đường dẫn tương đối.'; return; } try { await fileStore('delete', 'video:' + id); } catch { $('manage-status').textContent = 'Không thể thay thế video đã lưu trong trình duyệt.'; return; } const next = {...config, [id]:value}; if (save('academy-video-config',next)) { config = next; $('manage-status').textContent = 'Đã lưu đường dẫn video.'; if (id === current.id) media(); } };
  $('remove-video').onclick = async () => { const id = $('manage-lesson').value; try { await fileStore('delete','video:' + id); if (save('academy-video-config',{...config,[id]:''})) { config[id] = ''; $('video-url').value = ''; $('manage-status').textContent = 'Đã gỡ video trong trình duyệt này.'; if (id === current.id) media(); } } catch { $('manage-status').textContent = 'Không thể gỡ video. Hãy kiểm tra quyền lưu trữ.'; } };
  $('export-config').onclick = () => download(new Blob([JSON.stringify({videos:{...publicConfig,...config}},null,2)],{type:'application/json'}),'courses-config.json');
  function validateConfig(data) { if (!data || !data.videos || typeof data.videos !== 'object' || Array.isArray(data.videos)) throw new Error('invalid config'); const videos = {}; for (const l of lessons) { const value = data.videos[l.id]; if (value !== undefined) { if (typeof value !== 'string' || (value && !safeUrl(value))) throw new Error('invalid URL'); videos[l.id] = value; } } return videos; }
  $('import-config').onchange = async e => { try { const file = e.target.files[0]; if (!file) return; const videos = validateConfig(JSON.parse(await file.text())); if (save('academy-video-config',videos)) { config = videos; $('manage-lesson').onchange(); $('manage-status').textContent = 'Đã nhập cấu hình đường dẫn video. File MP4 trên máy vẫn được ưu tiên.'; if (!$('classroom').hidden) media(); } } catch { $('manage-status').textContent = 'Cấu hình không hợp lệ. Hãy chọn file xuất từ web.'; } e.target.value = ''; };
  window.addEventListener('hashchange',route); route();
  window.addEventListener('academy-exam-result', () => renderPractice(current));
  fetch('courses-config.json').then(r => { if (!r.ok) throw new Error('No shared config'); return r.json(); }).then(data => { publicConfig = validateConfig(data); if (!$('classroom').hidden) media(); }).catch(() => {});
})();
