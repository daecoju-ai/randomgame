/* Bright silhouettes; immutable profiles preserve the original spawning schedule. */
const MONSTER_NORMAL=[{name:'새싹 슬라임',hp:1,speed:1,defense:.04,cell:0,color:'#439744',theme:'표준형 · 낮은 방어력'},{name:'질주 박쥐',hp:.70,speed:1.26,defense:0,cell:1,color:'#387eaf',theme:'고속형 · 방어력 없음'},{name:'암갑 딱정벌레',hp:1.32,speed:.78,defense:.14,cell:2,color:'#9b703d',theme:'중장갑 · 느린 이동'}];
const MONSTER_BOSSES=[{name:'불꽃군주 그라움',hp:1,speed:.86,defense:.12,controlResist:.10,cell:3,color:'#cb4b30',theme:'화염 격노',skill:'HP 50% 이하에서 이동속도 25% 증가',trait:'enrage'},{name:'서리왕 펜리르',hp:.90,speed:1.18,defense:.08,controlResist:.50,cell:4,color:'#428fc0',theme:'빙결 면역 갑주',skill:'기절·빙결·감속 지속시간 50% 감소',trait:'resist'},{name:'태고의 바위왕',hp:1.30,speed:.68,defense:.27,controlResist:.25,cell:5,color:'#947235',theme:'태고의 석갑',skill:'받는 피해 30% 감소 · 제어효과 25% 저항',trait:'armor'},{name:'폭풍뱀 실피드',hp:.95,speed:1.26,defense:.06,controlResist:.20,cell:6,color:'#299453',theme:'폭풍 질주',skill:'8초마다 2초간 이동속도 45% 증가',trait:'dash'},{name:'뇌룡 볼테리온',hp:1.12,speed:1.02,defense:.18,controlResist:.35,cell:7,color:'#ba8c23',theme:'뇌린 장벽',skill:'받는 피해 18% 감소 · 제어효과 35% 저항',trait:'barrier'},{name:'흑월여왕 니아',hp:1.22,speed:1.10,defense:.20,controlResist:.35,cell:8,color:'#8a4ca8',theme:'흑월 각성',skill:'HP 50%에서 상태이상 해제 · 방어 30%·속도 20% 증가',trait:'phase'}];
let monsterAtlas=null;if(typeof Image!=='undefined'){monsterAtlas=new Image();monsterAtlas.src='/assets/monsters-v34.webp'}
function monsterProfile(wave,index,boss){return boss?MONSTER_BOSSES[Math.min(5,Math.floor(wave/5)-1)]:MONSTER_NORMAL[index%3]}
function drawMonster(g,m){const profile=m.profile||MONSTER_NORMAL[0],size=m.boss?62:30,bob=Math.sin(S.t*(profile.cell===1?9:5)+m.p*20)*(m.boss?1:2);g.save();g.translate(m.x,m.y);g.fillStyle='#34513325';g.beginPath();g.ellipse(0,size*.3,size*.34,size*.12,0,0,Math.PI*2);g.fill();if(m.boss){g.strokeStyle=profile.color;g.lineWidth=2;g.setLineDash([4,3]);g.beginPath();g.ellipse(0,5,29,12,0,0,Math.PI*2);g.stroke();g.setLineDash([])}
 if(monsterAtlas?.complete&&monsterAtlas.naturalWidth){const row=Math.floor(profile.cell/3),col=profile.cell%3,y=[0,385,790][row],height=[385,405,464][row];g.globalAlpha=m.hit?.72:1;g.drawImage(monsterAtlas,col*418,y,418,height,-size/2,-size*.6+bob,size,size);g.globalAlpha=1}else{g.fillStyle=profile.color;g.beginPath();g.arc(0,0,m.r,0,Math.PI*2);g.fill();g.fillStyle='#f9f5df';g.fillRect(-7,-5,4,4);g.fillRect(3,-5,4,4)}
 if(m.stun>0||m.slow>0||m.toxinTime>0||m.dotTime>0){g.lineWidth=1.7;g.shadowBlur=7;
 if(m.controlKind==='ice'&&(m.stun>0||m.slow>0)){g.fillStyle='#9deeff55';g.strokeStyle='#bcf7ff';g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;g.lineTo(Math.cos(a)*size*.55,Math.sin(a)*size*.55)}g.closePath();g.fill();g.stroke()}
 else if(m.stun>0){g.strokeStyle='#fff4b2';for(let i=0;i<3;i++){const a=S.t*4+i*2.1;g.strokeRect(Math.cos(a)*10,-size*.5+Math.sin(a)*3,3,3)}}
 if(m.dotTime>0&&m.dotKind==='electric'){g.strokeStyle='#ffed75';g.shadowColor='#fff2a0';g.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=size*(i%2?.42:.63);g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.closePath();g.stroke()}
 if(m.toxinTime>0){g.fillStyle='#b8ef4c';for(let i=0;i<3;i++){g.beginPath();g.arc(Math.sin(S.t*2+i)*size*.3,-size*.4-i*4,2,0,Math.PI*2);g.fill()}}
 g.shadowBlur=0;}
 const bar=m.boss?48:24;g.fillStyle='#405447';g.fillRect(-bar/2,-size*.63-5,bar,3);g.fillStyle=m.boss?'#ce643f':'#719e4c';g.fillRect(-bar/2,-size*.63-5,bar*Math.max(0,m.hp/m.max),3);if(m.boss){g.font='bold 10px system-ui';g.textAlign='center';g.fillStyle='#f8e8bd';g.strokeStyle='#07131f';g.lineWidth=3;g.strokeText(profile.name,0,-size*.63-10);g.fillText(profile.name,0,-size*.63-10);const pulse=.72+Math.sin(S.t*4)*.18;g.globalAlpha=pulse;g.strokeStyle=profile.color;g.lineWidth=2;g.beginPath();g.arc(0,bob,size*.58,0,Math.PI*2);g.stroke();g.globalAlpha=1}g.restore()}

