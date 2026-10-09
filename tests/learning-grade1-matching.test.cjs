'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../public/learning-rules');
const questions=require('../data/questions/school/elementary-grade1-year26-matching.pilot.json');
test('grade-one matching pilots use the existing ordered tile engine',()=>{
 assert.equal(questions.length,6);
 for(const q of questions){
  assert.equal(R.mode(q),'matching',q.id);
  assert.equal(q.game_type,'MATCHING');
  assert.equal(q.review.human_publication_pending,true);
  assert.equal(q.curriculum_evidence.verified,false);
  assert.equal(new Set(q.choices).size,q.choices.length);
  assert.equal(q.answer.length,2);
  assert(q.answer.every(token=>q.choices.includes(token)));
  const s=R.start(q);
  const incorrect=q.choices.find(token=>token!==q.answer[0]);
  assert.equal(R.choose(q,s,incorrect,50),false,q.id);
  assert.equal(s.step,0);
  assert.equal(s.done,false);
  assert.equal(R.choose(q,s,q.answer[0],100),true,q.id);
  assert.equal(s.done,false);
  assert.equal(R.choose(q,s,q.answer[1],200),true,q.id);
  assert.equal(s.done,true);
  assert.deepEqual(s.picked,q.answer);
  assert.equal(s.mistakes,1);
 }
});
