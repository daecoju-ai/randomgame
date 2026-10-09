'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const ref=require('../data/curriculum/official-reference-2026.json');
test('2026 curriculum rollout is recorded without claiming unverified standards',()=>{
 assert.equal(ref.reference_year,2026);
 assert.match(ref.latest_notice,/2026-1호/);
 assert.equal(ref.verification_policy.curriculum_notice_verified,true);
 assert.equal(ref.verification_policy.achievement_standard_mappings_verified,false);
 assert.equal(ref.verification_policy.question_content_verified_by_notice,false);
 const byGrade=new Map(ref.phase_in.flatMap(p=>p.grades.map(g=>[g,p.effective])));
 for(let i=1;i<=6;i++)assert(byGrade.get('elementary-'+i)<='2026-03-01');
 assert.equal(byGrade.get('middle-3'),'2027-03-01');
 assert.equal(byGrade.get('high-3'),'2027-03-01');
 assert.equal(new Set(byGrade.keys()).size,12);
});
