const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const bundle = fs.readFileSync('quizzes/catalog.js','utf8');
const loader = fs.readFileSync('assets/quiz-repository.js','utf8');
function context(protocol,fetch) {
  const ctx = {window:{},location:{protocol},AbortController,setTimeout,clearTimeout,fetch};
  vm.createContext(ctx); vm.runInContext(bundle,ctx); vm.runInContext(loader,ctx); return ctx;
}
(async () => {
  const offline = context('file:',() => { throw new Error('File URLs cannot fetch JSON'); });
  const all = await offline.window.quizRepository.loadAll();
  const files = fs.readdirSync('quizzes').filter(f => f.endsWith('.json'));
  let count = 0;
  for (const file of files) {
    const original = JSON.parse(fs.readFileSync('quizzes/'+file,'utf8'));
    const expected = Array.isArray(original) ? original : [original];
    const actual = await offline.window.quizRepository.loadFile(file);
    assert.deepEqual(JSON.parse(JSON.stringify(actual.map(q => q.questions))),expected.map(q => q.questions));
    count += expected.length;
  }
  assert.equal(all.length,count);
  const unavailable = context('https:',async () => ({ok:false,status:404}));
  assert.equal((await unavailable.window.quizRepository.loadAll()).length,count);
  const newest = context('https:',async () => ({ok:true,json:async () => ({id:'fresh',questions:[{text:'Updated source'}]})}));
  assert.equal((await newest.window.quizRepository.loadFile('de-7.json'))[0].id,'fresh');
  const api = context('https:',async () => ({ok:true,json:async () => [{id:'api',sourceFile:'new-quiz.json',questions:[{}]}]}));
  assert.equal((await api.window.quizRepository.loadAll())[0].sourceFile,'new-quiz.json');
  await assert.rejects(offline.window.quizRepository.loadFile('../secret.json'));
  console.log(`PASS: ${count} quizzes match JSON source; direct-file, HTTP failure, fresh JSON and dynamic API loading.`);
})().catch(error => {console.error(error);process.exitCode=1;});
