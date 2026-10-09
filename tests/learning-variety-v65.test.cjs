'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../lib/learning-bank.cjs');
const R=require('../public/learning-rules.js');
const P=require('../lib/learning-packs.cjs');

test('v64 through v66 exercises retain unique IDs, usable answers, and explanations',()=>{
 const rows=B.bank().filter(q=>/^V6[456]-/.test(q.id));
 assert.equal(rows.length,18);
 assert.equal(new Set(rows.map(q=>q.id)).size,rows.length);
 const modes=new Set(rows.map(q=>q.game_type));
 for(const type of ['ORDERING','TILE_SEQUENCE','FORMULA','TARGET_SELECT','MULTIPLE_CHOICE'])assert(modes.has(type),type);
 assert(!rows.some(q=>q.game_type==='MATCHING'&&R.answers(q).length===1),'single-answer matching must be modeled as choice');
 for(const q of rows){
  assert.equal(q.release_channel,'pilot',q.id);
  assert.equal(q.review.human_publication_pending,true,q.id);
  assert(q.explanation.length>=12,q.id);
  assert.equal(new Set(q.choices).size,q.choices.length,q.id);
  const state=R.start(q);
  for(const token of R.answers(q))assert.equal(R.choose(q,state,token,1000+state.step*100),true,q.id);
  assert.equal(state.done,true,q.id);
 }
 const packs=P.groupQuestions(B.bank());
 for(const q of rows)assert(packs.some(p=>p.rows.some(x=>x.id===q.id)),q.id);
});

test('recent pilots have independently checked arithmetic and unambiguous contexts',()=>{
 const rows=new Map(B.bank().filter(q=>/^V6[456]-/.test(q.id)).map(q=>[q.id,q]));
 const answer=id=>R.answers(rows.get(id));
 assert.deepEqual(answer('V64-MATH-001'),[2,4,6,8].map(String));
 assert.equal(Number(answer('V64-MATH-002')[0].split('+').reduce((s,n)=>s+Number(n),0)),3*4);
 assert.equal(answer('V65-MATH-001')[0],'90°');
 assert.equal(answer('V65-MATH-002')[0],'3/5');
 assert.equal(Number(answer('V66-MATH-001')[0].replace('개',''))*3,12);
 assert.equal(Number(answer('V66-MATH-002')[0].replace('cm','')),100);
 assert.match(rows.get('V65-KOREAN-001').question,/아침밥.*이를 닦.*학교에 갔/s);
 assert.notEqual(rows.get('V65-SCIENCE-001').game_type,'MATCHING');
 assert.match(rows.get('V66-SCIENCE-001').explanation,/응결/);
 for(const q of rows.values()){
  assert(q.choices.length>=R.answers(q).length,q.id);
  assert(q.review.human_publication_pending,q.id);
  assert.notEqual(q.review_status,'published',q.id);
 }
});
