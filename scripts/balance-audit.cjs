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
  const elem=B.combat.element?.[name]??1,role=dps*elem*(name==='shadow'?(B.combat.shadowBoss*(1+B.combat.shadowCrit*(B.combat.critMultiplier-1))):1);
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

console.log('\nNormalized base DPS spread by tier');
for(let tier=1;tier<=5;tier++){
 const values=elements.map(([name,atk,rate])=>{const base=atk*Math.pow(2.6,tier-1),interval=rate/(1+tier*.1),raw=base/interval,elem=B.combat.element?.[name]??1;return [name,raw*elem*(name==='shadow'?B.combat.shadowBoss*(1+B.combat.shadowCrit*(B.combat.critMultiplier-1)):1)]});
 const nums=values.map(x=>x[1]),lo=Math.min(...nums),hi=Math.max(...nums),avg=nums.reduce((a,b)=>a+b,0)/nums.length;
 console.log('T'+tier,'avg '+avg.toFixed(1),'spread '+((hi/lo-1)*100).toFixed(1)+'%',values.map(x=>x[0]+':'+Math.round(x[1])).join(' | '));
}

console.log('\nRole-aware balance targets');
console.log('shadow: intentional single-target outlier; short range/no broad AoE. Do NOT normalize it to six-element average.');
console.log('shadow boss target: roughly 1.7x-2.3x sustained single-target DPS of generalist elements is acceptable.');
console.log('fire/electric: judge pack/AoE DPS; water: control-adjusted value; earth: durable burst/control; wind: attack cadence/cooldown value.');


console.log('\nRange contract');
console.log('earth 1 / shadow 1 = melee 1 tile');
console.log('wind 2 / electric 2 = mid 2 tiles');
console.log('fire 3 / water 3 = ranged 3 tiles');

console.log('\nDisplayed-vs-runtime damage contract');
console.log('single/area/wave/ice/stun/global: displayed power = combatAttack * skill power before monster defense/vulnerability.');
console.log('strike,bossStrike: displayed 2x and runtime factor 2x.');
console.log('meteor: displayed 1.5x and runtime factor 1.5x.');
console.log('burst: displayed total 2x and runtime repeats sum to 2x.');
console.log('tidal/flurry: displayed total power and runtime repeats sum to 1x.');
console.log('execute: displayed 1x; <=30% HP runtime 4x normal / 2x boss.');
console.log('All hero damage then passes element/shadow/crit modifiers and monster defense/vulnerability exactly once.');


console.log('\nCombat role hierarchy');
console.log('support final-form personal offense multiplier:',B.combat.supportAttack,'(buff/control utility excluded from personal DPS)');
console.log('single-target active skill multiplier:',B.combat.singleSkill,'(highest direct skill damage class)');
console.log('Rule: support personal DPS < attack-form personal DPS; single-target direct skills > equal-rank AoE/control direct hit.');
console.log('Shadow remains an intentional boss/single-target specialist on top of the single-target premium.');


console.log('\nRole regression checks');
const fail=[];
if(!(B.combat.supportAttack>0&&B.combat.supportAttack<1))fail.push('supportAttack must stay below attacker baseline');
if(!(B.combat.singleSkill>1))fail.push('single-target premium must exceed AoE/control direct-hit baseline');
if(!(B.combat.shadowBoss>B.combat.shadowNormal))fail.push('shadow boss multiplier must exceed normal multiplier');
if(!Object.values(B.difficulties).every(d=>d.cap===80))fail.push('all modes must use 80-monster fail cap');
if(fail.length){console.error('FAIL',fail.join(' | '));process.exitCode=1}else console.log('PASS support < attacker; single > AoE/control; shadow boss > shadow normal; cap=80');


console.log('\nDeterministic combat QA matrix');
const defenseTargets=[['slime',.04,false],['beetle',.14,false],['W30',.20,true],['W30-phase',.28,true]];
const directEffects={single:1,ice:1,strike:2,burst:2,bossStrike:2,deathMark:2,execute:1,area:1,wave:1,stun:1,chain:1,meteor:1.5,tidal:1,flurry:1};
const roleMult=effect=>['single','ice','strike','burst','bossStrike','deathMark','execute','mark'].includes(effect)?B.combat.singleSkill:1;
const expectedHit=(element,raw,targetDef,boss=false)=>{
 const elem=B.combat.element?.[element]??1;
 const shadow=element==='shadow'?(boss?B.combat.shadowBoss:B.combat.shadowNormal):1;
 return raw*elem*shadow*(1-targetDef);
};
for(const tier of [1,3,5]){
 console.log('T'+tier);
 for(const [element,atk,rate] of elements){
  const base=atk*Math.pow(2.6,tier-1),effect=element==='shadow'?'strike':'single',shown=base*roleMult(effect)*(directEffects[effect]||1);
  const cells={fire:3,water:3,earth:1,wind:2,electric:2,shadow:1}[element];
  const targetText=defenseTargets.map(([name,def,boss])=>name+':'+expectedHit(element,shown,def,boss).toFixed(1)).join(' | ');
  console.log(element,'range '+cells,'shown '+shown.toFixed(1),'->',targetText);
 }
}
console.log('Note: deterministic QA excludes random crit from exact equality; shadow crit is audited separately as expected-value DPS.');

