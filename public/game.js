function playSound(name,...args){if(typeof window!=='undefined')window.SFX?.[name]?.(...args)}
function drawArena(){
 const a=geometry(),cx=W/2,cy=(a.top+a.bottom)/2;
 const bg=ctx.createRadialGradient(cx,cy,30,cx,cy,Math.max(W,H)*.7);bg.addColorStop(0,'#d8e8c6');bg.addColorStop(.5,'#e7efda');bg.addColorStop(1,'#f5f4e7');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 // Fine architectural lines outside the battle area.
 ctx.strokeStyle='#62885b10';ctx.lineWidth=1;for(let x=0;x<W;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.fillStyle='#a8c88550';ctx.beginPath();ctx.roundRect(a.left+25,a.top+26,a.width-50,a.height-52,18);ctx.fill();
 const ring=(width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.beginPath();for(let i=0;i<=160;i++){let p=path(i/160);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.closePath();ctx.stroke()};
 ring(39,'#90a77755');ring(30,'#e1c987');ring(26,'#f5dea1');ring(1,'#bba36680');
 const per=2*(a.width+a.height);for(let i=0;i<per/24;i++){let p=path(i*24/per);ctx.strokeStyle='#c5ad74';ctx.lineWidth=1;ctx.beginPath();if(p.y===a.top||p.y===a.bottom){ctx.moveTo(p.x-2,p.y-11);ctx.lineTo(p.x+2,p.y+11)}else{ctx.moveTo(p.x-11,p.y-2);ctx.lineTo(p.x+11,p.y+2)}ctx.stroke()}
 // Four carved gate stones.
 for(let x of [a.left,a.right])for(let y of [a.top,a.bottom]){ctx.fillStyle='#e3dfca';ctx.strokeStyle='#7b9e7380';ctx.beginPath();ctx.roundRect(x-15,y-15,30,30,6);ctx.fill();ctx.stroke();ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.shadowColor='#48ad88';ctx.shadowBlur=14;ctx.fillStyle='#3d9b79';ctx.fillRect(-4,-4,8,8);ctx.restore()}
 // Rune at the heart of the grid.
 ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='#71925325';ctx.lineWidth=1;for(let r of [48,55,90]){ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke()}ctx.rotate(Math.PI/4);ctx.strokeRect(-35,-35,70,70);ctx.restore();
 const gy=Math.min(54,(a.height-88)/7),gx=(a.width-108)/3;
 for(let i=0;i<32;i++){let p=slot(i),occupied=units.some(u=>u.slot===i),hw=Math.min(23,gx*.45),hh=Math.min(23,gy*.44);const tile=ctx.createLinearGradient(p.x,p.y-hh,p.x,p.y+hh);tile.addColorStop(0,occupied?'#eff7e2':'#e1edcf');tile.addColorStop(1,'#cddfb9');ctx.fillStyle=tile;ctx.strokeStyle=occupied?'#79a16d99':'#8baa6c66';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(p.x-hw,p.y-hh,hw*2,hh*2,6);ctx.fill();ctx.stroke();ctx.fillStyle='#66874755';ctx.font='12px serif';ctx.textAlign='center';ctx.fillText('◇',p.x,p.y+4)}
 for(let i=0;i<16;i++){let x=cx+Math.sin(i*18.3)*Math.min(W*.48,290),y=a.top+(Math.cos(i*9.1)+1)/2*a.height;ctx.globalAlpha=.16+.1*Math.sin(S.t+i);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,1,0,7);ctx.fill()}ctx.globalAlpha=1;
}


const C=document.querySelector('#g'),ctx=C.getContext('2d');let W,H,D;
const S={coin:80,life:80,wave:1,t:0,next:0,spawn:0,max:30,sel:null,shake:0,stageStart:0,summons:0,drag:null};
let units=[],mobs=[],shots=[],particles=[],floaters=[];
let skillEffects=[];
let battleUpgrades={}; // Run-only: never included in local or account progression.
let started=false,paused=false,ended=false;
const DIFFICULTIES={normal:{label:'보통',hp:1,speed:1,start:80,waveCoin:8,gold:1},easy:{label:'쉬움',hp:.6,speed:.8,start:120,waveCoin:12,gold:.7}};
let selectedDifficulty='normal',battleDifficulty='normal',guestReward=0;
function mode(){return DIFFICULTIES[battleDifficulty]}
function setDifficulty(value){if(started&&!ended||document.querySelector('#startGame').disabled||document.querySelector('#restartGame').disabled||!DIFFICULTIES[value])return;selectedDifficulty=value;document.querySelectorAll('[data-difficulty]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.difficulty===value)));}

let recipeFilter="all",recipeStamp="";

const tierColors=["","#93a5aa","#76c7a3","#92b8f3","#edbe72","#c8a1ff","#8effeb"];
const U=Array.from({length:17},(_,type)=>{const e=elementFor(type);return{n:e.id+(type===e.support?'-support':''),cls:e.id,role:e.role,c:e.color,accent:e.accent,atk:e.atk*(type===e.support?.55:1),rate:e.rate,range:e.reach,kind:e.kind,desc:e.role}});
function rs(){D=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;C.width=W*D;C.height=H*D;ctx.setTransform(D,0,0,D,0,0)}addEventListener('resize',rs);rs();
const rnd=(a,b)=>a+Math.random()*(b-a), d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function toast(s){let e=document.querySelector('#toast');e.textContent=s;e.style.opacity=1;clearTimeout(e.tm);e.tm=setTimeout(()=>e.style.opacity=0,1800)}
function geometry(){const width=Math.min(W-40,410),left=(W-width)/2,right=left+width,top=H<620?146:174,bottom=H-190;return{left,right,top,bottom,width,height:bottom-top}}
function slot(i){let a=geometry(),gx=(a.width-108)/3,gy=Math.min(54,(a.height-88)/7);return{x:W/2+(i%4-1.5)*gx,y:(a.top+a.bottom)/2+(Math.floor(i/4)-3.5)*gy}}
function unitScale(){return Math.max(.28,Math.min(.64,(geometry().height-88)/7/68))}
function path(t){t=((t%1)+1)%1;let a=geometry(),per=2*(a.width+a.height),q=t*per;if(q<a.width)return{x:a.left+q,y:a.top};q-=a.width;if(q<a.height)return{x:a.right,y:a.top+q};q-=a.height;if(q<a.width)return{x:a.right-q,y:a.bottom};q-=a.width;return{x:a.left,y:a.bottom-q}}
const summonTypes=BASE_TYPES;
function summonCost(){return Math.min(40,10+Math.floor(S.summons/4)*2)}
function updateSummonPrice(){document.querySelector('#summon').textContent='소환 · '+summonCost()}
function summon(){
 if(ended||paused)return;
 let cost=Math.min(40,10+Math.floor(S.summons/4)*2);
 if(S.coin<cost)return toast('Battle Coin이 부족합니다 · 필요 '+cost);let free=[...Array(32).keys()].filter(i=>i!==guardianRun.slot&&!units.some(u=>u.slot===i));if(!free.length)return toast('32개 슬롯이 가득 찼습니다');S.coin-=cost;S.summons++;updateSummonPrice();const tier=rollSummonTier(),pool=catalogEntries().filter(u=>u.lv===tier&&u.type<12),entry=pool[Math.floor(Math.random()*pool.length)],sl=free[Math.floor(Math.random()*free.length)];units.push({...entry,slot:sl,cd:0,anim:0,invested:cost,mp:0});playSound('summon');toast(`T${tier} ${heroLabel(entry)} 소환`)}


const RECIPES=[],SPECIALS={};
for(const e of ELEMENTS){
 for(let tier=2;tier<=4;tier++){const name=`${e.id}-${tier}`;SPECIALS[name]={base:e.base};RECIPES.push({tier,cls:e.id,name,parts:[U[e.base].n,U[e.base].n,U[e.base].n],partTier:tier-1})}
 for(const type of [e.base,e.support]){const name=`${e.id}-final-${type===e.support?'support':'attack'}`;SPECIALS[name]={base:type};RECIPES.push({tier:5,cls:e.id,name,parts:[U[e.base].n,U[e.base].n,U[e.base].n],partTier:4})}
}
const heroNames=U.map((u,type)=>elementFor(type).label+(type===elementFor(type).support?' · 지원형':' · 공격형'));
const evolutionNames=U.map((u,type)=>{const e=elementFor(type);return [...(GROWTH_NAMES[e.id]||['','','','']),e.final[type===e.support?1:0]]});
const classLabels=Object.fromEntries(ALL_ELEMENTS.map(e=>[e.id,`${e.label} 속성 · ${e.role}`]));
// Persistent local progression. A single versioned record avoids partial currency/level writes.
const META_KEY='ff_progress_v3';
let metaStorageKey=META_KEY;
let storageAvailable=true,labFilter='all',selectedLabKey='0:1';
function sanitizeMeta(value){return cleanProgress(value)}
function readMeta(){try{if(typeof localStorage==='undefined'){storageAvailable=false;return{levels:{},essence:120}}const raw=localStorage.getItem(META_KEY);if(raw){try{const parsed=JSON.parse(raw);if(parsed.version!==4&&!localStorage.getItem(META_KEY+'_before_v16'))localStorage.setItem(META_KEY+'_before_v16',raw);return sanitizeMeta(parsed)}catch{storageAvailable=false;return{levels:{},essence:0}}}let legacy={};try{legacy=JSON.parse(localStorage.getItem('ff_heroLevelsV2')||'{}')}catch{}const value=sanitizeMeta({levels:legacy,essence:localStorage.getItem('ff_essence')||0});value.essence+=120;localStorage.setItem(META_KEY,JSON.stringify(value));return value}catch{storageAvailable=false;return{levels:{},essence:120}}}
const initialMeta=readMeta();guardianMeta=cleanGuardian(initialMeta.guardian);let heroLevels=initialMeta.levels,heroSkills=initialMeta.skills||{},essence=initialMeta.essence;
function saveMeta(sync=true){try{if(typeof localStorage==='undefined')throw Error('storage unavailable');localStorage.setItem(metaStorageKey,JSON.stringify({version:4,levels:heroLevels,skills:heroSkills,essence,guardian:{...guardianMeta}}));storageAvailable=true}catch{storageAvailable=false}renderWallet();if(sync&&typeof window!=='undefined')window.ForgeAccount?.changed()}
function heroUnlocked(type){return type<12||!!window.ForgeAdventure?.unlocked(type)}
function diamondBalance(){return window.ForgeAdventure?.diamonds()||0}
function renderWallet(){document.querySelector('#essence').textContent=essence;document.querySelector('#lobbyEssence').textContent=essence;if(document.querySelector('#diamondWallet'))document.querySelector('#diamondWallet').textContent=diamondBalance();document.querySelector('#saveStatus').textContent=(typeof window!=='undefined'&&window.ForgeAccount?.statusText())||(storageAvailable?'이 브라우저에 자동 저장 · 기기 간 동기화 없음':'저장 공간 사용 불가 · 종료하면 성장이 사라질 수 있습니다')}
function lvKey(type,tier){return type+':'+tier}
function getLv(type,tier){return heroLevels[lvKey(type,tier)]||1}
function levelCost(lv){return lv*12}
function metaAtkMult(type,tier){return 1+.05*(getLv(type,tier)-1)}
function battleUpgradeLevel(u){return battleUpgrades[lvKey(u.type,u.lv)]||0}
function battleUpgradeCost(u){return (battleUpgradeLevel(u)+1)*10}
function battleAttack(entry){return unitData(entry).atk*Math.pow(2.6,entry.lv-1)*(window.ForgeSummons?.factor(entry)||1)*metaAtkMult(entry.type,entry.lv)*(1+battleUpgradeLevel(entry)/100)}
function battleRange(entry){return unitData(entry).range*combatCell()}
function renderHeroLab(){
 renderWallet();const entries=catalogEntries();
 const shown=filterHeroCollection(entries.filter(u=>labFilter==='all'||(labFilter==='T1'?u.lv===1:U[u.type].cls===labFilter)));
 if(!shown.length){document.querySelector('#labCards').innerHTML='<p class="empty">검색 결과가 없습니다.</p>';document.querySelector('#labDetail').innerHTML='';document.querySelector('#collectionCount').textContent='검색 결과 0종';return}
 document.querySelector('#collectionCount').textContent=`${shown.length}종 · 강화 가능 ${shown.filter(canLevelHero).length}종`;
 const selected=shown.find(u=>lvKey(u.type,u.lv)===selectedLabKey)||shown[0]||entries[0];selectedLabKey=lvKey(selected.type,selected.lv);
 document.querySelector('#labCards').innerHTML=shown.map(u=>`<button class="labSelect ${lvKey(u.type,u.lv)===selectedLabKey?'selected':''}" data-hero-select="${u.type}:${u.lv}" aria-label="${heroLabel(u)} T${u.lv} 선택" aria-pressed="${lvKey(u.type,u.lv)===selectedLabKey}"><span>${u.lv}단계</span><canvas width="160" height="150" data-lab-type="${u.type}" data-lab-tier="${u.lv}"></canvas><b>${heroLabel(u)}</b><small>Lv.${getLv(u.type,u.lv)} / 30 · ★${window.ForgeSummons?.stars(u)||0}</small><em class="cardState">${!heroUnlocked(u.type)?"해금 필요":canLevelHero(u)?"↑ 강화 가능":""}</em></button>`).join('');
 document.querySelectorAll('[data-lab-type]').forEach(c=>body(c.getContext('2d'),80,78,{type:+c.dataset.labType,lv:+c.dataset.labTier},1.3,true));
 document.querySelectorAll('[data-hero-select]').forEach(b=>b.onclick=()=>{selectedLabKey=b.dataset.heroSelect;renderHeroLab();if(innerWidth<801)document.querySelector('#labDetail').scrollIntoView?.({behavior:'smooth',block:'start'})});
 const lv=getLv(selected.type,selected.lv),cost=levelCost(lv),maxed=lv>=30,battleOn=started&&!ended;
 let next=(window.ForgeSummons?.factor(selected)||1)*(1+.05*lv)*unitData(selected).atk*Math.pow(2.6,selected.lv-1);
 document.querySelector('#labDetail').innerHTML=`<nav class="heroPaging"><button id="heroPrev" aria-label="이전 유닛">❮</button><b>${shown.indexOf(selected)+1} / ${shown.length}</b><button id="heroNext" aria-label="다음 유닛">❯</button></nav><span class="eyebrow">HERO GROWTH / ${classLabels[U[selected.type].cls]}</span><canvas id="detailHero" width="280" height="210"></canvas><h3>${heroLabel(selected)}</h3><p class="starBonus">★ ${window.ForgeSummons?.stars(selected)||0} / 20 · 중복 1개마다 공격력·스킬 효과 +10%</p><p>${selected.lv}단계 · ${heroNames[selected.type]}</p><p class="combatIdentity">${elementFor(selected.type).role}${elementFor(selected.type).id==='shadow'?' · 기본 치명타 20%, 치명타 피해 2배':elementFor(selected.type).id==='fire'?' · 기본 공격 주변 0.75칸에 25% 추가 피해':''}${isSupport(selected)?' · 지원 반경 2.2칸':''}</p><div class="growthLevel">Lv.${lv} <small>/ 30</small></div><div class="levelTrack"><span style="width:${lv/30*100}%"></span></div><div class="growthStats"><span>공격력<strong>${battleAttack(selected).toFixed(1)}</strong></span><span>사거리<strong>${rangeLabel(selected)}</strong></span></div>${selected.lv===5?`<p class="awakening">${isSupport(selected)?"지원형":"공격형"} · Lv.1 / 10 / 20 전용기 해금<br>Lv.30 첫 전용기 위력·효과 ×1.5 ${lv>=30?"✓ 각성 완료":"· 각성 대기"}</p>`:""}${heroMilestoneHTML(selected)}${growthPreviewHTML(selected,lv,cost)}<div class="skillUnlocks">${skillRows(selected).map(s=>`<div class="${s.unlocked?'unlocked':'sealed'}"><b>${s.name}</b><small>${s.slot<4?'일반 스킬':'최종진화 전용'} · Lv.${s.unlock} · ${s.active?'자동 시전':'지속 효과'} · ${s.unlocked?`${s.rank}/10`:'잠김'}</small><p>${s.description}${s.active?`<br>MP ${skillStats(s,s.rank||1).mp} · 재사용 ${skillStats(s,s.rank||1).cooldown}초`:''}</p>${s.unlocked?`<button data-skill-up="${s.slot}" ${!heroUnlocked(selected.type)||battleOn||s.rank>=10||diamondBalance()<skillCost(selected,s.slot)?'disabled':''}>${s.rank>=10?'최대 강화':`강화 ${s.rank} → ${s.rank+1} · ${skillCost(selected,s.slot)} ◆`}</button>`:`<span>${s.available?`유닛 Lv.${s.unlock} 필요`:`${s.slot<4?s.slot+1:5}단계에서 개방`}</span>`}</div>`).join('')}</div><button id="levelUpSelected" ${!heroUnlocked(selected.type)||maxed||battleOn||essence<cost?'disabled':''}>${!heroUnlocked(selected.type)?'특별유닛 영구 해금 필요':battleOn?'전투 종료 후 강화 가능':maxed?'최대 레벨 달성':essence<cost?`금화 ${cost-essence} 부족`:`레벨업 · ${cost} ✦`}</button><small class="labNotice">이 영웅의 T${selected.lv}에만 적용됩니다.<br>새로 소환·조합한 같은 영웅에도 자동 적용됩니다.</small>`;
 const levelButton=document.querySelector('#levelUpSelected');levelButton.parentElement?.insertBefore(levelButton,document.querySelector('#labDetail .skillUnlocks'));
 for(const [id,step] of [['heroPrev',-1],['heroNext',1]])document.querySelector('#'+id).onclick=()=>{const u=shown[(shown.indexOf(selected)+step+shown.length)%shown.length];if(u){selectedLabKey=lvKey(u.type,u.lv);renderHeroLab()}};
 body(document.querySelector('#detailHero').getContext('2d'),140,115,selected,1.9,true);
 document.querySelector('#levelUpSelected').onclick=()=>levelUpHero(selected.type,selected.lv);
 document.querySelectorAll('[data-skill-up]').forEach(b=>b.onclick=()=>levelUpSkill(selected.type,selected.lv,+b.dataset.skillUp));
}
function levelUpHero(type,tier){
 if(window.ForgeAccount?.currentUser?.())return window.ForgeAdventure.upgrade('level',{type,tier});
 if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return false}
 if(started&&!ended)return false;
 if(!catalogEntries().some(u=>u.type===type&&u.lv===tier))return false;
 const lv=getLv(type,tier),cost=levelCost(lv);if(lv>=30||essence<cost)return false;
 playSound('levelUp');essence-=cost;heroLevels[lvKey(type,tier)]=lv+1;saveMeta();
 toast(`${evolutionNames[type][tier-1]} Lv.${lv+1}${tier===5&&[10,20].includes(lv+1)?' · 새 스킬 개방!':tier===5&&lv+1===30?' · 궁극기 강화!':''}`);renderHeroLab();refreshCodex();return true;
}
function grantEssence(amount){if(window.ForgeAdventure?.active())return;essence+=Math.max(0,Math.floor(amount));saveMeta()}
function goLobby(){document.querySelector('#battleSkills')?.close?.();if(guestReward&&!window.ForgeAdventure?.active()){toast('보상 받기를 눌러 금화를 먼저 수령하세요.');return;}battleUpgrades={};skillEffects=[];skillZones=[];specialEchoes=[];started=false;paused=false;window.ForgeAdventure?.lobby();S.sel=null;S.drag=null;document.querySelector('#startScreen').hidden=false;document.querySelector('#resultScreen').hidden=true;document.querySelector('#leaveBattle').hidden=true;closeModal('#recipeOverlay');closeModal('#drawer');refreshSelection();renderWallet()}
function openGrowth(){renderHeroLab();openModal('#drawer')}
function heroLabel(u){return evolutionNames[u.type][u.lv-1]}
function catalogEntries(){return ELEMENTS.flatMap(e=>[...Array.from({length:4},(_,i)=>({type:e.base,lv:i+1})),{type:e.base,lv:5},{type:e.support,lv:5}]).concat(SPECIAL_UNITS.map(e=>({type:e.type,lv:5}))).map(u=>{const recipe=RECIPES.findIndex(r=>r.tier===u.lv&&SPECIALS[r.name].base===u.type);return{...u,recipe,...(recipe>=0?{name:RECIPES[recipe].name}:{})}})}
function unitData(u){return u.name?{...U[u.type],...SPECIALS[u.name],n:u.name}:U[u.type]}
function specialOwned(name,tier=4){return units.filter(u=>u.name===name&&u.lv===tier).length}


function countOwned(name,tier){
 let i=U.findIndex(x=>x.n===name);
 return units.filter(x=>x.type===i&&x.lv===tier).length;
}
function classOwned(cls,tier){return units.filter(x=>U[x.type].cls===cls&&x.lv===tier).length}
function recipeReady(r){
 if(r.unlock&&!heroUnlocked(r.unlock))return false;
 if(r.need)return classOwned(r.need.cls,r.need.tier)>=r.need.count;
 if(r.parts){
   let need={};r.parts.forEach(n=>need[n]=(need[n]||0)+1);
   return Object.entries(need).every(([n,c])=>countOwned(n,r.partTier)>=c);
 }
 if(r.special)return r.special.every(n=>specialOwned(n,r.specialTier||4)>=1);
 return false;
}
function materialHTML(u,have,need){const state=have===0?'miss':need&&have<need?'partial':'have';return `<div class="mat ${state}"><canvas width="96" height="96" data-material-type="${u.type}" data-lv="${u.lv}"></canvas><strong>${heroLabel(u)}</strong><span class="materialCount">${have}${need?`<small> / ${need}</small>`:'<small> 보유</small>'}</span><small>T${u.lv}${state==='partial'?' · 부족':''}</small></div>`}
function recipeMaterials(r){
 if(r.need){return U.map((v,type)=>({v,type})).filter(x=>x.v.cls===r.cls&&(r.need.tier>1||summonTypes.includes(x.type))).map(x=>materialHTML({type:x.type,lv:r.need.tier},countOwned(x.v.n,r.need.tier),null)).join('')}
 if(r.parts){const counts={};r.parts.forEach(n=>counts[n]=(counts[n]||0)+1);return Object.entries(counts).map(([name,count])=>materialHTML({type:U.findIndex(u=>u.n===name),lv:r.partTier},countOwned(name,r.partTier),count)).join('')}
 return r.special.map(name=>materialHTML({type:SPECIALS[name].base,lv:r.specialTier||4},specialOwned(name,r.specialTier||4),1)).join('');
}
function renderRecipes(){
 const host=document.querySelector('#recipeBook');const scroll=document.querySelector('#recipeOverlay').scrollTop;
 const entries=catalogEntries();let available=RECIPES.filter(recipeReady).length;
 document.querySelector('#forgeCount').textContent=`41 유닛 · 기존 6속성 + 특별 5속성 · 조합 가능 ${available}`;
 host.innerHTML=ALL_ELEMENTS.map(({id:cls})=>{
 const list=entries.filter(u=>U[u.type].cls===cls&&(recipeFilter==='all'||recipeFilter===cls||(recipeFilter==='ready'&&u.recipe>=0&&recipeReady(RECIPES[u.recipe]))));
 if(!list.length)return '';
 return `<section class="codexClass class-${cls}"><header><span class="classSigil">${ALL_ELEMENTS.find(e=>e.id===cls).label}</span><div><small>HERO ARCHIVE</small><h3>${classLabels[cls]}</h3></div><span class="classTotal">${list.length} HEROES</span></header><div class="evolutionGrid">${list.map(u=>{
 const r=RECIPES[u.recipe],ready=!!r&&recipeReady(r),owned=u.name?units.filter(v=>v.name===u.name).length:countOwned(U[u.type].n,u.lv);
 let summary=u.type>=12?'4단계 유닛 3개 · 신규 속성 랜덤 진화':!r?'소환으로 획득':r.need?`${classLabels[cls]} T${r.need.tier} 합계 ${classOwned(cls,r.need.tier)} / 3`:'지정 재료 조합 · 확정 획득';
 let action=u.type>=12?(heroUnlocked(u.type)?'신규 랜덤 진화에서 등장':'미션·다이아로 영구 해금'):r?.unlock&&!heroUnlocked(r.unlock)?'미션·다이아로 영구 해금':!r?'기본 소환 유닛':ready?(r.need?'탭하여 계열 랜덤 조합':'탭하여 즉시 조합'):'재료를 모아 주세요';
 return `<article class="evolutionCard ${ready?'ready':owned>0?'owned':'locked'} ${r&&!ready?'uncraftable':''}" style="--tier:${tierColors[u.lv]}"><div class="cardMeta"><span>${u.lv}단계</span><small>보유 ${owned}</small></div><button class="heroSelect" data-craft="${u.recipe}" ${ready?'':'disabled'} aria-label="${heroLabel(u)} ${action}"><canvas width="240" height="210" data-catalog-type="${u.type}" data-lv="${u.lv}"></canvas><span class="heroArchetype">${heroNames[u.type]}</span><b>${heroLabel(u)}</b></button><div class="recipeSummary">${summary}</div><button class="skillInspect" data-inspect="${u.type}:${u.lv}">스킬 ${skillRows(u).filter(s=>s.available).length}개 · 상세 / 강화 ↗</button>${r?`<div class="mats">${recipeMaterials(r)}</div>`:u.type>=12?'<div class="baseNote">상단 신규 랜덤 진화에서 재료 3개를 선택하세요.</div>':'<div class="baseNote">소환 버튼으로 무작위 영웅을 획득합니다.</div>'}<div class="craftAction">${ready?'✦ ':''}${action}</div>${r?.need?'<div class="chanceNote">표시 영웅 확정 아님 · 4종 각 25%</div>':''}</article>`;
 }).join('')}</div></section>`;
 }).join('')||'<p class="empty">아직 조합 가능한 영웅이 없습니다.<br>같은 계열, 같은 등급 3개를 모아 보세요.</p>';
 host.insertAdjacentHTML('afterbegin',randomForgeHTML());bindRandomForge();
 document.querySelectorAll('[data-catalog-type]').forEach(c=>body(c.getContext('2d'),120,111,{type:+c.dataset.catalogType,lv:+c.dataset.lv},1.75,true));
 document.querySelectorAll('[data-material-type]').forEach(c=>body(c.getContext('2d'),48,51,{type:+c.dataset.materialType,lv:+c.dataset.lv},.85,true));
 document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{selectedLabKey=b.dataset.inspect;labFilter='all';heroCollectionQuery='';const search=document.querySelector('#heroSearch');if(search)search.value='';closeModal('#recipeOverlay');openGrowth()});
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{if(+b.dataset.craft>=0)craftRecipe(+b.dataset.craft)});
 document.querySelector('#recipeOverlay').scrollTop=scroll;recipeStamp=inventoryStamp();
}
function inventoryStamp(){return units.map(u=>`${u.type}:${u.lv}:${u.name||''}`).sort().join('|')}
function removeUnit(u){units=units.filter(x=>x!==u);if(S.sel===u)S.sel=null}
function craftRecipe(i){
 const r=RECIPES[i];if(!r||!recipeReady(r)||ended||paused||!started)return false;
 let take=[];
 if(r.need)take=units.filter(u=>U[u.type].cls===r.cls&&u.lv===r.need.tier).slice(0,r.need.count);
 else if(r.parts)r.parts.forEach(n=>take.push(units.find(u=>U[u.type].n===n&&u.lv===r.partTier&&!take.includes(u))));
 else r.special.forEach(n=>take.push(units.find(u=>u.name===n&&u.lv===(r.specialTier||4)&&!take.includes(u))));
 if(take.some(u=>!u))return false;
 const previousTier=take[0].lv;
 const keep=take[0],invested=take.reduce((sum,u)=>sum+unitInvestment(u),0);take.slice(1).forEach(removeUnit);keep.invested=invested;
 if(r.need){const candidates=U.map((u,i)=>({u,i})).filter(v=>v.u.cls===r.cls);keep.type=candidates[Math.floor(Math.random()*candidates.length)].i;delete keep.name}
 else{keep.name=r.name;keep.type=SPECIALS[r.name].base}
 playSound('fuse');keep.lv=r.tier;keep.anim=1;keep.cd=0;keep.mp=0;keep.skillCD=Array(7).fill(0);keep.buffs={};keep.stun=0;keep.slow=0;keep.skillCursor=0;S.sel=keep;
 const pos=slot(keep.slot);for(let j=0;j<28;j++)particles.push({x:pos.x,y:pos.y,vx:rnd(-80,80),vy:rnd(-80,80),t:.9,col:tierColors[r.tier]});
 toast(`${previousTier} → ${r.tier}단계 · ${heroLabel(keep)} 진화 완료`);window.ForgeAdventure?.record('crafts');if(keep.lv===5)window.ForgeAdventure?.final(keep.type);refreshSelection();renderRecipes();refreshCodex();return true;
}
let modalReturn=null;
function openModal(id){modalReturn=document.activeElement;document.querySelector(id).style.display='block';document.querySelector(id).focus()}
function closeModal(id){document.querySelector(id).style.display='none';modalReturn?.focus()}
function openRecipes(){recipeFilter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));openModal('#recipeOverlay');renderRecipes();document.querySelector('#recipeOverlay').scrollTop=0}
function spawn(){let boss=S.spawn===S.max-1&&S.wave%5===0;
 let elite=(S.spawn+1)%10===0&&!boss;
 let scale=Math.pow(1.19,S.wave-1);
 let hp=(boss?780:(elite?150:92))*scale*rnd(.92,1.10)*mode().hp;let p=path(0);mobs.push({p:0,x:p.x,y:p.y,hp,max:hp,r:boss?25:13,boss,slow:0,stun:0,hit:0});S.spawn++}
