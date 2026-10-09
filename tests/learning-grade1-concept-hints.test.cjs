'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../public/learning-support');
const base={school:'elementary',grade:1,subject:'math',domain:'number_operations'};
test('first grade arithmetic and patterns receive concept-specific hints',()=>{
 const cases=[
  [{...base,question:'2 + 3을 더하면? '},'grade1-add'],
  [{...base,question:'5개에서 2개를 빼면?'},'grade1-subtract'],
  [{...base,domain:'data_patterns',question:'다음 규칙을 찾으세요'},'grade1-pattern'],
  [{...base,game_type:'MATCHING',question:'수를 읽는 말과 짝지으세요'},'grade1-matching']
 ];
 for(const [q,id] of cases){const l=S.lesson(q);assert.equal(l.id,id);assert.equal(l.hints.length,2);assert(l.choices.includes(l.answer))}
});
test('grade-two learning keeps existing generic lesson selection',()=>{
 assert.notEqual(S.lesson({...base,grade:2,question:'2 + 3을 더하면?'}).id,'grade1-add');
});