console.log('\n30-wave pressure gates');
let previous=0;
for(const wave of Array.from({length:30},(_,i)=>i+1)){
 const scale=B.waves.hpGrowth**(wave-1),avg=normalProfiles.reduce((sum,p)=>sum+effective(B.waves.normalBaseHp*scale*p[1],p[2]),0)/normalProfiles.length;
 const boss=wave%5===0?(()=>{const p=bossProfiles[wave/5-1];return effective(B.waves.bossBaseHp*scale*p[1],p[2])})():0,total=avg*29+boss;
 if(total<previous*.82)console.error('WARN pressure drop W'+wave,Math.round(previous),'->',Math.round(total));
 previous=total;
 if(wave===1||wave%5===0)console.log('W'+wave,'normal effective pack',Math.round(total));
}


console.log('\nSkill semantic checks');
const skillContracts={
 fire:['single','area','multi','burnZone'],
 water:['single','wave','ice','freezeZone'],
 earth:['single','mud','burst','stun'],
 wind:['single','stun','speed','pullZone'],
 electric:['single','chain','chain','stormZone'],
 shadow:['single','strike','clone','mark']
};
const expectedRoles={fire:'AoE/burn',water:'control',earth:'heavy/control',wind:'speed/cooldown',electric:'chain/stun',shadow:'single/boss'};
for(const [element,effects] of Object.entries(skillContracts)){
 const singleCount=effects.filter(x=>['single','ice','strike','burst'].includes(x)).length;
 console.log(element,expectedRoles[element],effects.join(','),'direct-single-like',singleCount);
}
console.log('PASS semantic intent table emitted; runtime definitions should preserve these element identities.');


console.log('\nT5 attack-vs-support personal DPS guard');
for(const [element,atk,rate] of elements){
 const base=atk*Math.pow(2.6,4),interval=rate/(1+5*.1),elem=B.combat.element?.[element]??1,shadowBoss=element==='shadow'?B.combat.shadowBoss*(1+B.combat.shadowCrit*(B.combat.critMultiplier-1)):1;
 const attackDps=base/interval*elem*shadowBoss,supportDps=attackDps*B.combat.supportAttack;
 const ratio=supportDps/attackDps;
 console.log(element,'attack',attackDps.toFixed(1),'support',supportDps.toFixed(1),'ratio',ratio.toFixed(2));
 if(ratio>=.70){console.error('FAIL '+element+' support personal DPS ceiling too high');process.exitCode=1}
}
console.log('Target: support-form personal basic DPS <= 70% of same-element attack-form; current design target 55%.');

console.log('\nSingle-vs-AoE direct skill guard');
for(const rank of [1,10,20]){
 const scale=1+.1*(rank-1),single=scale*B.combat.singleSkill,aoe=scale;
 console.log('rank',rank,'single',single.toFixed(2)+'x','AoE/control',aoe.toFixed(2)+'x','premium',((single/aoe-1)*100).toFixed(0)+'%');
 if(single<=aoe){console.error('FAIL single-target skill must exceed AoE/control direct hit');process.exitCode=1}
}


console.log('\nSpecial-unit premium audit');
const specials=[
 ['poison','독화여왕 베노라',6,1.1,2,200],
 ['metal','강철심판관 페로스',9,1.25,1,200],
 ['time','시계술사 크로니아',5,1.15,2,250],
 ['star','성운지기 아스트라',7,1.3,3,250],
 ['void','공허군주 니힐',6,1.1,2,300]
];
for(const [id,name,atk,rate,range,price] of specials){
 const base=atk*Math.pow(2.6,4),dps=base/(rate/(1+5*.1)),premium=dps*B.combat.specialUnit;
 console.log(name,id,'range '+range,'price '+price,'baseDPS '+dps.toFixed(1),'premiumDPS '+premium.toFixed(1),'bonus '+Math.round((B.combat.specialUnit-1)*100)+'%');
}
if(!(B.combat.specialUnit>1&&B.combat.specialUnit<=1.25)){console.error('FAIL special unit premium should be meaningful but controlled (1.01-1.25)');process.exitCode=1}
console.log('Rule: special units receive a controlled premium on top of unique mechanics; premium must not erase shadow single-target/boss identity.');


console.log('\nSpecial purchase-tier value gates');
let last=0;
for(const [id,name,atk,rate,range,price] of specials){
 const tier=B.combat.specialPremium?.[id]??1,total=B.combat.specialUnit*tier;
 const base=atk*Math.pow(2.6,4)/(rate/(1+5*.1)),premium=base*total;
 console.log(name,'price',price,'premium',total.toFixed(3)+'x','T5 personal DPS',premium.toFixed(1),'role range',range);
 if(price>=250&&total<1.20){console.error('FAIL '+name+' premium too low for 250+ price tier');process.exitCode=1}
 if(price>=300&&total<1.30){console.error('FAIL '+name+' premium too low for 300 price tier');process.exitCode=1}
 if(price>last&&last>0){} last=price;
}
console.log('Intent: 200 tier = unique mechanic +18%; 250 tier ~= +25%; 300 tier ~= +32%, while shadow keeps the dedicated boss/single-target ceiling.');


