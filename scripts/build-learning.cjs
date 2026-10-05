'use strict';
const fs=require('node:fs'),path=require('node:path'),B=require('../lib/learning-bank.cjs'),P=require('../lib/learning-packs.cjs');
const dir=path.join(__dirname,'../public/learning-data');fs.mkdirSync(dir,{recursive:true});
const packs=P.groupQuestions(B.bank()).map(({rows,...pack})=>{const file=pack.id+'.json';fs.writeFileSync(path.join(dir,file),JSON.stringify(rows));return {...pack,url:'/learning-data/'+file,version:1,count:rows.length}});
const activeFiles=new Set(packs.map(p=>p.url.split('/').at(-1)));for(const file of fs.readdirSync(dir))if(/^(elementary|middle|high|general)-.*-(math|english|korean|science|social|law|certification)\.json$/.test(file)&&!activeFiles.has(file))fs.unlinkSync(path.join(dir,file));
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({version:3,packs,certifications:(Array.isArray(P.catalog.targets)&&P.catalog.targets.length?P.catalog.targets:(P.catalog.legacy_pilot_targets||[])).map(({id,name,subjects,standards_effective_from,standards_effective_until})=>({id,name,subjects,standards_effective_from,standards_effective_until}))}));

// Publish the generated qualification catalog as a static game cache.
const certCatalog=path.join(__dirname,'../data/certifications/catalog/catalog.json');if(fs.existsSync(certCatalog))fs.copyFileSync(certCatalog,path.join(dir,'certification-catalog.json'));
