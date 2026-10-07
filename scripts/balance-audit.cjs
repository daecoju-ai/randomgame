#!/usr/bin/env node
// Offline balance audit. Reads only repo static rules; never touches Supabase.
const fs=require('fs'),vm=require('vm');
const sandbox={window:{}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/game-balance.js','utf8'),sandbox);
const B=sandbox.window.ForgeBalance;
const bossProfiles=[
 ['W5 불꽃군주',1,.12],['W10 서리왕',.90,.08],['W15 바위왕',1.30,.27],
 ['W20 폭풍뱀',.95,.06],['W25 뇌룡',1.12,.18],['W30 흑월여왕',1.22,.20]
];
const effective=(hp,def)=>hp/(1-def);
console.log('BALANCE SCHEMA',B.schema);
console.log('wave,difficulty,rawBossHP,effectiveBossHP,finalSeconds,monsterCap');
for(const [idx,p] of bossProfiles.entries()){
 const wave=(idx+1)*5,scale=B.waves.hpGrowth**(wave-1);
 for(const [key,d] of Object.entries(B.difficulties)){
  const raw=B.waves.bossBaseHp*scale*p[1]*d.hp;
  console.log([wave,key,Math.round(raw),Math.round(effective(raw,p[2])),d.final,d.cap].join(','));
 }
}
console.log('\nPersistent attack multipliers');
for(const [name,lv,stars] of [['신규',1,0],['초기성장',10,3],['중간성장',20,8],['후반성장',30,15],['최대',30,20]]){
 console.log(name,(1+.05*(lv-1)+.2*stars).toFixed(2)+'x');
}
