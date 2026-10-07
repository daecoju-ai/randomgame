function talismanBonus(u,stat){return typeof window!=='undefined'?(window.ForgeEconomy?.bonus(u?elementFor(u.type).id:'all',stat)||0):0}
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
 fire:{attack:[['종말의 화염','globalFire'],['불의 심판','burn'],['멸화 폭풍','burnZone']],support:[['불의 축복','attackAura'],['폭염의 공명','splashAura'],['불사조의 가호','fury']]},
 water:{attack:[['심해의 포효','globalWave'],['절대빙결','freeze'],['대해일','tidal']],support:[['마력의 샘','manaAura'],['정화의 물결','cleanse'],['청명의 결계','clarity']]},
 earth:{attack:[['대지의 분노','rupture'],['산의 붕괴','meteor'],['지반 파괴','shatter']],support:[['거암의 힘','earthAura'],['늪의 결계','mud'],['대륙의 기상','earthFury']]},
 wind:{attack:[['폭풍의 눈','pullZone'],['진공 난무','flurry'],['천공 회오리','airborne']],support:[['바람의 축복','speedAura'],['순풍의 가호','hasteAura'],['시간의 돌풍','swift']]},
 electric:{attack:[['천벌의 심판','globalThunder'],['연쇄 천벌','chain'],['신의 낙뢰','bossStrike']],support:[['감전 증폭','shockAura'],['뇌전의 결계','chain'],['벼락의 신호','bossStrike']]},
 shadow:{attack:[['죽음의 표식','deathMark'],['그림자 참살','burst'],['암흑 처형','execute']],support:[['흑월의 축복','critAura'],['살의의 공명','critPowerAura'],['월식의 계시','critFury']]}
};
const PASSIVES=['speed','clone','attackAura','splashAura','manaAura','earthAura','speedAura','hasteAura','shockAura','critAura','critPowerAura'];
const FRIENDLY_SKILLS=['fury','cleanse','clarity','earthFury','swift','critFury'];
function combatCell(){return (geometry().width-108)/3}
function supportRadius(){return combatCell()*2.2}
function rangeLabel(u){const e=elementFor(u.type);return `${e.reach<=1?'근접':e.reach<2?'중거리':'원거리'} ${e.reach}칸`}

