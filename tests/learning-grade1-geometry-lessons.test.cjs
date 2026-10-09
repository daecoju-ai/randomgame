'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../public/learning-support');
const base={school:'elementary',grade:1,subject:'math',domain:'geometry_measurement'};
test('grade-one geometry lessons are specific to the question concept',()=>{
 const cases=[
  ['긴바늘이 12, 짧은바늘이 5를 가리키면 몇 시인가요?','grade1-clock'],
  ['같은 크기 블록으로 길이를 비교하세요.','grade1-length'],
  ['축구공과 비슷한 입체 모양을 찾으세요.','grade1-solid'],
  ['꼭짓점이 3개인 평면도형은?','grade1-shapes']
 ];
 for(const [question,id] of cases){const lesson=S.lesson({...base,question});assert.equal(lesson.id,id);assert(lesson.choices.includes(lesson.answer));assert.equal(lesson.hints.length,2)}
});
test('grade-one specialization does not affect other grades',()=>{
 const l=S.lesson({...base,grade:2,question:'다음 수를 비교하세요.'});
 assert.notEqual(l.id,'grade1-shapes');
});
