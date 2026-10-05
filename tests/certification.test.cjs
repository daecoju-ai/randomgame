'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../lib/learning-bank.cjs'),P=require('../lib/learning-packs.cjs'),fs=require('node:fs');
test('certification calculations, units and ordered scores have checked answers',()=>{
 const rows=B.bank().filter(q=>q.calculation);assert.equal(rows.length,8);
 for(const q of rows){const c=q.calculation;let result;if(c.formula==='product')result=c.inputs.reduce((a,b)=>a*b,1);else if(c.formula==='quotient')result=c.inputs[0]/c.inputs[1];else if(c.formula==='kinetic')result=.5*c.inputs[0]*c.inputs[1]**2;else if(c.formula==='ascending')result=[...c.inputs].sort((a,b)=>a-b);else assert.fail('unknown formula');assert.deepEqual(result,c.result);assert.deepEqual(q.answer,Array.isArray(result)?result.map(String):`${result}${c.unit||''}`);assert.equal(q.review.human_publication_pending,true);}
});
test('chosen certification packs include only mapped target and subject, not the whole bank',()=>{
 const groups=P.groupQuestions(B.bank()).filter(p=>p.certification);assert.equal(groups.length,8);
 for(const p of groups)for(const q of p.rows)assert(q.certification_routes.some(r=>r.target===p.certification&&r.area===p.area));
 const electrical=groups.find(p=>p.certification==='industrial-safety-engineer'&&p.area==='electrical');assert.equal(electrical.rows.length,2);
 assert(!groups.some(p=>p.certification==='construction-safety-engineer'&&p.area==='electrical'));
 assert.throws(()=>P.groupQuestions([{...B.bank()[0],certification_routes:[{target:'unknown',area:'unknown'}]}]),/Unknown certification route/);
});
test('server verification allowlist accepts every playable proof; no question text added to SQL',()=>{
 const sql=fs.readFileSync('scripts/learning-content-v54.sql','utf8');const newSQL=fs.readFileSync('scripts/learning-content-v58.sql','utf8');const apiSQL=fs.readFileSync('scripts/learning-content-v61.sql','utf8');
 for(const q of B.bank()){assert((q.id.startsWith('V61-')?apiSQL:q.id.startsWith('V58-')?newSQL:sql).includes(B.proof(q).fingerprint));assert(!newSQL.includes(q.question));assert(!apiSQL.includes(q.question));}
 const prior=fs.readFileSync('scripts/learning-content-v53.sql','utf8');
 assert.equal(sql.replace(/fp not in \([^)]*\)/,'ALLOWLIST'),prior.replace(/fp not in \([^)]*\)/,'ALLOWLIST'));
});
