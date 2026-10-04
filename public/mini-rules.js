/* Deterministic one-second event simulation, mirrored by private.event_simulate.
   Currency is awarded from the database replay, never from a submitted score. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ForgeMiniRules=api})(typeof globalThis==='object'?globalThis:this,()=>{
'use strict';
const BASE=[8,10,0,7,9,1],SUPPORT=[11,3,2,4,5,6],COLORS=['#ff754a','#7edfff','#d5ab71','#75efa3','#ffe77b','#cba2ff','#ed83c5','#c3d6ed','#79eee1','#9aabff','#c6a2ff'];
const ORE=[1200,3500,8000,18000,45000,110000,260000],ORE_NAMES=['돌','청동','은','금','수정','다이아','고대 보석'];
const duration=k=>k==='luck'?90:60,element=t=>t>=12?t-6:Math.max(0,BASE.indexOf(t)>=0?BASE.indexOf(t):SUPPORT.indexOf(t));
const hash=(seed,t)=>(seed*16807+t*9973)%2147483647;
function unit(type,tier,growth={}){const e=element(type),key=type+':'+tier,level=growth.levels?.[key]||1,star=growth.balance>=60?Math.max(0,growth.unitStars?.[key]||0):Math.max(1,growth.unitStars?.[key]||1),rank=growth.skills?.[key+':1']||1,atk=[7,6,8,5,6,10,6,9,5,7,6][e],rate=[.95,1,1.2,.65,.85,1.1,1.1,1.25,1.15,1.3,1.1][e];return{type,tier,e,support:SUPPORT.includes(type),level,rank,star,dps:Math.floor(atk*Math.pow(2.6,tier-1)*1.5/rate*(growth.balance>=60?1+.05*(level-1)+.2*star:(1+.05*(level-1))*(1+.1*(star-1)))*(1+(growth.balance>=60?.10:.12)*(rank-1))*(1+.15*(tier-1))),reach:[1.8,2,1,1.5,1.8,1,1.8,1.2,1.8,2.2,1.5][e]*18,control:1+(growth.balance>=60?.10:.12)*(rank-1)}}
function roster(g,kind){return BASE.map(t=>unit(t,5,g))}
function draw(config,t){const r=hash(config.seed,t);if(config.legends===48)return unit(BASE[Math.floor(r/1000)%6],5,config.growth);const n=r%1000,tier=n<20?5:n<80?4:n<250?3:n<550?2:1,type=tier===5?Math.floor(r/1000)%17:BASE[Math.floor(r/1000)%6];return unit(type,tier,config.growth)}
function pos(slot){return{x:slot%2?40:20,y:30+Math.floor(slot/2)*20}}
function path(p,config){if(config?.formation===47){let d=((p%1)+1)%1*192;if(d<36)return{x:12+d,y:20};d-=36;if(d<60)return{x:48,y:20+d};d-=60;if(d<36)return{x:48-d,y:80};return{x:12,y:80-(d-36)}}let d=((p%1)+1)%1*280;if(d<50)return{x:5+d,y:5};d-=50;if(d<90)return{x:55,y:5+d};d-=90;if(d<50)return{x:55-d,y:95};return{x:5,y:95-(d-50)}}
function create(config){return{config,t:0,units:(config.formation===47||config.legends===48)?config.roster.slice(0,6).map((u,index)=>({...u,index})):Array(6).fill(null),actions:[],damage:0,gold:0,stage:0,hp:config.kind==='slime'?90000:config.kind==='mine'?ORE[0]:240,maxHp:config.kind==='slime'?90000:config.kind==='mine'?ORE[0]:240,kills:0,king:false,kingAt:null,spins:0,lastSpin:-8,progress:0,hits:[],history:[],unitDamage:{},life:30}}
function tick(s,actions=[]){const t=s.t,c=s.config;s.hits=[];
for(const a of actions){if(a.t!==t||!Number.isInteger(a.slot)||a.slot<0||a.slot>5)throw Error('잘못된 배치 기록');if(a.kind==='swap'&&c.controls===49){if(!Number.isInteger(a.from)||a.from<0||a.from>5)throw Error('잘못된 교환 기록');[s.units[a.from],s.units[a.slot]]=[s.units[a.slot],s.units[a.from]]}else if(a.kind==='place'&&c.kind!=='luck'){if(!Number.isInteger(a.index)||!c.roster[a.index])continue;const from=s.units.findIndex(u=>u?.index===a.index);if(from>=0&&from!==a.slot){if(c.formation!==47&&c.legends!==48)continue;[s.units[from],s.units[a.slot]]=[s.units[a.slot],s.units[from]]}else s.units[a.slot]={...c.roster[a.index],index:a.index}}else if(a.kind==='spin'&&c.kind==='luck'&&t-s.lastSpin>=8&&s.spins<12){const u=draw(c,t);s.units[a.slot]=u;s.spins++;s.lastSpin=t;s.history.push({...u,at:t})}}
let point=c.kind==='mine'?{x:30,y:50}:path(s.progress,c),total=0,control=0;
for(let i=0;i<6;i++){const u=s.units[i];if(!u)continue;const p=pos(i);if(c.kind!=='mine'&&Math.hypot(p.x-point.x,p.y-point.y)>u.reach)continue;let buff=1;
for(let j=0;j<6;j++){const b=s.units[j];if(!b?.support||Math.hypot(p.x-pos(j).x,p.y-pos(j).y)>40)continue;buff+=[.35,.25,.45,.55,.15,.25][b.e]||0}
let hit=Math.floor(u.dps*buff*(c.kind==='slime'?100/180*(c.formation===47?.5:2.4):1));if(c.kind==='slime'&&s.king)hit=0;if(c.kind==='mine'&&s.stage>=7)hit=0;total+=hit;s.unitDamage[u.type+':'+u.tier]=(s.unitDamage[u.type+':'+u.tier]||0)+hit;s.hits.push({slot:i,e:u.e,damage:hit,skill:t%6===0});if([1,2,3,4,6,8].includes(u.e))control=Math.max(control,Math.min(.65,.16*u.control+(u.e===1?.18:0)))}
s.damage+=total;
if(c.kind==='slime'){s.hp=Math.max(0,s.hp-total);const n=hash(c.seed,t)%1000,m=n<8?12:n<80?5:n<320?2:1;s.gold+=Math.floor(total/220)*m;if(s.hp===0&&!s.king){s.king=true;s.kingAt=t+1;s.gold+=150}if(!s.king)s.progress+=(c.controls===49?.070:.019)*(1-control)}
else if(c.kind==='mine'){let hit=total;while(hit>0&&s.stage<7){const take=Math.min(s.hp,hit);s.hp-=take;hit-=take;if(s.hp===0){s.stage++;s.hp=s.stage<7?ORE[s.stage]:0;s.maxHp=s.hp}}}
else{let hit=total;while(hit>0){const take=Math.min(s.hp,hit);s.hp-=take;hit-=take;if(s.hp===0){s.kills++;s.maxHp=240+s.kills*45;s.hp=s.maxHp}}s.progress+=(c.controls===49?.070:.03)*(1-control);if(s.progress>=1){s.progress=0;s.life--;s.hp=s.maxHp}}
s.t++;return s}
function replay(config,actions){if(!Array.isArray(actions)||actions.length>120)throw Error('행동 기록 초과');let last=-1;for(const a of actions){if(!Number.isInteger(a.t)||a.t<last||a.t<0||a.t>=duration(config.kind)||!['place','spin','swap'].includes(a.kind))throw Error('잘못된 행동 시간');last=a.t}const s=create(config);for(let t=0;t<duration(config.kind);t++)tick(s,actions.filter(a=>a.t===t));return s}
function field(s,actions){const copy={...s,units:s.units.map(u=>u?{...u}:null),unitDamage:{...s.unitDamage},history:[...s.history]};if(s.t<duration(s.config.kind))tick(copy,actions.filter(a=>a.t===s.t));return copy}
const grade=d=>d>=90000?'S':d>=55000?'A':d>=25000?'B':'C';
return{BASE,SUPPORT,COLORS,ORE,ORE_NAMES,duration,hash,unit,roster,draw,pos,path,create,tick,replay,field,grade};
});
