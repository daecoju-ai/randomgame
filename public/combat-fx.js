// Silhouettes remain readable without relying solely on elemental color.
function drawProjectile(g,s){const k=elementFor(s.type).id,c=U[s.type].accent,a=Math.atan2(s.target.y-s.y,s.target.x-s.x);g.save();g.translate(s.x,s.y);g.rotate(a);g.strokeStyle=c;g.fillStyle=c;g.lineWidth=2;g.shadowColor=c;g.shadowBlur=7;g.beginPath();
 if(k==='electric'){g.moveTo(-13,-3);g.lineTo(-3,2);g.lineTo(-6,-5);g.lineTo(10,0);g.stroke()}
 else if(k==='wind'){g.arc(-3,0,9,-1.3,1.3);g.arc(-6,0,7,1.3,-1.3,true);g.fill()}
 else if(k==='earth'){for(let i=0;i<6;i++){const t=i*Math.PI/3;g.lineTo(Math.cos(t)*(i%2?6:8),Math.sin(t)*6)}g.closePath();g.fill();g.strokeStyle='#50301d';g.stroke()}
 else if(k==='star'){for(let i=0;i<10;i++){const t=i*Math.PI/5,r=i%2?3:9;g.lineTo(Math.cos(t)*r,Math.sin(t)*r)}g.closePath();g.fill()}
 else if(k==='time'||k==='void'){g.ellipse(0,0,4,9,0,0,Math.PI*2);g.stroke();g.moveTo(0,-6);g.lineTo(0,0);g.lineTo(5,2);g.stroke()}
 else if(k==='poison'){g.rect(-5,-4,8,8);g.rect(3,-2,4,4);g.fill();g.fillStyle='#ffffff';g.fillRect(-3,-2,2,2)}
 else {const wide=k==='fire'?6:3;g.moveTo(11,0);g.lineTo(-8,-wide);g.lineTo(k==='fire'?-3:-12,0);g.lineTo(-8,wide);g.closePath();g.fill();g.strokeStyle='#fff8';g.beginPath();g.moveTo(-5,0);g.lineTo(6,0);g.stroke()}
 g.restore();}
