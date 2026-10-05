'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{spawnSync}=require('node:child_process'),B=require('../lib/learning-bank.cjs');
test('API expansion has unique prompts, explanations and usable answer tiles for all six grades',()=>{
 const rows=B.bank().filter(q=>q.id.startsWith('V61-'));
 assert.equal(rows.length,580);
 assert.equal(new Set(rows.map(q=>q.question)).size,rows.length);
 for(let grade=1;grade<=6;grade++)assert(rows.filter(q=>q.grade===grade).length>=80);
 for(const q of rows){
  assert.equal(new Set(q.choices).size,4);assert(q.choices.includes(q.answer));
  assert(q.explanation.includes(q.answer));assert(!q.explanation.includes('{answer}'));
  assert.equal(q.release_channel,'pilot');assert.equal(q.review.human_publication_pending,true);
  assert.equal(B.find(q.id).id,q.id);assert.equal(B.proof(q).prefixes.length,1);
 }
 const all=B.bank();for(const q of rows)assert.equal(all.filter(x=>x.question===q.question).length,1);
});
test('saved API evidence matches independently calculated answers and rejects corrupted or stale results',()=>{
 const code=`import importlib.util,json,copy
s=importlib.util.spec_from_file_location('g','scripts/expand-learning-api.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
rows=g.generate();snapshot=json.loads(g.SNAPSHOT.read_text());g.verify(rows,snapshot)
for change in ('wrong_result','missing_result','wrong_expression'):
 bad=copy.deepcopy(snapshot)
 if change=='wrong_result':bad['results'][0]='999999'
 elif change=='missing_result':bad['results'].pop()
 else:bad['expressions'][0]='1+1'
 try:g.verify(rows,bad)
 except ValueError:pass
 else:raise AssertionError('accepted '+change)
for expression in ('__import__("os").system("true")','2**100','True+2'):
 try:g.calculate(expression)
 except ValueError:pass
 else:raise AssertionError('accepted unsafe arithmetic')
for row in rows:
 assert g.calculate(row['expression']).denominator>0
for grade in range(1,7):
 path=g.ROOT/f'data/questions/school/math/elementary-grade{grade}.v61.json'
 for q in json.loads(path.read_text()):assert q['answer']==g.number(g.calculate(q['verification']['expression']))
`;
 const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('Math API provenance records no credential and every result is present',()=>{
 const snapshot=JSON.parse(fs.readFileSync('data/references/mathjs-v61-verification.json','utf8'));
 assert.equal(snapshot.endpoint,'https://api.mathjs.org/v4/');assert.equal(snapshot.results.length,580);
 assert.equal(snapshot.expressions.length,580);assert(!/api[_-]?key|serviceKey|authorization/i.test(JSON.stringify(snapshot)));
});
