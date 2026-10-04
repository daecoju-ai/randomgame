/* Live demonstrations use the exact hero, monster and VFX renderers used in battle. */
(()=>{
'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function icon(u,def){let h=2166136261;for(const c of def.name)h=Math.imul(h^c.charCodeAt(0),16777619);return '<img class="skillIcon" src="/assets/skill-icons/'+(h>>>0).toString(16)+'.svg" alt="'+esc(def.name)+' 스킬 이미지" width="48" height="48">'}
function art(u,def){
 const damage=typeof skillDamageText==='function'?skillDamageText(u,def):'직접 피해 0 · 지원 효과';
 return '<div class="skillArt"><header class="skillTitle">'+icon(u,def)+'<b>'+esc(def.name)+'</b></header>'+((def.components?.length>1)?'<div class="skillComponents">'+def.components.map(d=>'<span>'+icon(u,d)+esc(d.name)+'</span>').join('')+'</div>':'')+'<figure class="skillVisual liveSkillVisual"><canvas width="560" height="300" data-skill-scene="'+u.type+':'+u.lv+':'+(def.slot??0)+'" data-scene-effect="'+esc(def.components?def.components.map(x=>x.effect).join('|'):def.effect||'single')+'" aria-label="'+esc(heroLabel(u)+' · '+def.name+' 시전 장면')+'"></canvas><figcaption>게임 그래픽으로 재현한 시전 장면</figcaption><strong class="skillDamage">'+esc(damage)+'</strong><small class="skillDamageNote">치명타·적 방어 약화 적용 전 · 대상 1명 기준</small></figure></div>';
}
const seen=new Set(),active=new Set();
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)active.add(e.target);else active.delete(e.target)}),{threshold:.1});
function scan(){for(const c of document.querySelectorAll('[data-skill-scene]'))if(!seen.has(c)){seen.add(c);observer.observe(c);scene(c,performance.now()/1000)}for(const c of seen)if(!c.isConnected){observer.unobserve(c);seen.delete(c);active.delete(c)}}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
function scene(c,time){
 const [type,lv,skillSlot]=c.dataset.skillScene.split(':').map(Number),u={type,lv},f=c.dataset.sceneEffect.split('|')[Math.floor(time/2.8)%c.dataset.sceneEffect.split('|').length],g=c.getContext('2d'),color=U[type].accent;
 const p=(time%2.8)/2.8,cast=p>.18&&p<.85,phase=(p-.18)/.67;
 g.clearRect(0,0,560,300);const bg=g.createLinearGradient(0,0,0,300);bg.addColorStop(0,'#09192a');bg.addColorStop(1,'#183b40');g.fillStyle=bg;g.fillRect(0,0,560,300);
 // The battle's separate unit tiles and outer monster lane remain recognizable.
 g.fillStyle='#456354';g.fillRect(20,34,520,54);g.fillRect(445,34,70,234);g.fillStyle='#708078';for(let x=26;x<535;x+=22)g.fillRect(x,40,18,41);for(let y=94;y<260;y+=22)g.fillRect(451,y,57,18);
 for(let x=0;x<4;x++)for(let y=0;y<2;y++){g.fillStyle=(x+y)%2?'#1c3b49':'#234451';g.fillRect(30+x*98,111+y*77,92,70);g.strokeStyle='#a4d0c31a';g.strokeRect(30+x*98,111+y*77,92,70)}
 const support=(f==='ultimate'&&isSupport(u))||/Aura|fury|Fury|swift|cleanse|clarity|blessing|mana|reorder|speed/i.test(f);
 const targets=[{x:289,y:65},{x:380,y:65},{x:475,y:137}],origin={x:120,y:196};
 if(support){for(let i=0;i<3;i++)body(g,225+i*90,190,{type:i%6,lv:Math.min(lv,4)},.76,true)}
 else for(let i=0;i<targets.length;i++)drawMonster(g,{...targets[i],p:i*.1,r:15,hp:cast&&phase>.3?65:100,max:100,profile:MONSTER_NORMAL[i%3],hit:cast&&phase>.3&&phase<.5});
 body(g,origin.x,origin.y,u,1.35,true);
 if(cast){
  const target=support?{x:320,y:188}:targets[0];
  const effect={x:target.x,y:target.y,r:f==='ultimate'?143:support?143:62,t:Math.max(.05,.75*(1-phase)),color,kind:elementFor(type).id,effect:f,slot:skillSlot,type,support,phase:time*5,origin,life:.75};
  if(/chain|ricochet/i.test(f))effect.points=[origin,...targets];
  if(/pierce|railStrike|multi/.test(f))effect.points=[origin,...targets];
  drawSkillEffect(g,effect);
  if(!support&&phase>.28){g.font='bold 19px system-ui';g.textAlign='center';g.shadowColor='#07101d';g.shadowBlur=4;g.fillStyle='#fff0bc';g.fillText('HIT',target.x,target.y-27);g.shadowBlur=0}
 }
 g.fillStyle='#071321bb';g.fillRect(0,270,560,30);g.font='bold 13px system-ui';g.textAlign='left';g.fillStyle='#ecf3fa';g.fillText('SKILL CAST  /  '+heroLabel(u),18,291);
}
let last=0;function frame(ms){if(ms-last>65&&!document.hidden){last=ms;let count=0;for(const c of active){if(!c.isConnected||!c.getClientRects().length||!c.closest('dialog[open], #drawer, #battleSkillContent'))continue;if(++count>8)break;scene(c,ms/1000)}}requestAnimationFrame(frame)}
window.ForgeSkillVisuals={art,icon};scan();requestAnimationFrame(frame);
})();