function fire(u,e){let T=unitData(u),p=slot(u.slot),mods=skillModifiers(u);u.cd=T.rate/((1+u.lv*.1)*(1+mods.speed));u.anim=1;
 const strike=amount=>{if(T.range<=1){dealHeroDamage(u,e,amount);skillEffects.push({x:e.x,y:e.y,r:20,t:.35,color:T.accent,kind:elementFor(u.type).id,effect:T.kind==='slash'?'slash':'impact'})}else shots.push({x:p.x,y:p.y,target:e,dmg:amount,kind:T.kind,type:u.type,lv:u.lv,source:u,dead:false})};
 strike(combatAttack(u));if(mods.clone)strike(combatAttack(u)*mods.clone);
 if(T.range<=1)applyAttackSplash(u,e,combatAttack(u));
}
function applyAttackSplash(u,target,damage){const splash=Math.max(elementFor(u.type).id==='fire'?.25:0,skillModifiers(u).splash)+talismanBonus(u,'splash');if(!splash)return;for(const m of mobs)if(m!==target&&m.hp>0&&d(m,target)<=combatCell()*.75)dealHeroDamage(u,m,damage*splash)}

function hit(e,damage,kind,silent=false,source=null){if(!e||e.hp<=0)return;damage*=1+(e.vulnerableTime>0?(e.vulnerability||0):0);e.hp-=damage;e.hit=.14;if(!silent)playSound('hit',kind);
 let col=kind==='fire'?'#f6a15c':kind==='volt'?'#b9a5ff':kind==='ice'?'#bfeef4':kind==='arrow'?'#b9d58e':'#e7d8b6';
 if(!silent)for(let i=0;i<7;i++)particles.push({x:e.x,y:e.y,vx:rnd(-65,65),vy:rnd(-65,65),t:.4,col});
 if(!silent)floaters.push({x:e.x,y:e.y-14,t:.55,s:Math.round(damage),col});
 if(e.hp<=0){guardianKill(e);window.ForgeAdventure?.record('kills');if(e.boss)window.ForgeAdventure?.record('bosses');if(source?.type===8||source?.type===11)window.ForgeAdventure?.record('firekills');if(e.mudTagged)window.ForgeAdventure?.record('mudkills');if(e.boss&&(source?.type===1||source?.type===6))window.ForgeAdventure?.record('shadowbosses');playSound('death',e.boss);S.coin+=(e.boss?30:2)+(Math.random()<talismanBonus(null,'killCoin')?1:0);for(let i=0;i<18;i++)particles.push({x:e.x,y:e.y,vx:rnd(-100,100),vy:rnd(-100,100),t:.6,col:'#d95a62'})}
}
document.querySelector('#summon').onclick=summon;document.querySelector('#combine').onclick=openRecipes;
document.querySelector('#codex').onclick=openRecipes;document.querySelector('#close').onclick=()=>closeModal('#drawer');
function refreshCodex(){const heroes=catalogEntries();document.querySelector('#cards').innerHTML=heroes.map((u,i)=>{const t=unitData(u);return `<div class="card" style="--tier:${tierColors[u.lv]}"><span class="tierbadge">${heroNames[u.type]} · ${u.lv}단계</span><canvas width="240" height="210" data-hero="${i}"></canvas><b>${heroLabel(u)}</b><span class="tag">${classLabels[t.cls]}</span><div class="skill">공격력 ${Math.round(t.atk*Math.pow(2.6,u.lv-1))} · ${rangeLabel(u)}</div></div>`}).join('');document.querySelectorAll('[data-hero]').forEach(c=>body(c.getContext('2d'),120,111,heroes[+c.dataset.hero],1.75,true))}
function body(g,x,y,u,s=1,mini=false){drawElementHero(g,x,y,u,s,mini)}
C.addEventListener('pointerdown',e=>{
 if(!started||paused||ended||document.querySelector('#drawer').style.display==='block'||document.querySelector('#recipeOverlay').style.display==='block')return;
 let p={x:e.clientX,y:e.clientY},near=units.find(u=>d(slot(u.slot),p)<25);
 if(d(guardianPosition(),p)<19){guardianRun.selected=true;S.sel=null;S.drag={guardian:true,startX:p.x,startY:p.y};C.setPointerCapture?.(e.pointerId);refreshSelection();return;}guardianRun.selected=false;
 if(near){S.sel=near;S.drag={u:near,startX:p.x,startY:p.y};C.setPointerCapture?.(e.pointerId);refreshSelection()}
});
C.addEventListener('pointerup',e=>{
 if(!S.drag)return;
 const tapped=Math.hypot(e.clientX-S.drag.startX,e.clientY-S.drag.startY)<8;
 if(tapped){S.drag=null;refreshSelection();return;}
 let p={x:e.clientX,y:e.clientY},best=-1,bd=999;
 for(let i=0;i<32;i++){let q=slot(i),dd=d(q,p);if(dd<bd){bd=dd;best=i}}
 if(S.drag.guardian){if(best>=0&&bd<31&&moveGuardian(best))toast('주인공 이동 배치');S.drag=null;refreshSelection();return;}
 if(best>=0&&bd<31){
   let a=S.drag.u,b=units.find(u=>u.slot===best);
   if(guardianRun.slot===best){guardianRun.slot=a.slot;a.slot=best;toast('주인공과 위치 교환')}
   else if(b&&b!==a){let old=a.slot;a.slot=b.slot;b.slot=old;toast('유닛 위치 교환')}
   else if(!b)a.slot=best;
 }
 S.drag=null;refreshSelection();
});
C.addEventListener('pointercancel',()=>{S.drag=null});
function update(dt){S.t+=dt;tickGuardian(dt);tickBattleStatus(dt);tickSkillZones(dt);skillEffects=skillEffects.map(e=>({...e,t:e.t-dt})).filter(e=>e.t>0);
 if(S.stageStart===0)S.stageStart=S.t;
 if(S.spawn<S.max&&S.t>S.next){spawn();S.next=S.t+(20/30)}
 mobs.forEach(m=>{if(m.hp<=0)return;if(m.dotTime>0){const elapsed=Math.min(dt,m.dotTime);m.dotTime-=elapsed;hit(m,(m.dotDps||0)*elapsed,'skill',true,m.dotSource);if(m.hp<=0)return}m.vulnerableTime=Math.max(0,(m.vulnerableTime||0)-dt);m.weakenTime=Math.max(0,(m.weakenTime||0)-dt);m.attackSlowTime=Math.max(0,(m.attackSlowTime||0)-dt);m.hit=Math.max(0,m.hit-dt);m.stun=Math.max(0,m.stun-dt);m.slow=Math.max(0,m.slow-dt);if(m.stun<=0)m.p+=dt*.070*mode().speed*(m.slow>0?.55:1);let p=path(m.p);m.x=p.x;m.y=p.y});
 mobs=mobs.filter(m=>m.hp>0);
 if(mobs.length>=80){finish(false);return}
 if(S.t-S.stageStart>=20&&S.wave<30){S.wave++;playSound('wave');toast('WAVE '+S.wave);S.spawn=0;S.max=30;S.stageStart=S.t;S.next=S.t;S.coin+=mode().waveCoin;S.runEssence=(S.runEssence||0)+3}
 if(S.wave===30&&S.spawn===S.max&&mobs.length===0){finish(true);return}
 units.forEach(u=>{if(u.stun>0)return;tickHeroSkills(u,dt);u.cd-=dt*(u.slow>0?.65:1);u.anim=Math.max(0,u.anim-dt*4);let p=slot(u.slot),T=unitData(u);if(u.cd<=0){let rng=battleRange(u);let tar=mobs.filter(m=>m.hp>0&&d(p,m)<rng).sort((a,b)=>b.p-a.p)[0];if(tar)fire(u,tar)}});
 shots.forEach(s=>{if(!s.target||s.target.hp<=0){s.dead=true;return}let dx=s.target.x-s.x,dy=s.target.y-s.y,dd=Math.hypot(dx,dy);if(dd<13){s.dead=true;dealHeroDamage(s.source,s.target,s.dmg);applyAttackSplash(s.source,s.target,s.dmg)}else{s.x+=dx/dd*440*dt;s.y+=dy/dd*440*dt}});
 shots=shots.filter(s=>!s.dead);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;p.t-=dt});particles=particles.filter(p=>p.t>0);floaters.forEach(f=>{f.y-=25*dt;f.t-=dt});floaters=floaters.filter(f=>f.t>0);
 document.querySelector('#coin').textContent=S.coin;document.querySelector('#life').textContent=mobs.length;document.querySelector('#wave').textContent=String(S.wave).padStart(2,'0')+' / 30';
 document.querySelector('#stageProgress span').style.width=Math.min(100,(S.t-S.stageStart)/20*100)+'%';
 document.querySelector('#summon').disabled=S.coin<summonCost();
 refreshSelection();
 if(document.querySelector('#recipeOverlay').style.display==='block'&&recipeStamp!==inventoryStamp())renderRecipes();
 let b=mobs.find(m=>m.boss),bw=document.querySelector('#bossWrap');bw.style.display=b?'block':'none';if(b)document.querySelector('#bossBar').style.width=100*b.hp/b.max+'%';
}
function draw(){ctx.save();ctx.clearRect(0,0,W,H);
 drawArena();
 // Selected unit: show its real attack radius.
 if(S.sel){
   let sp=slot(S.sel.slot),sr=battleRange(S.sel);
   ctx.save();
   ctx.fillStyle='#157cba22';
   ctx.strokeStyle='#126ba9';
   ctx.lineWidth=2.5;
   ctx.setLineDash([6,5]);
   ctx.beginPath();ctx.arc(sp.x,sp.y,sr,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.setLineDash([]);
   ctx.fillStyle='#123e60';ctx.font='800 12px system-ui';ctx.textAlign='center';
   ctx.fillText(rangeLabel(S.sel),sp.x,Math.max(78,sp.y-sr-7));
   ctx.restore();
 }
 drawGuardian();
 units.forEach(u=>{const p=slot(u.slot),bounds=tileBounds();if(S.sel===u){ctx.strokeStyle='#f1d087';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(p.x-bounds.hw,p.y-bounds.hh,bounds.hw*2,bounds.hh*2,5);ctx.stroke()}body(ctx,p.x,p.y-u.anim*3,u,unitScale()+u.anim*.03);const barWidth=Math.max(12,bounds.hw*2-22);ctx.fillStyle='#132a3a';ctx.fillRect(p.x-bounds.hw+20,p.y+bounds.hh-5,barWidth,3);ctx.fillStyle='#5ecfff';ctx.fillRect(p.x-bounds.hw+20,p.y+bounds.hh-5,barWidth*(u.mp||0)/100,3)});

 mobs.forEach(m=>{ctx.save();ctx.translate(m.x,m.y);ctx.shadowBlur=m.boss?20:8;ctx.shadowColor='#b94a52';ctx.fillStyle=m.hit?'#f3e6d4':'#7b3c43';ctx.beginPath();ctx.roundRect(-m.r,-m.r,m.r*2,m.r*2,8);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#12181c';ctx.beginPath();ctx.arc(-4,-2,2,0,7);ctx.arc(4,-2,2,0,7);ctx.fill();ctx.fillStyle='#171d21';ctx.fillRect(-m.r,-m.r-7,m.r*2,3);ctx.fillStyle='#d8585f';ctx.fillRect(-m.r,-m.r-7,m.r*2*m.hp/m.max,3);ctx.restore()});
 shots.forEach(s=>drawProjectile(ctx,s));
 particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.t*3);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,7);ctx.fill();ctx.globalAlpha=1});
 floaters.forEach(f=>{ctx.globalAlpha=Math.min(1,f.t*3);ctx.fillStyle=f.col;ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(f.s,f.x,f.y);ctx.globalAlpha=1});
 for(const z of skillZones)drawSkillEffect(ctx,{x:z.x,y:z.y,r:z.radius,t:.3,color:z.color,kind:elementFor(z.source.type).id,effect:z.effect});
 for(const e of skillEffects)drawSkillEffect(ctx,e);
 drawGuardianEffects();
 units.forEach(u=>{const p=slot(u.slot);drawUnitBadge(ctx,p.x,p.y,u)});
 ctx.restore()}
