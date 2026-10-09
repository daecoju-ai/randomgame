'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../public/learning-support');
test('grade-one Korean lessons match literacy domains',()=>{
 const cases=[['받침 익히기','grade1-korean-final'],['문장 부호','grade1-korean-punctuation'],['일의 순서','grade1-korean-order'],['읽기 이해','grade1-korean-reading'],['낱말 의미','grade1-korean-word'],['글자 익히기','grade1-korean-letter']];
 for(const [domain,id] of cases){const l=S.lesson({school:'elementary',grade:1,subject:'korean',domain,question:'알맞은 것을 고르세요.'});assert.equal(l.id,id);assert(l.choices.includes(l.answer));assert.equal(l.hints.length,2)}
});