const ULTIMATE_NAMES=['태산 붕괴','월식 참살','대륙의 수호','해양의 기적','천공의 행진','천뢰의 공명','흑월 강림','폭풍 분쇄','불사조 강림','천벌 강림','절대 빙하','홍련의 성역','만독의 재앙','심판의 철우','시간의 종말','초신성 강림','공허 대붕괴'];
function ultimateDefinition(u){return{name:ULTIMATE_NAMES[u.type],effect:'ultimate',slot:5,tier:5,unlock:20,active:true,ultimate:true,visualKey:elementFor(u.type).id+':ultimate:'+u.type}}
function stageMilestone(u,def){const n=window.ForgeSummons?.stars(u)||0,isNew=def.slot===u.lv-1;return{scale:isNew?(n>=20&&u.lv<5?1.5:n>=10?1.25:1):1,cooldown:isNew&&n>=15?.9:1}}
function definitions(u){const e=elementFor(u.type),all=SPECIAL_SKILLS[e.id]||[...INHERITED[e.id],...(u.lv===5?FINAL_SKILLS[e.id][isSupport(u)?'support':'attack']:[])];const result=all.slice(0,u.lv).map(([name,effect],i)=>({name,effect,slot:i,tier:i+1,unlock:1,active:i===4?all.slice(4).some(x=>!PASSIVES.includes(x[1])):!PASSIVES.includes(effect),visualKey:e.id+':'+i,components:i===4?all.slice(4).map(([name,effect])=>({name,effect,slot:4,tier:5,unlock:1,active:!PASSIVES.includes(effect)})):null}));if(u.lv===5)result.push(ultimateDefinition(u));return result}
function resolvedSkills(u){return definitions(u).flatMap(def=>def.components||[def])}
const SUMMON_WEIGHTS=[7000,2000,700,250,50];
const SUMMON_ODDS='T1 70% · T2 20% · T3 7% · T4 2.5% · T5 0.5%';
function rollSummonTier(random=Math.random){const roll=random()*10000;let total=0;for(let i=0;i<SUMMON_WEIGHTS.length;i++){total+=SUMMON_WEIGHTS[i];if(roll<total)return i+1}return 5}
function skillKey(u,i){return `${u.type}:${u.lv}:${i===5&&u.lv===5?"ultimate":i}`}
function skillRank(u,i){if(u.lv===5&&i===5)return (window.ForgeSummons?.stars(u)||0)>=20?Math.min(20,heroSkills[skillKey(u,i)]||1):0;if(!Number.isInteger(i)||i<0||i>=u.lv)return 0;return validHero(u.type,u.lv)&&window.ForgeDrawRules.skillUnlocked(u.lv,i,window.ForgeSummons?.stars(u)||0)?(i===4?Math.max(heroSkills[skillKey(u,4)]||1,heroSkills[`${u.type}:5:5`]||1,heroSkills[`${u.type}:5:6`]||1):heroSkills[skillKey(u,i)]||1):0}
function skillCost(u,i){return skillRank(u,i)*2*u.lv}
function skillStats(def,rank,u){const r=Math.max(1,rank),final=def.slot>=4,awakened=false,milestone=u?stageMilestone(u,def):{scale:1,cooldown:1},scale=milestone.scale;
 if(def.ultimate){const q=window.ForgeBalance?.ultimate||{power:64,mp:80,cooldown:45,radius:3,duration:8};return{power:q.power*(1+.1*(r-1))*(1+talismanBonus(u,'skill')),radius:combatCell()*q.radius,stun:3*(1+.1*(r-1)),duration:q.duration*(1+.1*(r-1)),targets:80,bonus:1+.1*(r-1),mp:q.mp,cooldown:q.cooldown,awakened:false}};
 return{power:Math.pow(2,def.slot)*(1+.1*(r-1))*scale*(1+talismanBonus(u,'skill')),radius:combatCell()*(final?1:.65),stun:((final?1.8:.6)*(1+.1*(r-1)))*(1+talismanBonus(u,'control')),duration:(final?6:3)*(1+.1*(r-1))*(1+talismanBonus(u,'control')),targets:Math.min(12,3+Math.ceil(r/2)),bonus:(.145*(1+.1*(r-1)))*scale*(window.ForgeSummons?.factor(u)||1),mp:final?60:15+def.slot*4,cooldown:(final?30:6+def.slot*2)*milestone.cooldown,awakened};
}
function skillDescription(def,rank,u){if(def.ultimate)return isSupport(u)?ultimateSupportText(u,rank):'★20 전용 궁극기 · 반경 3칸 · 현재 공격력의 '+Math.round(skillStats(def,rank,u).power*100)+'% 광역 피해 · '+ultimateExtraText(u,def,rank);const v=skillStats(def,rank,u),p=Math.round(v.power*100),b=Math.round(v.bonus*100),dur=v.duration.toFixed(1),a=`반경 ${(v.radius/combatCell()).toFixed(2)}칸`,f=def.effect;const text={
 single:`단일 적 ${p}% 피해`,area:`${a} 광역 ${p}% 피해`,multi:`사거리 내 서로 다른 적 ${v.targets}명에 ${p}% 화염탄`,wave:`전방 부채꼴 ${p}% 피해`,ice:`단일 ${p}% 피해 · ${dur}초 45% 감속`,mud:`${a} 매초 ${Math.round(p*.3)}% 피해 · ${dur}초 진흙 지대 · 45% 감속`,burst:`단일 대상 ${v.targets}회 연속 공격 · 합계 ${p*2}% 피해`,strike:`단일 ${p*2}% 피해`,stun:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 기절`,chain:`간격 1칸 이내 연결 적 · ${p}% 피해 · ${v.stun.toFixed(1)}초 기절 · ${dur}초 감전`,speed:`자신 공격속도 +${b}%`,clone:`분신이 기본 공격의 ${b*2}%로 추가 공격`,mark:`대상 ${dur}초 받는 피해 +${b}%`,
 burnZone:`${a} 불꽃 지대 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,freezeZone:`${a} 빙결 구역 · 매초 ${Math.round(p*.15)}% 피해 · 초당 35% 확률 빙결`,pullZone:`${a} 회오리 · 중앙으로 흡입 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,stormZone:`${a} 번개 지대 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,
 globalFire:`${a} ${p}% 화염 피해 + 화상`,globalWave:`${a} ${p}% 해일 피해`,globalThunder:`${a} ${p}% 번개 피해 + 기절`,burn:`${a} ${p}% 폭발 + ${dur}초 화상`,freeze:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 확정 동결`,tidal:`${a} 적을 뒤로 밀며 3회 합계 ${p}% 피해`,rupture:`${a} ${p}% 대지 광역 피해`,meteor:`${a} ${p*1.5}% 바위 낙하`,shatter:`${a} ${p}% 피해 · ${dur}초 방어 약화 +${b}% 받는 피해`,flurry:`${a} 5연격 · 합계 ${p}% 피해`,airborne:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 띄우기`,bossStrike:`보스 우선 단일 ${p*2}% 집중 낙뢰`,deathMark:`강한 적 우선 표식 · 2초 뒤 ${p*2}% 폭발`,execute:`단일 ${p}% 피해 · 적 HP 30% 이하 4배 (보스 2배)`,
 attackAura:`주변 2.2칸 아군 공격력 +${b}%`,splashAura:`주변 아군 기본 공격에 0.75칸 광역 피해 ${b*2}% 추가`,manaAura:`주변 아군 MP 회복속도 +${b*3}%`,earthAura:`주변 아군 공격력 +${b*2}% · 자신 주변 진흙으로 적 45% 감속`,speedAura:`주변 아군 공격속도 +${b*2}%`,hasteAura:`주변 아군 스킬 쿨타임 ${Math.min(45,b)}% 감소`,shockAura:`주변 전기 유닛 기절 지속시간 +${b*2}%`,critAura:`주변 아군 치명타 확률 +${b}%p`,critPowerAura:`주변 아군 치명타 피해 배율 +${b*2}%p`,
 fury:`주변 아군 ${dur}초 공격력 +${b*2}% · 기본 공격 광역 피해 ${b*2}%`,cleanse:`주변 아군 기절·감속 제거 · MP +${Math.round(v.bonus*100)}`,clarity:`주변 아군 ${dur}초 상태이상 면역 · MP 회복속도 +${b*3}%`,earthFury:`주변 아군 ${dur}초 공격력 +${b*3}%`,swift:`주변 아군 ${dur}초 공격속도 +${b*2}% · 스킬 쿨타임 ${Math.min(45,b*2)}% 감소`,critFury:`주변 아군 ${dur}초 치명타 확률 +${b}%p · 치명타 피해 배율 +${b*2}%p`

 };return text[f]||(specialDescription(f)||f).replace('6초',dur+'초');
}
function skillRows(u){return definitions(u).map(def=>{const rank=skillRank(u,def.slot);return{...def,rank,unlocked:rank>0,available:true,description:(def.components||[def]).map(d=>skillDescription(d,rank||1,u)).join(' / ')}})}
function levelUpSkill(type,tier,i){if(window.ForgeAccount?.currentUser?.())return window.ForgeAdventure.upgrade('skill',{type,tier,slot:i});if(window.ForgeAccount){window.ForgeAccount.open();return false;}if(started&&!ended||typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed())return false;if(!Number.isInteger(i)||!validHero(type,tier))return false;const u={type,lv:tier},rank=skillRank(u,i),cost=skillCost(u,i);if(!rank||rank>=20||essence<cost)return false;essence-=cost;heroSkills[skillKey(u,i)]=rank+1;saveMeta();playSound('levelUp');renderHeroLab();return true}
function prepareSkills(u){if(!Number.isFinite(u.mp))u.mp=0;if(!u.skillCD)u.skillCD=Array(7).fill(0);if(!Number.isInteger(u.skillCursor))u.skillCursor=0;if(!u.buffs)u.buffs={}}
function skillModifiers(u){const caps=window.ForgeBalance?.supportCaps||{attack:.60,speed:.55,mana:.80,haste:.45,splash:.45,crit:.40,critPower:.60,shock:.60};const result={attack:0,speed:0,mana:0,haste:0,clone:0,resist:0,splash:0,crit:0,critPower:0,shock:0};
 const add=(key,value)=>result[key]=Math.max(result[key],value);
 for(const ally of units){if(ally.stun>0)continue;for(const def of resolvedSkills(ally)){const rank=skillRank(ally,def.slot);if(!rank||def.active)continue;const v=skillStats(def,rank,ally);
  if(ally===u&&def.effect==='speed')add('speed',v.bonus);if(ally===u&&def.effect==='clone')add('clone',v.bonus*2);
  if(d(slot(u.slot),slot(ally.slot))>supportRadius())continue;
  const effects={attackAura:['attack',1],splashAura:['splash',2],manaAura:['mana',3],earthAura:['attack',2],speedAura:['speed',2],hasteAura:['haste',1],shockAura:['shock',2],critAura:['crit',1],critPowerAura:['critPower',2]};
  const effect=effects[def.effect];if(effect)add(effect[0],v.bonus*effect[1]);
 }}
 for(const buff of Object.values(u.buffs||{})){if(buff.time<=0)continue;for(const key in result)if(buff[key])add(key,buff[key])}
 result.speed+=talismanBonus(u,'speed');result.mana+=talismanBonus(u,'mana');result.haste+=talismanBonus(u,'haste');result.crit+=talismanBonus(u,'crit');result.critPower+=talismanBonus(u,'critPower');
 result.attack=Math.min(caps.attack,result.attack);result.speed=Math.min(caps.speed,result.speed);result.mana=Math.min(caps.mana,result.mana);result.haste=Math.min(caps.haste,result.haste);result.splash=Math.min(caps.splash,result.splash);result.crit=Math.min(caps.crit,result.crit);result.critPower=Math.min(caps.critPower,result.critPower);result.shock=Math.min(caps.shock,result.shock);return result;
}
function combatAttack(u){return battleAttack(u)*(1+skillModifiers(u).attack)*(1+talismanBonus(u,'attack'))}
function outgoingDamage(u,enemy,amount){const mods=skillModifiers(u),shadow=elementFor(u.type).id==='shadow',bal=window.ForgeBalance?.combat||{shadowNormal:2.4,shadowBoss:1.8,shadowCrit:.15,critMultiplier:2};let damage=amount*(shadow?(enemy.boss?bal.shadowBoss:bal.shadowNormal):1);if(Math.random()<Math.min(.85,(shadow?bal.shadowCrit:0)+mods.crit))damage*=bal.critMultiplier+mods.critPower;return damage}
function dealHeroDamage(u,enemy,amount){hit(enemy,outgoingDamage(u,enemy,amount),U[u.type].kind,false,u)}
let skillZones=[];
function nearestTarget(u,strongest=false){const alive=mobs.filter(m=>m.hp>0&&d(slot(u.slot),m)<=battleRange(u));return strongest?alive.sort((a,b)=>Number(!!b.boss)-Number(!!a.boss)||b.hp-a.hp)[0]:alive.filter(m=>d(slot(u.slot),m)<=battleRange(u)).sort((a,b)=>b.p-a.p)[0]}
function skillDamage(enemy,amount){hit(enemy,amount,'skill')}
function showSkill(u,def,v,target){const origin=slot(u.slot),color=U[u.type].accent,isFriendly=FRIENDLY_SKILLS.includes(def.effect);if(isFriendly){skillEffects.push({x:origin.x,y:origin.y,r:v.radius,t:.55,color,kind:elementFor(u.type).id,effect:def.effect,slot:def.slot,type:u.type,origin,life:.55,support:true})}else if(target&&Number.isFinite(target.x)&&Number.isFinite(target.y)){skillEffects.push({x:target.x,y:target.y,r:v.radius,t:.55,color,kind:elementFor(u.type).id,effect:def.effect,slot:def.slot,type:u.type,origin,life:.55})}playSound('skill',{element:elementFor(u.type).id,effect:def.effect,slot:def.slot,rank:v.rank||1})}
function castHeroSkill(u,def,rank,target){if(def.ultimate){castUltimate(u,def,rank,target);return}if(def.components){for(const part of def.components){if(part.active)castHeroSkill(u,part,rank,target)}return}if(castSpecialSkill(u,def,rank,target))return;const v=skillStats(def,rank,u),origin=slot(u.slot),damage=combatAttack(u)*v.power,f=def.effect;let targets=[];
 if(FRIENDLY_SKILLS.includes(f)){for(const ally of units){prepareSkills(ally);if(d(origin,slot(ally.slot))>supportRadius())continue;
  if(f==='cleanse'){ally.stun=0;ally.slow=0;ally.mp=Math.min(100,ally.mp+Math.round(v.bonus*100))}
  if(f==='clarity')ally.buffs.clarity={time:v.duration,resist:1,mana:v.bonus*3};
  if(f==='fury')ally.buffs.fury={time:v.duration,attack:v.bonus*2,splash:v.bonus*2};
  if(f==='earthFury')ally.buffs.earthFury={time:v.duration,attack:v.bonus*3};
  if(f==='swift')ally.buffs.swift={time:v.duration,speed:v.bonus*2,haste:v.bonus*2};
  if(f==='critFury')ally.buffs.critFury={time:v.duration,crit:v.bonus,critPower:v.bonus*2};
 }showSkill(u,def,{...v,radius:supportRadius()},origin);return}
 if(!target||d(origin,target)>battleRange(u))return;
 if(['bossStrike','deathMark'].includes(f))target=nearestTarget(u,true)||target;
 const all=mobs.filter(m=>m.hp>0);
 if(f==='chain'){targets=[target];for(let i=0;i<targets.length;i++)for(const enemy of all)if(!targets.includes(enemy)&&d(enemy,targets[i])<=combatCell())targets.push(enemy);}
 else if(f==='multi')targets=all.filter(m=>d(origin,m)<=battleRange(u)).sort((a,b)=>b.p-a.p).slice(0,v.targets);
 else if(f==='wave'){const dx=target.x-origin.x,dy=target.y-origin.y,len=Math.hypot(dx,dy)||1;targets=all.filter(m=>{const dist=d(origin,m);return dist<=battleRange(u)&&((m.x-origin.x)*dx+(m.y-origin.y)*dy)/(len*(dist||1))>=.55})}
 else if(['single','ice','strike','burst','mark','execute','bossStrike','deathMark'].includes(f))targets=[target];
 else targets=all.filter(m=>d(m,target)<=v.radius);
 if(['chain','multi'].includes(f))skillEffects.push({x:target.x,y:target.y,points:[origin,...targets.map(m=>({x:m.x,y:m.y}))],r:20,t:.55,life:.55,color:U[u.type].accent,kind:elementFor(u.type).id,effect:f,slot:def.slot,type:u.type});
 if(f==='chain'&&targets.length>=5)window.ForgeAdventure?.record('chains');
 if(['burnZone','freezeZone','pullZone','stormZone','mud'].includes(f)){skillZones.push({slot:def.slot,effect:f,x:target.x,y:target.y,p:target.p,radius:v.radius,time:v.duration,damage:damage*(f==='freezeZone'?.15:.3),tick:0,v,source:u,color:U[u.type].accent});showSkill(u,def,v,target);return}
 if(f==='deathMark'){target.deathMark={time:2,damage:damage*2,source:u};showSkill(u,def,v,target);return}
 const noDamage=['mark','curse','weaken','bind'];
 for(const enemy of targets){
  const factor=f==='execute'&&enemy.hp/enemy.max<=.3?(enemy.boss?2:4):['strike','bossStrike'].includes(f)?2:f==='meteor'?1.5:1;
  if(!noDamage.includes(f)){const repeats=f==='burst'?v.targets:f==='tidal'?3:f==='flurry'?5:1;for(let j=0;j<repeats;j++)dealHeroDamage(u,enemy,damage*factor*(f==='burst'?2:1)/repeats)}
  if(['stun','freeze','airborne','chain','globalThunder'].includes(f))enemy.stun=Math.max(enemy.stun||0,(typeof monsterControlDuration==='function'?monsterControlDuration(enemy,v.stun):v.stun)*(elementFor(u.type).id==='electric'?1+skillModifiers(u).shock:1));
  if(['freeze','ice'].includes(f))enemy.controlKind='ice';if(f==='freeze'&&!enemy.missionFrozen){enemy.missionFrozen=true;window.ForgeAdventure?.record('freezes')}
  if(['ice','bind','freeze'].includes(f))enemy.slow=Math.max(enemy.slow||0,(typeof monsterControlDuration==='function'?monsterControlDuration(enemy,v.duration):v.duration));
  if(['burn','globalFire','chain'].includes(f)){enemy.dotKind=elementFor(u.type).id;enemy.dotSource=u;enemy.dotTime=Math.max(enemy.dotTime||0,v.duration);enemy.dotDps=Math.max(enemy.dotDps||0,outgoingDamage(u,enemy,damage*.2))}
  if(['mark','shatter','curse'].includes(f)){enemy.vulnerableTime=Math.max(enemy.vulnerableTime||0,v.duration);enemy.vulnerability=Math.max(enemy.vulnerability||0,v.bonus)}
  if(f==='weaken'){enemy.weakenTime=v.duration;enemy.weakness=Math.min(.7,v.bonus*2)}
  if(f==='bind'){enemy.attackSlowTime=v.duration;enemy.attackSlow=Math.min(.7,v.bonus*2)}
  if(f==='tidal'){enemy.p=Math.max(0,enemy.p-.06);Object.assign(enemy,path(enemy.p))}
 }
 showSkill(u,def,v,target);
}
function tickSkillZones(dt){tickSpecialEffects(dt);for(const m of mobs){if(m.deathMark){m.deathMark.time-=dt;if(m.deathMark.time<=0){dealHeroDamage(m.deathMark.source,m,m.deathMark.damage);delete m.deathMark}}}
 for(const z of skillZones){const elapsed=Math.min(dt,z.time);z.time-=elapsed;z.tick-=elapsed;
  for(const m of mobs){if(m.hp<=0||d(m,z)>z.radius)continue;if(z.effect==='mud'){m.mudTagged=true;m.slow=Math.max(m.slow||0,z.v.duration*.35);dealHeroDamage(z.source,m,z.damage*elapsed);continue}dealHeroDamage(z.source,m,z.damage*elapsed);
   if(z.effect==='pullZone'){const target=z.p??m.p,delta=((target-m.p+.5)%1+1)%1-.5;m.p+=Math.sign(delta)*Math.min(Math.abs(delta),elapsed*.06);Object.assign(m,path(m.p));m.slow=Math.max(m.slow||0,.3)}
   if(z.effect==='stormZone'&&z.tick<=0)m.stun=Math.max(m.stun||0,(typeof monsterControlDuration==='function'?monsterControlDuration(m,z.v.stun):z.v.stun)*(1+skillModifiers(z.source).shock));
   if(z.effect==='freezeZone'&&z.tick<=0&&Math.random()<.35){m.controlKind='ice';m.stun=Math.max(m.stun||0,(typeof monsterControlDuration==='function'?monsterControlDuration(m,z.v.stun):z.v.stun));if(!m.missionFrozen){m.missionFrozen=true;window.ForgeAdventure?.record('freezes')}}
  }if(z.tick<=0){z.tick=1;skillEffects.push({x:z.x,y:z.y,r:z.radius,t:.55,life:.55,color:z.color,kind:elementFor(z.source.type).id,effect:z.effect,slot:z.slot,type:z.source.type})}
 }skillZones=skillZones.filter(z=>z.time>0);
}
function tickHeroSkills(u,dt){prepareSkills(u);if(u.stun>0)return;const mods=skillModifiers(u);u.mp=Math.min(100,u.mp+dt*(1+mods.mana));u.skillCD=u.skillCD.map(v=>Math.max(0,v-dt/(1-mods.haste)));const defs=definitions(u);
 for(let offset=0;offset<defs.length;offset++){const i=(u.skillCursor+offset)%defs.length,def=defs[i],rank=skillRank(u,i);if(!rank||!def.active)continue;const v=skillStats(def,rank,u);if(u.mp<v.mp||u.skillCD[i]>0)continue;
  const friendly=FRIENDLY_SKILLS.includes(def.effect)||def.ultimate&&isSupport(u),target=nearestTarget(u,['bossStrike','deathMark'].includes(def.effect));
  if(!friendly&&!target)continue;if(friendly&&!mobs.some(m=>m.hp>0))continue;
  u.mp-=v.mp;u.skillCD[i]=v.cooldown;u.skillCursor=(i+1)%defs.length;castHeroSkill(u,def,rank,target);if(units.some(a=>elementFor(a.type).id==='wind'&&isSupport(a)&&d(slot(a.slot),slot(u.slot))<=supportRadius()))window.ForgeAdventure?.record('windcasts');break;
 }
}
// Allies have statuses and MP only. Boss pulses provide debuffs for water cleanse.
function tickBattleStatus(dt){
 for(const u of units){prepareSkills(u);u.stun=Math.max(0,(u.stun||0)-dt);u.slow=Math.max(0,(u.slow||0)-dt);
  for(const key of Object.keys(u.buffs)){u.buffs[key].time-=dt;if(u.buffs[key].time<=0)delete u.buffs[key]}
  if(definitions(u).some(def=>def.effect==='earthAura'&&skillRank(u,def.slot))&&!(u.stun>0))for(const m of mobs)if(m.hp>0&&d(slot(u.slot),m)<=battleRange(u))m.slow=Math.max(m.slow||0,.5);
 }
 for(const m of mobs){if(m.hp<=0||!m.boss||m.stun>0)continue;m.attackCD=(m.attackCD??4)-dt;if(m.attackCD>0)continue;m.attackCD=4;
  for(const u of units){if(d(slot(u.slot),m)>combatCell()*2)continue;const resist=skillModifiers(u).resist;if(resist>=1)continue;u.slow=2;u.stun=.4}
 }
}

