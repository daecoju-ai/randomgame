'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('grade-two pilot audit runs in CI and finds no blocking data errors',()=>{
 const script=path.join(__dirname,'../scripts/audit-grade2-question-quality.cjs');
 const result=spawnSync(process.execPath,[script],{encoding:'utf8'});
 assert.equal(result.status,0,'audit failed: '+result.stdout+'\n'+result.stderr);
 const report=JSON.parse(result.stdout);
 assert(report.questions>=50,'expected all new second-grade questions');
 assert(report.files>=3,'expected all second-grade pilot files');
 assert.equal(report.issue_counts?.duplicate_id||0,0);
 assert.equal(report.issue_counts?.answer_not_in_choices||0,0);
 assert.equal(report.issue_counts?.unsupported_mode||0,0);
 assert.equal(report.issue_counts?.duplicate_choices||0,0);
});
