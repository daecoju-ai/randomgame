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

console.log('\nBase attack DPS by element/tier (before skills/talismans)');
const elements=[['fire',7,.95],['water',6,1],['earth',8,1.2],['wind',5,.65],['electric',6,.85],['shadow',10,1.1]];
for(let tier=1;tier<=5;tier++){
 const row=elements.map(([name,atk,rate])=>{
  const base=atk*Math.pow(2.6,tier-1),interval=rate/(1+tier*.1),dps=base/interval;
  const role=name==='shadow'?dps*(B.combat.shadowBoss*(1+B.combat.shadowCrit*(B.combat.critMultiplier-1))):dps;
  return name+':'+Math.round(role);
 });
 console.log('T'+tier,row.join(' | '));
}
console.log('\nW30 boss effective HP range');
const finalBoss=bossProfiles.at(-1);
for(const [key,d] of Object.entries(B.difficulties)){
 const raw=B.waves.bossBaseHp*B.waves.hpGrowth**29*finalBoss[1]*d.hp;
 const initial=effective(raw,finalBoss[2]),awakened=effective(raw,Math.min(.65,finalBoss[2]+.08));
 console.log(key,Math.round(initial)+' -> '+Math.round(awakened),'limit '+d.final+'s');
}

console.log('\nSupport stacking caps');
for(const [k,v] of Object.entries(B.supportCaps||{}))console.log(k,Math.round(v*100)+'%');
console.log('Rule: nearby duplicate support effects use strongest value; different support categories can combine only up to these caps.');

console.log('\nT5 ★20 ultimate baseline');
const q=B.ultimate;
for(const rank of [1,10,20]){
 const scale=1+.1*(rank-1);
 console.log('rank '+rank,'power '+Math.round(q.power*scale*100)+'%','duration '+(q.duration*scale).toFixed(1)+'s','MP '+q.mp,'CD '+q.cooldown+'s');
}


console.log('\nWave pressure / target clear-time audit');
const normalProfiles=[
 ['slime',1,.04],['bat',.70,0],['beetle',1.32,.14]
];
const checkpoints=[1,5,10,15,20,25,30];
for(const [key,diff] of Object.entries(B.difficulties)){
 console.log('\n['+key+']');
 for(const wave of checkpoints){
  const scale=B.waves.hpGrowth**(wave-1);
  const avgNormal=normalProfiles.reduce((sum,p)=>sum+effective(B.waves.normalBaseHp*scale*p[1]*diff.hp,p[2]),0)/normalProfiles.length;
  const wavePack=avgNormal*29;
  let boss=0;
  if(wave%5===0){const p=bossProfiles[wave/5-1];boss=effective(B.waves.bossBaseHp*scale*p[1]*diff.hp,p[2]);}
  const total=wavePack+boss;
  const target=wave<10?18:wave<20?22:wave<30?27:diff.final;
  console.log('W'+wave,'effective pack '+Math.round(total),'target team DPS '+Math.round(total/target),'target '+target+'s');
 }
}
console.log('\nDesign target: Easy ~= 60% Normal pressure, Hard ~= 145% Normal pressure after HP/speed/start-coin effects. 80 live monsters is a universal fail condition.');
