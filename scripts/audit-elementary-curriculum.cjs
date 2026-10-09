#!/usr/bin/env node
'use strict';
// Read-only inventory: does not promote publication status or invent standards.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public/learning-data');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const rows=[];
const placementFlags=[];
const gradeBandFlags=[];
const curriculumReviewQueue=[];
const gradeBand=grade=>Number(grade)<=2?'1-2':Number(grade)<=4?'3-4':'5-6';
const elligibleStart={english:3,science:3,social:3};
const officialSource={
  standards:'https://www.ncic.re.kr/',
  implementation:'https://www.ncic.re.kr/bbs/eduNotice2022/view/543.do',
  amendment_search:'https://www.ncic.re.kr/srch/total_search.do?search=2022',
  latest_amendment_notice:'2026-01-21 national curriculum amendment: verify applicable subject annex before assigning standard codes'
};
for(const pack of manifest.packs){
  const questions=JSON.parse(fs.readFileSync(path.join(root,path.basename(pack.url)),'utf8'));
  for(const q of questions){
    if(q.school!=='elementary')continue;
    const pending=q.source_reference==='original_learning_pilot';
    const band=gradeBand(q.grade);
    const standardCode=q.curriculum_mapping?.standard_code;
    if(standardCode){
      const match=String(standardCode).replace(/^\[/,'').replace(/\]$/,'').match(/^([0-9]{1,2})([가-힣])([0-9]{2})-([0-9]{2})$/);
      if(match&&Number(match[1])!==Number(band.split('-')[1]))gradeBandFlags.push({id:q.id,grade:q.grade,standard_code:standardCode,reason:'standard_code_grade_band_mismatch'});
    }
    const minGrade=elligibleStart[q.subject];
    if(minGrade&&Number(q.grade)<minGrade)placementFlags.push({id:q.id,pack:pack.id,grade:q.grade,subject:q.subject,reason:'subject_not_offered_in_this_elementary_grade',min_grade:minGrade});
    const mapped=Boolean(q.curriculum_mapping?.standard_code&&q.curriculum_mapping?.source_url&&q.curriculum_mapping?.checked_at&&q.curriculum_mapping?.reviewer);
    if(['korean','math'].includes(q.subject)&&!mapped)curriculumReviewQueue.push({id:q.id,pack:pack.id,grade:q.grade,grade_band:band,subject:q.subject,domain:q.domain,learning_target:q.learning_target,source_reference:q.source_reference,review_status:q.review_status,required:['standard_code','source_url','checked_at','reviewer']});
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
const result={generated_at:new Date().toISOString(),source:'2022 revised curriculum - NCIC official',source_url:'https://www.ncic.re.kr/',official_sources:officialSource,verified_standard_mappings:rows.filter(x=>x.mapping_status==='documented').length,placement_flags:placementFlags,grade_band_flags:gradeBandFlags,curriculum_review_queue:{count:curriculumReviewQueue.length,questions:curriculumReviewQueue},elementary_questions:rows.length,by_grade_subject:byGroup,questions:rows};
const dest=path.resolve(__dirname,'../public/learning-curriculum-audit.json');
fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({elementary_questions:rows.length,verified_standard_mappings:result.verified_standard_mappings,placement_flags:placementFlags,grade_band_flags:gradeBandFlags,curriculum_review_queue:curriculumReviewQueue.length,groups:byGroup,report:'public/learning-curriculum-audit.json'},null,2));