// Display the same coefficients used by casting, before critical hits and target debuffs.
function skillDamageBaseText(u,def){
 if(def.ultimate&&isSupport(u))return '직접 피해 0 · '+ultimateSupportText(u,def.rank||1);
 if(def.ultimate){const v=skillStats(def,def.rank||1,u);return '피해 '+((Number.isInteger(u.slot)?combatAttack(u):battleAttack(u)*(1+talismanBonus(u,'attack')))*v.power).toFixed(1)+' · 현재 공격력의 '+Math.round(v.power*100)+'%'}
 if(def.damageText)return def.damageText;if(def.components)return def.components.map(d=>d.name+': '+skillDamageBaseText(u,{...d,rank:def.rank})).join(' / ');
 const v=skillStats(def,def.rank||1,u),f=def.effect,base=(Number.isInteger(u.slot)?combatAttack(u):battleAttack(u)*(1+talismanBonus(u,'attack')))*v.power;
 const n=ratio=>(base*ratio).toFixed(1),pct=ratio=>Math.round(v.power*ratio*100)+'%';
 const hit=(ratio=1)=>'피해 '+n(ratio)+' · 현재 공격력의 '+pct(ratio);
 if(PASSIVES.includes(f)||FRIENDLY_SKILLS.includes(f)||['mark','blessing','mana','reorder','clarity'].includes(f)){
  if(f==='clone')return '추가 공격 '+(battleAttack(u)*v.bonus*2).toFixed(1)+' · 기본 공격 '+Math.round(v.bonus*200)+'%';
  if(f==='splashAura')return '아군 기본 공격의 '+Math.round(v.bonus*200)+'% 광역 피해 추가';
  return '직접 피해 0 · 지원/제어 효과';
 }
 if(f==='mud')return '초당 피해 '+n(.3)+' · 현재 공격력의 '+pct(.3)+' · '+v.duration.toFixed(1)+'초 지대 · 45% 감속';
 if(['burnZone','freezeZone','pullZone','stormZone'].includes(f)){const r=f==='freezeZone'?.15:.3;return '초당 피해 '+n(r)+' · 현재 공격력의 '+pct(r)+' · '+v.duration.toFixed(1)+'초 유지'}
 if(['strike','bossStrike','deathMark','burst'].includes(f))return (f==='burst'?'연타 합계 ':f==='deathMark'?'2초 뒤 ':'')+hit(2);
 if(f==='meteor')return hit(1.5);
 if(f==='execute')return hit()+' · HP 30% 이하 '+n(4)+' (보스 '+n(2)+')';
 if(['burn','globalFire','chain'].includes(f))return hit()+' + 지속 피해 '+n(.2)+'/초 · '+v.duration.toFixed(1)+'초';
 if(['toxicStack','acidPool','plague'].includes(f))return hit(.5)+' + 중독 중첩당 '+n(.08)+'/초 · '+v.duration.toFixed(1)+'초';
 if(['toxicBurst','detonate','venomQueen'].includes(f))return hit(f==='venomQueen'?4:1)+' · 중독당 +'+n(.6)+(f==='venomQueen'?' (5중첩 포함)':' · 최대 '+n(4));
 if(['riftMark','voidShard','voidBrand'].includes(f))return hit(.5);
 if(['riftConsume','riftDetonate','nullCollapse'].includes(f))return hit(f==='nullCollapse'?4.5:1)+' · 균열당 +'+n(.7)+(f==='nullCollapse'?' (5중첩 포함)':' · 최대 '+n(4.5));
 if(f==='starMark')return hit(.5);
 if(f==='judgement')return hit()+' · 방어 약화 대상 '+n(2);
 if(['echo','chronicle','rewindStrike','timeSeal','timeCascade'].includes(f))return (f==='timeSeal'?'즉시 피해 0':hit())+' + '+(f==='chronicle'?'1초·2초 뒤 각각 ':f==='rewindStrike'||f==='timeSeal'?'2초 뒤 ':'1초 뒤 ')+n(f==='rewindStrike'?1.5:.6)+' 재현 · 시간 표식 시 재현 ×1.25';
 if(['starfall','meteorSign','constellation','supernova'].includes(f))return hit()+' · 중심부 '+n(2)+(f==='constellation'?' · 최대 3곳':'');
 return (['flurry','tidal','bladeStorm'].includes(f)?'연타 합계 ':'')+hit();
}

