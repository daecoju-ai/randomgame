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

test('all grade-one pilot questions have distinct worked-example prompts and usable hints',()=>{
 const fs=require('node:fs');
 const path=require('node:path');
 const dir=path.join(__dirname,'../data/questions/school');
 const files=fs.readdirSync(dir).filter(name=>/^elementary-grade1-year26.*\.pilot\.json$/.test(name));
 assert(files.length>=8,'expected the full grade-one pilot collection');
 let checked=0;
 for(const name of files){
  for(const q of JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))){
   const l=S.lesson(q);
   if(!l)continue;
   assert.notEqual(l.prompt.trim(),q.question.trim(),q.id);
   assert(l.choices.includes(l.answer),q.id);
   assert.equal(new Set(l.choices).size,l.choices.length,q.id);
   assert.equal(l.hints.length,2,q.id);
   assert(l.hints.every(h=>typeof h==='string'&&h.trim().length>8),q.id);
   checked++;
  }
 }
 assert(checked>=100,'expected at least 100 scaffolded grade-one pilot questions');
});
