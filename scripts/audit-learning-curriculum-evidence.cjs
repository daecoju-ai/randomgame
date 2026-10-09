'use strict';
const fs=require('node:fs'),path=require('node:path');
const B=require('../lib/learning-bank.cjs');
const rows=B.bank(),summary={total:rows.length,verified:0,pending:0,missing_mapping:0,invalid_claims:[],by_subject:{},by_school_grade:{}},examples=[];
for(const q of rows){
 const subject=String(q.subject||'unknown');
 const grade=String(q.school||'unknown')+'-'+String(q.grade??'unknown');
 summary.by_subject[subject]??={total:0,verified:0,missing_mapping:0};
 summary.by_school_grade[grade]??={total:0,verified:0,missing_mapping:0};
 summary.by_subject[subject].total++;
 summary.by_school_grade[grade].total++;
 const ev=q.curriculum_evidence;
 if(!ev||!ev.standard_code||!ev.source_url){
  summary.missing_mapping++;
  summary.by_subject[subject].missing_mapping++;
  summary.by_school_grade[grade].missing_mapping++;
  if(examples.length<30)examples.push({id:q.id,grade:q.grade,subject:q.subject,reason:'standard code or official source not recorded'});
  continue;
 }
 const valid=ev.verified===true&&ev.reviewer&&ev.checked_at&&/^https:\/\//.test(ev.source_url)&&ev.standard_code;
 if(ev.verified===true&&!valid)summary.invalid_claims.push(q.id);
 if(valid){summary.verified++;summary.by_subject[subject].verified++;summary.by_school_grade[grade].verified++;}else summary.pending++;
}
const out=path.join(__dirname,'../public/learning-curriculum-evidence-report.json');
fs.writeFileSync(out,JSON.stringify({...summary,examples},null,2)+'\n');
console.log(JSON.stringify({total:summary.total,verified:summary.verified,pending:summary.pending,missing_mapping:summary.missing_mapping,invalid_claims:summary.invalid_claims.length}));
if(summary.invalid_claims.length)process.exitCode=1;