function monsterDefense(m){const p=m?.profile||MONSTER_NORMAL[0];return Math.max(0,Math.min(.65,(p.defense||0)+(m?.phaseDefense||0)))}
function monsterDamageMultiplier(m){return 1-monsterDefense(m)}
function monsterControlDuration(m,duration){return duration*(1-Math.max(0,Math.min(.8,m?.profile?.controlResist||0)))}
function tickMonsterTrait(m,dt){
 if(!m?.boss)return 1;const p=m.profile||{};
 if(p.trait==='enrage'&&m.hp<=m.max*.5)return 1.25;
 if(p.trait==='dash'){m.traitClock=(m.traitClock||0)+dt;return m.traitClock%8<2?1.45:1}
 if(p.trait==='phase'&&m.hp<=m.max*.5){if(!m.phaseAwake){m.phaseAwake=true;m.stun=0;m.slow=0;m.dotTime=0;m.toxinTime=0;m.phaseDefense=.08}return 1.2}
 return 1
}
function monsterCodexHTML(){
 const stat=p=>'<div class="monsterStats"><span>HP<strong>×'+p.hp.toFixed(2)+'</strong></span><span>방어<strong>'+Math.round((p.defense||0)*100)+'%</strong></span><span>이동<strong>×'+p.speed.toFixed(2)+'</strong></span></div>';
 return '<section class="monsterCodexSection"><h3>일반 몬스터</h3><div class="monsterCodexGrid">'+MONSTER_NORMAL.map((p,i)=>'<article><span class="monsterCodexArt" style="--monster:'+p.color+'">'+(i+1)+'</span><div><h4>'+p.name+'</h4><p>'+p.theme+'</p>'+stat(p)+'</div></article>').join('')+'</div></section><section class="monsterCodexSection"><h3>보스 · 5웨이브마다 등장</h3><div class="monsterBossGrid">'+MONSTER_BOSSES.map((p,i)=>'<article><span class="bossWave">WAVE '+((i+1)*5)+'</span><h4>'+p.name+'</h4><p>'+p.theme+'</p>'+stat(p)+'<div class="bossSkill"><b>전용 특성</b><span>'+p.skill+'</span></div></article>').join('')+'</div></section><p class="monsterCodexNote">방어력은 최종 받는 피해를 감소시킵니다. 이동속도는 새싹 슬라임을 1.00 기준으로 표시합니다. 실제 HP는 웨이브 진행에 따라 증가합니다.</p>'
}
addEventListener('DOMContentLoaded',()=>{const d=document.querySelector('#monsterCodexContent'),open=document.querySelector('#openMonsterCodex'),close=document.querySelector('#closeMonsterCodex'),dialog=document.querySelector('#monsterCodexDialog');if(d)d.innerHTML=monsterCodexHTML();if(open&&dialog)open.onclick=()=>dialog.showModal();if(close&&dialog)close.onclick=()=>dialog.close()});