// Same renderer in combat and the animated skill catalogue.
function drawSkillEffect(g,e){
 const k=e.kind||'fire',f=e.effect||'impact',slot=e.slot??0,r=Math.max(12,e.r||24),life=e.life||.65,p=Math.max(0,Math.min(1,1-e.t/life)),phase=e.phase??S.t*5;
 const hash=Array.from(k+':'+slot+':'+f).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 g.save();g.globalAlpha=Math.min(1,e.t*4);g.strokeStyle=e.color||'#fff1a1';g.fillStyle=e.color||'#fff1a1';g.lineWidth=2;g.lineCap='round';g.shadowColor=g.strokeStyle;g.shadowBlur=12;
 const arc=(x,y,rad,a,b)=>{g.beginPath();g.arc(x,y,Math.max(1,rad),a,b);g.stroke()};
 const bolt=(a,b,seed)=>{g.beginPath();g.moveTo(a.x,a.y);for(let j=1;j<=9;j++){const t=j/9,offset=j===9?0:Math.sin(j*4.1+seed+phase*3)*12;g.lineTo(a.x+(b.x-a.x)*t+offset,a.y+(b.y-a.y)*t-offset*.55)}g.stroke()};
 if(e.points){for(let i=1;i<e.points.length;i++){if(k==='electric'){g.lineWidth=6;bolt(e.points[i-1],e.points[i],hash+i);g.strokeStyle='#fff';g.lineWidth=1.5;bolt(e.points[i-1],e.points[i],hash+i);g.strokeStyle=e.color}else{g.beginPath();g.moveTo(e.points[0].x,e.points[0].y);g.lineTo(e.points[i].x,e.points[i].y);g.stroke()}}}
 if(e.origin&&f==='single'){const travel=Math.min(1,p*3);drawProjectile(g,{x:e.origin.x+(e.x-e.origin.x)*travel,y:e.origin.y+(e.y-e.origin.y)*travel,type:e.type??ELEMENTS.find(z=>z.id===k)?.base??8,target:e})}
 g.translate(e.x,e.y);
 if(f==='ultimate'){
  g.globalCompositeOperation='lighter';g.shadowBlur=28;const size=r*(.3+.7*p);
  const glow=g.createRadialGradient(0,0,0,0,0,size);glow.addColorStop(0,'#ffffffbb');glow.addColorStop(.25,(e.color||'#fff')+'88');glow.addColorStop(1,'#ffffff00');g.fillStyle=glow;g.beginPath();g.arc(0,0,size,0,Math.PI*2);g.fill();
  for(let j=0;j<4;j++){g.lineWidth=j===0?6:2;g.strokeStyle=j%2?'#fff':e.color;arc(0,0,size*(.45+j*.18),phase+j,phase+j+Math.PI*1.7)}
  for(let j=0;j<28;j++){const a=j*Math.PI/14+phase*.15,rr=size*(.35+.65*((j%5)/4)),x=Math.cos(a)*rr,y=Math.sin(a)*rr;g.fillStyle=j%3?'#fff':e.color;g.beginPath();g.arc(x,y,2+j%4,0,Math.PI*2);g.fill();if(j%4===0){g.beginPath();g.moveTo(x,y);g.lineTo(x*.6,y*.6);g.stroke()}}
  if(!e.support){g.strokeStyle='#ffffff';g.lineWidth=8*(1-p);g.beginPath();g.moveTo(0,-r*2);g.lineTo(0,0);g.stroke()}
 }else if(f==='telegraph'){g.setLineDash([6,5]);arc(0,0,r,0,Math.PI*2);g.beginPath();g.moveTo(-r,0);g.lineTo(r,0);g.moveTo(0,-r);g.lineTo(0,r);g.stroke()}
 else if(k==='electric'){
  const spokes=f==='single'?3:f==='chain'?slot===1?5:8:f==='bossStrike'?1:12;
  if(f==='bossStrike'||f==='globalThunder'){g.lineWidth=8;bolt({x:0,y:-r*2},{x:0,y:0},hash);g.strokeStyle='#fff';g.lineWidth=2;bolt({x:0,y:-r*2},{x:0,y:0},hash)}
  else for(let i=0;i<spokes;i++){const a=i*Math.PI*2/spokes+phase*.08;bolt({x:Math.cos(a)*r*.15,y:Math.sin(a)*r*.15},{x:Math.cos(a)*r*(.5+p*.5),y:Math.sin(a)*r*(.5+p*.5)},hash+i)}
  for(let i=0;i<3+slot;i++)arc(Math.sin(i+phase)*r*.3,Math.cos(i+phase)*r*.3,4+i,phase+i,phase+i+1.8);
 }else if(k==='fire'){
  const count=f==='single'?3:f==='multi'?6:f==='area'?12:18;
  for(let i=0;i<count;i++){const a=i*6.283/count,dist=r*(.12+p*.7);g.save();g.translate(Math.cos(a)*dist,Math.sin(a)*dist*.7);g.rotate(a);g.beginPath();g.moveTo(0,-6);g.quadraticCurveTo(15+slot*3,-24*(1-p),3,10);g.quadraticCurveTo(-10,0,0,-6);g.fillStyle=i%2?'#ffcd70':e.color;g.fill();g.restore()}
 }else if(k==='water'){
  if(f==='wave'||f==='globalWave'||f==='tidal'){for(let i=0;i<3+slot;i++)arc(-r*.25,0,r*(.2+p*.6)+i*5,-1.2,1.2)}
  else for(let i=0;i<4+slot*2;i++){const a=i*6.283/(4+slot*2)+hash*.01;g.save();g.rotate(a);g.beginPath();g.moveTo(0,-r*(.2+p*.8));g.lineTo(7,-r*.2);g.lineTo(0,8);g.lineTo(-7,-r*.2);g.closePath();g.fillStyle='#b6f4ff';g.fill();g.restore()}
 }else if(k==='earth'){
  if(f==='mud'||f==='earthAura'){g.fillStyle='#6d503aaa';g.beginPath();g.ellipse(0,0,r,r*.45,0,0,6.283);g.fill();for(let i=0;i<6;i++)arc(Math.sin(i*3)*r*.7,Math.cos(i*2)*r*.3,3+p*8,0,6.283)}
  else for(let i=0;i<3+slot;i++){const a=i*6.283/(3+slot);g.save();g.rotate(a);g.beginPath();g.moveTo(0,0);g.lineTo(r*.4,7);g.lineTo(r*.6,-8);g.lineTo(r*(.4+p*.6),6);g.stroke();g.fillRect(r*.6,-10,8+slot,10+slot);g.restore()}
 }else if(k==='wind'){
  for(let i=0;i<3+slot;i++){g.beginPath();g.ellipse(Math.sin(phase+i)*5,-i*8,r*(.25+i*.11)*(1-p*.25),r*.18,0,phase+i,phase+i+4.5);g.stroke()}
  if(f==='speed'||f==='speedAura'||f==='hasteAura')for(let i=0;i<3;i++){g.beginPath();g.moveTo(-r+i*12,-12);g.lineTo(-r+10+i*12,0);g.lineTo(-r+i*12,12);g.stroke()}
 }else if(k==='shadow'||k==='metal'){
  const count=/mark|Mark|Break|Brand/.test(f)?4:1+slot;
  for(let i=0;i<count;i++){g.save();g.rotate((hash%17)*.08+i*.65);g.beginPath();g.ellipse(0,0,r*(.35+p*.65),r*.15,0,.3,Math.PI*1.45);g.stroke();if(k==='metal'){g.fillRect(r*.5,-3,15,6)}g.restore()}
 }else if(k==='poison'){
  if(/Pool|plague/.test(f)){g.fillStyle='#b8ef4555';g.beginPath();g.ellipse(0,0,r,r*.5,0,0,6.283);g.fill()}
  for(let i=0;i<5+slot*2;i++){const a=i*2.4+hash*.01,dist=r*(.1+p*.7);g.fillStyle=i%2?'#aaf54c':e.color;g.beginPath();g.arc(Math.cos(a)*dist,Math.sin(a)*dist*.6-p*12,3+(i%3)*2,0,6.283);g.fill()}
 }else if(k==='time'){
  for(let i=0;i<1+slot;i++){g.save();g.rotate(phase*.2+i*.5);arc(i*4,0,r*(.4+i*.1),0,6.283);g.beginPath();g.moveTo(0,-r*.4);g.lineTo(0,0);g.lineTo(r*.3,0);g.stroke();g.restore()}
 }else if(k==='star'){
  for(let i=0;i<2+slot;i++){g.save();g.translate(Math.sin(i*3)*r*.5,Math.cos(i*4)*r*.4);g.rotate(phase*.1);g.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5,rr=j%2?5:14+p*12;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.closePath();g.stroke();g.restore()}
 }else if(k==='void'){
  for(let i=0;i<2+slot;i++){g.save();g.rotate(i+phase*.15);g.beginPath();g.ellipse(0,0,r*(.3+i*.12),r*.1,0,0,6.283);g.stroke();g.restore()}
 }
 // Each named spell has a stable, different runic pattern as well as its elemental silhouette.
 if(slot>=4||/Aura|mark|Mark|Brand|Seal/.test(f)){g.save();g.rotate((hash%360)*Math.PI/180+phase*.05);const n=3+hash%6;g.beginPath();for(let i=0;i<=n;i++){const a=i*6.283/n;g.lineTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7)}g.stroke();g.restore()}

 // V63 premium finish: a second, lighter layer adds elemental identity without changing damage or timing.
 if(!e._premiumLayer){
  const q={...e,_premiumLayer:true};
  try{drawPremiumSkillEffect(g,q)}catch(_){}
 }
 g.restore();
}

