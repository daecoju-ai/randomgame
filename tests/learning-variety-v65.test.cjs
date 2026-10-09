'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../lib/learning-bank.cjs');
const R=require('../public/learning-rules.js');
const P=require('../lib/learning-packs.cjs');

test('v64 through v66 exercises retain unique IDs, usable answers, and explanations',()=>{
 const rows=B.bank().filter(q=>/^V6[456]-/.test(q.id));
 assert.equal(rows.length,18);
 assert.equal(new Set(rows.map(q=>q.id)).size,12);
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
