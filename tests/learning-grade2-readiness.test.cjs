'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('../public/learning-support');
const R=require('../public/learning-rules');
const B=require('../lib/learning-bank.cjs');
const P=require('../lib/learning-packs.cjs');

test('second-grade concept lessons and hints match subject and game type',()=>{
 const base={school:'elementary',grade:2};
 const cases=[
  [{...base,subject:'math',domain:'number_operations',game_type:'TILE_CHOICE',question:'36+48은?'},'grade2-number'],
  [{...base,subject:'math',domain:'geometry_measurement',game_type:'TILE_CHOICE',question:'1m는 몇 cm?'},'grade2-measure'],
  [{...base,subject:'math',domain:'data_patterns',game_type:'TILE_CHOICE',question:'다음 규칙은?'},'grade2-pattern'],
  [{...base,subject:'korean',domain:'읽기 이해',game_type:'MULTIPLE_CHOICE',question:'글을 읽고 답하세요'},'grade2-reading'],
  [{...base,subject:'integrated',domain:'생활 안전',game_type:'TILE_CHOICE',question:'안전한 행동은?'},'grade2-integrated'],
  [{...base,subject:'math',game_type:'ORDERING',question:'순서대로 선택하세요'},'grade2-order'],
  [{...base,subject:'korean',game_type:'MATCHING',question:'짝을 고르세요'},'grade2-matching']
 ];
 for(const [q,id] of cases){
  const lesson=S.lesson(q);
  assert.equal(lesson?.id,id);
  assert.equal(lesson.hints.length,2);
  assert(lesson.hints.every(h=>typeof h==='string'&&h.length>8));
  assert(lesson.choices.includes(lesson.answer));
 }
});

test('all new second-grade pilot questions have valid playable modes and scaffolding',()=>{
 const dir=path.join(__dirname,'../data/questions/school');
 const files=fs.readdirSync(dir).filter(f=>/^elementary-grade2-year26.*\.pilot\.json$/.test(f));
 assert(files.length>=3);
 const ids=new Set();
 let checked=0;
 for(const file of files)for(const q of JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))){
  assert.equal(q.grade,2,q.id);
  assert.equal(q.review_status,'draft',q.id);
  assert(!ids.has(q.id),'duplicate id: '+q.id);ids.add(q.id);
  assert(R.mode(q),'unsupported game mode: '+q.id);
  const answers=R.answers(q);
  assert(answers.length>0,q.id);
  assert(answers.every(a=>q.choices.map(String).includes(a)),'answer missing from choices: '+q.id);
  assert.equal(new Set(q.choices.map(String)).size,q.choices.length,q.id);
  const lesson=S.lesson(q);
  assert(lesson,'missing lesson: '+q.id);
  assert.notEqual(lesson.prompt.trim(),q.question.trim(),q.id);
  assert.equal(lesson.hints.length,2,q.id);
  checked++;
 }
 assert(checked>=50,'expected at least 50 second-grade draft questions');
});

test('second-grade drafts are not silently promoted to playable game packs',()=>{
 const drafts=fs.readdirSync(path.join(__dirname,'../data/questions/school'))
  .filter(f=>/^elementary-grade2-year26.*\.pilot\.json$/.test(f))
  .flatMap(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data/questions/school',f),'utf8')));
 const liveIds=new Set(B.bank().map(q=>q.id));
 for(const q of drafts)assert(!liveIds.has(q.id),'draft must not appear in live bank: '+q.id);
 const packs=P.groupQuestions(B.bank()).filter(p=>p.school==='elementary'&&Number(p.grade)===2);
 assert(packs.length>0,'existing second-grade live packs must remain available');
});

test('grade-two practice mirrors the authored question sources',()=>{
 const dir=path.join(__dirname,'../data/questions/school');
 const source=fs.readdirSync(dir).filter(f=>/^elementary-grade2-year26.*\\.pilot\\.json$/.test(f))
  .flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
 const practice=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/learning-data/grade2-practice.json'),'utf8'));
 assert.equal(practice.length,source.length);
 const sourceById=new Map(source.map(q=>[q.id,q]));
 for(const q of practice){
  const original=sourceById.get(q.id);
  assert(original,'practice-only question missing from source: '+q.id);
  assert.deepEqual(q,original,'practice question drifted from source: '+q.id);
 }
});
