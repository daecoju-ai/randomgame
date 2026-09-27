// Evolution adds skills; final forms retain all four inherited skills.
const INHERITED={
 fire:[['화염탄','single'],['화염 폭발','area'],['연속 화염탄','multi'],['화염 폭풍','burnZone']],
 water:[['물방울','single'],['물의 파도','wave'],['얼음 화살','ice'],['빙결 구역','freezeZone']],
 earth:[['바위 던지기','single'],['진흙 구역','mud'],['바위 폭주','burst'],['지진 충격','stun']],
 wind:[['바람 칼날','single'],['회오리','stun'],['가속의 바람','speed'],['토네이도','pullZone']],
 electric:[['전기구체','single'],['감전','chain'],['연쇄 번개','chain'],['전기 폭풍','stormZone']],
 shadow:[['암흑 단검','single'],['암흑 돌진','strike'],['그림자 분신','clone'],['암흑 낙인','mark']]
};
const FINAL_SKILLS={
 fire:{attack:[['종말의 화염','globalFire'],['불의 심판','burn'],['멸화 폭풍','burnZone']],support:[['불의 축복','attackAura'],['재생의 불꽃','healAura'],['불사조의 가호','fury']]},
 water:{attack:[['심해의 포효','globalWave'],['절대빙결','freeze'],['대해일','tidal']],support:[['생명의 샘','healAll'],['정화의 물결','cleanse'],['물의 보호막','shield']]},
 earth:{attack:[['대지의 분노','rupture'],['산의 붕괴','meteor'],['지반 파괴','shatter']],support:[['대지의 생명력','healthAura'],['대지의 결계','defenseAura'],['자연의 부활','renew']]},
 wind:{attack:[['폭풍의 눈','pullZone'],['진공 난무','flurry'],['천공 회오리','airborne']],support:[['바람의 축복','speedAura'],['신속의 바람','swift'],['바람의 보호','evadeAura']]},
 electric:{attack:[['천벌의 심판','globalThunder'],['연쇄 천벌','chain'],['신의 낙뢰','bossStrike']],support:[['빛의 축복','dualAura'],['신성한 보호막','guard'],['치유의 빛','heal']]},
 shadow:{attack:[['죽음의 표식','deathMark'],['그림자 참살','burst'],['암흑 처형','execute']],support:[['그림자의 저주','curse'],['암흑 결계','weaken'],['영혼의 속박','bind']]}
};
const PASSIVES=['speed','clone','attackAura','healAura','healAll','healthAura','defenseAura','speedAura','evadeAura','dualAura'];
function definitions(u){const e=elementFor(u.type);return [...INHERITED[e.id],...(u.lv===5?FINAL_SKILLS[e.id][isSupport(u)?'support':'attack']:[])].map(([name,effect],i)=>({name,effect,slot:i,tier:i<4?i+1:5,unlock:i<4?1:[1,10,20][i-4],active:!PASSIVES.includes(effect)}))}
const SUMMON_WEIGHTS=[7000,2000,700,250,50];
const SUMMON_ODDS='T1 70% · T2 20% · T3 7% · T4 2.5% · T5 0.5%';
function rollSummonTier(random=Math.random){const roll=random()*10000;let total=0;for(let i=0;i<SUMMON_WEIGHTS.length;i++){total+=SUMMON_WEIGHTS[i];if(roll<total)return i+1}return 5}
function skillKey(u,i){return `${u.type}:${u.lv}:${i}`}
function skillRank(u,i){return validHero(u.type,u.lv)&&getLv(u.type,u.lv)>=skillUnlockLevel(u.lv,i)?(heroSkills[skillKey(u,i)]||1):0}
function skillCost(u,i){return skillRank(u,i)*10*u.lv}
function skillStats(def,rank,u){const r=Math.max(1,rank),final=def.slot>=4,awakened=u&&u.lv===5&&getLv(u.type,5)>=30&&def.slot===4,scale=awakened?1.5:1;
 return{power:(final?4+def.slot*.5:1+def.slot*.3)*(1+.12*(r-1))*scale,radius:(final?125:70)+r*3,stun:(final?1.8:.45)+r*.06,duration:(final?5:3)+r*.15,targets:Math.min(12,3+Math.ceil(r/2)),bonus:(.12+.025*r)*scale,heal:(.015+.003*r)*scale,shield:(.2+.025*r)*scale,mp:final?40:15+def.slot*4,cooldown:final?18+def.slot:6+def.slot*2,awakened};
}
function skillDescription(def,rank,u){const v=skillStats(def,rank,u),p=Math.round(v.power*100),b=Math.round(v.bonus*100),dur=v.duration.toFixed(1),a=`반경 ${v.radius}`,f=def.effect;const text={
 single:`단일 적 ${p}% 피해`,area:`${a} 광역 ${p}% 피해`,multi:`사거리 내 서로 다른 적 ${v.targets}명에 ${p}% 화염탄`,wave:`전방 부채꼴 ${p}% 피해`,ice:`단일 ${p}% 피해 · ${dur}초 45% 감속`,mud:`${a} 진흙 지대 · ${dur}초 45% 감속`,burst:`단일 대상 ${v.targets}회 연속 공격 · 합계 ${p*2}% 피해`,strike:`단일 ${p*2}% 피해`,stun:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 기절`,chain:`가까운 적 최대 ${v.targets}명 · ${p}% 연쇄 피해 · 기절·감전`,speed:`자신 공격속도 +${b}%`,clone:`분신이 기본 공격의 ${b*2}%로 추가 공격`,mark:`대상 ${dur}초 받는 피해 +${b}%`,
 burnZone:`${a} 불꽃 지대 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,freezeZone:`${a} 빙결 구역 · 매초 ${Math.round(p*.15)}% 피해 · 초당 35% 확률 빙결`,pullZone:`${a} 회오리 · 중앙으로 흡입 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,stormZone:`${a} 번개 지대 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,
 globalFire:`맵 전체 ${p}% 화염 피해 + 화상`,globalWave:`맵 전체 ${p}% 해일 피해`,globalThunder:`맵 전체 ${p}% 번개 피해 + 기절`,burn:`${a} ${p}% 폭발 + ${dur}초 화상`,freeze:`${a} ${v.stun.toFixed(1)}초 확정 동결`,tidal:`${a} 적을 뒤로 밀며 3회 합계 ${p}% 피해`,rupture:`${a} ${p}% 대지 광역 피해`,meteor:`${a} ${p*1.5}% 바위 낙하`,shatter:`${a} ${p}% 피해 · ${dur}초 방어 약화 +${b}% 받는 피해`,flurry:`${a} 5연격 · 합계 ${p}% 피해`,airborne:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 띄우기`,bossStrike:`보스 우선 단일 ${p*2}% 집중 낙뢰`,deathMark:`강한 적 우선 표식 · 2초 뒤 ${p*2}% 폭발`,execute:`단일 ${p}% 피해 · HP 30% 이하 4배 (보스 2배)`,
 attackAura:`아군 전체 공격력 +${b}%`,healAura:`${a} 아군 초당 최대 HP ${+(v.heal*100).toFixed(1)}% 회복`,healAll:`아군 전체 초당 최대 HP ${+(v.heal*100).toFixed(1)}% 회복`,healthAura:`아군 전체 최대 HP +${b*2}%`,defenseAura:`아군 전체 받는 피해 ${b}% 감소`,speedAura:`아군 전체 공격속도 +${b}%`,dualAura:`아군 전체 공격력·공격속도 +${b}%`,evadeAura:`아군 전체 회피 +${b}% · 원거리 피해 ${b}% 감소`,
 fury:`${dur}초 아군 전체 공격력·공격속도 +${b*2}%`,cleanse:`아군 전체 감속·기절 해제 + HP ${Math.round(v.heal*500)}% 회복`,shield:`${dur}초 아군 전체 최대 HP ${Math.round(v.shield*100)}% 흡수 보호막`,renew:`${a} 아군 HP ${Math.round(v.heal*800)}% 회복 + ${dur}초 상태이상 저항`,swift:`${dur}초 아군 공격속도 +${b}% · 이동 반응 가속 +${b}% (고정 배치 전투에서는 감속 저항)`,guard:`${dur}초 아군 전체 받는 피해 ${b*2}% 감소`,heal:`${a} 아군 HP ${Math.round(v.heal*800)}% 회복`,curse:`맵 전체 적 ${dur}초 방어 약화 · 받는 피해 +${b}%`,weaken:`${a} 적 ${dur}초 공격력 ${b*2}% 감소`,bind:`맵 전체 적 ${dur}초 이동 45% 감속 · 공격속도 ${b*2}% 감소`
 };return text[f]||f;
}
function skillRows(u){return definitions(u).map(def=>{const rank=skillRank(u,def.slot);return{...def,rank,unlocked:rank>0,available:def.tier<=u.lv,description:skillDescription(def,rank||1,u)}})}
function levelUpSkill(type,tier,i){if(started&&!ended||typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed())return false;if(!Number.isInteger(i)||!validHero(type,tier))return false;const u={type,lv:tier},rank=skillRank(u,i),cost=skillCost(u,i);if(!rank||rank>=10||essence<cost)return false;essence-=cost;heroSkills[skillKey(u,i)]=rank+1;saveMeta();playSound('levelUp');renderHeroLab();return true}
function prepareSkills(u){if(!Number.isFinite(u.mp))u.mp=0;if(!u.skillCD)u.skillCD=Array(7).fill(0);if(!Number.isInteger(u.skillCursor))u.skillCursor=0;if(!u.buffs)u.buffs={}}
function skillModifiers(u){const result={attack:0,speed:0,mana:0,haste:0,heal:0,health:0,defense:0,evade:0,ranged:0,clone:0,resist:0};
 const add=(key,value)=>result[key]=Math.max(result[key],value);
 for(const ally of units){if(ally.disabled>0)continue;for(const def of definitions(ally)){const rank=skillRank(ally,def.slot);if(!rank||def.active)continue;const v=skillStats(def,rank,ally),near=d(slot(u.slot),slot(ally.slot))<=v.radius;
  if(ally===u&&def.effect==='speed')add('speed',v.bonus);if(ally===u&&def.effect==='clone')add('clone',v.bonus*2);
  if(['attackAura','dualAura'].includes(def.effect))add('attack',v.bonus);
  if(['speedAura','dualAura'].includes(def.effect))add('speed',v.bonus);
  if(def.effect==='healthAura')add('health',v.bonus*2);if(def.effect==='defenseAura')add('defense',v.bonus);
  if(def.effect==='evadeAura'){add('evade',v.bonus);add('ranged',v.bonus)}
  if(def.effect==='healAll'||def.effect==='healAura'&&near)add('heal',v.heal);
 }}
 for(const buff of Object.values(u.buffs||{})){if(buff.time<=0)continue;for(const key in result)if(buff[key])add(key,buff[key])}
 result.defense=Math.min(.7,result.defense);result.evade=Math.min(.5,result.evade);return result;
}
function combatAttack(u){return battleAttack(u)*(1+skillModifiers(u).attack)}
let skillZones=[];
function nearestTarget(u,strongest=false){const alive=mobs.filter(m=>m.hp>0);return strongest?alive.sort((a,b)=>Number(!!b.boss)-Number(!!a.boss)||b.hp-a.hp)[0]:alive.filter(m=>d(slot(u.slot),m)<=battleRange(u)).sort((a,b)=>b.p-a.p)[0]}
function skillDamage(enemy,amount){hit(enemy,amount,'skill')}
function showSkill(u,def,v,target){const origin=slot(u.slot),color=U[u.type].accent;skillEffects.push({x:target?.x??origin.x,y:target?.y??origin.y,r:v.radius,t:.55,color});floaters.push({x:origin.x,y:origin.y-30,t:1,s:def.name+(v.awakened?' ✦':''),col:color});playSound('hit',U[u.type].kind)}
function castHeroSkill(u,def,rank,target){const v=skillStats(def,rank,u),origin=slot(u.slot),damage=combatAttack(u)*v.power,f=def.effect;let targets=[];
 const support=['fury','cleanse','shield','renew','swift','guard','heal'];
 if(support.includes(f)){for(const ally of units){prepareSkills(ally);if(ally.disabled>0)continue;if(['renew','heal'].includes(f)&&d(origin,slot(ally.slot))>v.radius)continue;
  if(['cleanse','renew','heal'].includes(f))ally.hp=Math.min(ally.maxHP,ally.hp+ally.maxHP*v.heal*(f==='cleanse'?5:8));
  if(f==='cleanse'){ally.stun=0;ally.slow=0}if(f==='renew')ally.buffs.resist={time:v.duration,resist:1};
  if(f==='shield'){ally.shield=Math.max(ally.shield||0,ally.maxHP*v.shield);ally.shieldTime=v.duration}
  if(f==='fury')ally.buffs.fury={time:v.duration,attack:v.bonus*2,speed:v.bonus*2};
  if(f==='swift')ally.buffs.swift={time:v.duration,speed:v.bonus,resist:v.bonus};
  if(f==='guard')ally.buffs.guard={time:v.duration,defense:v.bonus*2};
 }showSkill(u,def,v,origin);return}
 if(!target)return;
 if(['bossStrike','deathMark'].includes(f))target=nearestTarget(u,true)||target;
 const all=mobs.filter(m=>m.hp>0);
 if(f.startsWith('global')||['curse','bind'].includes(f))targets=all;
 else if(f==='chain'){let current=target;while(current&&targets.length<v.targets){targets.push(current);current=all.filter(m=>!targets.includes(m)&&d(m,current)<=v.radius).sort((a,b)=>d(a,current)-d(b,current))[0]}}
 else if(f==='multi')targets=all.filter(m=>d(origin,m)<=battleRange(u)).sort((a,b)=>b.p-a.p).slice(0,v.targets);
 else if(f==='wave'){const dx=target.x-origin.x,dy=target.y-origin.y,len=Math.hypot(dx,dy)||1;targets=all.filter(m=>{const dist=d(origin,m);return dist<=battleRange(u)&&((m.x-origin.x)*dx+(m.y-origin.y)*dy)/(len*(dist||1))>=.55})}
 else if(['single','ice','strike','burst','mark','execute','bossStrike','deathMark'].includes(f))targets=[target];
 else targets=all.filter(m=>d(m,target)<=v.radius);
 if(['burnZone','freezeZone','pullZone','stormZone','mud'].includes(f)){skillZones.push({effect:f,x:target.x,y:target.y,p:target.p,radius:v.radius,time:v.duration,damage:damage*(f==='freezeZone'?.15:.3),tick:0,v,color:U[u.type].accent});showSkill(u,def,v,target);return}
 if(f==='deathMark'){target.deathMark={time:2,damage:damage*2};showSkill(u,def,v,target);return}
 const noDamage=['mark','freeze','curse','weaken','bind'];
 for(const enemy of targets){
  const factor=f==='execute'&&enemy.hp/enemy.max<=.3?(enemy.boss?2:4):['strike','bossStrike'].includes(f)?2:f==='meteor'?1.5:1;
  if(!noDamage.includes(f)){const repeats=f==='burst'?v.targets:f==='tidal'?3:f==='flurry'?5:1;for(let j=0;j<repeats;j++)skillDamage(enemy,damage*factor*(f==='burst'?2:1)/repeats)}
  if(['stun','freeze','airborne','chain','globalThunder'].includes(f))enemy.stun=Math.max(enemy.stun||0,v.stun*(enemy.boss?.5:1));
  if(['ice','bind','freeze'].includes(f))enemy.slow=Math.max(enemy.slow||0,v.duration);
  if(['burn','globalFire','chain'].includes(f)){enemy.dotTime=Math.max(enemy.dotTime||0,v.duration);enemy.dotDps=Math.max(enemy.dotDps||0,damage*.2)}
  if(['mark','shatter','curse'].includes(f)){enemy.vulnerableTime=Math.max(enemy.vulnerableTime||0,v.duration);enemy.vulnerability=Math.max(enemy.vulnerability||0,v.bonus)}
  if(f==='weaken'){enemy.weakenTime=v.duration;enemy.weakness=Math.min(.7,v.bonus*2)}
  if(f==='bind'){enemy.attackSlowTime=v.duration;enemy.attackSlow=Math.min(.7,v.bonus*2)}
  if(f==='tidal'){enemy.p=Math.max(0,enemy.p-.06);Object.assign(enemy,path(enemy.p))}
 }
 showSkill(u,def,v,target);
}
function tickSkillZones(dt){for(const m of mobs){if(m.deathMark){m.deathMark.time-=dt;if(m.deathMark.time<=0){skillDamage(m,m.deathMark.damage);delete m.deathMark}}}
 for(const z of skillZones){const elapsed=Math.min(dt,z.time);z.time-=elapsed;z.tick-=elapsed;
  for(const m of mobs){if(m.hp<=0||d(m,z)>z.radius)continue;if(z.effect==='mud'){m.slow=Math.max(m.slow||0,.5);continue}skillDamage(m,z.damage*elapsed);
   if(z.effect==='pullZone'){const target=z.p??m.p,delta=((target-m.p+.5)%1+1)%1-.5;m.p+=Math.sign(delta)*Math.min(Math.abs(delta),elapsed*.06);Object.assign(m,path(m.p));m.slow=Math.max(m.slow||0,.3)}
   if(z.effect==='freezeZone'&&z.tick<=0&&Math.random()<.35)m.stun=Math.max(m.stun||0,z.v.stun*(m.boss?.5:1));
  }if(z.tick<=0){z.tick=1;skillEffects.push({x:z.x,y:z.y,r:z.radius,t:.55,color:z.color})}
 }skillZones=skillZones.filter(z=>z.time>0);
}
function tickHeroSkills(u,dt){prepareSkills(u);if(u.disabled>0||u.stun>0)return;u.mp=Math.min(100,u.mp+dt*12);u.skillCD=u.skillCD.map(v=>Math.max(0,v-dt));const defs=definitions(u);
 for(let offset=0;offset<defs.length;offset++){const i=(u.skillCursor+offset)%defs.length,def=defs[i],rank=skillRank(u,i);if(!rank||!def.active)continue;const v=skillStats(def,rank,u);if(u.mp<v.mp||u.skillCD[i]>0)continue;
  const friendly=['fury','cleanse','shield','renew','swift','guard','heal'].includes(def.effect),global=def.effect.startsWith('global')||['curse','bind','bossStrike','deathMark'].includes(def.effect),target=global?mobs.find(m=>m.hp>0):nearestTarget(u);
  if(!friendly&&!target)continue;if(friendly&&!mobs.some(m=>m.hp>0))continue;
  u.mp-=v.mp;u.skillCD[i]=v.cooldown;u.skillCursor=(i+1)%defs.length;castHeroSkill(u,def,rank,target);break;
 }
}
function tickBattleHealth(dt){
 for(const u of units){prepareSkills(u);const mods=skillModifiers(u),max=(120+u.lv*70)*(1+mods.health);if(!Number.isFinite(u.hp)){u.hp=max;u.maxHP=max}else{const ratio=u.hp/(u.maxHP||max);u.maxHP=max;u.hp=Math.min(max,ratio*max)}
  u.disabled=Math.max(0,(u.disabled||0)-dt);if(u.hp<=0&&u.disabled<=0)u.hp=max*.5;
  u.stun=Math.max(0,(u.stun||0)-dt);u.slow=Math.max(0,(u.slow||0)-dt);u.shieldTime=Math.max(0,(u.shieldTime||0)-dt);if(!u.shieldTime)u.shield=0;
  for(const key of Object.keys(u.buffs)){u.buffs[key].time-=dt;if(u.buffs[key].time<=0)delete u.buffs[key]}
  if(u.disabled<=0)u.hp=Math.min(max,u.hp+max*(mods.heal+.002)*dt);
 }
 for(const m of mobs){if(m.hp<=0||m.stun>0)continue;m.attackCD=(m.attackCD??2)-dt*(m.attackSlowTime>0?1-(m.attackSlow||0):1);if(m.attackCD>0)continue;
  const candidates=units.filter(u=>u.disabled<=0&&d(slot(u.slot),m)<(m.boss?350:200));const u=candidates.sort((a,b)=>d(slot(a.slot),m)-d(slot(b.slot),m))[0];if(!u)continue;m.attackCD=m.boss?2.5:4;
  const mods=skillModifiers(u);if(Math.random()<mods.evade)continue;let damage=(m.boss?35:8)*(1+S.wave*.05)*(m.weakenTime>0?1-(m.weakness||0):1)*(1-mods.defense)*(1-mods.ranged);
  const absorb=Math.min(u.shield||0,damage);u.shield=(u.shield||0)-absorb;damage-=absorb;u.hp=Math.max(0,u.hp-damage);
  if(m.boss&&mods.resist<1){u.slow=2*(1-mods.resist);u.stun=.4*(1-mods.resist)}
  if(u.hp<=0){u.disabled=6;u.shield=0;floaters.push({...slot(u.slot),t:1,s:'6초 기절',col:'#ffd6c9'})}
 }
}
