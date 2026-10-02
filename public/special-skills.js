const SPECIAL_SKILLS={
 poison:[['독침','toxicStack'],['산성 웅덩이','acidPool'],['맹독 응축','toxicStack'],['독성 파열','toxicBurst'],['역병의 왕관','plague'],['만독 폭발','detonate'],['독화 만개','venomQueen']],
 metal:[['강철 관통','pierce'],['은빛 도탄','ricochet'],['칼날 파편','steelShard'],['장갑 분쇄','armorBreak'],['심판의 궤적','railStrike'],['백은 난무','bladeStorm'],['강철 선고','judgement']],
 time:[['시간 잔상','echo'],['초침의 낙인','timeMark'],['기록의 메아리','echo'],['시각 봉인','timeSeal'],['순간의 기록','chronicle'],['되감긴 타격','rewindStrike'],['시간 연쇄','timeCascade']],
 star:[['별빛 표식','starMark'],['성운 가루','stardust'],['작은 유성','starfall'],['항성 관측','starMark'],['낙성 예고','meteorSign'],['별자리 낙하','constellation'],['초신성','supernova']],
 void:[['균열 표식','riftMark'],['공허 파편','voidShard'],['차원의 흔적','riftMark'],['균열 흡수','riftConsume'],['공허의 각인','voidBrand'],['차원 붕괴','riftDetonate'],['무의 종언','nullCollapse']]
};
let specialEchoes=[];
function specialDescription(f){const descriptions={
 toxicStack:'중독 1중첩 추가 · 최대 5중첩 · 6초 지속 피해',acidPool:'주변 적에게 중독 2중첩',toxicBurst:'중독을 소모해 중첩당 추가 피해',plague:'주변 적에게 중독 3중첩',detonate:'주변 적의 중독을 소모해 폭발',venomQueen:'주변 적에게 5중첩을 부여하고 즉시 폭발',
 pierce:'대상 방향 직선상의 적을 관통',ricochet:'가까운 적 4명까지 0.8칸 간격으로 도탄',steelShard:'주변 적에게 금속 파편 피해',armorBreak:'대상에게 피해와 방어 약화',railStrike:'넓은 직선 관통 · Lv.30 피해 강화',bladeStorm:'주변 적에게 칼날 3연격',judgement:'방어 약화 상태의 적에게 추가 피해',
 echo:'타격을 기록하고 1초 뒤 60% 피해를 한 번 재현',timeMark:'피해와 시간 표식 · 재현 피해 증가',timeSeal:'2초 뒤 주변 적에게 기록 피해',chronicle:'타격 후 1초·2초 뒤 60%씩 재현',rewindStrike:'강한 적에게 타격을 기록하고 2초 뒤 150% 재현',timeCascade:'주변 적에게 각각 지연 타격 · 재현은 재귀 발동하지 않음',
 starMark:'별빛 표식으로 받는 피해 증가',stardust:'주변 적에게 별가루 피해',starfall:'1초 뒤 예고 지점에 낙하 · 중심부 2배 피해',meteorSign:'1.5초 뒤 큰 낙성 · 중심부 2배 피해',constellation:'적 3명의 현재 위치에 각각 낙하 예고',supernova:'2초 뒤 넓은 범위 초신성 폭발 · 중심부 2배 피해',
 riftMark:'균열 1중첩 부여 · 최대 5중첩',voidShard:'주변 적에게 피해와 균열 1중첩',riftConsume:'대상의 균열 소모 · 중첩당 추가 피해',voidBrand:'주변 적에게 균열 3중첩',riftDetonate:'주변 적의 균열을 소모해 폭발',nullCollapse:'대상에 균열 5중첩 부여 후 소모 · 주변에도 피해'
 };return descriptions[f]}
