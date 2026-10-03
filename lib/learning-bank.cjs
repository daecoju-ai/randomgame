'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),R=require('../public/learning-rules.js');
const root=path.join(__dirname,'../data');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.json')?[path.join(dir,e.name)]:[])}
function bank(){return files(path.join(root,'questions')).flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8'))).filter(q=>['reviewed','published'].includes(q.review_status)&&q.content_origin==='original'&&q.license==='original_game_content'&&(q.review_status==='published'||q.release_channel==='pilot')&&R.mode(q))}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function proof(q){const a=R.answers(q),prefixes=a.map((_,i)=>sha(a.slice(0,i+1).join('\x1f'))),meta={id:q.id,version:q.version,subject:q.subject,domain:q.domain,mode:R.mode(q),prefixes};meta.fingerprint=sha([meta.id,meta.version,meta.subject,meta.domain,meta.mode,prefixes.join(':')].join('|'));return meta}
function find(id){return bank().find(q=>q.id===id)}
module.exports={bank,proof,find,sha};
