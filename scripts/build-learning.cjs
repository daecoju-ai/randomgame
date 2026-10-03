'use strict';
const fs=require('node:fs'),path=require('node:path'),B=require('../lib/learning-bank.cjs'),P=require('../lib/learning-packs.cjs');
const dir=path.join(__dirname,'../public/learning-data');fs.mkdirSync(dir,{recursive:true});
const packs=P.groupQuestions(B.bank()).map(({rows,...pack})=>{const file=pack.id+'.json';fs.writeFileSync(path.join(dir,file),JSON.stringify(rows));return {...pack,url:'/learning-data/'+file,version:1,count:rows.length}});
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({version:3,packs,certifications:P.catalog.targets.map(({id,name,subjects,standards_effective_from,standards_effective_until})=>({id,name,subjects,standards_effective_from,standards_effective_until}))}));