function castSpecialSkill(u,def,rank,target){if(!SPECIAL_SKILLS[elementFor(u.type).id])return false;if(!target||d(slot(u.slot),target)>battleRange(u))return true;
 const v=skillStats(def,rank,u),f=def.effect,e=elementFor(u.type).id,damage=combatAttack(u)*v.power,alive=mobs.filter(m=>m.hp>0),near=alive.filter(m=>d(m,target)<=v.radius);let targets=[target];
 const fx=(m,effect=f)=>skillEffects.push({x:m.x,y:m.y,r:v.radius,t:.65,kind:e,effect,slot:def.slot,type:u.type,color:U[u.type].accent,origin:slot(u.slot),life:.65});
 const later=(m,delay,amount,area=false)=>{specialEchoes.push({source:u,target:m,x:m.x,y:m.y,delay,damage:amount,area,r:v.radius,kind:e,effect:f,slot:def.slot});if(area)skillEffects.push({x:m.x,y:m.y,r:v.radius,t:delay,kind:e,effect:'telegraph',slot:def.slot,type:u.type,color:U[u.type].accent})};
 if(e==='poison'){
  if(['acidPool','plague','detonate','venomQueen'].includes(f))targets=near;
  for(const m of targets){const add=f==='venomQueen'?5:f==='plague'?3:f==='acidPool'?2:1;m.toxin=Math.min(5,(m.toxin||0)+(['detonate','toxicBurst'].includes(f)?0:add));m.toxinTime=v.duration;m.toxinSource=u;m.toxinDps=damage*.08;
   const consume=['toxicBurst','detonate','venomQueen'].includes(f);dealHeroDamage(u,m,damage*(consume?1+(m.toxin||0)*.6:.5));if(consume){m.toxin=0;m.toxinTime=0}fx(m)}
 }else if(e==='metal'){
  if(['pierce','railStrike'].includes(f)){const o=slot(u.slot),dx=target.x-o.x,dy=target.y-o.y,len=Math.hypot(dx,dy)||1;targets=alive.filter(m=>d(o,m)<=battleRange(u)&&((m.x-o.x)*dx+(m.y-o.y)*dy)>=0&&Math.abs((m.x-o.x)*dy-(m.y-o.y)*dx)/len<=combatCell()*(f==='railStrike'?.3:.15))}
  else if(f==='ricochet'){targets=[target];while(targets.length<4){const last=targets.at(-1),next=alive.filter(m=>!targets.includes(m)&&d(last,m)<=combatCell()*.8).sort((a,b)=>d(last,a)-d(last,b))[0];if(!next)break;targets.push(next)}}else if(['steelShard','bladeStorm'].includes(f))targets=near;
  if(['ricochet','pierce','railStrike'].includes(f))skillEffects.push({x:target.x,y:target.y,points:[slot(u.slot),...targets.map(m=>({x:m.x,y:m.y}))],r:20,t:.65,life:.65,kind:e,effect:f,color:U[u.type].accent});
  for(const m of targets){if(f==='bladeStorm'){dealHeroDamage(u,m,damage/3);later(m,.12,damage/3);later(m,.24,damage/3)}else dealHeroDamage(u,m,damage*(f==='judgement'&&m.vulnerableTime>0?2:1));if(f==='armorBreak'){m.vulnerableTime=6;m.vulnerability=.2}fx(m)}
 }else if(e==='time'){
  if(['timeSeal','timeCascade'].includes(f))targets=near;
  for(const m of targets){if(f!=='timeSeal')dealHeroDamage(u,m,damage);if(f==='timeMark')m.timeMarked=6;else{later(m,f==='rewindStrike'||f==='timeSeal'?2:1,damage*(f==='rewindStrike'?1.5:.6)*(m.timeMarked>0?1.25:1));if(f==='chronicle')later(m,2,damage*.6)}fx(m)}
 }else if(e==='star'){
  if(f==='starMark'){target.vulnerableTime=6;target.vulnerability=.2;dealHeroDamage(u,target,damage*.5)}else if(f==='stardust'){for(const m of near)dealHeroDamage(u,m,damage)}else{targets=f==='constellation'?alive.filter(m=>d(slot(u.slot),m)<=battleRange(u)).slice(0,3):[target];for(const m of targets)later(m,f==='supernova'?2:f==='meteorSign'?1.5:1,damage,true)}
 }else{
  if(['voidShard','voidBrand','riftDetonate','nullCollapse'].includes(f))targets=near;
  for(const m of targets){const consume=['riftConsume','riftDetonate','nullCollapse'].includes(f);if(f==='nullCollapse')m.rift=5;else if(!consume)m.rift=Math.min(5,(m.rift||0)+(f==='voidBrand'?3:1));m.riftTime=8;dealHeroDamage(u,m,damage*(consume?1+(m.rift||0)*.7:.5));if(consume)m.rift=0;fx(m)}
 }
 showSkill(u,def,v,target);return true;
}
function tickSpecialEffects(dt){
 for(const m of mobs){m.timeMarked=Math.max(0,(m.timeMarked||0)-dt);m.riftTime=Math.max(0,(m.riftTime||0)-dt);if(!m.riftTime)m.rift=0;if(m.toxinTime>0&&m.hp>0){const elapsed=Math.min(dt,m.toxinTime);m.toxinTime-=dt;dealHeroDamage(m.toxinSource,m,m.toxinDps*m.toxin*elapsed);if(m.toxinTime<=0)m.toxin=0}}
 for(const e of specialEchoes){e.delay-=dt;if(e.delay>0)continue;const targets=e.area?mobs.filter(m=>m.hp>0&&d(m,e)<=e.r):[e.target].filter(m=>m&&m.hp>0);for(const m of targets)dealHeroDamage(e.source,m,e.damage*(e.area&&d(m,e)<=e.r*.3?2:1));skillEffects.push({x:e.area?e.x:e.target.x,y:e.area?e.y:e.target.y,r:e.r,t:.55,kind:e.kind,effect:e.effect,slot:e.slot,type:e.source.type,life:.55,color:U[e.source.type].accent})}specialEchoes=specialEchoes.filter(e=>e.delay>0);
}
