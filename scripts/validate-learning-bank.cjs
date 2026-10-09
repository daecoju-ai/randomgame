#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public/learning-data');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const errors=[],warnings=[],ids=new Set(),types=new Set(['TILE_CHOICE','MULTIPLE_CHOICE','TARGET_SELECT','FORMULA','TILE_SEQUENCE','ORDERING','MATCHING']);
let total=0,draft=0;
for(const pack of manifest.packs){
 let rows;
 try{rows=JSON.parse(fs.readFileSync(path.join(root,path.basename(pack.url)),'utf8'))}
 catch(e){errors.push(pack.id+': missing or invalid file '+e.message);continue}
 if(!Array.isArray(rows)){errors.push(pack.id+': expected array');continue}
 if(rows.length!==pack.count)errors.push(pack.id+': manifest count '+pack.count+' != '+rows.length);
 for(const [i,q] of rows.entries()){
  total++;const label=pack.id+'['+i+']';
  for(const field of ['id','school','grade','subject','domain','learning_target','difficulty','game_type','question','choices','answer','explanation','content_origin','source_reference','license','review_status']){
   if(q[field]===undefined||q[field]===null||q[field]==='')errors.push(label+': missing '+field);
  }
  if(!q.id)continue;
  if(ids.has(q.id))errors.push(label+': duplicate id '+q.id);ids.add(q.id);
  if(q.school!==pack.school||String(q.grade)!==String(pack.grade)||q.subject!==pack.subject)errors.push(label+': pack metadata mismatch');
  if(!types.has(q.game_type))errors.push(label+': unsupported game type '+q.game_type);
  if(!Array.isArray(q.choices)||q.choices.length<2)errors.push(label+': insufficient choices');
  else {
   const choices=q.choices.map(String);
   if(new Set(choices).size!==choices.length)errors.push(label+': duplicate choices');
   const answer=Array.isArray(q.answer)?q.answer.map(String):[String(q.answer)];
   if(answer.some(a=>!choices.includes(a)))errors.push(label+': answer absent from choices');
   if(answer.length!==new Set(answer).size)errors.push(label+': duplicate answer tokens');
   if(['TILE_SEQUENCE','ORDERING'].includes(q.game_type)&&answer.length<2)errors.push(label+': sequence needs >=2 tokens');
   if(!['TILE_SEQUENCE','ORDERING','MATCHING'].includes(q.game_type)&&answer.length!==1)errors.push(label+': single choice requires one answer');
  }
  if(!['draft','reviewed','published'].includes(q.review_status))errors.push(label+': invalid review status');
  if(q.review_status==='draft')draft++;
  if(q.review_status==='published'&&(!q.review||q.review.human_publication_pending!==false))errors.push(label+': published without human review');
  if(q.review_status==='draft'&&q.review?.human_publication_pending===false)errors.push(label+': draft cannot claim completed human publication review');
  if(q.review_status==='draft'&&String(q.review?.method||'').includes('automated_structure_check'))errors.push(label+': draft claims automated validation before validator approval');
  if(String(q.explanation||'').length<12)warnings.push(label+': short explanation');
  if(q.source_reference==='original_learning_pilot')warnings.push(label+': generic source; curriculum mapping pending');
 }
}
const report={generated_at:new Date().toISOString(),packs:manifest.packs.length,questions:total,drafts:draft,errors,warnings,policy:'draft/reviewed may remain pilot; published requires completed human review'};
fs.writeFileSync(path.join(ROOT,'public','learning-validation-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({packs:report.packs,questions:report.questions,drafts:report.drafts,errors:errors.length,warnings:warnings.length,report:'/learning-validation-report.json'},null,2));
if(warnings.length)console.log('WARNINGS\n'+warnings.slice(0,30).join('\n'));
if(errors.length){console.error('ERRORS\n'+errors.slice(0,100).join('\n'));process.exitCode=1}
