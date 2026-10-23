const STORAGE_KEY = 'quizmaster_vn_quizzes_v6';
        const STATS_KEY = 'quizmaster_vn_stats_v6';
        const PROGRESS_KEY = 'quizmaster_vn_progress_v6';
        const HISTORY_KEY = 'quizmaster_vn_history_v1';

        const DEFAULT_QUIZZES = [
            {
                id: 'q-py-01',
                code: 'PY-01',
                title: '50 Câu Trắc Nghiệm Ôn Tập Python',
                desc: 'Hệ thống câu hỏi ôn tập hàm Python từ cơ bản đến nâng cao.',
                duration: 45,
                isServer: true,
                questions: [
                    {
                        text: "Cho đoạn chương trình sau:\na = 12\nif a % 5 == 0:\n    a = a + 3\nelse:\n    a = a - 2\nprint(a)\nCho biết kết quả in ra màn hình.",
                        options: ["15", "10", "12", "14"],
                        correct: 1,
                        explain: "Vì 12 % 5 == 0 là False, chương trình nhảy vào nhánh else và thực hiện a = a - 2 = 10.",
                        hints: [
                            "Hãy tính phần dư của 12 khi chia cho 5.",
                            "12 % 5 bằng 2, nên điều kiện 12 % 5 == 0 là False.",
                            "Chương trình đi vào nhánh else và thực hiện a = 12 - 2."
                        ]
                    }
                ]
            }
        ];

        const app = {
            quizzes: [],
            stats: { attempts: 0, totalScore: 0 },
            editingQuizId: null,
            editorQuestions: [],
            activeQuiz: null,
            examQuestions: [],
            userAnswers: {},
            flaggedQuestions: new Set(),
            currentQIndex: 0,
            hintIndex: {},
            history: [],
            historyOnlyCompleted: false,
            timerSeconds: 0,
            timerInterval: null,
            startTime: 0,
            questionNotes: {},

            isNoteOpen: false,
            telegramTrackingEnabled: true,
            telegramReportInterval: null,
            trackingSessionId: null,
            notificationPollInterval: null,
            activeTeacherNotification: null,
            seenTeacherNotificationIds: new Set(),

            async pollTeacherNotifications() {
                if (!this.activeQuiz || !this.trackingSessionId ||
                    document.getElementById('view-exam')?.classList.contains('hidden')) return;
                try {
                    const url = `/api/notifications?action=poll&sessionId=${encodeURIComponent(this.trackingSessionId)}&t=${Date.now()}`;
                    const response = await fetch(url, { cache: 'no-store' });
                    if (!response.ok) return;
                    const result = await response.json();
                    if (!result.ok || !Array.isArray(result.notifications)) return;
                    for (const notification of result.notifications) {
                        if (!notification || !notification.id || this.seenTeacherNotificationIds.has(notification.id)) continue;
                        this.showTeacherNotification(notification);
                        break;
                    }
                } catch (err) {
                    console.warn('Không tải được thông báo từ giáo viên:', err);
                }
            },

            showTeacherNotification(notification) {
                if (this.activeTeacherNotification) return;
                this.activeTeacherNotification = notification;
                const modal = document.getElementById('teacher-notification-modal');
                document.getElementById('teacher-notification-message').textContent = notification.message || '';
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                document.getElementById('teacher-notification-ack').onclick = async () => {
                    const button = document.getElementById('teacher-notification-ack');
                    button.disabled = true;
                    button.textContent = 'Đang xác nhận...';
                    try {
                        const response = await fetch('/api/notifications', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'ack',
                                sessionId: this.trackingSessionId,
                                notificationId: notification.id
                            })
                        });
                        if (!response.ok) throw new Error('Không xác nhận được');
                        this.seenTeacherNotificationIds.add(notification.id);
                        try {
                            const key = `quizmaster_seen_notifications_${this.trackingSessionId}`;
                            const seen = JSON.parse(localStorage.getItem(key) || '[]');
                            if (!seen.includes(notification.id)) seen.push(notification.id);
                            localStorage.setItem(key, JSON.stringify(seen.slice(-100)));
                        } catch (_) {}
                    } catch (err) {
                        console.warn('Không gửi được xác nhận đã đọc:', err);
                    } finally {
                        modal.classList.add('hidden');
                        modal.classList.remove('flex');
                        this.activeTeacherNotification = null;
                        button.disabled = false;
                        button.textContent = 'Đã hiểu';
                        setTimeout(() => this.pollTeacherNotifications(), 250);
                    }
                };
            },

            startTeacherNotificationPolling() {
                if (this.notificationPollInterval) clearInterval(this.notificationPollInterval);
                this.notificationPollInterval = setInterval(() => this.pollTeacherNotifications(), 4000);
                try {
                    const key = `quizmaster_seen_notifications_${this.trackingSessionId}`;
                    this.seenTeacherNotificationIds = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
                } catch (_) {
                    this.seenTeacherNotificationIds = new Set();
                }
                this.pollTeacherNotifications();
            },

            async trackProgress(eventType, actionDetail) {
                if (!this.activeQuiz) return;
                const answers = {};
                for (const [idx, value] of Object.entries(this.userAnswers || {})) {
                    answers[Number(idx) + 1] = String.fromCharCode(65 + Number(value));
                }
                const answerSheet = Object.keys(answers).length
                    ? Object.keys(answers).sort((a, b) => Number(a) - Number(b))
                        .map(n => `Câu ${n}: ${answers[n]}`).join(' | ')
                    : 'Chưa chọn câu nào';
                let correctCount = 0;
                const answerResults = {};
                for (const [idx, value] of Object.entries(this.userAnswers || {})) {
                    const q = this.examQuestions[Number(idx)];
                    const isCorrect = !!q && Number(value) === Number(q.correct);
                    if (isCorrect) correctCount++;
                    answerResults[String(Number(idx) + 1)] = {
                        selected: String.fromCharCode(65 + Number(value)),
                        isCorrect
                    };
                }
                const seconds = Math.max(0, Number(this.timerSeconds) || 0);
                const payload = {
                    sessionId: this.trackingSessionId || (this.trackingSessionId = (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`)),
                    eventType,
                    elapsedSeconds: this.startTime ? Math.max(0, Math.floor((Date.now() - this.startTime) / 1000)) : 0,
                    durationMinutes: Number(this.activeQuiz.duration) || 0,
                    playerName: this.playerName || 'Ẩn danh',
                    quizCode: this.activeQuiz.code || 'QUIZ',
                    quizTitle: this.activeQuiz.title || 'Đề thi',
                    currentQuestion: this.currentQIndex + 1,
                    totalQuestions: this.examQuestions.length,
                    actionDetail: actionDetail || 'Cập nhật tiến độ',
                    answeredCount: Object.keys(this.userAnswers || {}).length,
                    correctCount,
                    answerSheet,
                    answerResults,
                    timeLeft: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
                };
                try {
                    const response = await fetch('/api/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) console.warn('Telegram tracking API lỗi:', response.status);
                } catch (err) {
                    console.warn('Không gửi được tiến độ Telegram:', err);
                }
            },


            async init() {
                const savedStats = localStorage.getItem(STATS_KEY);
                if (savedStats) { try { this.stats = JSON.parse(savedStats); } catch (e) {} }
                try { this.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); if (!Array.isArray(this.history)) this.history = []; } catch (e) { this.history = []; }
                await this.reloadServerQuizzes(false);
                this.checkUrlSharedQuiz();
                const lessonQuiz = new URLSearchParams(window.location.search).get('quiz');
                if (lessonQuiz && /^de-(?:[1-9]|1[0-4])\.json$/.test(lessonQuiz)) {
                    try {
                        const [quiz] = await window.quizRepository.loadFile(lessonQuiz);
                        if (quiz && Array.isArray(quiz.questions)) {
                            if (!this.quizzes.some(q => q.id === quiz.id)) this.quizzes.push(quiz);
                            this.startQuiz(quiz.id);
                        }
                    } catch (error) { alert('Chưa tải được đề bài học. Bạn có thể chọn đề trong kho đề.'); }
                }

                window.addEventListener('keydown', (e) => {
                    if (document.getElementById('view-exam').classList.contains('hidden')) return;
                    if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;

                    const key = e.key.toUpperCase();
                    if (/^[A-Z]$/.test(key) && this.examQuestions[this.currentQIndex]?.options && key.charCodeAt(0) - 65 < this.examQuestions[this.currentQIndex].options.length) {
                        this.selectOption(key.charCodeAt(0) - 65);
                    } else if (e.key === 'ArrowRight') {
                        this.nextQuestion();
                    } else if (e.key === 'ArrowLeft') {
                        this.prevQuestion();
                    }
                });

                const box = document.getElementById('floating-note-box');
                const header = document.getElementById('note-header-drag');
                let isDragging = false, startX, startY, initialX, initialY;

                header.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    const rect = box.getBoundingClientRect();
                    initialX = rect.left;
                    initialY = rect.top;
                    box.style.right = 'auto';
                    box.style.left = initialX + 'px';
                    box.style.top = initialY + 'px';
                    e.preventDefault();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    box.style.left = (initialX + e.clientX - startX) + 'px';
                    box.style.top = (initialY + e.clientY - startY) + 'px';
                });

                document.addEventListener('mouseup', () => { isDragging = false; });
            },

            openPythonRunner() {
                document.getElementById('modal-python-runner').classList.replace('hidden', 'flex');
                const q = this.examQuestions[this.currentQIndex];
                const codeInput = document.getElementById('py-code-input');
                if (q && (q.text.includes('\n') || q.text.includes('='))) {
                    const lines = q.text.split('\n');
                    const codeLines = lines.filter(l => !l.toLowerCase().includes('cho đoạn chương trình') && !l.toLowerCase().includes('kết quả in ra'));
                    codeInput.value = codeLines.join('\n').trim();
                } else {
                    codeInput.value = 'print("Xin chào từ Em Bô!")';
                }
                document.getElementById('py-output').textContent = '';
                document.getElementById('py-stdin').value = '';
            },

            closePythonRunner() {
                document.getElementById('modal-python-runner').classList.replace('flex', 'hidden');
            },

            runPythonCode() {
                const code = document.getElementById('py-code-input').value;
                const outputEl = document.getElementById('py-output');
                const stdinStr = document.getElementById('py-stdin').value;
                
                outputEl.textContent = 'Đang chạy...\n';
                const inputLines = stdinStr.split('\n');
                let inputCursor = 0;

                Sk.configure({
                    output: function(text) { outputEl.textContent += text; },
                    read: function(x) {
                        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
                            throw "File not found: '" + x + "'";
                        return Sk.builtinFiles["files"][x];
                    },
                    inputfun: function(promptStr) {
                        return new Promise((resolve) => {
                            if (inputCursor < inputLines.length && inputLines[inputCursor] !== undefined) {
                                resolve(inputLines[inputCursor++]);
                            } else {
                                const val = prompt(promptStr || 'Nhập input cho Python:');
                                resolve(val !== null ? val : '');
                            }
                        });
                    },
                    execLimit: 5000
                });

                Sk.misceval.asyncToPromise(() => {
                    outputEl.textContent = '';
                    return Sk.importMainWithBody("<stdin>", false, code, true);
                }).then(() => {}, (err) => {
                    outputEl.textContent += '\n[LỖI] ' + err.toString();
                });
            },

            saveProgress() {
                if (!this.activeQuiz) return;
                const progress = {
                    quizId: this.activeQuiz.id,
                    trackingSessionId: this.trackingSessionId,
                    playerName: this.playerName,
                    examQuestions: this.examQuestions,
                    userAnswers: this.userAnswers,
                    flaggedQuestions: Array.from(this.flaggedQuestions),
                    questionNotes: this.questionNotes,
                    hintIndex: this.hintIndex,
                    currentQIndex: this.currentQIndex,
                    timerSeconds: this.timerSeconds,
                    startTime: this.startTime
                };
                localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
            },

            checkSavedProgress() {
                const saved = localStorage.getItem(PROGRESS_KEY);
                const banner = document.getElementById('resume-banner');
                if (saved && banner) {
                    try {
                        const p = JSON.parse(saved);
                        const q = this.quizzes.find(item => item.id === p.quizId);
                        if (q) {
                            document.getElementById('resume-quiz-title').textContent = `${q.code || 'QUIZ'} — ${q.title}`;
                            banner.classList.remove('hidden');
                            banner.classList.add('flex');
                            return;
                        }
                    } catch(e) {}
                }
                if (banner) {
                    banner.classList.add('hidden');
                    banner.classList.remove('flex');
                }
            },

            resumeQuiz() {
                const saved = localStorage.getItem(PROGRESS_KEY);
                if (!saved) return;
                try {
                    const progress = JSON.parse(saved);
                    const quiz = this.quizzes.find(q => q.id === progress.quizId);
                    if (!quiz) return;

                    this.playerName = progress.playerName;
                    this.trackingSessionId = progress.trackingSessionId || null;
                    this.activeQuiz = quiz;
                    this.examQuestions = progress.examQuestions;
                    this.userAnswers = progress.userAnswers || {};
                    this.flaggedQuestions = new Set(progress.flaggedQuestions || []);
                    this.questionNotes = progress.questionNotes || {};
                    this.hintIndex = progress.hintIndex || {};
                    this.currentQIndex = progress.currentQIndex || 0;
                    this.timerSeconds = progress.timerSeconds;
                    this.startTime = progress.startTime;

                    document.getElementById('exam-quiz-title').textContent = `${quiz.code || 'QUIZ'} — ${quiz.title}`;
                    this.showView('exam');
                    this.renderExamQuestion();
                    this.startTimer();
                    this.updateNoteButtonLabel();
                    this.trackProgress('START', 'Bắt đầu làm bài (Tiếp tục)');
                    this.startTeacherNotificationPolling();
                    if (this.telegramTrackingEnabled) {
                        this.telegramReportInterval = setInterval(() => {
                            this.trackProgress('PERIODIC', 'Báo cáo tiến độ định kỳ mỗi phút');
                        }, 60000);
                    }
                } catch(e) {
                    this.clearProgressAndHide();
                }
            },

            clearProgressAndHide() {
                localStorage.removeItem(PROGRESS_KEY);
                this.checkSavedProgress();
            },

            toggleNoteModal() {
                const box = document.getElementById('floating-note-box');
                this.isNoteOpen = !this.isNoteOpen;
                if (this.isNoteOpen) {
                    box.classList.remove('hidden');
                    document.getElementById('floating-note-textarea').focus();
                } else {
                    box.classList.add('hidden');
                }
                this.updateNoteButtonLabel();
            },

            updateNoteButtonLabel() {
                const count = Object.keys(this.questionNotes).length;
                const label = document.getElementById('note-btn-label');
                if (label) {
                    label.textContent = count > 0 ? `Note (${count})` : `Note (0)`;
                }
            },

            saveCurrentNote(val) {
                if (val.trim() === '') delete this.questionNotes[this.currentQIndex];
                else this.questionNotes[this.currentQIndex] = val;
                document.getElementById('note-char-count').textContent = `${val.length} ký tự`;
                const statusEl = document.getElementById('note-save-status');
                if (statusEl) {
                    statusEl.textContent = 'Đang lưu...';
                    setTimeout(() => { statusEl.textContent = 'Đã lưu'; }, 400);
                }
                this.updateNoteButtonLabel();
            },

            async reloadServerQuizzes(showAlert = true) {
                const statusEl = document.getElementById('sync-status');
                if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Đang tải...';

                const saved = localStorage.getItem(STORAGE_KEY);
                let localQuizzes = [];
                if (saved) { try { localQuizzes = JSON.parse(saved).filter(q => !q.isServer); } catch (e) {} }

                let serverQuizzes = [];
                try {
                    serverQuizzes = (await window.quizRepository.loadAll()).map(q => ({...q,isServer:true}));
                } catch (error) { console.warn('Không tải được kho đề:', error); }
                const serverKeys = new Set(serverQuizzes.map(q => q.id || q.code));
                this.quizzes = [...serverQuizzes, ...localQuizzes.filter(q => !serverKeys.has(q.id) && !serverKeys.has(q.code))];
                if (this.quizzes.length === 0) this.quizzes = DEFAULT_QUIZZES;
                this.saveToStorage();
                this.renderDashboard();

                if (statusEl) {
                    statusEl.innerHTML = serverQuizzes.length > 0 ? `<i class="fa-solid fa-check mr-1"></i>Đã đồng bộ ${serverQuizzes.length} đề` : `Chế độ mặc định`;
                }
            },

            saveToStorage() {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.quizzes));
                localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
            },

            showView(viewName) {
                ['dashboard', 'editor', 'exam', 'result'].forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
                document.getElementById(`view-${viewName}`).classList.remove('hidden');
                if (viewName !== 'exam' && this.timerInterval) clearInterval(this.timerInterval);
                if (viewName === 'dashboard') this.renderDashboard();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },

            renderDashboard() {
                const query = (document.getElementById('search-quiz')?.value || '').toLowerCase();
                const grid = document.getElementById('quiz-grid');

                const totalQ = this.quizzes.reduce((sum, q) => sum + (q.questions ? q.questions.length : 0), 0);
                document.getElementById('stat-total-quizzes').textContent = this.quizzes.length;
                document.getElementById('stat-total-questions').textContent = totalQ;
                document.getElementById('stat-total-attempts').textContent = this.stats.attempts;
                document.getElementById('stat-avg-score').textContent = this.stats.attempts ? (this.stats.totalScore / this.stats.attempts).toFixed(1) : '0.0';

                const filtered = this.quizzes.filter(q => (q.title || '').toLowerCase().includes(query) || (q.code && q.code.toLowerCase().includes(query)));

                grid.innerHTML = filtered.map(q => this.renderQuizCard(q)).join('');

                if (!filtered.length) grid.innerHTML = '<div class="col-span-full border border-zinc-200 p-8 text-center text-sm text-zinc-500">Không tìm thấy bộ đề phù hợp.</div>';
                this.renderHistory();
                this.checkSavedProgress();
            },

            renderQuizCard(q) {
                    const attempts = this.history.filter(h => h.quizId === q.id || (h.quizCode && h.quizCode === (q.code || 'QUIZ')));
                    const latest = attempts[0];
                    const completionBadge = latest
                        ? `<span class="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase"><i class="fa-solid fa-check-circle"></i> Đã làm ${attempts.length} lần</span>`
                        : `<span class="inline-flex items-center gap-1 px-2 py-1 bg-zinc-50 border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase"><i class="fa-regular fa-circle"></i> Chưa làm</span>`;
                    return `
                    <div class="bg-white border border-zinc-200 p-7 hover:border-zinc-900 transition flex flex-col justify-between group">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
                                <span class="px-2.5 py-1 bg-zinc-100 text-zinc-900 font-mono text-[11px] font-bold">#${this.escapeHtml(q.code || 'QUIZ')}</span>
                                <span class="text-xs text-zinc-400"><i class="fa-regular fa-clock mr-1"></i>${q.duration || 45}p • ${(q.questions || []).length} câu</span>
                            </div>
                            <div class="mb-3">${completionBadge}</div>
                            ${latest ? `<p class="text-xs text-zinc-500 mb-2">Lần gần nhất: <strong class="text-zinc-800">${latest.score}/10 điểm</strong> · ${this.escapeHtml(latest.dateLabel || '')}</p>` : ''}
                            <h4 class="font-bold text-lg text-zinc-900 line-clamp-1 group-hover:underline">${this.escapeHtml(q.title)}</h4>
                            <p class="text-xs text-zinc-500 mt-2 line-clamp-2">${this.escapeHtml(q.desc || '')}</p>
                        </div>
                        <div class="pt-5 mt-6 border-t border-zinc-100 flex items-center justify-between gap-2">
                            <button onclick="app.startQuiz('${q.id}')" class="flex-1 py-2.5 px-4 bg-[#212326] hover:bg-black text-white text-[11px] font-bold uppercase tracking-[0.15em] transition">Vào Thi</button>
                            <button onclick="app.openShareModal('${q.id}')" class="w-9 h-9 border border-zinc-200 text-zinc-600 hover:border-zinc-900 text-xs"><i class="fa-solid fa-share-nodes"></i></button>
                            <button onclick="app.openEditQuiz('${q.id}')" class="w-9 h-9 border border-zinc-200 text-zinc-600 hover:border-zinc-900 text-xs"><i class="fa-solid fa-pen"></i></button>
                        </div>
                    </div>
                `;
            },

            renderHistory() {
                const container = document.getElementById('quiz-history-list');
                if (!container) return;
                const records = this.historyOnlyCompleted ? this.history.filter(h => h.score !== null) : this.history;
                if (!records.length) {
                    container.innerHTML = `<div class="border border-dashed border-zinc-300 p-8 text-center"><i class="fa-regular fa-clock text-2xl text-zinc-300 mb-3"></i><p class="text-sm font-semibold text-zinc-700">${this.historyOnlyCompleted ? 'Chưa có lượt làm bài hoàn thành.' : 'Bạn chưa có lịch sử làm bài.'}</p><p class="text-xs text-zinc-500 mt-1">Sau khi nộp đề, điểm số và thời gian sẽ xuất hiện tại đây.</p></div>`;
                    return;
                }
                container.innerHTML = records.slice(0, 30).map((h, idx) => `
                    <div class="bg-white border border-zinc-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                        <div class="flex items-start gap-3 min-w-0">
                            <div class="w-10 h-10 shrink-0 flex items-center justify-center bg-zinc-100 text-zinc-700"><i class="fa-solid fa-file-lines"></i></div>
                            <div class="min-w-0">
                                <div class="font-bold text-sm text-zinc-900">${this.escapeHtml(h.quizTitle || h.quizCode || 'Đề thi')}</div>
                                <div class="text-xs text-zinc-500 mt-1">#${this.escapeHtml(h.quizCode || 'QUIZ')} · ${this.escapeHtml(h.dateLabel || '')} · ${this.escapeHtml(h.playerName || 'Ẩn danh')}</div>
                                <div class="text-xs text-zinc-500 mt-1">${h.correct}/${h.total} câu đúng · Thời gian ${this.escapeHtml(h.timeSpent || '--:--')}</div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between sm:justify-end gap-4">
                            <div class="text-right"><div class="text-xl font-extrabold text-zinc-900">${this.escapeHtml(String(h.score))}<span class="text-xs font-medium text-zinc-400">/10</span></div><div class="text-[10px] uppercase tracking-wider ${Number(h.score) >= 5 ? 'text-emerald-700' : 'text-rose-700'}">${Number(h.score) >= 5 ? 'Đạt 5 điểm' : 'Cần ôn tập'}</div></div>
                            <button onclick="app.removeHistoryEntry('${h.id}')" title="Xóa lượt làm này" class="w-9 h-9 border border-zinc-200 text-zinc-500 hover:text-rose-700 hover:border-rose-300"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </div>`).join('');
            },

            toggleHistoryFilter() {
                this.historyOnlyCompleted = !this.historyOnlyCompleted;
                const btn = document.getElementById('history-filter-btn');
                if (btn) btn.textContent = this.historyOnlyCompleted ? 'Chỉ lượt hoàn thành' : 'Tất cả lượt làm';
                this.renderHistory();
            },

            removeHistoryEntry(id) {
                if (!confirm('Xóa lượt làm này khỏi lịch sử?')) return;
                this.history = this.history.filter(h => h.id !== id);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
                this.renderDashboard();
            },

            clearHistory() {
                if (!this.history.length) return alert('Lịch sử đang trống.');
                if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử làm bài trên trình duyệt này?')) return;
                this.history = [];
                localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
                this.renderDashboard();
            },

            joinByCode() {
                const raw = document.getElementById('join-code-input').value.trim();
                if (!raw) return alert('Vui lòng nhập Mã Đề!');
                const found = this.quizzes.find(q => (q.code || '').toUpperCase() === raw.toUpperCase());
                if (found) this.startQuiz(found.id);
                else alert('Không tìm thấy mã đề "' + raw + '"!');
            },

            openCreateQuiz() {
                this.editingQuizId = null;
                document.getElementById('editor-page-title').textContent = 'Tạo Bộ Đề Mới';
                document.getElementById('edit-title').value = '';
                document.getElementById('edit-code').value = 'PY-' + Math.floor(100 + Math.random() * 900);
                document.getElementById('edit-duration').value = 45;
                document.getElementById('edit-desc').value = '';
                this.editorQuestions = [{ text: '', options: ['', '', '', ''], correct: 0, explain: '' }];
                this.renderEditorQuestions();
                this.showView('editor');
            },

            openEditQuiz(id) {
                const q = this.quizzes.find(item => item.id === id);
                if (!q) return;
                this.editingQuizId = q.id;
                document.getElementById('edit-title').value = q.title;
                document.getElementById('edit-code').value = q.code || '';
                document.getElementById('edit-duration').value = q.duration || 45;
                document.getElementById('edit-desc').value = q.desc || '';
                this.editorQuestions = JSON.parse(JSON.stringify(q.questions));
                this.renderEditorQuestions();
                this.showView('editor');
            },

            renderEditorQuestions() {
                document.getElementById('editor-questions-list').innerHTML = this.editorQuestions.map((q, idx) => {
                    if (!Array.isArray(q.options)) q.options = ['', '', '', ''];
                    return `
                        <div class="bg-white p-6 border border-zinc-200 space-y-4">
                            <div class="flex items-center justify-between">
                                <span class="px-3 py-1 bg-zinc-900 text-white font-bold text-xs uppercase">Câu hỏi ${idx + 1}</span>
                                <div class="flex items-center gap-3">
                                    <button onclick="app.addEditorOption(${idx})" class="text-xs text-emerald-600 font-semibold hover:underline">+ Thêm đáp án</button>
                                    <button onclick="app.removeEditorQuestion(${idx})" class="text-xs text-rose-600 font-semibold hover:underline">Xóa câu</button>
                                </div>
                            </div>
                            <textarea oninput="app.editorQuestions[${idx}].text = this.value" rows="3" class="w-full p-3 border border-zinc-300 text-sm font-mono">${this.escapeHtml(q.text)}</textarea>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${q.options.map((optText, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    return `
                                        <div class="flex items-center gap-2">
                                            <input type="radio" name="correct-${idx}" ${q.correct === optIdx ? 'checked' : ''} onchange="app.editorQuestions[${idx}].correct = ${optIdx}" title="Chọn làm đáp án đúng">
                                            <span class="text-xs font-bold w-4">${letter}.</span>
                                            <input type="text" value="${this.escapeHtml(optText || '')}" oninput="app.editorQuestions[${idx}].options[${optIdx}] = this.value" class="flex-1 px-3 py-2 border border-zinc-300 text-sm" placeholder="Nội dung đáp án...">
                                            ${q.options.length > 2 ? `<button onclick="app.removeEditorOption(${idx}, ${optIdx})" class="text-zinc-400 hover:text-rose-600 px-1 text-xs" title="Xóa đáp án này">×</button>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>

                            <input type="text" value="${this.escapeHtml(q.explain || '')}" oninput="app.editorQuestions[${idx}].explain = this.value" placeholder="Giải thích chi tiết đáp án..." class="w-full px-3.5 py-2 border border-zinc-200 bg-zinc-50 text-xs">
                        </div>
                    `;
                }).join('');
            },

            addEditorOption(questionIndex) {
                const q = this.editorQuestions[questionIndex];
                if (!q) return;
                if (!Array.isArray(q.options)) q.options = ['', '', '', ''];
                if (q.options.length >= 26) return alert('Mỗi câu tối đa 26 đáp án (A-Z).');
                q.options.push('');
                this.renderEditorQuestions();
            },

            removeEditorOption(questionIndex, optionIndex) {
                const q = this.editorQuestions[questionIndex];
                if (!q || !Array.isArray(q.options)) return;
                if (q.options.length <= 2) return alert('Mỗi câu cần có ít nhất 2 đáp án.');
                q.options.splice(optionIndex, 1);
                if (q.correct === optionIndex) q.correct = 0;
                else if (q.correct > optionIndex) q.correct--;
                this.renderEditorQuestions();
            },

            addEmptyQuestion() {
                this.editorQuestions.push({ text: '', options: ['', '', '', ''], correct: 0, explain: '' });
                this.renderEditorQuestions();
            },

            removeEditorQuestion(idx) {
                if (this.editorQuestions.length <= 1) return alert('Ít nhất 1 câu!');
                this.editorQuestions.splice(idx, 1);
                this.renderEditorQuestions();
            },

            saveQuiz() {
                const title = document.getElementById('edit-title').value.trim();
                const code = document.getElementById('edit-code').value.trim().toUpperCase() || 'PY-01';
                const duration = parseInt(document.getElementById('edit-duration').value) || 45;
                const desc = document.getElementById('edit-desc').value.trim();
                if (!title) return alert('Nhập tên đề!');
                const validQuestions = this.editorQuestions.filter(q => q.text.trim() !== '');

                let targetId = this.editingQuizId || ('q-' + Date.now());
                const quizObj = { id: targetId, code, title, desc, duration, isServer: false, questions: validQuestions };
                const idx = this.quizzes.findIndex(q => q.id === targetId);
                if (idx > -1) this.quizzes[idx] = quizObj;
                else this.quizzes.unshift(quizObj);

                this.saveToStorage();
                this.showView('dashboard');
                this.openShareModal(targetId);
            },

            openShareModal(id) {
                const q = this.quizzes.find(item => item.id === id);
                if (!q) return;
                const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(q))));
                document.getElementById('share-url-input').value = `${window.location.origin}${window.location.pathname}#share=${base64}`;
                document.getElementById('btn-download-json').onclick = () => {
                    const blob = new Blob([JSON.stringify(q, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${(q.code || 'quiz').toLowerCase()}.json`;
                    a.click();
                };
                document.getElementById('modal-share').classList.remove('hidden');
                document.getElementById('modal-share').classList.add('flex');
            },

            closeModal(id) { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); },

            copyShareLink() {
                const input = document.getElementById('share-url-input');
                input.select();
                navigator.clipboard.writeText(input.value);
                alert('Đã copy Link!');
            },

            checkUrlSharedQuiz() {
                if (window.location.hash.startsWith('#share=')) {
                    try {
                        const shared = JSON.parse(decodeURIComponent(escape(atob(window.location.hash.substring(7)))));
                        if (!this.quizzes.some(q => q.id === shared.id)) {
                            this.quizzes.unshift(shared);
                            this.saveToStorage();
                        }
                        this.startQuiz(shared.id);
                    } catch (e) {}
                    history.replaceState(null, null, window.location.pathname);
                }
            },

            importQuizJSON(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        (Array.isArray(data) ? data : [data]).forEach((item, idx) => {
                            item.id = item.id || ('q-' + Date.now() + idx);
                            this.quizzes.unshift(item);
                        });
                        this.saveToStorage();
                        this.renderDashboard();
                        alert('Nhập JSON thành công!');
                    } catch (err) { alert('File không hợp lệ!'); }
                };
                reader.readAsText(file);
            },

            startQuiz(id, customQuestions = null) {
                const quiz = this.quizzes.find(q => q.id === id);
                if (!quiz) return;

                const savedProgress = localStorage.getItem(PROGRESS_KEY);
                if (savedProgress && !customQuestions) {
                    try {
                        const p = JSON.parse(savedProgress);
                        if (p.quizId === id) {
                            if (confirm('Bạn đang có bài làm dang dở ở đề này. Bạn muốn tiếp tục bài làm cũ chứ? (Bấm OK để tiếp tục, bấm Cancel để làm lại từ đầu)')) {
                                this.resumeQuiz();
                                return;
                            } else {
                                this.clearProgressAndHide();
                            }
                        }
                    } catch(e) {}
                }

                this.pendingQuizId = id;
                this.pendingCustomQuestions = customQuestions;
                
                const savedName = localStorage.getItem('qm_player_name') || '';
                document.getElementById('custom-player-name-input').value = savedName;
                document.getElementById('modal-player-name').classList.remove('hidden');
                document.getElementById('modal-player-name').classList.add('flex');
                setTimeout(() => document.getElementById('custom-player-name-input').focus(), 100);
            },

            closeNameModal(isConfirmed) {
                const modal = document.getElementById('modal-player-name');
                modal.classList.replace('flex', 'hidden');
                if (!isConfirmed) return;

                this.telegramTrackingEnabled = true;
                if (this.telegramReportInterval) clearInterval(this.telegramReportInterval);
                this.telegramReportInterval = null;
                this.playerName = document.getElementById('custom-player-name-input').value.trim() || 'Thí sinh ẩn danh';
                this.trackingSessionId = (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
                localStorage.setItem('qm_player_name', this.playerName);

                const quiz = this.quizzes.find(q => q.id === this.pendingQuizId);
                if (!quiz) return;

                this.activeQuiz = quiz;
                this.examQuestions = (this.pendingCustomQuestions || JSON.parse(JSON.stringify(quiz.questions || []))).map(q => {
                    const item = { ...q };
                    if (!Array.isArray(item.options)) {
                        if (item.options && typeof item.options === 'object') {
                            item.options = Object.keys(item.options).sort().map(k => item.options[k]);
                        } else {
                            item.options = [];
                        }
                    }
                    if (typeof item.correct === 'string' && /^[A-Z]$/i.test(item.correct.trim())) {
                        item.correct = item.correct.trim().toUpperCase().charCodeAt(0) - 65;
                    } else if (typeof item.correct === 'string' && item.correct.trim() !== '' && !Number.isNaN(Number(item.correct))) {
                        item.correct = Number(item.correct);
                    }
                    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length) item.correct = 0;
                    item.text = item.text ?? item.question ?? '';
                    item.explain = item.explain ?? item.explanation ?? '';
                    return item;
                });
                this.userAnswers = {};
                this.flaggedQuestions = new Set();
                this.questionNotes = {};
                this.hintIndex = {};
                this.currentQIndex = 0;
                this.timerSeconds = (quiz.duration || 45) * 60;
                this.startTime = Date.now();

                document.getElementById('exam-quiz-title').textContent = `${quiz.code || 'QUIZ'} — ${quiz.title}`;
                this.showView('exam');
                this.renderExamQuestion();
                this.startTimer();
                this.updateNoteButtonLabel();
                this.trackProgress('START', 'Bắt đầu làm bài thi');
                this.startTeacherNotificationPolling();
                if (this.telegramTrackingEnabled) {
                    this.telegramReportInterval = setInterval(() => {
                        this.trackProgress('PERIODIC', 'Báo cáo tiến độ định kỳ mỗi phút');
                    }, 60000);
                }
            },

            shuffleActiveExam() {
                if (!confirm('Đảo thứ tự câu hỏi? Các câu trả lời sẽ được làm mới.')) return;
                const shuffled = [...this.examQuestions].sort(() => Math.random() - 0.5);
                this.startQuiz(this.activeQuiz.id, shuffled);
            },

            startTimer() {
                if (this.timerInterval) clearInterval(this.timerInterval);
                const updateDisplay = () => {
                    const m = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
                    const s = String(this.timerSeconds % 60).padStart(2, '0');
                    document.getElementById('exam-timer').textContent = `${m}:${s}`;
                };
                updateDisplay();
                this.timerInterval = setInterval(() => {
                    this.timerSeconds--;
                    updateDisplay();
                    this.saveProgress();

                    if (this.timerSeconds <= 0) {
                        clearInterval(this.timerInterval);
                        alert('Hết giờ làm bài!');
                        this.submitExam(true);
                    }
                }, 1000);
            },

            showNextHint() {
                const q = this.examQuestions[this.currentQIndex];
                const hints = Array.isArray(q?.hints) ? q.hints.filter(h => typeof h === 'string' && h.trim()) : [];
                if (!hints.length) return;

                const key = String(this.currentQIndex);
                const shown = Math.min(Number(this.hintIndex[key] || 0), hints.length);
                if (shown >= hints.length) return;

                this.hintIndex[key] = shown + 1;
                this.renderHintPanel(q);
                this.saveProgress();
                this.trackProgress('HINT', `Đã mở gợi ý số ${shown + 1} cho <b>Câu ${this.currentQIndex + 1}</b>`);
            },

            renderHintPanel(q) {
                const section = document.getElementById('hint-section');
                const content = document.getElementById('hint-content');
                const counter = document.getElementById('hint-counter');
                const button = document.getElementById('hint-next-btn');
                if (!section || !content || !counter || !button) return;

                const hints = Array.isArray(q?.hints) ? q.hints.filter(h => typeof h === 'string' && h.trim()) : [];
                const shown = Math.min(Number(this.hintIndex[String(this.currentQIndex)] || 0), hints.length);
                content.replaceChildren();

                if (!hints.length) {
                    section.classList.add('hidden');
                    return;
                }

                section.classList.remove('hidden');
                for (let i = 0; i < shown; i++) {
                    const item = document.createElement('div');
                    item.className = 'border-l-2 border-zinc-400 pl-3 py-1 mt-2';
                    const title = document.createElement('div');
                    title.className = 'text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1';
                    title.textContent = `Gợi ý ${i + 1}`;
                    const body = document.createElement('div');
                    body.className = 'whitespace-pre-wrap';
                    body.textContent = hints[i];
                    item.append(title, body);
                    content.appendChild(item);
                }

                counter.textContent = `${shown}/${hints.length} gợi ý`;
                button.disabled = shown >= hints.length;
                button.classList.toggle('opacity-50', shown >= hints.length);
                button.classList.toggle('cursor-not-allowed', shown >= hints.length);
                button.innerHTML = shown >= hints.length
                    ? 'Đã xem hết gợi ý'
                    : '<i class="fa-regular fa-lightbulb mr-1"></i> Xem gợi ý tiếp theo';
            },

            renderExamQuestion() {
                const q = this.examQuestions[this.currentQIndex];
                if (!q) {
                    document.getElementById('exam-question-text').textContent = 'Không tìm thấy câu hỏi.';
                    document.getElementById('exam-options-list').innerHTML = '';
                    document.getElementById('hint-section')?.classList.add('hidden');
                    return;
                }
                if (!Array.isArray(q.options)) q.options = [];
                const total = this.examQuestions.length;
                this.renderHintPanel(q);

                document.getElementById('exam-question-counter').textContent = `Câu hỏi ${this.currentQIndex + 1} / ${total}`;
                
                const textEl = document.getElementById('exam-question-text');
                if (q.text.includes('\n') || q.text.includes('=') || q.text.includes('print')) {
                    textEl.innerHTML = `<pre class="code-box"><code class="language-python">${this.escapeHtml(q.text)}</code></pre>`;
                } else {
                    textEl.innerHTML = `<div class="preserve-space">${this.escapeHtml(q.text)}</div>`;
                }

                const isFlagged = this.flaggedQuestions.has(this.currentQIndex);
                document.getElementById('exam-flag-btn').className = isFlagged 
                    ? 'px-4 py-2 border border-amber-500 bg-amber-50 text-xs font-bold text-amber-800'
                    : 'px-4 py-2 border border-zinc-200 text-xs font-semibold text-zinc-600 hover:border-zinc-900';

                const selected = this.userAnswers[this.currentQIndex];
                document.getElementById('exam-options-list').innerHTML = q.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const active = selected === idx;
                    return `
                        <div onclick="app.selectOption(${idx})" class="p-4 border cursor-pointer transition flex items-center gap-4 ${
                            active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-900 bg-white text-zinc-800'
                        }">
                            <div class="w-8 h-8 flex items-center justify-center font-bold text-xs border ${
                                active ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-200 bg-zinc-100 text-zinc-800'
                            }">${letter}</div>
                            <div class="text-sm sm:text-base flex-1 preserve-space">${this.escapeHtml(opt)}</div>
                        </div>
                    `;
                }).join('');

                document.getElementById('exam-answered-count').textContent = `${Object.keys(this.userAnswers).length}/${total} đã chọn`;

                document.getElementById('exam-palette').innerHTML = this.examQuestions.map((_, idx) => {
                    const isCurrent = idx === this.currentQIndex;
                    const isAns = this.userAnswers[idx] !== undefined;
                    const isFlg = this.flaggedQuestions.has(idx);
                    let cls = 'bg-zinc-100 text-zinc-600 border-zinc-200';
                    if (isAns) cls = 'bg-zinc-900 text-white border-zinc-900';
                    if (isFlg) cls = 'bg-amber-400 text-zinc-900 border-amber-500';
                    if (isCurrent) cls += ' ring-2 ring-offset-1 ring-zinc-900';
                    return `<button onclick="app.jumpToQuestion(${idx})" class="h-9 border text-xs font-bold transition ${cls}">${idx + 1}</button>`;
                }).join('');

                document.getElementById('note-current-q-num').textContent = this.currentQIndex + 1;
                const textarea = document.getElementById('floating-note-textarea');
                if (textarea) {
                    textarea.value = this.questionNotes[this.currentQIndex] || '';
                    document.getElementById('note-char-count').textContent = `${textarea.value.length} ký tự`;
                }

                if (window.Prism) Prism.highlightAll();
            },

            selectOption(optIdx) {
                this.userAnswers[this.currentQIndex] = optIdx;
                this.renderExamQuestion();
                this.saveProgress();

                const q = this.examQuestions[this.currentQIndex];
                const pickedChar = String.fromCharCode(65 + optIdx);
                const rightChar = q ? String.fromCharCode(65 + q.correct) : '?';
                const isRight = q && optIdx === q.correct;

                this.trackProgress(
                    'SELECT_ANSWER',
                    `Chọn <b>${pickedChar}</b> ở <b>Câu ${this.currentQIndex + 1}</b> (${isRight ? '✅ ĐÚNG' : `❌ SAI - Đáp án chuẩn: ${rightChar}`})`
                );
            },

            toggleFlagCurrent() {
                const isNowFlagged = !this.flaggedQuestions.has(this.currentQIndex);
                if (isNowFlagged) {
                    this.flaggedQuestions.add(this.currentQIndex);
                } else {
                    this.flaggedQuestions.delete(this.currentQIndex);
                }
                this.renderExamQuestion();
                this.saveProgress();

                this.trackProgress(
                    'FLAG_QUESTION',
                    isNowFlagged 
                        ? `🚩 Đã <b>ĐÁNH DẤU XEM LẠI</b> ở <b>Câu ${this.currentQIndex + 1}</b>` 
                        : `🏳️ Đã <b>HỦY ĐÁNH DẤU</b> ở <b>Câu ${this.currentQIndex + 1}</b>`
                );
            },

            prevQuestion() { 
                if (this.currentQIndex > 0) { 
                    this.currentQIndex--; 
                    this.renderExamQuestion(); 
                    this.trackProgress('CHANGE_QUESTION', `Lùi về xem <b>Câu ${this.currentQIndex + 1}</b>`);
                } 
            },

            nextQuestion() { 
                if (this.currentQIndex < this.examQuestions.length - 1) { 
                    this.currentQIndex++; 
                    this.renderExamQuestion(); 
                    this.trackProgress('CHANGE_QUESTION', `Chuyển sang xem <b>Câu ${this.currentQIndex + 1}</b>`);
                } 
            },

            jumpToQuestion(idx) { 
                this.currentQIndex = idx; 
                this.renderExamQuestion(); 
                this.trackProgress('CHANGE_QUESTION', `Nhảy tới <b>Câu ${this.currentQIndex + 1}</b>`);
            },

            submitExam(auto = false) {
                const total = this.examQuestions.length;
                if (total === 0) return alert('Đề thi chưa có câu hỏi hợp lệ.');
                const answered = Object.keys(this.userAnswers).length;
                if (!auto && answered < total && !confirm(`Bạn mới làm ${answered}/${total} câu. Nộp bài sớm?`)) return;

                clearInterval(this.timerInterval);
                if (this.telegramReportInterval) clearInterval(this.telegramReportInterval);
                this.telegramReportInterval = null;
                localStorage.removeItem(PROGRESS_KEY);

                let correctCount = 0;
                const wrongQuestions = [];
                this.examQuestions.forEach((q, idx) => {
                    if (this.userAnswers[idx] === q.correct) correctCount++;
                    else wrongQuestions.push(q);
                });

                const score10 = ((correctCount / total) * 10).toFixed(1);
                const elapsedSec = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
                const elapsedStr = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

                this.trackProgress(
                    'SUBMIT',
                    `🎉 <b>ĐÃ NỘP BÀI!</b> Điểm: <b>${score10}/10</b> (${correctCount}/${total} câu đúng) - Thời gian: <b>${elapsedStr}</b>`
                );

                const now = new Date();
                const historyEntry = {
                    id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    quizId: this.activeQuiz?.id || '',
                    quizCode: this.activeQuiz?.code || 'QUIZ',
                    quizTitle: this.activeQuiz?.title || 'Đề thi',
                    playerName: this.playerName || 'Ẩn danh',
                    score: Number(score10),
                    correct: correctCount,
                    total,
                    timeSpent: elapsedStr,
                    timestamp: now.toISOString(),
                    dateLabel: now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                };
                this.history.unshift(historyEntry);
                this.history = this.history.slice(0, 200);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));

                fetch('/api/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerName: this.playerName || 'Ẩn danh', quizCode: this.activeQuiz?.code || 'QUIZ', score: score10, correct: correctCount, total, timeSpent: elapsedStr })
                }).catch(err => {});

                this.stats.attempts++;
                this.stats.totalScore += parseFloat(score10);
                this.saveToStorage();

                document.getElementById('result-quiz-title').textContent = this.activeQuiz?.title || '';
                document.getElementById('res-score').textContent = score10;
                document.getElementById('res-correct').textContent = correctCount;
                document.getElementById('res-wrong').textContent = total - correctCount;
                document.getElementById('res-time').textContent = elapsedStr;

                document.getElementById('btn-retry-wrong').style.display = wrongQuestions.length > 0 ? 'inline-block' : 'none';
                this.lastWrongQuestions = wrongQuestions;

                document.getElementById('result-review-list').innerHTML = this.examQuestions.map((q, idx) => {
                    const userAns = this.userAnswers[idx];
                    const isCorrect = userAns === q.correct;
                    return `
                        <div class="bg-white p-6 border ${isCorrect ? 'border-zinc-200' : 'border-rose-300'} shadow-sm space-y-3">
                            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 ${isCorrect ? 'bg-zinc-900 text-white' : 'bg-rose-600 text-white'}">Câu ${idx + 1}: ${isCorrect ? 'ĐÚNG' : 'SAI'}</span>
                            <div class="font-medium text-zinc-900 text-sm sm:text-base preserve-space">${this.escapeHtml(q.text)}</div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                ${q.options.map((opt, oIdx) => {
                                    let style = 'border-zinc-200 bg-zinc-50 text-zinc-700';
                                    if (oIdx === q.correct) style = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold';
                                    else if (oIdx === userAns && !isCorrect) style = 'border-rose-400 bg-rose-50 text-rose-900 line-through';
                                    return `<div class="p-3 border ${style} preserve-space">${String.fromCharCode(65 + oIdx)}. ${this.escapeHtml(opt)}</div>`;
                                }).join('')}
                            </div>
                            ${q.explain ? `<div class="text-xs text-zinc-600 bg-zinc-50 p-3.5 border border-zinc-200 preserve-space"><i class="fa-solid fa-lightbulb text-amber-500 mr-1"></i> <b>Giải thích:</b> ${this.escapeHtml(q.explain)}</div>` : ''}
                        </div>
                    `;
                }).join('');

                this.showView('result');
                if (this.isNoteOpen) this.toggleNoteModal();
            },

            retryCurrentQuiz(onlyWrong = false) {
                if (!this.activeQuiz) return;
                if (onlyWrong && this.lastWrongQuestions?.length > 0) {
                    this.startQuiz(this.activeQuiz.id, JSON.parse(JSON.stringify(this.lastWrongQuestions)));
                } else {
                    this.startQuiz(this.activeQuiz.id);
                }
            },

            escapeHtml(str) {
                if (!str) return '';
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }
        };

        window.examsReady = new Promise((resolve, reject) => {
            const initialize = () => app.init().then(resolve, reject);
            if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', initialize, {once:true});
            else initialize();
        });
        window.examsReady.catch(error => console.error('Khởi tạo phần thi thất bại:', error));
