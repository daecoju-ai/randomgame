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
function drawSkillEffect(g,e){g.save();g.globalAlpha=Math.min(1,e.t*3);g.strokeStyle=e.color;g.fillStyle=e.color;g.lineWidth=2;const r=Math.max(8,e.r||20),k=e.kind||'fire',f=e.effect||'',phase=S.t*5;
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
let skillInspectPaused=false;
function openBattleSkills(u){const dialog=document.querySelector('#battleSkills');if(!dialog?.showModal)return;prepareSkills(u);skillInspectPaused=paused;paused=true;document.querySelector('#battleSkillContent').innerHTML=`<h2>${heroLabel(u)}</h2><p>${u.lv}단계 · Lv.${getLv(u.type,u.lv)} · ${rangeLabel(u)}</p><p>MP ${Math.floor(u.mp)} / 100 · 기본 회복 1/초</p><div class="skillUnlocks">${skillRows(u).filter(s=>s.available).map(s=>{const v=skillStats(s,s.rank||1,u);return `<div class="${s.unlocked?'unlocked':'sealed'}"><b>${s.name}</b><small>${s.unlocked?'스킬 Lv.'+s.rank:'유닛 Lv.'+s.unlock+' 해금'} · ${s.active?'자동 시전':'지속 효과'}</small><p>${s.description}</p>${s.active?`<small>MP ${v.mp} · 재사용 ${v.cooldown}초 · ${!s.unlocked?'잠김':u.skillCD[s.slot]>0?'남은 시간 '+u.skillCD[s.slot].toFixed(1)+'초':u.mp<v.mp?'MP 충전 중':'사용 준비'}</small>`:''}</div>`}).join('')}</div>`;dialog.showModal();dialog.onclose=()=>{if(started&&!ended)paused=skillInspectPaused};document.querySelector('#closeBattleSkills').onclick=()=>dialog.close();}
