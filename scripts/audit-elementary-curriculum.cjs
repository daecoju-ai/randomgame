#!/usr/bin/env node
'use strict';
// Read-only inventory: does not promote publication status or invent standards.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public/learning-data');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const rows=[];
for(const pack of manifest.packs){
  const questions=JSON.parse(fs.readFileSync(path.join(root,path.basename(pack.url)),'utf8'));
  for(const q of questions){
    if(q.school!=='elementary')continue;
    const pending=q.source_reference==='original_learning_pilot';
    const mapped=Boolean(q.curriculum_mapping?.standard_code&&q.curriculum_mapping?.source_url&&q.curriculum_mapping?.checked_at&&q.curriculum_mapping?.reviewer);
    rows.push({id:q.id,pack:pack.id,grade:q.grade,subject:q.subject,domain:q.domain,
      learning_target:q.learning_target,source_reference:q.source_reference,
      mapping_status:mapped?'documented':pending?'source_pending':'standard_unverified',
      review_status:q.review_status,release_channel:q.release_channel});
  }
}
const byGroup={};
for(const q of rows){
  const k=q.grade+'-'+q.subject;
  (byGroup[k]??={total:0,source_pending:0,standard_unverified:0,documented:0})[q.mapping_status]++;
  byGroup[k].total++;
}
const result={generated_at:new Date().toISOString(),source:'2022 revised curriculum - NCIC official',source_url:'https://www.ncic.re.kr/',elementary_questions:rows.length,by_grade_subject:byGroup,questions:rows};
const dest=path.resolve(__dirname,'../public/learning-curriculum-audit.json');
fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({elementary_questions:rows.length,groups:byGroup,report:'public/learning-curriculum-audit.json'},null,2));
