const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('assets/course-data.js','utf8'),context);
const lessons = context.window.COURSE_LESSONS;
assert.equal(lessons.length,10);
assert.equal(new Set(lessons.map(l => l.source.file)).size,10);
assert.deepEqual(Array.from(lessons,l => l.id),['basics','conditions','loops','lists','collections','files','functions','strings','numpy','matplotlib']);
for (const lesson of lessons) {
  assert(fs.existsSync(lesson.source.file),lesson.source.file);
  assert.equal(lesson.body,fs.readFileSync(path.join('assets/theory',lesson.id+'.md'),'utf8').trim());
  assert(lesson.body.includes('## Mục tiêu bài học'));
  assert(lesson.body.includes('## Bài tập tự kiểm tra'));
  assert(lesson.body.length>5000);
  assert(lesson.body.includes('| --- |'));
  if (lesson.quiz) assert(fs.existsSync('quizzes/'+lesson.quiz));
}
assert.equal(lessons.find(l => l.id === 'files').quiz,null);
const html = fs.readFileSync('index.html','utf8');
assert(!html.includes('id="theory-source"'));
assert(!html.includes('id="lesson-quiz"'));
assert(!html.includes('id="start-inline-quiz"'));
assert(html.includes('id="lesson-quiz-card"'));
assert(!html.includes('lesson-details.js'));
assert(!html.includes('9 bài học'));
console.log('PASS: 10 ordered lessons, 10 unique PDF sources, detailed text, quiz mapping and classroom markup.');
