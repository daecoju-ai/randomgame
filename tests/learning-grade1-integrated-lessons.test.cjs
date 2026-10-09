'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../public/learning-support');
test('integrated studies lessons follow first-grade domains',()=>{
 const cases=[['안전한 생활','grade1-integrated-safety'],['계절 변화','grade1-integrated-season'],['자연 관찰','grade1-integrated-nature'],['학교 공동체','grade1-integrated-community'],['건강 습관','grade1-integrated-health'],['미술 표현','grade1-integrated-expression'],['식물 돌보기','grade1-integrated-care'],['하루 일과','grade1-integrated-routine'],['친구 관계','grade1-integrated-relations']];
 for(const [domain,id] of cases){
  const l=S.lesson({school:'elementary',grade:1,subject:'integrated',domain,question:'알맞은 행동은?'});
  assert.equal(l.id,id);
  assert(l.choices.includes(l.answer));
  assert.equal(l.hints.length,2);
 }
});