console.log('\nMAX-account difficulty audit (Lv30 / skill20 / star20 / talisman caps)');
const maxGrowth=1+.05*29+.2*20; // 6.45x persistent attack
const maxSkill=1+.1*19; // 2.9x rank scaling
const maxBattle=1.10; // run upgrade 10/10
const maxSupport=1+B.supportCaps.attack;
const maxSpeed=1+B.supportCaps.speed;
const maxSkillHaste=1/(1-B.supportCaps.haste);
console.log('persistent attack',maxGrowth.toFixed(2)+'x','skill rank',maxSkill.toFixed(2)+'x','run attack',maxBattle.toFixed(2)+'x','support attack',maxSupport.toFixed(2)+'x','support speed',maxSpeed.toFixed(2)+'x','haste throughput',maxSkillHaste.toFixed(2)+'x');
const maxBasicEnvelope=maxGrowth*maxBattle*maxSupport*maxSpeed;
const maxSkillEnvelope=maxBasicEnvelope*maxSkill*maxSkillHaste;
console.log('theoretical max basic envelope',maxBasicEnvelope.toFixed(1)+'x','active-skill envelope',maxSkillEnvelope.toFixed(1)+'x');
const difficultyPressure={easy:.50*.80,normal:1,hard:1.45*1.08};
for(const [id,d] of Object.entries(B.difficulties)){
 const pressure=d.hp*d.speed;
 const relative=pressure/difficultyPressure.normal;
 const finalWindow=d.final;
 console.log(id,'HP',d.hp+'x','speed',d.speed+'x','pressure',pressure.toFixed(2)+'x','start',d.start,'waveCoin',d.waveCoin,'W30',finalWindow+'s','rewardGold',d.gold+'x','bossDia',d.diamonds);
}
if(B.difficulties.hard.hp<1.55){console.error('WARN max-account hard HP may be too forgiving below 1.55x; live simulation required before raising.')}
if(B.difficulties.easy.hp>.55){console.error('FAIL easy should remain onboarding-friendly');process.exitCode=1}
console.log('Design target at MAX account: Easy = comfortable/farm, Normal = reliable but placement-sensitive, Hard = optimized roster/support/positioning required; max progression must not imply automatic Hard clear.');


console.log('\nF2P progression pacing targets');
const prog=B.progression;
const levelTotal=tier=>Array.from({length:29},(_,i)=>i+1).reduce((s,lv)=>s+Math.max(1,Math.round(lv*12*(prog.levelGoldScale[tier]??1))),0);
const skillTotal=tier=>Array.from({length:19},(_,i)=>i+1).reduce((s,r)=>s+Math.max(1,Math.round(r*2*tier*(prog.skillDiamondScale[tier]??1))),0);
for(let tier=1;tier<=5;tier++)console.log('T'+tier,'Lv1-30 gold',levelTotal(tier),'one skill 1-20 diamonds',skillTotal(tier));
console.log('Easy target:',prog.freeTarget.easyHours,'active hours to first clear with focused T1-T3 growth; lucky T4/T5 draw may accelerate but is not required.');
console.log('Normal target:',prog.freeTarget.normalDays,'days F2P with favorable T1-T5 draw/upgrade allocation; not a guaranteed calendar-day clear.');
if(!(B.difficulties.easy.hp<=.45&&B.difficulties.easy.gold>=.8)){console.error('FAIL easy pacing must support early free progression');process.exitCode=1}
if(!(B.difficulties.normal.hp>=1&&B.difficulties.normal.final<=90)){console.error('FAIL normal should remain a month-scale progression gate');process.exitCode=1}


console.log('\nF2P checkpoint combat-power audit');
const snap=B.progression.snapshots;
for(const [when,s] of Object.entries(snap)){
 const growth=1+.05*(s.level-1)+.2*s.stars;
 const skill=1+.1*(s.skill-1);
 const score=growth*skill;
 console.log(when,'Lv'+s.level,'★'+s.stars,'skill'+s.skill,'growth '+growth.toFixed(2)+'x','skill '+skill.toFixed(2)+'x','powerIndex '+score.toFixed(2));
}
const p1=(1+.05*(snap.hour1.level-1)+.2*snap.hour1.stars)*(1+.1*(snap.hour1.skill-1));
const p3=(1+.05*(snap.hour3.level-1)+.2*snap.hour3.stars)*(1+.1*(snap.hour3.skill-1));
const p30=(1+.05*(snap.day30.level-1)+.2*snap.day30.stars)*(1+.1*(snap.day30.skill-1));
if(!(p3>=p1*1.5)){console.error('FAIL first 3 hours do not provide enough visible combat growth');process.exitCode=1}
if(!(p30>=p3*2)){console.error('FAIL month-one growth is too flat versus first-clear progression');process.exitCode=1}
console.log('Pacing contract: hour3 should support Easy first-clear attempts; day30 + favorable T1-T5 draw should support Normal first-clear attempts. These checkpoints are QA targets, not guaranteed rewards.');