function openBattleSkills(u){const dialog=document.querySelector('#battleSkills');if(!dialog?.show)return;prepareSkills(u);document.querySelector('#battleSkillContent').innerHTML=`<h2>${heroLabel(u)}</h2><p>${u.lv}단계 · Lv.${getLv(u.type,u.lv)} · ${rangeLabel(u)}</p><p class="liveBattleNote">전투 진행 중 · 확인 시점의 스킬 상태</p><p>MP ${Math.floor(u.mp)} / 100 · 기본 회복 1/초</p><div class="skillUnlocks">${skillRows(u).filter(s=>s.available).map(s=>{const v=skillStats(s,s.rank||1,u);return `<div class="${s.unlocked?'unlocked':'sealed'}">${window.ForgeSkillVisuals?.art(u,s)}<b>${s.name}</b><small>${s.unlocked?'스킬 Lv.'+s.rank:'★'+(s.ultimate?20:5)+' 개방'} · ${s.active?'자동 시전':'지속 효과'}</small><p>${s.description}</p>${s.active?`<small>MP ${v.mp} · 재사용 ${v.cooldown}초 · ${!s.unlocked?'잠김':u.skillCD[s.slot]>0?'남은 시간 '+u.skillCD[s.slot].toFixed(1)+'초':u.mp<v.mp?'MP 충전 중':'사용 준비'}</small>`:''}</div>`}).join('')}</div>`;if(!dialog.open)dialog.show();dialog.onclose=null;document.querySelector('#closeBattleSkills').onclick=()=>dialog.close();}

