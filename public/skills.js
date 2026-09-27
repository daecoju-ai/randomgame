// Skill definitions are shared by the codex, progression and live battle engine.
// Each tier adds one slot, unlocked at hero levels 5/10/15/20/25/30.
const HERO_SKILLS=[
 [['방패 충격','stun'],['수호자의 맹세','attackAura'],['강철 의지','power'],['충격파','stun'],['전장의 지휘','hasteAura'],['성역의 심판','stun']],
 [['그림자 베기','execute'],['암살 본능','speed'],['어둠의 집중','mana'],['그림자 폭풍','area'],['죽음의 표식','power'],['황혼 처형','execute']],
 [['대지 분쇄','area'],['전투 함성','attackAura'],['광전사의 피','speed'],['지진 강타','stun'],['분노 축적','mana'],['타이탄의 격노','area']],
 [['휘감는 뿌리','stun'],['생명의 샘','manaAura'],['숲의 축복','attackAura'],['정령의 순환','hasteAura'],['고목의 힘','power'],['세계수의 울림','stun']],
 [['관통 화살','pierce'],['매의 눈','power'],['바람의 시위','speed'],['화살비','area'],['사냥꾼의 호흡','mana'],['천궁의 심판','pierce']],
 [['속사 연발','burst'],['고속 장전','speed'],['전술 신호','speedAura'],['집중 사격','power'],['마력 탄창','mana'],['폭풍 탄막','burst']],
 [['폭발 포탄','area'],['공성 조준','power'],['충격 탄두','stun'],['자동 장전','speed'],['화력 지원','attackAura'],['궤도 폭격','area']],
 [['정령 화살','pierce'],['순풍','speedAura'],['마나 바람','manaAura'],['시간의 숨결','hasteAura'],['정령 공명','power'],['천공의 폭풍','area']],
 [['화염 폭발','burn'],['불씨 흡수','mana'],['홍염의 힘','power'],['용암 분출','area'],['불꽃의 격려','attackAura'],['불사조 강림','burn']],
 [['연쇄 감전','chain'],['과충전','mana'],['번개의 속도','speed'],['전도장','hasteAura'],['뇌신의 힘','power'],['천둥 폭풍','chain']],
 [['서리 폭발','freeze'],['냉기 집중','mana'],['빙결 파동','stun'],['얼음 결정','power'],['혹한 지대','freeze'],['절대 영도','freeze']],
 [['빛의 파동','area'],['마나의 축복','manaAura'],['성스러운 격려','attackAura'],['시간의 축복','hasteAura'],['빛의 행진','speedAura'],['태양의 심판','area']]
].map(row=>row.map(([name,effect],i)=>({name,effect,unlock:(i+1)*5,slot:i,active:['stun','execute','area','pierce','burst','burn','chain','freeze'].includes(effect)})));
const SUMMON_WEIGHTS=[7000,2000,700,250,45,5]; // out of 10,000; tier then uniform hero within tier
const SUMMON_ODDS='T1 70% · T2 20% · T3 7% · T4 2.5% · T5 0.45% · T6 0.05%';
function rollSummonTier(random=Math.random){const roll=random()*10000;let total=0;for(let i=0;i<6;i++){total+=SUMMON_WEIGHTS[i];if(roll<total)return i+1}return 6}
function skillKey(u,i){return `${u.type}:${u.lv}:${i}`}
function skillRank(u,i){return i<u.lv&&getLv(u.type,u.lv)>=(i+1)*5?(heroSkills[skillKey(u,i)]||1):0}
function skillCost(u,i){return skillRank(u,i)*10*u.lv}
function skillStats(def,rank){const r=Math.max(1,rank);return{power:1+.18*r+.2*def.slot,radius:65+5*r,stun:.35+.09*r,duration:2+.2*r,targets:2+Math.ceil(r/2),bonus:.03*r,regen:.6*r,mp:35+5*def.slot,cooldown:8+def.slot}}
function skillDescription(def,rank){const v=skillStats(def,rank),pct=Math.round(v.power*100),bonus=Math.round(v.bonus*100),area=`반경 ${v.radius}`;switch(def.effect){
 case 'power':return `자신 공격력 +${bonus}%`;
 case 'speed':return `자신 공격속도 +${bonus}%`;
 case 'mana':return `자신 MP 회복 +${v.regen.toFixed(1)}/초`;
 case 'attackAura':return `${area} 내 다른 아군 공격력 +${bonus}%`;
 case 'speedAura':return `${area} 내 다른 아군 공격속도 +${bonus}%`;
 case 'manaAura':return `${area} 내 다른 아군 MP 회복 +${v.regen.toFixed(1)}/초`;
 case 'hasteAura':return `${area} 내 다른 아군 스킬 재사용 속도 +${bonus}%`;
 case 'chain':return `가까운 적 ${v.targets}명 연쇄 · 공격력 ${pct}% · 감전 기절 ${v.stun.toFixed(2)}초 · ${v.duration.toFixed(1)}초 감전 피해`;
 case 'stun':return `${area} 광역 ${pct}% 피해 · 기절 ${v.stun.toFixed(2)}초`;
 case 'freeze':return `${area} 광역 ${pct}% 피해 · 빙결 ${v.stun.toFixed(2)}초 · 45% 감속 ${v.duration.toFixed(1)}초`;
 case 'burn':return `${area} 광역 ${pct}% 피해 · ${v.duration.toFixed(1)}초 화상`;
 case 'execute':return `단일 ${pct}% 피해 · 체력 35% 이하 적 피해 2배`;
 case 'pierce':return `대상 방향 관통 ${pct}% 피해 · 최대 ${v.targets}명`;
 case 'burst':return `단일 ${pct}% × ${v.targets}발 집중 사격`;
 default:return `${area} 광역 ${pct}% 피해`;
}}
function skillRows(u){return HERO_SKILLS[u.type].map((def,i)=>{const rank=skillRank(u,i);return{...def,rank,unlocked:rank>0,available:i<u.lv,description:skillDescription(def,rank||1)}})}
function levelUpSkill(type,tier,i){
 if(started&&!ended||typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed())return false;
 if(!Number.isInteger(i)||!catalogEntries().some(u=>u.type===type&&u.lv===tier)||i<0||i>=tier)return false;
 const u={type,lv:tier},rank=skillRank(u,i),cost=skillCost(u,i);if(!rank||rank>=10||essence<cost)return false;
 essence-=cost;heroSkills[skillKey(u,i)]=rank+1;saveMeta();playSound('levelUp');renderHeroLab();return true;
}
function prepareSkills(u){if(!Number.isFinite(u.mp))u.mp=0;if(!u.skillCD)u.skillCD=Array(6).fill(0);if(!Number.isInteger(u.skillCursor))u.skillCursor=0}
function skillModifiers(u){const result={attack:0,speed:0,mana:0,haste:0};
 for(const def of HERO_SKILLS[u.type]){const rank=skillRank(u,def.slot);if(!rank)continue;const v=skillStats(def,rank);if(def.effect==='power')result.attack+=v.bonus;if(def.effect==='speed')result.speed+=v.bonus;if(def.effect==='mana')result.mana+=v.regen}
 // Same aura category uses the strongest nearby source, preventing support stacking exploits.
 const aura={attack:0,speed:0,mana:0,haste:0};
 for(const ally of units){if(ally===u)continue;for(const def of HERO_SKILLS[ally.type]){const key={attackAura:'attack',speedAura:'speed',manaAura:'mana',hasteAura:'haste'}[def.effect];if(!key)continue;const rank=skillRank(ally,def.slot);if(!rank)continue;const v=skillStats(def,rank);if(d(slot(u.slot),slot(ally.slot))<=v.radius)aura[key]=Math.max(aura[key],key==='mana'?v.regen:v.bonus)}}
 for(const key in result)result[key]+=aura[key];return result;
}
function combatAttack(u){return battleAttack(u)*(1+skillModifiers(u).attack)}
function skillDamage(enemy,amount){hit(enemy,amount,'skill')}
function castHeroSkill(u,def,rank,target){
 const v=skillStats(def,rank),origin=slot(u.slot),damage=combatAttack(u)*v.power;let targets=[];
 if(def.effect==='chain'){
  let current=target;while(current&&targets.length<v.targets){targets.push(current);current=mobs.filter(m=>m.hp>0&&!targets.includes(m)&&d(m,current)<=v.radius).sort((a,b)=>d(a,current)-d(b,current))[0]}
 }else if(def.effect==='pierce'){
  const dx=target.x-origin.x,dy=target.y-origin.y,len=Math.hypot(dx,dy)||1;
  targets=mobs.filter(m=>{const x=m.x-origin.x,y=m.y-origin.y,along=(x*dx+y*dy)/len;return m.hp>0&&along>=0&&along<=battleRange(u)&&Math.abs(x*dy-y*dx)/len<=22}).sort((a,b)=>d(a,origin)-d(b,origin)).slice(0,v.targets);
 }else if(['execute','burst'].includes(def.effect))targets=[target];
 else targets=mobs.filter(m=>m.hp>0&&d(m,target)<=v.radius);
 for(const enemy of targets){
  const factor=def.effect==='execute'&&enemy.hp/enemy.max<=.35?2:def.effect==='burst'?v.targets:1;
  skillDamage(enemy,damage*factor);
  if(['chain','stun','freeze'].includes(def.effect))enemy.stun=Math.max(enemy.stun||0,v.stun);
  if(def.effect==='freeze')enemy.slow=Math.max(enemy.slow||0,v.duration);
  if(['chain','burn'].includes(def.effect)){enemy.dotTime=Math.max(enemy.dotTime||0,v.duration);enemy.dotDps=Math.max(enemy.dotDps||0,damage*.2)}
 }
 const color=U[u.type].accent;skillEffects.push({x:target.x,y:target.y,r:v.radius,t:.55,color,points:def.effect==='chain'?[origin,...targets.map(m=>({x:m.x,y:m.y}))]:null});
 floaters.push({x:origin.x,y:origin.y-30,t:1,s:def.name,col:color});playSound('hit',U[u.type].kind);
}
function tickHeroSkills(u,dt){prepareSkills(u);const mods=skillModifiers(u);u.mp=Math.min(100,u.mp+dt*(5+mods.mana));u.skillCD=u.skillCD.map(v=>Math.max(0,v-dt*(1+mods.haste)));
 const target=mobs.filter(m=>m.hp>0&&d(slot(u.slot),m)<=battleRange(u)).sort((a,b)=>b.p-a.p)[0];if(!target)return;
 for(let offset=0;offset<6;offset++){const i=(u.skillCursor+offset)%6,def=HERO_SKILLS[u.type][i],rank=skillRank(u,i);if(!rank||!def.active)continue;const v=skillStats(def,rank);if(u.mp<v.mp||u.skillCD[i]>0)continue;u.mp-=v.mp;u.skillCD[i]=v.cooldown;u.skillCursor=(i+1)%6;castHeroSkill(u,def,rank,target);break}
}
