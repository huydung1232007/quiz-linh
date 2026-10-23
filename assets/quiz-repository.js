// Shared by the catalog and lesson practice; never embeds questions in index.html.
(() => {
  const bundled = window.QUIZ_CATALOG || {};
  const normalize = (data,file) => (Array.isArray(data) ? data : [data])
    .filter(q => q && Array.isArray(q.questions) && q.questions.length)
    .map((q,i) => ({...q,id:q.id || `q-${file.replace('.json','')}-${i}`,sourceFile:q.sourceFile || file}));
  async function json(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),8000);
    try { const r = await fetch(url,{cache:'no-store',signal:controller.signal}); if (!r.ok) throw new Error('HTTP '+r.status); return await r.json(); }
    finally { clearTimeout(timer); }
  }
  async function loadFile(file) {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(file)) throw new Error('Tên file đề không hợp lệ');
    if (location.protocol !== 'file:') {
      try { const quizzes = normalize(await json('quizzes/'+file),file); if (quizzes.length) return quizzes; } catch { /* Use generated source below. */ }
    }
    const quizzes = normalize(bundled[file] || [],file);
    if (!quizzes.length) throw new Error(`Không tìm thấy đề quizzes/${file}`);
    return quizzes;
  }
  async function loadAll() {
    if (location.protocol !== 'file:') {
      try { const data = await json('api/quizzes?t='+Date.now()); if (Array.isArray(data)) { const quizzes = normalize(data,'server.json'); if (quizzes.length) return quizzes; } } catch { /* Static hosting has no API. */ }
    }
    return (await Promise.all(Object.keys(bundled).map(loadFile))).flat();
  }
  window.quizRepository = {loadAll,loadFile};
})();