function resetGame(){resetGuardian();battleDifficulty=selectedDifficulty;guestReward=0;document.querySelector('#battleSkills')?.close?.();randomForgeSelection=[];battleUpgrades={};skillEffects=[];skillZones=[];specialEchoes=[];Object.assign(S,{coin:80,wave:1,t:0,next:0,spawn:0,max:30,sel:null,stageStart:0,summons:0,drag:null,runEssence:0});units=[];mobs=[];shots=[];particles=[];floaters=[];paused=false;ended=false;for(let i=0;i<4;i++)summon();placeGuardian();window.ForgeSummons?.deploy();S.summons=0;S.coin=mode().start+Math.floor(talismanBonus(null,'startCoin'));updateSummonPrice();document.querySelector('#pause').textContent='Ⅱ';document.querySelector('#pause').setAttribute('aria-label','일시정지');refreshSelection()}
function finish(won){if(ended)return;ended=true;saveMeta();renderGuardian();battleUpgrades={};skillEffects=[];skillZones=[];specialEchoes=[];refreshSelection();playSound(won?'victory':'defeat');let gained=Math.floor(S.wave*1.5)+(won?30:0);const talismanReward=Math.floor((gained+(S.runEssence||0))*talismanBonus(null,'essence'));guestReward=Math.floor((gained+(S.runEssence||0)+talismanReward)*mode().gold);document.querySelector('#claimBattleReward').disabled=!!window.ForgeAdventure?.active();document.querySelector('#claimBattleReward').textContent='보상 받기';document.querySelector('#battleSkills')?.close?.();document.querySelector('#resultTitle').textContent=won?'VICTORY':'다시, 전설을 향해';document.querySelector('#resultText').textContent=`${mode().label} · ${S.wave} 웨이브 · ${won?'유적 방어 성공':'몬스터 수용 한계 도달'}`;document.querySelector('#rewardTotal').textContent=`+${guestReward}`;document.querySelector('#rewardBreakdown').textContent=`웨이브 보상 ${S.runEssence||0} + 종료 보상 ${Math.floor(S.wave*1.5)} + 승리 보너스 ${won?30:0} + 부적 보너스 ${talismanReward}${battleDifficulty==='easy'?' · 쉬움 금화 70% 적용':''}`;document.querySelector('#rewardBalance').textContent=`현재 보유 금화 ${essence}`;document.querySelector('#resultScreen').hidden=false;window.ForgeUX?.rewards({pending:!!window.ForgeAdventure?.active()});if(window.ForgeAdventure?.active())window.ForgeAdventure.finish(won);closeModal('#recipeOverlay');closeModal('#drawer')}
document.querySelector('#startGame').onclick=()=>{if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}started=true;resetGame();document.querySelector('#startScreen').hidden=true};
document.querySelector('#restartGame').onclick=()=>{if(guestReward&&!window.ForgeAdventure?.active()){toast('보상을 먼저 받아 주세요.');return;}if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}resetGame();document.querySelector('#resultScreen').hidden=true};
document.querySelector('#previewCodex').onclick=openGrowth;
document.querySelector('#pause').onclick=()=>{if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}paused=!paused;document.querySelector('#pause').textContent=paused?'▶':'Ⅱ';document.querySelector('#pause').setAttribute('aria-label',paused?'전투 계속':'일시정지');toast(paused?'전투 일시정지':'전투 계속')};
document.querySelector('#closeRecipe').onclick=()=>closeModal('#recipeOverlay');
document.querySelector('#recipeOverlay').addEventListener('pointerdown',e=>{if(e.target.id==='recipeOverlay')closeModal('#recipeOverlay')});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{recipeFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderRecipes()});
addEventListener('keydown',e=>{let id=['#recipeOverlay','#drawer'].find(id=>document.querySelector(id).style.display==='block');if(e.key==='Escape'&&id)closeModal(id);if(e.key==='Tab'&&id){let buttons=[...document.querySelector(id).querySelectorAll('button:not(:disabled)')];let first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===document.querySelector(id))){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
C.addEventListener('pointercancel',()=>S.drag=null);
let last=performance.now();function loop(n){let dt=Math.min(.034,(n-last)/1000);last=n;if((typeof window==='undefined'||!window.ForgeAccount||window.ForgeAccount.allowed())&&started&&!paused&&!ended&&!document.hidden&&!(W>H&&H<=520))update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
refreshCodex();renderHeroLab();

function unitInvestment(u){return u.invested??10*([0,1,3,9,27,54,108][u.lv]||1)}
function sellValue(u){return Math.floor(unitInvestment(u)*(.5+talismanBonus(null,'sell')))}
function refreshSelection(){const u=S.sel,valid=!!u&&units.includes(u);document.querySelector('#selectionPanel').hidden=!valid;document.querySelector('#codex').hidden=valid;for(const id of ['battleUpgrade','sellUnit','battleUpgradeNotice'])document.querySelector('#'+id).hidden=false;if(!valid){if(guardianRun.selected){document.querySelector('#selectionPanel').hidden=false;document.querySelector('#codex').hidden=true;document.querySelector('#selectedName').textContent=guardianMeta.nickname;document.querySelector('#selectedTier').textContent=`Lv.${guardianLevel(guardianMeta)} · 공격 ${(120*guardianPower()*(1+.03*(guardianLevel(guardianMeta)-1))).toFixed(1)} · 0.6회/초 · 1.5칸 · MP ${Math.floor(guardianRun.mp)}`;for(const id of ['battleUpgrade','sellUnit','battleUpgradeNotice'])document.querySelector('#'+id).hidden=true;}return;}refreshBattleUpgrade();document.querySelector('#selectedName').textContent=heroLabel(u);document.querySelector('#selectedTier').textContent=`${u.lv}단계 · Lv.${getLv(u.type,u.lv)} · 공격 ${combatAttack(u).toFixed(1)} · ${rangeLabel(u)} · MP ${Math.floor(u.mp||0)}/100${u.stun>0?' · 기절':u.slow>0?' · 감속':''}`;document.querySelector('#sellUnit').textContent=`되팔기 +${sellValue(u)} ◈`}
function refreshBattleUpgrade(){
 const u=S.sel;if(!u||!units.includes(u))return;
 const level=battleUpgradeLevel(u),cost=battleUpgradeCost(u),button=document.querySelector('#battleUpgrade');
 button.disabled=!started||ended||paused||level>=10||S.coin<cost;
 button.textContent=level>=10?'전투 강화 10/10 · 최대':`전투 강화 ${level}/10 → ${level+1} · ${cost} ◈`;
 document.querySelector('#battleUpgradeNotice').textContent=`공격력 +${level}% · 같은 종류·단계 전체 적용 · 종료 시 초기화`;
}
function upgradeBattleSelected(){
 const u=S.sel;
 if(!started||ended||paused||!u||!units.includes(u))return false;
 if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed())return false;
 const level=battleUpgradeLevel(u),cost=battleUpgradeCost(u);
 if(level>=10||S.coin<cost)return false;
 S.coin-=cost;battleUpgrades[lvKey(u.type,u.lv)]=level+1;
 document.querySelector('#coin').textContent=S.coin;
 document.querySelector('#summon').disabled=S.coin<summonCost();
 refreshSelection();playSound('coin');
 toast(`${heroLabel(u)} 전투 강화 ${level+1}/10 · 공격력 +${level+1}%`);
 return true;
}
document.querySelector('#battleUpgrade').onclick=upgradeBattleSelected;
function sellSelected(){const u=S.sel;if(!started||ended||!u||!units.includes(u))return false;const value=sellValue(u);playSound('coin');removeUnit(u);S.coin+=value;S.drag=null;refreshSelection();document.querySelector('#coin').textContent=S.coin;document.querySelector('#summon').disabled=S.coin<summonCost();if(document.querySelector('#recipeOverlay').style.display==='block')renderRecipes();toast(`${heroLabel(u)} 판매 · +${value} ◈ (${Math.round((.5+talismanBonus(null,'sell'))*100)}% 환급)`);return true}
document.querySelector('#sellUnit').onclick=sellSelected;
document.querySelector('#deselectUnit').onclick=()=>{S.sel=null;guardianRun.selected=false;refreshSelection()};


document.querySelectorAll('[data-lab-filter]').forEach(b=>b.onclick=()=>{labFilter=b.dataset.labFilter;document.querySelectorAll('[data-lab-filter]').forEach(x=>x.classList.toggle('active',x===b));renderHeroLab()});
document.querySelector('#homeButton').onclick=()=>{if(started&&!ended){paused=true;document.querySelector('#pause').textContent='▶';document.querySelector('#pause').setAttribute('aria-label','전투 계속');document.querySelector('#leaveBattle').hidden=false}else goLobby()};
document.querySelector('#confirmLeave').onclick=goLobby;
document.querySelector('#cancelLeave').onclick=()=>{document.querySelector('#leaveBattle').hidden=true};
document.querySelector('#resultLobby').onclick=goLobby;
document.querySelector('#claimBattleReward').onclick=()=>{if(window.ForgeAdventure?.active()){void window.ForgeAdventure.claimBattle();return}if(!ended||document.querySelector('#claimBattleReward').disabled)return;grantEssence(guestReward);guestReward=0;document.querySelector('#claimBattleReward').disabled=true;document.querySelector('#claimBattleReward').textContent='수령 완료 ✓';document.querySelector('#rewardBalance').textContent=`보유 금화 ${essence}`;window.ForgeUX?.celebrate()};
document.querySelector('#resultGrowth').onclick=()=>{goLobby();openGrowth()};
renderWallet();

// Account adapter: authentication never writes over the original guest save.
if(typeof window!=='undefined')window.ForgeGame={
 guardianSnapshot:()=>({...guardianMeta}),
 guardianNormalize:cleanGuardian,
 guardianApply:(v)=>{guardianMeta=cleanGuardian(v);saveMeta(false);renderGuardian()},
 applyGrowth:(v)=>{heroLevels={...v.levels};heroSkills={...v.skills};essence=v.gold;renderWallet();renderHeroLab();refreshCodex()},
 snapshot:()=>({version:4,levels:{...heroLevels},skills:{...heroSkills},essence,guardian:{...guardianMeta}}),
 guestSnapshot:()=>readMeta(),
 inBattle:()=>started&&!ended,
 difficulty:()=>selectedDifficulty,
 pause:()=>{if(started&&!ended){paused=true;document.querySelector('#pause').textContent='▶';document.querySelector('#pause').setAttribute('aria-label','전투 계속')}},
 apply:(value,owner)=>{try{if(value?.version!==4&&!localStorage.getItem('ff_before_v16_'+owner))localStorage.setItem('ff_before_v16_'+owner,JSON.stringify(value))}catch{}const clean=sanitizeMeta(value);metaStorageKey='ff_progress_account_'+owner;heroLevels=clean.levels;heroSkills=clean.skills;essence=clean.essence;guardianMeta=cleanGuardian(clean.guardian);renderGuardian();renderHeroLab();refreshCodex()},
 guest:()=>{const value=readMeta();metaStorageKey=META_KEY;heroLevels=value.levels;heroSkills=value.skills||{};essence=value.essence;guardianMeta=cleanGuardian(value.guardian);renderGuardian();renderHeroLab();refreshCodex()}
};

document.querySelector('#guardianCast').onclick=castGuardian;
document.querySelector('#guardianRename').onclick=async()=>{if(started&&!ended||!window.ForgeAccount?.allowed())return;const input=document.querySelector('#guardianNickname'),button=document.querySelector('#guardianRename'),raw=input.value.normalize('NFC').trim();if(!raw||Array.from(raw).length>12||/[<>\u0000-\u001f]/.test(raw)){toast('닉네임은 1~12글자로 입력하세요.');return;}button.disabled=true;button.textContent='저장 중…';try{if(window.ForgeAccount?.currentUser()){await window.ForgeGuardianSync.rename(raw);toast('주인공 이름을 계정에 저장했습니다.')}else{guardianMeta.nickname=raw;saveMeta();renderGuardian();toast('주인공 이름을 이 기기에 저장했습니다.')}}catch(e){toast(e.message)}finally{button.disabled=false;button.textContent='이름 저장'}};
renderGuardian();

document.querySelector("#guardianDetails").onclick=guardianDetails;
document.querySelector("#selectedSkills").onclick=()=>guardianRun.selected?guardianDetails():S.sel&&openBattleSkills(S.sel);
