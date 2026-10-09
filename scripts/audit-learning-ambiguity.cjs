'use strict';
const fs=require('node:fs'),path=require('node:path');
const B=require('../lib/learning-bank.cjs'),R=require('../public/learning-rules.js');
const rows=B.bank(),issues=[],warnings=[],byId=new Set();
const clean=x=>String(x).normalize('NFKC').trim().replace(/\\s+/g,' ').toLowerCase();
for(const q of rows){
 const id=q.id||'(missing)';
 if(byId.has(id))issues.push(id+': duplicate question ID');
 byId.add(id);
 const choices=Array.isArray(q.choices)?q.choices:[];
 const answers=R.answers(q);
 if(!choices.length)issues.push(id+': no choices');
 if(choices.some(x=>!String(x).trim()))issues.push(id+': empty choice');
 if(new Set(choices.map(clean)).size!==choices.length)issues.push(id+': equivalent choice labels');
 if(answers.some(a=>!choices.some(c=>String(c)===a)))issues.push(id+': answer not in choices');
 if(answers.length>choices.length)issues.push(id+': more answer steps than tiles');
 if(q.game_type==='MATCHING'&&answers.length<2)warnings.push(id+': single-step matching resembles a choice question');
 if(!q.explanation||String(q.explanation).trim().length<12)warnings.push(id+': short or missing explanation');
 if(!q.question||String(q.question).trim().length<10)warnings.push(id+': unusually short question');
 if(answers.length>1&&new Set(answers).size!==answers.length)warnings.push(id+': repeated sequence tokens need dedicated tile handling');
 if(q.review_status==='published'&&q.review?.human_publication_pending===true)issues.push(id+': published while human approval pending');
}
const report={total:rows.length,errors:issues,warnings};
const out=path.join(__dirname,'../public/learning-ambiguity-report.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\\n');
console.log(JSON.stringify({total:rows.length,errors:issues.length,warnings:warnings.length,report:'/learning-ambiguity-report.json'}));
if(issues.length){console.error(issues.slice(0,30).join('\\n'));process.exitCode=1}
