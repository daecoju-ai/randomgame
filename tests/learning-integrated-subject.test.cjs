'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('integrated studies is selectable in both learning subject and profile preferences',()=>{
 const src=fs.readFileSync('public/learning.js','utf8');
 assert.match(src,/integrated:'통합교과'/);
 assert.equal((src.match(/\['integrated','통합교과'\]/g)||[]).length,2);
 assert.match(src,/id="learnSubject"/);
 assert.match(src,/data-profile-subject/);
});
