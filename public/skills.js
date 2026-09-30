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

function definitions(u){const e=elementFor(u.type);return (SPECIAL_SKILLS[e.id]||[...INHERITED[e.id],...(u.lv===5?FINAL_SKILLS[e.id][isSupport(u)?'support':'attack']:[])]).map(([name,effect],i)=>({name,effect,slot:i,tier:i<4?i+1:5,unlock:i<4?1:[1,10,20][i-4],active:!PASSIVES.includes(effect)}))}
const SUMMON_WEIGHTS=[7000,2000,700,250,50];
const SUMMON_ODDS='T1 70% · T2 20% · T3 7% · T4 2.5% · T5 0.5%';
function rollSummonTier(random=Math.random){const roll=random()*10000;let total=0;for(let i=0;i<SUMMON_WEIGHTS.length;i++){total+=SUMMON_WEIGHTS[i];if(roll<total)return i+1}return 5}
function skillKey(u,i){return `${u.type}:${u.lv}:${i}`}
function skillRank(u,i){return validHero(u.type,u.lv)&&getLv(u.type,u.lv)>=skillUnlockLevel(u.lv,i)?(heroSkills[skillKey(u,i)]||1):0}
function skillCost(u,i){return skillRank(u,i)*2*u.lv}
function skillStats(def,rank,u){const r=Math.max(1,rank),final=def.slot>=4,awakened=u&&u.lv===5&&getLv(u.type,5)>=30&&def.slot===4,scale=awakened?1.5:1;
 return{power:(final?4+def.slot*.5:1+def.slot*.3)*(1+.12*(r-1))*scale*(1+talismanBonus(u,'skill')),radius:combatCell()*(final?1:.65),stun:((final?1.8:.45)+r*.06)*(1+talismanBonus(u,'control')),duration:((final?5:3)+r*.15)*(1+(['ice','mud','freeze','freezeZone'].includes(def.effect)?talismanBonus(u,'control'):0)),targets:Math.min(12,3+Math.ceil(r/2)),bonus:(.12+.025*r)*scale*(window.ForgeSummons?.factor(u)||1),mp:final?40:15+def.slot*4,cooldown:final?18+def.slot:6+def.slot*2,awakened};
}
function skillDescription(def,rank,u){const v=skillStats(def,rank,u),p=Math.round(v.power*100),b=Math.round(v.bonus*100),dur=v.duration.toFixed(1),a=`반경 ${(v.radius/combatCell()).toFixed(2)}칸`,f=def.effect;const text={
 single:`단일 적 ${p}% 피해`,area:`${a} 광역 ${p}% 피해`,multi:`사거리 내 서로 다른 적 ${v.targets}명에 ${p}% 화염탄`,wave:`전방 부채꼴 ${p}% 피해`,ice:`단일 ${p}% 피해 · ${dur}초 45% 감속`,mud:`${a} 진흙 지대 · ${dur}초 45% 감속`,burst:`단일 대상 ${v.targets}회 연속 공격 · 합계 ${p*2}% 피해`,strike:`단일 ${p*2}% 피해`,stun:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 기절`,chain:`간격 1칸 이내로 연결된 모든 적 · ${p}% 연쇄 피해 · 기절·감전`,speed:`자신 공격속도 +${b}%`,clone:`분신이 기본 공격의 ${b*2}%로 추가 공격`,mark:`대상 ${dur}초 받는 피해 +${b}%`,
 burnZone:`${a} 불꽃 지대 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,freezeZone:`${a} 빙결 구역 · 매초 ${Math.round(p*.15)}% 피해 · 초당 35% 확률 빙결`,pullZone:`${a} 회오리 · 중앙으로 흡입 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,stormZone:`${a} 번개 지대 · ${dur}초 동안 매초 ${Math.round(p*.3)}% 피해`,
 globalFire:`${a} ${p}% 화염 피해 + 화상`,globalWave:`${a} ${p}% 해일 피해`,globalThunder:`${a} ${p}% 번개 피해 + 기절`,burn:`${a} ${p}% 폭발 + ${dur}초 화상`,freeze:`${a} ${v.stun.toFixed(1)}초 확정 동결`,tidal:`${a} 적을 뒤로 밀며 3회 합계 ${p}% 피해`,rupture:`${a} ${p}% 대지 광역 피해`,meteor:`${a} ${p*1.5}% 바위 낙하`,shatter:`${a} ${p}% 피해 · ${dur}초 방어 약화 +${b}% 받는 피해`,flurry:`${a} 5연격 · 합계 ${p}% 피해`,airborne:`${a} ${p}% 피해 · ${v.stun.toFixed(1)}초 띄우기`,bossStrike:`보스 우선 단일 ${p*2}% 집중 낙뢰`,deathMark:`강한 적 우선 표식 · 2초 뒤 ${p*2}% 폭발`,execute:`단일 ${p}% 피해 · 적 HP 30% 이하 4배 (보스 2배)`,
 attackAura:`주변 2.2칸 아군 공격력 +${b}%`,splashAura:`주변 아군 기본 공격에 0.75칸 광역 피해 ${b*2}% 추가`,manaAura:`주변 아군 MP 회복속도 +${b*3}%`,earthAura:`주변 아군 공격력 +${b*2}% · 자신 주변 진흙으로 적 45% 감속`,speedAura:`주변 아군 공격속도 +${b*2}%`,hasteAura:`주변 아군 스킬 쿨타임 ${Math.min(45,b)}% 감소`,shockAura:`주변 전기 유닛 기절 지속시간 +${b*2}%`,critAura:`주변 아군 치명타 확률 +${b}%p`,critPowerAura:`주변 아군 치명타 피해 배율 +${b*2}%p`,
 fury:`주변 아군 ${dur}초 공격력 +${b*2}% · 기본 공격 광역 피해 ${b*2}%`,cleanse:`주변 아군 기절·감속 제거 · MP +${Math.round(v.bonus*100)}`,clarity:`주변 아군 ${dur}초 상태이상 면역 · MP 회복속도 +${b*3}%`,earthFury:`주변 아군 ${dur}초 공격력 +${b*3}%`,swift:`주변 아군 ${dur}초 공격속도 +${b*2}% · 스킬 쿨타임 ${Math.min(45,b*2)}% 감소`,critFury:`주변 아군 ${dur}초 치명타 확률 +${b}%p · 치명타 피해 배율 +${b*2}%p`

 };return text[f]||specialDescription(f)||f;
}
function skillRows(u){return definitions(u).map(def=>{const rank=skillRank(u,def.slot);return{...def,rank,unlocked:rank>0,available:def.tier<=u.lv,description:skillDescription(def,rank||1,u)}})}
function levelUpSkill(type,tier,i){if(window.ForgeAccount?.currentUser?.())return window.ForgeAdventure.upgrade('skill',{type,tier,slot:i});if(window.ForgeAccount){window.ForgeAccount.open();return false;}if(started&&!ended||typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed())return false;if(!Number.isInteger(i)||!validHero(type,tier))return false;const u={type,lv:tier},rank=skillRank(u,i),cost=skillCost(u,i);if(!rank||rank>=10||essence<cost)return false;essence-=cost;heroSkills[skillKey(u,i)]=rank+1;saveMeta();playSound('levelUp');renderHeroLab();return true}
function prepareSkills(u){if(!Number.isFinite(u.mp))u.mp=0;if(!u.skillCD)u.skillCD=Array(7).fill(0);if(!Number.isInteger(u.skillCursor))u.skillCursor=0;if(!u.buffs)u.buffs={}}
function skillModifiers(u){const result={attack:0,speed:0,mana:0,haste:0,clone:0,resist:0,splash:0,crit:0,critPower:0,shock:0};
 const add=(key,value)=>result[key]=Math.max(result[key],value);
 for(const ally of units){if(ally.stun>0)continue;for(const def of definitions(ally)){const rank=skillRank(ally,def.slot);if(!rank||def.active)continue;const v=skillStats(def,rank,ally);
  if(ally===u&&def.effect==='speed')add('speed',v.bonus);if(ally===u&&def.effect==='clone')add('clone',v.bonus*2);
  if(d(slot(u.slot),slot(ally.slot))>supportRadius())continue;
  const effects={attackAura:['attack',1],splashAura:['splash',2],manaAura:['mana',3],earthAura:['attack',2],speedAura:['speed',2],hasteAura:['haste',1],shockAura:['shock',2],critAura:['crit',1],critPowerAura:['critPower',2]};
  const effect=effects[def.effect];if(effect)add(effect[0],v.bonus*effect[1]);
 }}
 for(const buff of Object.values(u.buffs||{})){if(buff.time<=0)continue;for(const key in result)if(buff[key])add(key,buff[key])}
 result.speed+=talismanBonus(u,'speed');result.mana+=talismanBonus(u,'mana');result.haste+=talismanBonus(u,'haste');result.crit+=talismanBonus(u,'crit');result.critPower+=talismanBonus(u,'critPower');
 result.haste=Math.min(.45,result.haste);result.crit=Math.min(.75,result.crit);return result;
}
function combatAttack(u){return battleAttack(u)*(1+skillModifiers(u).attack)*(1+talismanBonus(u,'attack'))}
function outgoingDamage(u,enemy,amount){const mods=skillModifiers(u),shadow=elementFor(u.type).id==='shadow';let damage=amount*(shadow?(enemy.boss?2:3):1);if(Math.random()<Math.min(.85,(shadow?.2:0)+mods.crit))damage*=2+mods.critPower;return damage}
function dealHeroDamage(u,enemy,amount){hit(enemy,outgoingDamage(u,enemy,amount),U[u.type].kind,false,u)}
let skillZones=[];
function nearestTarget(u,strongest=false){const alive=mobs.filter(m=>m.hp>0&&d(slot(u.slot),m)<=battleRange(u));return strongest?alive.sort((a,b)=>Number(!!b.boss)-Number(!!a.boss)||b.hp-a.hp)[0]:alive.filter(m=>d(slot(u.slot),m)<=battleRange(u)).sort((a,b)=>b.p-a.p)[0]}
function skillDamage(enemy,amount){hit(enemy,amount,'skill')}
function showSkill(u,def,v,target){const origin=slot(u.slot),color=U[u.type].accent;skillEffects.push({x:target?.x??origin.x,y:target?.y??origin.y,r:v.radius,t:.55,color,kind:elementFor(u.type).id,effect:def.effect,slot:def.slot});floaters.push({x:origin.x,y:origin.y-30,t:1,s:def.name+(v.awakened?' ✦':''),col:color});playSound('hit',U[u.type].kind)}
function castHeroSkill(u,def,rank,target){if(castSpecialSkill(u,def,rank,target))return;const v=skillStats(def,rank,u),origin=slot(u.slot),damage=combatAttack(u)*v.power,f=def.effect;let targets=[];
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
 if(f==='chain'&&targets.length>=5)window.ForgeAdventure?.record('chains');
 if(['burnZone','freezeZone','pullZone','stormZone','mud'].includes(f)){skillZones.push({effect:f,x:target.x,y:target.y,p:target.p,radius:v.radius,time:v.duration,damage:damage*(f==='freezeZone'?.15:.3),tick:0,v,source:u,color:U[u.type].accent});showSkill(u,def,v,target);return}
 if(f==='deathMark'){target.deathMark={time:2,damage:damage*2,source:u};showSkill(u,def,v,target);return}
 const noDamage=['mark','freeze','curse','weaken','bind'];
 for(const enemy of targets){
  const factor=f==='execute'&&enemy.hp/enemy.max<=.3?(enemy.boss?2:4):['strike','bossStrike'].includes(f)?2:f==='meteor'?1.5:1;
  if(!noDamage.includes(f)){const repeats=f==='burst'?v.targets:f==='tidal'?3:f==='flurry'?5:1;for(let j=0;j<repeats;j++)dealHeroDamage(u,enemy,damage*factor*(f==='burst'?2:1)/repeats)}
  if(['stun','freeze','airborne','chain','globalThunder'].includes(f))enemy.stun=Math.max(enemy.stun||0,v.stun*(enemy.boss?.5:1)*(elementFor(u.type).id==='electric'?1+skillModifiers(u).shock:1));
  if(f==='freeze'&&!enemy.missionFrozen){enemy.missionFrozen=true;window.ForgeAdventure?.record('freezes')}
  if(['ice','bind','freeze'].includes(f))enemy.slow=Math.max(enemy.slow||0,v.duration);
  if(['burn','globalFire','chain'].includes(f)){enemy.dotSource=u;enemy.dotTime=Math.max(enemy.dotTime||0,v.duration);enemy.dotDps=Math.max(enemy.dotDps||0,outgoingDamage(u,enemy,damage*.2))}
  if(['mark','shatter','curse'].includes(f)){enemy.vulnerableTime=Math.max(enemy.vulnerableTime||0,v.duration);enemy.vulnerability=Math.max(enemy.vulnerability||0,v.bonus)}
  if(f==='weaken'){enemy.weakenTime=v.duration;enemy.weakness=Math.min(.7,v.bonus*2)}
  if(f==='bind'){enemy.attackSlowTime=v.duration;enemy.attackSlow=Math.min(.7,v.bonus*2)}
  if(f==='tidal'){enemy.p=Math.max(0,enemy.p-.06);Object.assign(enemy,path(enemy.p))}
 }
 showSkill(u,def,v,target);
}
function tickSkillZones(dt){tickSpecialEffects(dt);for(const m of mobs){if(m.deathMark){m.deathMark.time-=dt;if(m.deathMark.time<=0){dealHeroDamage(m.deathMark.source,m,m.deathMark.damage);delete m.deathMark}}}
 for(const z of skillZones){const elapsed=Math.min(dt,z.time);z.time-=elapsed;z.tick-=elapsed;
  for(const m of mobs){if(m.hp<=0||d(m,z)>z.radius)continue;if(z.effect==='mud'){m.mudTagged=true;m.slow=Math.max(m.slow||0,.5);continue}dealHeroDamage(z.source,m,z.damage*elapsed);
   if(z.effect==='pullZone'){const target=z.p??m.p,delta=((target-m.p+.5)%1+1)%1-.5;m.p+=Math.sign(delta)*Math.min(Math.abs(delta),elapsed*.06);Object.assign(m,path(m.p));m.slow=Math.max(m.slow||0,.3)}
   if(z.effect==='stormZone'&&z.tick<=0)m.stun=Math.max(m.stun||0,z.v.stun*(m.boss?.5:1)*(1+skillModifiers(z.source).shock));
   if(z.effect==='freezeZone'&&z.tick<=0&&Math.random()<.35){m.stun=Math.max(m.stun||0,z.v.stun*(m.boss?.5:1));if(!m.missionFrozen){m.missionFrozen=true;window.ForgeAdventure?.record('freezes')}}
  }if(z.tick<=0){z.tick=1;skillEffects.push({x:z.x,y:z.y,r:z.radius,t:.55,color:z.color})}
 }skillZones=skillZones.filter(z=>z.time>0);
}
function tickHeroSkills(u,dt){prepareSkills(u);if(u.stun>0)return;const mods=skillModifiers(u);u.mp=Math.min(100,u.mp+dt*(1+mods.mana));u.skillCD=u.skillCD.map(v=>Math.max(0,v-dt/(1-mods.haste)));const defs=definitions(u);
 for(let offset=0;offset<defs.length;offset++){const i=(u.skillCursor+offset)%defs.length,def=defs[i],rank=skillRank(u,i);if(!rank||!def.active)continue;const v=skillStats(def,rank,u);if(u.mp<v.mp||u.skillCD[i]>0)continue;
  const friendly=FRIENDLY_SKILLS.includes(def.effect),target=nearestTarget(u,['bossStrike','deathMark'].includes(def.effect));
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
