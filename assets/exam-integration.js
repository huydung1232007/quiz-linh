// One exam engine and one set of views, shared by the catalog and the classroom.
(() => {
  const hub = document.getElementById('exam-hub');
  let lessonMode = false;
  const showView = app.showView.bind(app);
  const returnViews = () => {
    for (const name of ['exam','result']) hub.append(document.getElementById('view-' + name));
    document.getElementById('lesson-exam').hidden = true;
  };
  app.showView = function(name) {
    if (lessonMode && ['exam','result'].includes(name)) {
      showView(name);
      if (name === 'result') window.dispatchEvent(new Event('academy-exam-result'));
      document.getElementById('lesson-exam').scrollIntoView({block:'start',behavior:'smooth'});
      return;
    }
    lessonMode = false;
    returnViews();
    document.getElementById('home').hidden = name !== 'dashboard';
    document.getElementById('classroom').hidden = true;
    hub.hidden = false;
    if (location.hash !== '#exams') history.replaceState(null,'','#exams');
    showView(name);
    if (name === 'dashboard') hub.scrollIntoView({block:'start',behavior:'smooth'});
  };
  window.academyLeaveExam = () => {
    lessonMode = false;
    returnViews();
    // Match the original engine's behavior when leaving an exam view.
    if (app.timerInterval) clearInterval(app.timerInterval);
    if (app.telegramReportInterval) clearInterval(app.telegramReportInterval);
    for (const name of ['exam','result','editor']) document.getElementById('view-' + name).classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
  };
  window.academyOpenQuiz = async file => {
    const requestedRoute = location.hash;
    await window.examsReady;
    const [quiz] = await window.quizRepository.loadFile(file);
    if (location.hash !== requestedRoute) throw new Error('Đã chuyển bài học');
    if (!quiz || !Array.isArray(quiz.questions)) throw new Error('Đề không hợp lệ');
    if (!app.quizzes.some(q => q.id === quiz.id)) app.quizzes.push(quiz);
    lessonMode = true;
    const mount = document.getElementById('lesson-exam');
    for (const name of ['exam','result']) mount.append(document.getElementById('view-' + name));
    mount.hidden = false;
    app.startQuiz(quiz.id);
  };
  const closeNameModal = app.closeNameModal.bind(app);
  app.closeNameModal = function(confirmed) {
    closeNameModal(confirmed);
    if (!confirmed && lessonMode) {
      document.getElementById('lesson-exam').hidden = true;
      document.getElementById('inline-quiz-status').textContent = 'Bạn có thể bắt đầu làm đề khi sẵn sàng.';
    }
  };
})();
