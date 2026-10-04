'use strict';
const fs=require('node:fs'),path=require('node:path');
const OUT=path.join(__dirname,'../data/certifications/catalog/catalog.json');
const key=(process.env.QNET_API_KEY||'').trim();
const endpoint=(process.env.QNET_QUALIFICATIONS_ENDPOINT||'').trim();
function serviceKey(v){if(/%[0-9a-f]{2}/i.test(v)){try{return decodeURIComponent(v)}catch{}}return v}
function items(v){const body=v?.response?.body||v?.body||v;const x=body?.items?.item||body?.items||[];return Array.isArray(x)?x:x?[x]:[]}
function normalize(x){const code=String(x.jmCd||x.qualCd||x.code||'').trim(),name=String(x.jmNm||x.qualNm||x.name||'').trim();if(!code||!name)return null;return{qualification_code:code,qualification_name:name,qualification_grade:String(x.seriesNm||x.qualGrade||x.grade||'').trim()||null,category:String(x.obligFldNm||x.category||'').trim()||null,source:'qnet_official_api'}}
(async()=>{if(!key)throw Error('QNET_API_KEY is missing');if(!endpoint)throw Error('QNET_QUALIFICATIONS_ENDPOINT is missing. Set it only after confirming the official API endpoint; this script never guesses endpoints.');
const u=new URL(endpoint);u.searchParams.set('serviceKey',serviceKey(key));u.searchParams.set('dataType','JSON');u.searchParams.set('numOfRows','1000');u.searchParams.set('pageNo','1');
const r=await fetch(u,{signal:AbortSignal.timeout(20000)});const body=await r.text();if(!r.ok)throw Error('Q-Net HTTP '+r.status);let data;try{data=JSON.parse(body)}catch{throw Error('Q-Net returned non-JSON. Confirm endpoint/approval/ServiceKey encoding; XML adapters must be added from the official response schema.')}
const rows=items(data).map(normalize).filter(Boolean);if(!rows.length)throw Error('No qualification rows returned; catalog was not overwritten.');
const unique=[...new Map(rows.map(x=>[x.qualification_code,x])).values()].sort((a,b)=>a.qualification_name.localeCompare(b.qualification_name,'ko'));
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({version:'2.0.0',generated_at:new Date().toISOString(),source:'qnet_official_api',items:unique},null,2));console.log('Qualifications:',unique.length);
})().catch(e=>{console.error(e.message);process.exit(1)});