#!/usr/bin/env node
'use strict';
// Advisory review for grade-two authored pilots. Never changes publication status.
const fs=require('node:fs'),path=require('node:path');
const R=require('../public/learning-rules');
const S=require('../public/learning-support');
const root=path.resolve(__dirname,'../data/questions/school');
const files=fs.readdirSync(root).filter(f=>/^elementary-grade2-year26.*\.pilot\.json$/.test(f)).sort();
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s"'“”‘’.,!?·:;()[\]{}]/g,'');
const seenId=new Map(),seenStem=new Map(),issues=[],counts={},types={};
let total=0;
for(const file of files){
 const rows=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 if(!Array.isArray(rows))throw Error(file+': expected array');
 for(const [index,q] of rows.entries()){
  total++;counts[q.subject]=(counts[q.subject]||0)+1;types[q.game_type]=(types[q.game_type]||0)+1;
  const ref={file,index,id:q.id};
  if(seenId.has(q.id))issues.push({kind:'duplicate_id',items:[seenId.get(q.id),ref]});
  else seenId.set(q.id,ref);
  const stem=norm(q.question);
  if(seenStem.has(stem))issues.push({kind:'identical_question',items:[seenStem.get(stem),ref]});
  else seenStem.set(stem,ref);
  if(!R.mode(q))issues.push({kind:'unsupported_mode',items:[ref]});
  if(!Array.isArray(q.choices)||!q.choices.length)issues.push({kind:'missing_choices',items:[ref]});
  else{
   const options=q.choices.map(String),answers=R.answers(q);
   if(answers.some(a=>!options.includes(a)))issues.push({kind:'answer_not_in_choices',items:[ref]});
   if(new Set(options).size!==options.length)issues.push({kind:'duplicate_choices',items:[ref]});
   if(answers.length!==new Set(answers).size)issues.push({kind:'duplicate_answers',items:[ref]});
  }
  if(!q.explanation||String(q.explanation).trim().length<10)issues.push({kind:'weak_explanation',items:[ref]});
  if(q.school!=='elementary'||Number(q.grade)!==2)issues.push({kind:'wrong_grade_placement',items:[ref]});
  if(!['math','korean','integrated'].includes(q.subject))issues.push({kind:'unexpected_subject',items:[ref]});
  if(q.curriculum!=='2022')issues.push({kind:'unexpected_curriculum',items:[ref]});
  if(q.content_origin!=='original'||q.license!=='original_game_content')issues.push({kind:'unverified_license',items:[ref]});
  if(!q.curriculum_evidence||q.curriculum_evidence.verified!==true)issues.push({kind:'curriculum_mapping_pending',items:[ref]});
  if(!q.review||q.review.human_publication_pending!==false)issues.push({kind:'human_review_pending',items:[ref]});
  if(q.review_status!=='draft')issues.push({kind:'unexpected_review_status',items:[ref]});
  const lesson=S.lesson(q);
  if(!lesson||!Array.isArray(lesson.hints)||lesson.hints.length<2)issues.push({kind:'missing_scaffolding',items:[ref]});
 }
}
const issue_counts={};for(const i of issues)issue_counts[i.kind]=(issue_counts[i.kind]||0)+1;
const release_ready=issues.length===0;\nconst report={release_ready,scope:'elementary-grade2-year26*.pilot.json',status:'advisory_only',files:files.length,questions:total,subjects:counts,game_types:types,issue_counts,issues,notes:['No publication status is changed.','Automated checks cannot verify curriculum alignment or explanation correctness.','Human review is required before promoting drafts.']};
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:files.length,questions:total,subjects:counts,game_types:types,release_ready,issue_counts},null,2));
if(issues.some(i=>['duplicate_id','answer_not_in_choices','unsupported_mode','duplicate_choices','wrong_grade_placement','unexpected_subject','unexpected_curriculum','unverified_license'].includes(i.kind)))process.exitCode=1;