function skillDamageText(u,def){const text=skillDamageBaseText(u,def);if(elementFor(u.type).id!=='shadow'||text.startsWith('직접 피해 0'))return text;const b=window.ForgeBalance?.combat||{shadowNormal:2.4,shadowBoss:1.8};return text+` · 암흑 특성: 일반 적 ×${b.shadowNormal} / 보스 ×${b.shadowBoss}`}

function ultimateExtraText(u,def,rank){const e=elementFor(u.type).id,v=skillStats(def,rank,u);if(e==='fire'||e==='poison')return `${v.duration.toFixed(1)}초 ${e==='fire'?'화상':'중독'} · 매초 현재 공격력의 ${Math.round(v.power*5)}% 추가 피해`;if(['water','earth','wind','electric','time'].includes(e))return `${v.stun.toFixed(1)}초 ${e==='water'?'빙결':'기절'} · 보스는 절반 지속`;if(e==='metal'||e==='void')return `${v.duration.toFixed(1)}초 받는 피해 +${Math.round(50*v.bonus)}%`;if(e==='shadow'){const b=window.ForgeBalance?.combat||{shadowNormal:2.4,shadowBoss:1.8};return `암흑 특성: 일반 적 피해 ×${b.shadowNormal} / 보스 ×${b.shadowBoss}`;}return '반경 안의 모든 적에게 집중 폭발'}
function ultimateSupportText(u,rank=1){const z=1+.1*(Math.max(1,rank)-1),pct=n=>Math.round(n*100),caps=window.ForgeBalance?.supportCaps||{attack:.60,speed:.55,mana:.80,haste:.45,splash:.45,crit:.40,critPower:.60,shock:.60},effect={fire:`공격력 +${pct(caps.attack)}% · 광역 추가 피해 +${pct(caps.splash)}%`,water:`상태이상 해제 · MP +${Math.min(100,Math.round(60*z))} · MP 회복속도 +${pct(caps.mana)}%`,earth:`공격력 +${pct(caps.attack)}% · 상태이상 면역`,wind:`공격속도 +${pct(caps.speed)}% · 재사용 시간 ${pct(caps.haste)}% 감소`,electric:`공격력 +${pct(caps.attack)}% · 기절 지속시간 +${pct(caps.shock)}%`,shadow:`치명타 확률 +${pct(caps.crit)}%p · 치명타 피해 +${pct(caps.critPower)}%p`}[elementFor(u.type).id];return '반경 3칸 아군 · '+effect+' · '+(8*z).toFixed(1)+'초 · 중첩 상한 적용'}
function castUltimate(u,def,rank,target){
 const origin=slot(u.slot),v=skillStats(def,rank,u),e=elementFor(u.type).id,support=isSupport(u);
 if(!support&&(!target||d(origin,target)>battleRange(u)))return;
 const center=support?origin:target,targets=mobs.filter(m=>m.hp>0&&d(m,center)<=v.radius);
 if(support){for(const ally of units){if(d(origin,slot(ally.slot))>v.radius)continue;prepareSkills(ally);const buffs={fire:{attack:1,splash:.5},water:{mana:1,resist:1},earth:{attack:1.5,resist:1},wind:{speed:.8,haste:.35},electric:{attack:.75,shock:.5},shadow:{crit:.5,critPower:1.5}};ally.buffs.ultimate={time:v.duration,...Object.fromEntries(Object.entries(buffs[e]).map(([k,n])=>[k,k==='resist'?n:n*v.bonus]))};if(e==='water'){ally.stun=0;ally.slow=0;ally.mp=Math.min(100,ally.mp+60*v.bonus)}}}
 else for(const m of targets){dealHeroDamage(u,m,combatAttack(u)*v.power);if(['water','earth','wind','electric','time'].includes(e)){m.stun=Math.max(m.stun||0,typeof monsterControlDuration==='function'?monsterControlDuration(m,v.stun):v.stun);if(e==='water')m.controlKind='ice'}if(e==='fire'||e==='poison'){m.dotSource=u;m.dotKind=e;m.dotTime=Math.max(m.dotTime||0,v.duration);m.dotDps=Math.max(m.dotDps||0,outgoingDamage(u,m,combatAttack(u)*v.power*.05))}if(e==='metal'||e==='void'){m.vulnerableTime=v.duration;m.vulnerability=Math.max(m.vulnerability||0,.5*v.bonus)}}
 skillEffects.push({x:center.x,y:center.y,r:v.radius,t:1.8,life:1.8,color:U[u.type].accent,kind:e,effect:'ultimate',slot:5,type:u.type,origin,support,points:[origin,...(support?units.filter(a=>d(origin,slot(a.slot))<=v.radius).map(a=>slot(a.slot)):targets.map(m=>({x:m.x,y:m.y})))]});
 playSound('skill',{element:e,effect:'ultimate',slot:5,rank:10});
}
