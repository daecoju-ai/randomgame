'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../lib/learning-bank.cjs'),R=require('../public/learning-rules'),P=require('../lib/learning-packs.cjs');
test('diverse bank supplies four subjects and both choice and ordered gameplay without repeated prompts',()=>{
 const rows=B.bank().filter(q=>q.id.startsWith('V62-'));assert.equal(rows.length,96);
 assert.equal(new Set(rows.map(q=>q.question)).size,96);
 for(const subject of ['english','korean','science','social'])assert.equal(rows.filter(q=>q.subject===subject).length,24);
 assert.equal(rows.filter(q=>R.mode(q)==='sequence').length,36);
 assert(new Set(rows.map(q=>q.domain)).size>=25);
 for(const q of rows){
  assert(q.explanation.length>15);assert(q.review.human_publication_pending);assert.equal(q.release_channel,'pilot');
  assert(q.choices.length<=12);assert.equal(new Set(q.choices).size,q.choices.length);
  assert.equal(B.bank().filter(x=>x.question===q.question).length,1);
  const state=R.start(q);for(const [i,token] of R.answers(q).entries())assert.equal(R.choose(q,state,token,100+i*100),true,q.id);
  assert.equal(state.done,true);assert.equal(state.mistakes,0);
  if(q.subject==='english')assert.equal(q.sentence,q.answer.join(' '));
 }
 const packs=P.groupQuestions(B.bank());for(const subject of ['science','social']){
  const ps=packs.filter(p=>p.subject===subject);assert(ps.length>1);assert(ps.every(p=>p.school==='elementary'&&p.grade>=3&&p.grade<=6));assert(ps.reduce((n,p)=>n+p.rows.length,0)>=24);
 }
});
