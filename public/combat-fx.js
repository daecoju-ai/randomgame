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
function drawSkillEffect(g,e){drawPremiumSkillEffect(g,e);g.save();g.globalAlpha=Math.min(1,e.t*3);g.strokeStyle=e.color;g.fillStyle=e.color;g.lineWidth=2;const r=Math.max(8,e.r||20),k=e.kind||'fire',f=e.effect||'',phase=e.phase??S.t*5;
 if(e.points){g.beginPath();e.points.forEach((p,i)=>{if(!i)g.moveTo(p.x,p.y);else{const prev=e.points[i-1];g.lineTo((prev.x+p.x)/2+7,(prev.y+p.y)/2-7);g.lineTo(p.x,p.y)}});g.stroke()}
 else {g.translate(e.x,e.y);if(k==='electric'||f.includes('Thunder')||f==='bossStrike'){g.beginPath();g.moveTo(7,-r*1.8);g.lineTo(-8,-r*.5);g.lineTo(5,-r*.5);g.lineTo(-4,5);g.stroke()}
 else if(k==='shadow'||f==='slash'||k==='metal'){for(let i=0;i<(f==='slash'?1:3);i++){g.beginPath();g.ellipse(0,0,r,r*.25,-.7+i*.5,0,Math.PI);g.stroke()}}
 else if(k==='wind'||k==='void'){for(let i=0;i<3;i++){g.beginPath();g.arc(0,0,r*(.35+i*.25),phase+i,phase+i+4);g.stroke()}}
 else {const rays=k==='water'?6:k==='earth'?5:k==='star'?8:12;for(let i=0;i<rays;i++){const a=i*Math.PI*2/rays;g.beginPath();g.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);if(k==='earth'||k==='fire'){g.lineTo(Math.cos(a+.15)*r*.65,Math.sin(a+.15)*r*.65)}g.stroke()}}
 // Skill-specific sigil: inherited spells, control and final skills read differently.
 if(f==='telegraph'){g.setLineDash([3,5]);g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.moveTo(-r*.3,0);g.lineTo(r*.3,0);g.moveTo(0,-r*.3);g.lineTo(0,r*.3);g.stroke()}
 if(/mark|Mark|Brand/.test(f)){g.rotate(Math.PI/4);g.strokeRect(-9,-9,18,18);g.rotate(-Math.PI/4)}
 if(/Aura|fury|Fury|swift|cleanse|clarity/.test(f)){for(let i=0;i<4;i++){const a=i*Math.PI/2;g.strokeRect(Math.cos(a)*r-3,Math.sin(a)*r-3,6,6)}}
 if(/multi|burst|flurry|Burst|Storm/.test(f)){for(let i=0;i<3;i++){g.beginPath();g.moveTo(-r+i*8,-r);g.lineTo(r-i*8,r);g.stroke()}}
 if(f.includes('Zone')||/Pool|mud|freeze|Seal/.test(f)){g.setLineDash([5,4]);g.beginPath();g.ellipse(0,0,r,r*.55,0,0,Math.PI*2);g.stroke()}
 if(e.slot>=4){g.lineWidth=1;g.beginPath();g.arc(0,0,r*1.2,0,Math.PI*2);g.stroke()}}
 g.restore();}

function openBattleSkills(u){const dialog=document.querySelector('#battleSkills');if(!dialog?.show)return;prepareSkills(u);document.querySelector('#battleSkillContent').innerHTML=`<h2>${heroLabel(u)}</h2><p>${u.lv}단계 · Lv.${getLv(u.type,u.lv)} · ${rangeLabel(u)}</p><p class="liveBattleNote">전투 진행 중 · 확인 시점의 스킬 상태</p><p>MP ${Math.floor(u.mp)} / 100 · 기본 회복 1/초</p><div class="skillUnlocks">${skillRows(u).filter(s=>s.available).map(s=>{const v=skillStats(s,s.rank||1,u);return `<div class="${s.unlocked?'unlocked':'sealed'}">${window.ForgeSkillVisuals?.art(u,s)}<b>${s.name}</b><small>${s.unlocked?'스킬 Lv.'+s.rank:'유닛 Lv.'+s.unlock+' 해금'} · ${s.active?'자동 시전':'지속 효과'}</small><p>${s.description}</p>${s.active?`<small>MP ${v.mp} · 재사용 ${v.cooldown}초 · ${!s.unlocked?'잠김':u.skillCD[s.slot]>0?'남은 시간 '+u.skillCD[s.slot].toFixed(1)+'초':u.mp<v.mp?'MP 충전 중':'사용 준비'}</small>`:''}</div>`}).join('')}</div>`;if(!dialog.open)dialog.show();dialog.onclose=null;document.querySelector('#closeBattleSkills').onclick=()=>dialog.close();}

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