// Layered light, elemental shapes and deterministic particles; visual only.
function drawPremiumSkillEffect(g,e){
 const r=Math.min(180,Math.max(12,e.r||24)),life=e.life||.65,p=Math.max(0,Math.min(1,1-e.t/life)),f=e.effect||'impact',k=e.kind||'fire',color=e.color||'#e9cd88',phase=e.phase??S.t*5;
 g.save();g.globalAlpha=Math.min(1,e.t*4);g.globalCompositeOperation='lighter';g.lineCap='round';
 const beam=points=>{for(const [width,alpha] of [[11,.15],[5,.7],[1.5,1]]){g.lineWidth=width;g.strokeStyle=alpha===1?'#f7ffff':color;g.globalAlpha=alpha*Math.min(1,e.t*4);g.beginPath();points.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.stroke()}};
 if(e.points)beam(e.points);
 else if(e.origin&&/pierce|railStrike|echo|chronicle/.test(f))beam([e.origin,{x:e.x,y:e.y}]);
 if(e.origin&&['single','ice','strike'].includes(f)){const travel=Math.min(1,p*3),x=e.origin.x+(e.x-e.origin.x)*travel,y=e.origin.y+(e.y-e.origin.y)*travel;drawProjectile(g,{x,y,type:e.type??ELEMENTS.find(z=>z.id===k)?.base??8,target:{x:e.x,y:e.y}})}
 g.translate(e.x,e.y);g.globalAlpha=Math.min(1,e.t*4);
 const glow=g.createRadialGradient(0,0,0,0,0,r);glow.addColorStop(0,'#ffffff88');glow.addColorStop(.18,color+'b0');glow.addColorStop(.65,color+'24');glow.addColorStop(1,color+'00');g.fillStyle=glow;g.beginPath();g.ellipse(0,0,r,r*.72,0,0,Math.PI*2);g.fill();
 g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.ellipse(0,0,r*(.4+.6*p),r*(.25+.4*p),0,0,Math.PI*2);g.stroke();
 const count=e.slot>=4?20:12;for(let i=0;i<count;i++){const a=i*Math.PI*2/count+.27,dist=r*(.22+p*.78),x=Math.cos(a)*dist,y=Math.sin(a)*dist*.72;g.save();g.translate(x,y);g.rotate(a+phase*.08);g.fillStyle=i%3?'#fff1ca':color;
  if(k==='earth'||k==='metal'||k==='water'){g.beginPath();g.moveTo(0,-7);g.lineTo(4,0);g.lineTo(0,7);g.lineTo(-3,0);g.closePath();g.fill()}
  else if(k==='fire'||k==='poison'){g.beginPath();g.ellipse(0,0,2.5,7*(1-p)+2,0,0,Math.PI*2);g.fill()}
  else{g.fillRect(-1,-5,2,10);g.fillRect(-5,-1,10,2)}g.restore();
 }
 if(k==='wind'||k==='void'||/Zone|Pool/.test(f)){g.strokeStyle=color;for(let j=0;j<3;j++){g.beginPath();g.ellipse(0,-j*8,r*(.45+j*.18),r*.25,phase*.15+j,0,Math.PI*1.65);g.stroke()}}
 if(k==='time'){g.strokeStyle='#d8fff4';g.beginPath();g.arc(0,0,r*.65,0,Math.PI*2);g.moveTo(0,-r*.45);g.lineTo(0,0);g.lineTo(r*.3,r*.15);g.stroke()}
 g.restore();
}
