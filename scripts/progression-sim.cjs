#!/usr/bin/env node
// Monte Carlo-ish progression readiness model. Static/config QA only; it does not pretend to execute the browser battle loop.
const fs=require('fs'),vm=require('vm');
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('public/game-balance.js','utf8'),sandbox);
const B=sandbox.window.ForgeBalance;
const elements=[['fire',7,.95],['water',6,1],['earth',8,1.2],['wind',5,.65],['electric',6,.85],['shadow',10,1.1]];
const luck={
 bad:{tiers:[2,2,1,1,1,1],mix:.88},
 average:{tiers:[3,2,2,2,1,1],mix:1},
 good:{tiers:[5,4,3,3,2,2],mix:1.14}
};
const checkpoints={hour1:'hour1',hour3:'hour3',day7:'day7',day14:'day14',day30:'day30'};
function growth(s){return 1+.05*(s.level-1)+.2*s.stars}
function skill(s){return 1+.1*(s.skill-1)}
function baseDps(e,tier){const [name,atk,rate]=e,b=atk*Math.pow(2.6,tier-1),interval=rate/(1+tier*.1),elem=B.combat.element[name]||1,shadow=name==='shadow'?B.combat.shadowNormal*(1+B.combat.shadowCrit*(B.combat.critMultiplier-1)):1;return b/interval*elem*shadow}
function teamDps(snapshot,luckName){
 const L=luck[luckName],g=growth(snapshot),sk=skill(snapshot);
 return elements.reduce((sum,e,i)=>sum+baseDps(e,L.tiers[i]),0)*g*(.68+.32*sk)*L.mix;
}
function w30Need(diff){
 const d=B.difficulties[diff],p=1.22,def=.20,scale=B.waves.hpGrowth**29;
 const normals=B.waves.normalBaseHp*scale*d.hp*29/(1-.06);
 const boss=B.waves.bossBaseHp*scale*p*d.hp/(1-def);
 return (normals+boss)/d.final;
}
console.log('F2P READINESS MODEL');
for(const [when,key] of Object.entries(checkpoints)){
 const s=B.progression.snapshots[key];
 for(const l of Object.keys(luck)){
  const dps=teamDps(s,l);
  console.log(when,l,'teamIndex',Math.round(dps),'easy', (dps/w30Need('easy')).toFixed(2)+'x','normal',(dps/w30Need('normal')).toFixed(2)+'x','hard',(dps/w30Need('hard')).toFixed(2)+'x');
 }
}
console.log('\nContract: hour3 average should approach/clear Easy; day30 good should approach/clear Normal; day30 bad must not guarantee Normal.');
const h3=teamDps(B.progression.snapshots.hour3,'average')/w30Need('easy');
const d30g=teamDps(B.progression.snapshots.day30,'good')/w30Need('normal');
const d30b=teamDps(B.progression.snapshots.day30,'bad')/w30Need('normal');
if(h3<.90){console.error('WARN hour3 average below Easy target',h3.toFixed(2));process.exitCode=1}
if(d30g<.90){console.error('WARN day30 good below Normal target',d30g.toFixed(2));process.exitCode=1}
if(d30b>=1.15){console.error('WARN day30 bad luck guarantees Normal too easily',d30b.toFixed(2));process.exitCode=1}
