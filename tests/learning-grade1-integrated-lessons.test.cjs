'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../public/learning-support');
test('integrated studies lessons follow first-grade domains',()=>{
 const cases=[['안전한 생활','grade1-integrated-safety'],['계절 변화','grade1-integrated-season'],['자연 관찰','grade1-integrated-nature'],['학교 공동체','grade1-integrated-community']];
 for(const [domain,id] of cases){
  const l=S.lesson({school:'elementary',grade:1,subject:'integrated',domain,question:'알맞은 행동은?'});
  assert.equal(l.id,id);
  assert(l.choices.includes(l.answer));
  assert.equal(l.hints.length,2);
 }
});
