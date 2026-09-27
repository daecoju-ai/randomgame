function playSound(name,...args){if(typeof window!=='undefined')window.SFX?.[name]?.(...args)}
function drawArena(){
 const a=geometry(),cx=W/2,cy=(a.top+a.bottom)/2;
 const bg=ctx.createRadialGradient(cx,cy,30,cx,cy,Math.max(W,H)*.7);bg.addColorStop(0,'#163638');bg.addColorStop(.5,'#0b2228');bg.addColorStop(1,'#050f17');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 // Fine architectural lines outside the battle area.
 ctx.strokeStyle='#94c9bc07';ctx.lineWidth=1;for(let x=0;x<W;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.fillStyle='#07171bb0';ctx.beginPath();ctx.roundRect(a.left+25,a.top+26,a.width-50,a.height-52,18);ctx.fill();
 const ring=(width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.beginPath();for(let i=0;i<=160;i++){let p=path(i/160);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.closePath();ctx.stroke()};
 ring(39,'#020d1399');ring(30,'#2b3c3d');ring(26,'#253638');ring(1,'#b4b59140');
 const per=2*(a.width+a.height);for(let i=0;i<per/24;i++){let p=path(i*24/per);ctx.strokeStyle='#0e2229';ctx.lineWidth=1;ctx.beginPath();if(p.y===a.top||p.y===a.bottom){ctx.moveTo(p.x-2,p.y-11);ctx.lineTo(p.x+2,p.y+11)}else{ctx.moveTo(p.x-11,p.y-2);ctx.lineTo(p.x+11,p.y+2)}ctx.stroke()}
 // Four carved gate stones.
 for(let x of [a.left,a.right])for(let y of [a.top,a.bottom]){ctx.fillStyle='#0e222b';ctx.strokeStyle='#8ca69555';ctx.beginPath();ctx.roundRect(x-15,y-15,30,30,6);ctx.fill();ctx.stroke();ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.shadowColor='#83e3c5';ctx.shadowBlur=14;ctx.fillStyle='#8addc4';ctx.fillRect(-4,-4,8,8);ctx.restore()}
 // Rune at the heart of the grid.
 ctx.save();ctx.translate(cx,cy);ctx.strokeStyle='#9fb79516';ctx.lineWidth=1;for(let r of [48,55,90]){ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke()}ctx.rotate(Math.PI/4);ctx.strokeRect(-35,-35,70,70);ctx.restore();
 const gy=Math.min(54,(a.height-88)/7),gx=Math.min(58,(a.width-108)/3);
 for(let i=0;i<32;i++){let p=slot(i),occupied=units.some(u=>u.slot===i),hw=Math.min(23,gx*.45),hh=Math.min(23,gy*.44);const tile=ctx.createLinearGradient(p.x,p.y-hh,p.x,p.y+hh);tile.addColorStop(0,occupied?'#2c4446':'#213639');tile.addColorStop(1,'#13292f');ctx.fillStyle=tile;ctx.strokeStyle=occupied?'#b6c6a04d':'#a4c7b623';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(p.x-hw,p.y-hh,hw*2,hh*2,6);ctx.fill();ctx.stroke();ctx.fillStyle='#c8d4ae30';ctx.font='12px serif';ctx.textAlign='center';ctx.fillText('◇',p.x,p.y+4)}
 for(let i=0;i<16;i++){let x=cx+Math.sin(i*18.3)*Math.min(W*.48,290),y=a.top+(Math.cos(i*9.1)+1)/2*a.height;ctx.globalAlpha=.16+.1*Math.sin(S.t+i);ctx.fillStyle='#a9edd2';ctx.beginPath();ctx.arc(x,y,1,0,7);ctx.fill()}ctx.globalAlpha=1;
}


const C=document.querySelector('#g'),ctx=C.getContext('2d');let W,H,D;
const S={coin:80,life:80,wave:1,t:0,next:0,spawn:0,max:30,sel:null,shake:0,ult:true,stageStart:0,summons:0,drag:null};
let units=[],mobs=[],shots=[],particles=[],floaters=[];
let battleUpgrades={}; // Run-only: never included in local or account progression.
let started=false,paused=false,ended=false,relicCooldown=0;
let recipeFilter="all",recipeStamp="";
const tierNames=["","일반","고급","희귀","전설","신화"];
const tierColors=["","#93a5aa","#76c7a3","#92b8f3","#edbe72","#c8a1ff"];
const U=[
 {n:'BASTION',cls:'MELEE',role:'기절 수호',c:'#68818b',accent:'#d5c29a',atk:7,rate:1.18,range:76,kind:'bash',skill:'Aegis Slam · 범위 기절',desc:'거대한 방패로 길목을 제어하는 근접 수호자.'},
 {n:'NOX',cls:'MELEE',role:'처형 암살',c:'#6b596d',accent:'#df9ab7',atk:9,rate:1.05,range:88,kind:'slash',skill:'Night Cut · 저체력 처형',desc:'빠른 베기로 약해진 적을 마무리한다.'},
 {n:'BRAM',cls:'MELEE',role:'연속 검격',c:'#7d6655',accent:'#e3c69d',atk:6,rate:.72,range:82,kind:'slash',skill:'Twin Cut · 연속 타격',desc:'작은 쌍검을 사용하는 빠른 근접 공격수.'},
 {n:'MOSS',cls:'MELEE',role:'둔화 강타',c:'#55745d',accent:'#bad09b',atk:8,rate:1.28,range:80,kind:'bash',skill:'Root Hammer · 둔화',desc:'묵직한 망치로 적의 흐름을 늦춘다.'},

 {n:'THORN',cls:'RANGED',role:'장거리 사격',c:'#5f8c6b',accent:'#c7d69a',atk:5,rate:.62,range:260,kind:'arrow',skill:'Briar Shot · 장거리 관통',desc:'가장 먼 거리에서 안정적으로 공격하는 궁수.'},
 {n:'PIPER',cls:'RANGED',role:'속사',c:'#607c91',accent:'#badcf0',atk:3.5,rate:.36,range:225,kind:'arrow',skill:'Quick Volley · 빠른 연사',desc:'피해는 낮지만 매우 빠르게 사격한다.'},
 {n:'ROOK',cls:'RANGED',role:'중화기',c:'#796a5e',accent:'#e6bd75',atk:7,rate:1.08,range:235,kind:'arrow',skill:'Heavy Bolt · 강한 단발',desc:'느리지만 강한 대형 볼트를 발사한다.'},
 {n:'WISP',cls:'RANGED',role:'표식 사격',c:'#637e80',accent:'#aee1d6',atk:4.5,rate:.7,range:245,kind:'arrow',skill:'Mark Shot · 표식 피해',desc:'먼 적을 추적하며 꾸준히 압박한다.'},

 {n:'EMBER',cls:'MAGIC',role:'광역 화염',c:'#e87545',accent:'#ffc477',atk:5.5,rate:.92,range:200,kind:'fire',skill:'Cinder Bloom · 폭발/화상',desc:'작은 불꽃이 주변까지 번지는 화염 마도사.'},
 {n:'VOLT',cls:'MAGIC',role:'연쇄 번개',c:'#725bc7',accent:'#c8b7ff',atk:4.5,rate:.82,range:215,kind:'volt',skill:'Arc Link · 연쇄 감전',desc:'번개가 가까운 적에게 연쇄되는 마도사.'},
 {n:'FROST',cls:'MAGIC',role:'빙결 제어',c:'#6ba9bc',accent:'#c7eff2',atk:4,rate:.98,range:205,kind:'ice',skill:'Crystal Veil · 이동 감속',desc:'적을 느리게 만들어 누적 처치를 돕는다.'},
 {n:'LUMEN',cls:'MAGIC',role:'빛 폭발',c:'#a78b62',accent:'#fff0a6',atk:6,rate:1.16,range:190,kind:'fire',skill:'Halo Burst · 범위 폭발',desc:'느린 대신 넓은 범위를 공격하는 빛 마도사.'}
];
function rs(){D=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;C.width=W*D;C.height=H*D;ctx.setTransform(D,0,0,D,0,0)}addEventListener('resize',rs);rs();
const rnd=(a,b)=>a+Math.random()*(b-a), d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function toast(s){let e=document.querySelector('#toast');e.textContent=s;e.style.opacity=1;clearTimeout(e.tm);e.tm=setTimeout(()=>e.style.opacity=0,1800)}
function geometry(){const width=Math.min(W-40,410),left=(W-width)/2,right=left+width,top=H<620?146:174,bottom=H-176;return{left,right,top,bottom,width,height:bottom-top}}
function slot(i){let a=geometry(),gx=Math.min(58,(a.width-108)/3),gy=Math.min(54,(a.height-88)/7);return{x:W/2+(i%4-1.5)*gx,y:(a.top+a.bottom)/2+(Math.floor(i/4)-3.5)*gy}}
function unitScale(){return Math.max(.28,Math.min(.64,(geometry().height-88)/7/68))}
function path(t){t=((t%1)+1)%1;let a=geometry(),per=2*(a.width+a.height),q=t*per;if(q<a.width)return{x:a.left+q,y:a.top};q-=a.width;if(q<a.height)return{x:a.right,y:a.top+q};q-=a.height;if(q<a.width)return{x:a.right-q,y:a.bottom};q-=a.width;return{x:a.left,y:a.bottom-q}}
const summonTypes=[0,1,4,6,8,10]; // T1: two heroes per class; T2 onward: four.
function summonCost(){return Math.min(40,10+Math.floor(S.summons/4)*2)}
function updateSummonPrice(){document.querySelector('#summon').textContent='소환 · '+summonCost()}
function summon(){
 if(ended||paused)return;
 let cost=Math.min(40,10+Math.floor(S.summons/4)*2);
 if(S.coin<cost)return toast('Battle Coin이 부족합니다 · 필요 '+cost);let free=[...Array(32).keys()].filter(i=>!units.some(u=>u.slot===i));if(!free.length)return toast('32개 슬롯이 가득 찼습니다');S.coin-=cost;S.summons++;updateSummonPrice();let type=summonTypes[Math.floor(Math.random()*summonTypes.length)],sl=free[Math.floor(Math.random()*free.length)];units.push({type,slot:sl,lv:1,cd:0,anim:0,invested:cost});playSound('summon');toast(heroNames[type]+' 소환')}

const RECIPES=[
 {tier:2,cls:'MELEE',name:'MELEE T2 RANDOM',need:{cls:'MELEE',tier:1,count:3}},
 {tier:2,cls:'RANGED',name:'RANGED T2 RANDOM',need:{cls:'RANGED',tier:1,count:3}},
 {tier:2,cls:'MAGIC',name:'MAGIC T2 RANDOM',need:{cls:'MAGIC',tier:1,count:3}},
 {tier:3,cls:'MELEE',name:'MELEE T3 RANDOM',need:{cls:'MELEE',tier:2,count:3}},
 {tier:3,cls:'RANGED',name:'RANGED T3 RANDOM',need:{cls:'RANGED',tier:2,count:3}},
 {tier:3,cls:'MAGIC',name:'MAGIC T3 RANDOM',need:{cls:'MAGIC',tier:2,count:3}},
 {tier:4,cls:'MELEE',name:'COLOSSUS',parts:['BASTION','BRAM','MOSS'],partTier:3},
 {tier:4,cls:'MELEE',name:'DUSK KNIGHT',parts:['NOX','BRAM','BASTION'],partTier:3},
 {tier:4,cls:'RANGED',name:'HAWKEYE',parts:['THORN','WISP','PIPER'],partTier:3},
 {tier:4,cls:'RANGED',name:'BALLISTA',parts:['ROOK','THORN','PIPER'],partTier:3},
 {tier:4,cls:'MAGIC',name:'TEMPEST',parts:['EMBER','VOLT','LUMEN'],partTier:3},
 {tier:4,cls:'MAGIC',name:'ZERO',parts:['FROST','VOLT','FROST'],partTier:3},
 {tier:5,cls:'MELEE',name:'VALOR',special:['COLOSSUS','DUSK KNIGHT']},
 {tier:5,cls:'RANGED',name:'ORION',special:['HAWKEYE','BALLISTA']},
 {tier:5,cls:'MAGIC',name:'ARCANA',special:['TEMPEST','ZERO']}
];
const SPECIALS={
 'COLOSSUS':{base:0,accent:'#f6c276',c:'#706343',kind:'bash'},
 'DUSK KNIGHT':{base:1,accent:'#de9bd2',c:'#554867',kind:'slash'},
 'HAWKEYE':{base:4,accent:'#bce49b',c:'#436d5e',kind:'arrow'},
 'BALLISTA':{base:6,accent:'#ffd191',c:'#786247',kind:'arrow'},
 'TEMPEST':{base:9,accent:'#b3a2ff',c:'#5c548f',kind:'volt'},
 'ZERO':{base:10,accent:'#a9f4fa',c:'#4d8999',kind:'ice'},
 'VALOR':{base:0,accent:'#ffdf99',c:'#b49352',kind:'bash'},
 'ORION':{base:4,accent:'#99f3d9',c:'#417c79',kind:'arrow'},
 'ARCANA':{base:9,accent:'#e5beff',c:'#8d60a0',kind:'volt'}
};
Object.assign(SPECIALS,{
 'WARLORD':{base:2},'FOREST LORD':{base:3},'STEAM RUNNER':{base:5},'SKY GUARD':{base:7},'INFERNO':{base:8},'LUMINA':{base:11},
 'DEATHBRINGER':{base:1},'TITAN':{base:2},'EVER TREE':{base:3},'HELLRIFLE':{base:5},'MECHA KING':{base:6},'LUMINOUS FOX':{base:7},'PHOENIX':{base:8},'ICE EMPRESS':{base:10},'ASTRA':{base:11}
});
RECIPES.push(
 {tier:4,cls:'MELEE',name:'WARLORD',parts:['BRAM','NOX','MOSS'],partTier:3},
 {tier:4,cls:'MELEE',name:'FOREST LORD',parts:['MOSS','MOSS','BASTION'],partTier:3},
 {tier:4,cls:'RANGED',name:'STEAM RUNNER',parts:['PIPER','PIPER','ROOK'],partTier:3},
 {tier:4,cls:'RANGED',name:'SKY GUARD',parts:['WISP','WISP','THORN'],partTier:3},
 {tier:4,cls:'MAGIC',name:'INFERNO',parts:['EMBER','EMBER','LUMEN'],partTier:3},
 {tier:4,cls:'MAGIC',name:'LUMINA',parts:['LUMEN','LUMEN','FROST'],partTier:3},
 {tier:5,cls:'MELEE',name:'DEATHBRINGER',special:['DUSK KNIGHT','WARLORD']},
 {tier:5,cls:'MELEE',name:'TITAN',special:['COLOSSUS','WARLORD']},
 {tier:5,cls:'MELEE',name:'EVER TREE',special:['FOREST LORD','COLOSSUS']},
 {tier:5,cls:'RANGED',name:'HELLRIFLE',special:['STEAM RUNNER','HAWKEYE']},
 {tier:5,cls:'RANGED',name:'MECHA KING',special:['BALLISTA','STEAM RUNNER']},
 {tier:5,cls:'RANGED',name:'LUMINOUS FOX',special:['SKY GUARD','HAWKEYE']},
 {tier:5,cls:'MAGIC',name:'PHOENIX',special:['INFERNO','TEMPEST']},
 {tier:5,cls:'MAGIC',name:'ICE EMPRESS',special:['ZERO','LUMINA']},
 {tier:5,cls:'MAGIC',name:'ASTRA',special:['LUMINA','INFERNO']}
);
const heroNames=['바스티온','녹스','브람','모스','쏜','파이퍼','룩','위스프','엠버','볼트','프로스트','루멘'];
const evolutionNames=[
 ['꼬마 방패병','수호기사','아이언가드','로열가디언','세이크리드'],
 ['그림자단원','섀도우','블레이드','나이트로우즈','데스브링어'],
 ['꼬마 전사','워보이','브루탈','워로드','타이탄'],
 ['새싹거인','우드가드','트리센트','포레스트로드','에버트리'],
 ['숲의 궁수','엘프궁수','호크아이','실버레인저','스타폴'],
 ['꼬마 사수','머스킷','건슬링어','스팀러너','헬리츠'],
 ['꼬마 포병','미니캐논','시즈캐논','로켓마스터','메카킹'],
 ['정령 친구','윈드스피릿','페어리보우','스카이가드','루미너스'],
 ['불꽃 정령','파이어위저드','플레임로드','인페르노','피닉스'],
 ['번개 정령','스파크위저드','썬더로드','라이트닝','스톰킹'],
 ['얼음 정령','아이스위치','블리자드','프로스트로드','제로'],
 ['빛의 정령','하이프리스트','세라핌','루미나','아스트라']
];
const classLabels={MELEE:'근접 계열',RANGED:'원거리 계열',MAGIC:'마법 계열'};
// Persistent local progression. A single versioned record avoids partial currency/level writes.
const META_KEY='ff_progress_v3';
let metaStorageKey=META_KEY;
let storageAvailable=true,labFilter='all',selectedLabKey='0:1';
function sanitizeMeta(value){const levels={};for(let type=0;type<12;type++)for(let tier=1;tier<=5;tier++){if(tier===1&&!summonTypes.includes(type))continue;const key=type+':'+tier,n=Number(value?.levels?.[key]);if(Number.isInteger(n)&&n>=1&&n<=20)levels[key]=n}const n=Number(value?.essence);return{version:3,levels,essence:Number.isFinite(n)&&n>=0?Math.min(10000000,Math.floor(n)):0}}
function readMeta(){try{if(typeof localStorage==='undefined'){storageAvailable=false;return{levels:{},essence:120}}const raw=localStorage.getItem(META_KEY);if(raw){try{return sanitizeMeta(JSON.parse(raw))}catch{storageAvailable=false;return{levels:{},essence:0}}}let legacy={};try{legacy=JSON.parse(localStorage.getItem('ff_heroLevelsV2')||'{}')}catch{}const value=sanitizeMeta({levels:legacy,essence:localStorage.getItem('ff_essence')||0});value.essence+=120;localStorage.setItem(META_KEY,JSON.stringify(value));return value}catch{storageAvailable=false;return{levels:{},essence:120}}}
const initialMeta=readMeta();let heroLevels=initialMeta.levels,essence=initialMeta.essence;
function saveMeta(){try{if(typeof localStorage==='undefined')throw Error('storage unavailable');localStorage.setItem(metaStorageKey,JSON.stringify({version:3,levels:heroLevels,essence}));storageAvailable=true}catch{storageAvailable=false}renderWallet();if(typeof window!=='undefined')window.ForgeAccount?.changed()}
function renderWallet(){document.querySelector('#essence').textContent=essence;document.querySelector('#lobbyEssence').textContent=essence;document.querySelector('#saveStatus').textContent=(typeof window!=='undefined'&&window.ForgeAccount?.statusText())||(storageAvailable?'이 브라우저에 자동 저장 · 기기 간 동기화 없음':'저장 공간 사용 불가 · 종료하면 성장이 사라질 수 있습니다')}
function lvKey(type,tier){return type+':'+tier}
function getLv(type,tier){return heroLevels[lvKey(type,tier)]||1}
function levelCost(lv){return lv*12}
function metaAtkMult(type,tier){const lv=getLv(type,tier);return (1+.05*(lv-1))*(lv>=10?1.25:1)}
function battleUpgradeLevel(u){return battleUpgrades[lvKey(u.type,u.lv)]||0}
function battleUpgradeCost(u){return (battleUpgradeLevel(u)+1)*10}
function battleAttack(entry){return unitData(entry).atk*Math.pow(2.6,entry.lv-1)*metaAtkMult(entry.type,entry.lv)*(1+battleUpgradeLevel(entry)/100)}
function battleRange(entry){const t=unitData(entry);return t.range*(t.kind==='arrow'&&getLv(entry.type,entry.lv)>=5?1.2:1)}
const KIND_SKILL2={bash:'방패 충격: 기절 0.35초 → 0.5초',slash:'처형: 적 체력 35% 미만에서 피해 ×1.8',arrow:'장거리 조준: 사거리 +20%',fire:'화염 치명타: 15% 확률로 피해 ×1.5',volt:'연쇄 확장: 추가 타격 2명 → 3명',ice:'서리 결계: 감속 0.8초 → 1.2초'};
function entryKind(entry){return (entry.name&&SPECIALS[entry.name]?.kind)||U[entry.type].kind}
function heroSkillText(entry){const lv=getLv(entry.type,entry.lv),kind=entryKind(entry);return[{name:'Lv.1 · 기본 공격 / 성장 레벨당 공격력 +5%',unlocked:true},{name:'Lv.5 · '+KIND_SKILL2[kind],unlocked:lv>=5},{name:'Lv.10 · 전투 공격력 추가 +25%',unlocked:lv>=10}]}
function renderHeroLab(){
 renderWallet();const entries=catalogEntries(),selected=entries.find(u=>lvKey(u.type,u.lv)===selectedLabKey)||entries[0];
 const shown=entries.filter(u=>labFilter==='all'||(labFilter==='T1'?u.lv===1:U[u.type].cls===labFilter));
 document.querySelector('#labCards').innerHTML=shown.map(u=>`<button class="labSelect ${lvKey(u.type,u.lv)===selectedLabKey?'selected':''}" data-hero-select="${u.type}:${u.lv}" aria-label="${heroLabel(u)} T${u.lv} 선택" aria-pressed="${lvKey(u.type,u.lv)===selectedLabKey}"><span>T${u.lv} ${tierNames[u.lv]}</span><canvas width="160" height="150" data-lab-type="${u.type}" data-lab-tier="${u.lv}"></canvas><b>${heroLabel(u)}</b><small>Lv.${getLv(u.type,u.lv)} / 20</small></button>`).join('');
 document.querySelectorAll('[data-lab-type]').forEach(c=>body(c.getContext('2d'),80,78,{type:+c.dataset.labType,lv:+c.dataset.labTier},1.3,true));
 document.querySelectorAll('[data-hero-select]').forEach(b=>b.onclick=()=>{selectedLabKey=b.dataset.heroSelect;renderHeroLab();if(innerWidth<801)document.querySelector('#labDetail').scrollIntoView?.({behavior:'smooth',block:'start'})});
 const lv=getLv(selected.type,selected.lv),cost=levelCost(lv),maxed=lv>=20,battleOn=started&&!ended;
 let next=(1+.05*lv)*(lv+1>=10?1.25:1)*unitData(selected).atk*Math.pow(2.6,selected.lv-1);
 document.querySelector('#labDetail').innerHTML=`<span class="eyebrow">HERO GROWTH / ${classLabels[U[selected.type].cls]}</span><canvas id="detailHero" width="280" height="210"></canvas><h3>${heroLabel(selected)}</h3><p>T${selected.lv} ${tierNames[selected.lv]} · ${heroNames[selected.type]}</p><div class="growthLevel">Lv.${lv} <small>/ 20</small></div><div class="levelTrack"><span style="width:${lv/20*100}%"></span></div><div class="growthStats"><span>공격력<strong>${battleAttack(selected).toFixed(1)}${maxed?'':` <small>→ ${next.toFixed(1)}</small>`}</strong></span><span>사거리<strong>${Math.round(battleRange(selected))}</strong></span></div><div class="skillUnlocks">${heroSkillText(selected).map(s=>`<div class="${s.unlocked?'unlocked':'sealed'}">${s.unlocked?'✦':'◇'} ${s.name}<small>${s.unlocked?'개방 완료':'잠김'}</small></div>`).join('')}</div><button id="levelUpSelected" ${maxed||battleOn||essence<cost?'disabled':''}>${battleOn?'전투 종료 후 강화 가능':maxed?'최대 레벨 달성':essence<cost?`정수 ${cost-essence} 부족`:`레벨업 · ${cost} ✦`}</button><small class="labNotice">이 영웅의 T${selected.lv}에만 적용됩니다.<br>새로 소환·조합한 같은 영웅에도 자동 적용됩니다.</small>`;
 body(document.querySelector('#detailHero').getContext('2d'),140,115,selected,1.9,true);
 document.querySelector('#levelUpSelected').onclick=()=>levelUpHero(selected.type,selected.lv);
}
function levelUpHero(type,tier){
 if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return false}
 if(started&&!ended)return false;
 if(!catalogEntries().some(u=>u.type===type&&u.lv===tier))return false;
 const lv=getLv(type,tier),cost=levelCost(lv);if(lv>=20||essence<cost)return false;
 playSound('levelUp');essence-=cost;heroLevels[lvKey(type,tier)]=lv+1;saveMeta();
 toast(`${evolutionNames[type][tier-1]} Lv.${lv+1}${lv+1===5||lv+1===10?' · 새 스킬 개방!':''}`);renderHeroLab();refreshCodex();return true;
}
function grantEssence(amount){essence+=Math.max(0,Math.floor(amount));saveMeta()}
function goLobby(){battleUpgrades={};started=false;paused=false;S.sel=null;S.drag=null;document.querySelector('#startScreen').hidden=false;document.querySelector('#resultScreen').hidden=true;document.querySelector('#leaveBattle').hidden=true;closeModal('#recipeOverlay');closeModal('#drawer');refreshSelection();renderWallet()}
function openGrowth(){renderHeroLab();openModal('#drawer')}
function heroLabel(u){return evolutionNames[u.type][u.lv-1]}
function catalogEntries(){return U.flatMap((base,type)=>[1,2,3,4,5].map(lv=>{
 const r=lv<2?null:lv<4?RECIPES.find(r=>r.tier===lv&&r.cls===base.cls):RECIPES.find(r=>r.tier===lv&&SPECIALS[r.name]?.base===type);
 return {type,lv,...(lv>=4?{name:r.name}:{}),recipe:r?RECIPES.indexOf(r):-1};
})).filter(u=>u.lv>1||summonTypes.includes(u.type))}
const heroAtlas=typeof Image!=='undefined'?new Image():null;
let atlasLoaded=false;
if(heroAtlas){heroAtlas.onload=()=>{atlasLoaded=true;refreshCodex();if(document.querySelector('#drawer').style.display==='block')renderHeroLab();if(document.querySelector('#recipeOverlay').style.display==='block')renderRecipes()};heroAtlas.src='/assets/heroes-v10.webp'}
// Measured atlas cell boundaries; original transparent image remains unchanged.
const atlasX=[0,151,301,461,630,809];
const atlasY=[0,178,317,471,632,783,939,1098,1255,1417,1588,1762,1942];
function drawHeroSprite(g,x,y,u,scale=1,mini=false){
 if(!atlasLoaded)return false;
 const col=u.lv-1,row=u.type,sx=atlasX[col],sy=atlasY[row],sw=atlasX[col+1]-sx,sh=atlasY[row+1]-sy;
 const size=mini?98*scale:90*scale,ratio=Math.min(size/sw,size/sh),dw=sw*ratio,dh=sh*ratio;
 g.save();const bob=mini?0:Math.sin(S.t*2+(u.slot||0))*.9;g.translate(x,y+bob);
 if(!mini&&u.lv>=3){g.fillStyle=tierColors[u.lv]+'35';g.beginPath();g.ellipse(0,12*scale,29*scale,8*scale,0,0,7);g.fill()}
 g.drawImage(heroAtlas,sx,sy,sw,sh,-dw/2,mini?-dh*.56:-dh*.72,dw,dh);
 if(!mini){g.fillStyle=tierColors[u.lv];g.font='bold 8px system-ui';g.textAlign='center';g.fillText('·'.repeat(u.lv),0,dh*.3+3)}
 g.restore();return true;
}
function unitData(u){return u.name?{...U[u.type],...SPECIALS[u.name],n:u.name}:U[u.type]}
function specialOwned(name){return units.filter(u=>u.name===name&&u.lv===4).length}


function countOwned(name,tier){
 let i=U.findIndex(x=>x.n===name);
 return units.filter(x=>x.type===i&&x.lv===tier).length;
}
function classOwned(cls,tier){return units.filter(x=>U[x.type].cls===cls&&x.lv===tier).length}
function recipeReady(r){
 if(r.need)return classOwned(r.need.cls,r.need.tier)>=r.need.count;
 if(r.parts){
   let need={};r.parts.forEach(n=>need[n]=(need[n]||0)+1);
   return Object.entries(need).every(([n,c])=>countOwned(n,r.partTier)>=c);
 }
 if(r.special)return r.special.every(n=>specialOwned(n)>=1);
 return false;
}
function materialHTML(u,have,need){const state=have===0?'miss':need&&have<need?'partial':'have';return `<div class="mat ${state}"><canvas width="96" height="96" data-material-type="${u.type}" data-lv="${u.lv}"></canvas><strong>${heroLabel(u)}</strong><span class="materialCount">${have}${need?`<small> / ${need}</small>`:'<small> 보유</small>'}</span><small>T${u.lv}${state==='partial'?' · 부족':''}</small></div>`}
function recipeMaterials(r){
 if(r.need){return U.map((v,type)=>({v,type})).filter(x=>x.v.cls===r.cls&&(r.need.tier>1||summonTypes.includes(x.type))).map(x=>materialHTML({type:x.type,lv:r.need.tier},countOwned(x.v.n,r.need.tier),null)).join('')}
 if(r.parts){const counts={};r.parts.forEach(n=>counts[n]=(counts[n]||0)+1);return Object.entries(counts).map(([name,count])=>materialHTML({type:U.findIndex(u=>u.n===name),lv:r.partTier},countOwned(name,r.partTier),count)).join('')}
 return r.special.map(name=>materialHTML({type:SPECIALS[name].base,lv:4},specialOwned(name),1)).join('');
}
function renderRecipes(){
 const host=document.querySelector('#recipeBook');const scroll=document.querySelector('#recipeOverlay').scrollTop;
 const entries=catalogEntries();let available=RECIPES.filter(recipeReady).length;
 document.querySelector('#forgeCount').textContent=`54 영웅 · T1 6종 → T2부터 12종 · 조합 가능 ${available}`;
 host.innerHTML=['MELEE','RANGED','MAGIC'].map(cls=>{
 const list=entries.filter(u=>U[u.type].cls===cls&&(recipeFilter==='all'||recipeFilter===cls||(recipeFilter==='ready'&&u.recipe>=0&&recipeReady(RECIPES[u.recipe]))));
 if(!list.length)return '';
 return `<section class="codexClass class-${cls}"><header><span class="classSigil">${{MELEE:'⚔',RANGED:'➶',MAGIC:'✦'}[cls]}</span><div><small>HERO ARCHIVE</small><h3>${classLabels[cls]}</h3></div><span class="classTotal">${list.length} HEROES</span></header><div class="evolutionGrid">${list.map(u=>{
 const r=RECIPES[u.recipe],ready=!!r&&recipeReady(r),owned=u.name?units.filter(v=>v.name===u.name).length:countOwned(U[u.type].n,u.lv);
 let summary=!r?'소환으로 획득':r.need?`${classLabels[cls]} T${r.need.tier} 합계 ${classOwned(cls,r.need.tier)} / 3`:'지정 재료 조합 · 확정 획득';
 let action=!r?'기본 소환 유닛':ready?(r.need?'탭하여 계열 랜덤 조합':'탭하여 즉시 조합'):'재료를 모아 주세요';
 return `<article class="evolutionCard ${ready?'ready':owned>0?'owned':'locked'} ${r&&!ready?'uncraftable':''}" style="--tier:${tierColors[u.lv]}"><div class="cardMeta"><span>T${u.lv} · ${tierNames[u.lv]}</span><small>보유 ${owned}</small></div><button class="heroSelect" data-craft="${u.recipe}" ${ready?'':'disabled'} aria-label="${heroLabel(u)} ${action}"><canvas width="240" height="210" data-catalog-type="${u.type}" data-lv="${u.lv}"></canvas><span class="heroArchetype">${heroNames[u.type]}</span><b>${heroLabel(u)}</b></button><div class="recipeSummary">${summary}</div>${r?`<div class="mats">${recipeMaterials(r)}</div>`:'<div class="baseNote">소환 버튼으로 무작위 영웅을 획득합니다.</div>'}<div class="craftAction">${ready?'✦ ':''}${action}</div>${r?.need?'<div class="chanceNote">표시 영웅 확정 아님 · 4종 각 25%</div>':''}</article>`;
 }).join('')}</div></section>`;
 }).join('')||'<p class="empty">아직 조합 가능한 영웅이 없습니다.<br>같은 계열, 같은 등급 3개를 모아 보세요.</p>';
 document.querySelectorAll('[data-catalog-type]').forEach(c=>body(c.getContext('2d'),120,111,{type:+c.dataset.catalogType,lv:+c.dataset.lv},1.75,true));
 document.querySelectorAll('[data-material-type]').forEach(c=>body(c.getContext('2d'),48,51,{type:+c.dataset.materialType,lv:+c.dataset.lv},.85,true));
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{if(+b.dataset.craft>=0)craftRecipe(+b.dataset.craft)});
 document.querySelector('#recipeOverlay').scrollTop=scroll;recipeStamp=inventoryStamp();
}
function inventoryStamp(){return units.map(u=>`${u.type}:${u.lv}:${u.name||''}`).sort().join('|')}
function removeUnit(u){units=units.filter(x=>x!==u);if(S.sel===u)S.sel=null}
function craftRecipe(i){
 const r=RECIPES[i];if(!r||!recipeReady(r)||ended)return false;
 let take=[];
 if(r.need)take=units.filter(u=>U[u.type].cls===r.cls&&u.lv===r.need.tier).slice(0,r.need.count);
 else if(r.parts)r.parts.forEach(n=>take.push(units.find(u=>U[u.type].n===n&&u.lv===r.partTier&&!take.includes(u))));
 else r.special.forEach(n=>take.push(units.find(u=>u.name===n&&u.lv===4&&!take.includes(u))));
 if(take.some(u=>!u))return false;
 const keep=take[0],invested=take.reduce((sum,u)=>sum+unitInvestment(u),0);take.slice(1).forEach(removeUnit);keep.invested=invested;
 if(r.need){const candidates=U.map((u,i)=>({u,i})).filter(v=>v.u.cls===r.cls);keep.type=candidates[Math.floor(Math.random()*candidates.length)].i;delete keep.name}
 else{keep.name=r.name;keep.type=SPECIALS[r.name].base}
 playSound('fuse');keep.lv=r.tier;keep.anim=1;keep.cd=0;S.sel=keep;
 const pos=slot(keep.slot);for(let j=0;j<28;j++)particles.push({x:pos.x,y:pos.y,vx:rnd(-80,80),vy:rnd(-80,80),t:.9,col:tierColors[r.tier]});
 toast(`${tierNames[r.tier]} · ${heroLabel(keep)} 조합 완료`);refreshSelection();renderRecipes();refreshCodex();return true;
}
let modalReturn=null;
function openModal(id){modalReturn=document.activeElement;document.querySelector(id).style.display='block';document.querySelector(id).focus()}
function closeModal(id){document.querySelector(id).style.display='none';modalReturn?.focus()}
function openRecipes(){recipeFilter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));openModal('#recipeOverlay');renderRecipes();document.querySelector('#recipeOverlay').scrollTop=0}
function spawn(){let boss=S.spawn===S.max-1&&S.wave%5===0;
 let elite=(S.spawn+1)%10===0&&!boss;
 let scale=Math.pow(1.19,S.wave-1);
 let hp=(boss?780:(elite?150:92))*scale*rnd(.92,1.10);let p=path(0);mobs.push({p:0,x:p.x,y:p.y,hp,max:hp,r:boss?25:13,boss,slow:0,stun:0,hit:0});S.spawn++}
function fire(u,e){let T=unitData(u),p=slot(u.slot);u.cd=T.rate/(1+u.lv*.1);u.anim=1;shots.push({x:p.x,y:p.y,target:e,dmg:battleAttack(u),kind:T.kind,type:u.type,lv:u.lv,dead:false})}
function hit(e,damage,kind,mlv=1){if(!e||e.hp<=0)return;if(kind==='ice')e.slow=mlv>=5?1.2:.8;if(kind==='bash')e.stun=mlv>=5?.5:.35;if(kind==='slash'&&e.hp/e.max<(mlv>=5?.35:.25))damage*=1.8;e.hp-=damage;e.hit=.14;playSound('hit',kind);
 let col=kind==='fire'?'#f6a15c':kind==='volt'?'#b9a5ff':kind==='ice'?'#bfeef4':kind==='arrow'?'#b9d58e':'#e7d8b6';
 for(let i=0;i<7;i++)particles.push({x:e.x,y:e.y,vx:rnd(-65,65),vy:rnd(-65,65),t:.4,col});
 floaters.push({x:e.x,y:e.y-14,t:.55,s:Math.round(damage),col});
 if(e.hp<=0){playSound('death',e.boss);S.coin+=e.boss?30:2;for(let i=0;i<18;i++)particles.push({x:e.x,y:e.y,vx:rnd(-100,100),vy:rnd(-100,100),t:.6,col:'#d95a62'})}
}
function relic(){if(!started||paused||ended)return;if(relicCooldown>0)return toast('별빛 강림 충전 중');relicCooldown=7;playSound('ultimate');toast('✦ 별빛 강림');mobs.forEach(m=>hit(m,75+S.wave*5,'volt'))}
document.querySelector('#summon').onclick=summon;document.querySelector('#combine').onclick=openRecipes;document.querySelector('#ult').onclick=relic;
document.querySelector('#codex').onclick=openRecipes;document.querySelector('#close').onclick=()=>closeModal('#drawer');
function refreshCodex(){const heroes=catalogEntries();document.querySelector('#cards').innerHTML=heroes.map((u,i)=>{const t=unitData(u);return `<div class="card" style="--tier:${tierColors[u.lv]}"><span class="tierbadge">${heroNames[u.type]} · T${u.lv} ${tierNames[u.lv]}</span><canvas width="240" height="210" data-hero="${i}"></canvas><b>${heroLabel(u)}</b><span class="tag">${classLabels[t.cls]}</span><div class="skill">공격력 ${Math.round(t.atk*Math.pow(2.6,u.lv-1))} · 사거리 ${t.range}</div></div>`}).join('');document.querySelectorAll('[data-hero]').forEach(c=>body(c.getContext('2d'),120,111,heroes[+c.dataset.hero],1.75,true))}
function body(g,x,y,u,s=1,mini=false){
 if(drawHeroSprite(g,x,y,u,s,mini))return;
 const T=unitData(u),lv=u.lv||1,color=tierColors[lv],time=mini?0:S.t,bob=mini?0:Math.sin(time*2+u.slot)*1.1;
 g.save();g.translate(x,y+bob);g.scale(s,s);
 function poly(points,fill,stroke){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke()}}
 function line(points,col,w=2){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.stroke()}
 function orb(x,y,r,c){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill()}
 const aura=g.createRadialGradient(0,0,2,0,0,lv>=4?55:30);aura.addColorStop(0,T.accent+(lv>=4?'45':'16'));aura.addColorStop(1,T.accent+'00');g.fillStyle=aura;g.fillRect(-60,-60,120,120);
 g.fillStyle='#02090cb0';g.beginPath();g.ellipse(0,24,23,6,0,0,7);g.fill();
 if(lv>=3){g.strokeStyle=color+'77';g.lineWidth=1;g.beginPath();g.ellipse(0,24,28+(lv-3)*3,9,0,0,7);g.stroke();for(let k=0;k<lv;k++){let a=k*Math.PI*2/lv+time*.25;orb(Math.cos(a)*30,24+Math.sin(a)*9,1.6,color)}}
 if(lv===5){for(let sign of [-1,1])poly([[sign*9,-12],[sign*37,-36],[sign*29,-10],[sign*45,-18],[sign*24,15],[sign*10,20]],T.c+'bb',T.accent+'88');g.strokeStyle=T.accent;g.lineWidth=1;g.beginPath();g.arc(0,-12,40,Math.PI*1.07,Math.PI*1.93);g.stroke()}
 // A compact cloth silhouette at tier 1, layered armour at higher tiers.
 poly([[-12,-10],[-20,22],[-7,18],[0,24],[18,21],[12,-10]],T.c);
 line([[-7,14],[-8,24]],'#142631',7);line([[7,14],[8,24]],'#142631',7);
 line([[-12,-4],[-18,9]],T.c,8);line([[12,-4],[18,8]],T.c,8);
 const plate=g.createLinearGradient(-13,-10,13,18);plate.addColorStop(0,T.accent);plate.addColorStop(.24,T.c);plate.addColorStop(1,'#162a32');
 poly([[-12,-9],[12,-9],[11,11],[0,17],[-11,11]],plate,lv>1?T.accent+'99':undefined);
 line([[-10,11],[10,11]],'#172327',4);orb(0,11,2.3,T.accent);
 if(lv>=2){poly([[-11,-9],[-21,-11],[-21,-3],[-11,1]],plate,T.accent);poly([[11,-9],[21,-11],[21,-3],[11,1]],plate,T.accent);line([[-7,-5],[0,1],[7,-5]],T.accent,1.5)}
 // Face, hood and readable eyes.
 orb(0,-22,12.5,'#111f29');poly([[-10,-25],[0,-32],[10,-25],[9,-14],[0,-10],[-9,-14]],'#d9cbb2');
 if(T.cls==='MAGIC'){poly([[-15,-22],[-9,-35],[0,-40],[9,-35],[15,-22],[8,-27],[0,-32],[-8,-27]],T.c,T.accent+'80')}
 else if(T.cls==='RANGED'){poly([[-14,-22],[-10,-35],[1,-38],[12,-31],[14,-21],[6,-27],[-3,-29]],T.c);line([[-10,-21],[10,-21]],'#223a38',4)}
 else{poly([[-13,-22],[-11,-34],[0,-38],[11,-34],[13,-22],[6,-25],[0,-23],[-6,-25]],plate,T.accent+'80');line([[0,-36],[0,-24]],T.accent,2)}
 line([[-7,-20],[-3,-20]],T.accent,2);line([[3,-20],[7,-20]],T.accent,2);
 if(lv>=3){poly([[-10,-32],[-16,-44],[-4,-37],[0,-47],[4,-37],[16,-44],[10,-32]],lv>=4?T.accent:T.c,T.accent)}
 // Individual equipment uses the same renderer on the field and in the codex.
 if(T.kind==='bash'){
 const shield=g.createLinearGradient(-30,0,-10,8);shield.addColorStop(0,'#293f48');shield.addColorStop(.5,T.c);shield.addColorStop(1,T.accent);
 poly([[-31,-5],[-19,-10],[-8,-5],[-10,15],[-19,23],[-29,15]],shield,T.accent);poly([[-23,0],[-15,0],[-15,9],[-19,14],[-23,9]],'#23343b',T.accent);line([[20,-14],[20,20]],'#a78b60',3);poly([[13,-17],[27,-17],[27,-6],[13,-6]],plate,T.accent)
 }else if(T.kind==='slash'){
 line([[15,12],[30,-20]],'#9f8293',4);poly([[20,0],[32,-26],[29,-4],[22,4]],'#e1e5e7',T.accent);line([[16,-1],[26,5]],T.accent,3);if(lv>=3){poly([[-18,8],[-31,-20],[-26,5],[-19,13]],'#ccd9df',T.accent)}
 }else if(T.kind==='arrow'){
 if(u.type===6||u.name==='BALLISTA'){poly([[10,-5],[34,-5],[34,4],[10,4]],'#334b52',T.accent);line([[24,-15],[24,13]],T.accent,4);line([[16,-13],[32,11]],'#e5dfca',1)}else{g.strokeStyle=T.accent;g.lineWidth=3;g.beginPath();g.ellipse(19,-1,13,24,0,-1.4,1.4);g.stroke();line([[21,-24],[21,22]],'#e0d6b6',1);line([[9,0],[36,0]],T.accent,2);poly([[36,0],[30,-3],[30,3]],T.accent)}
 }else{
 line([[21,-25],[18,23]],'#958066',3);orb(22,-28,10,T.accent+'22');g.shadowColor=T.accent;g.shadowBlur=10;
 if(T.kind==='fire'){poly([[22,-19],[13,-29],[19,-37],[22,-44],[26,-33],[30,-28]],T.accent);poly([[22,-23],[19,-30],[23,-34],[25,-29]],'#fff2cf')}
 if(T.kind==='ice'){poly([[22,-42],[30,-29],[22,-18],[14,-29]],T.accent);line([[22,-42],[22,-18]],'#f1ffff',1)}
 if(T.kind==='volt'){poly([[24,-43],[14,-27],[23,-27],[17,-14],[31,-33],[22,-33]],T.accent)}g.shadowBlur=0;
 }
 if(u.type===3){orb(-7,-34,4,'#819e74');orb(6,-34,3,'#bdd99b')}
 if(u.type===7){line([[-8,-34],[-14,-43]],T.accent,2)}
 if(u.type===11){g.strokeStyle=T.accent;g.lineWidth=2;g.beginPath();g.ellipse(0,-42,13,4,0,0,7);g.stroke()}
 if(!mini){g.fillStyle=color;g.font='bold 10px system-ui';g.textAlign='center';g.fillText('·'.repeat(lv),0,36)}
 g.restore();
}
C.addEventListener('pointerdown',e=>{
 if(!started||paused||ended||document.querySelector('#drawer').style.display==='block'||document.querySelector('#recipeOverlay').style.display==='block')return;
 let p={x:e.clientX,y:e.clientY},near=units.find(u=>d(slot(u.slot),p)<25);
 if(near){S.sel=near;S.drag={u:near,startX:p.x,startY:p.y};C.setPointerCapture?.(e.pointerId);refreshSelection()}
});
C.addEventListener('pointerup',e=>{
 if(!S.drag)return;
 let p={x:e.clientX,y:e.clientY},best=-1,bd=999;
 for(let i=0;i<32;i++){let q=slot(i),dd=d(q,p);if(dd<bd){bd=dd;best=i}}
 if(best>=0&&bd<31){
   let a=S.drag.u,b=units.find(u=>u.slot===best);
   if(b&&b!==a){let old=a.slot;a.slot=b.slot;b.slot=old;toast('유닛 위치 교환')}
   else if(!b)a.slot=best;
 }
 S.drag=null;
});
function update(dt){S.t+=dt;relicCooldown=Math.max(0,relicCooldown-dt);
 if(S.stageStart===0)S.stageStart=S.t;
 if(S.spawn<S.max&&S.t>S.next){spawn();S.next=S.t+(20/30)}
 mobs.forEach(m=>{if(m.hp<=0)return;m.hit=Math.max(0,m.hit-dt);m.stun=Math.max(0,m.stun-dt);m.slow=Math.max(0,m.slow-dt);if(m.stun<=0)m.p+=dt*.070*(m.slow>0?.55:1);let p=path(m.p);m.x=p.x;m.y=p.y});
 mobs=mobs.filter(m=>m.hp>0);
 if(mobs.length>=80){finish(false);return}
 if(S.t-S.stageStart>=20&&S.wave<30){S.wave++;playSound('wave');toast('WAVE '+S.wave);S.spawn=0;S.max=30;S.stageStart=S.t;S.next=S.t;S.coin+=8;grantEssence(3);S.runEssence=(S.runEssence||0)+3}
 if(S.wave===30&&S.spawn===S.max&&mobs.length===0){finish(true);return}
 units.forEach(u=>{u.cd-=dt;u.anim=Math.max(0,u.anim-dt*4);let p=slot(u.slot),T=unitData(u);if(u.cd<=0){let rng=battleRange(u);let tar=mobs.filter(m=>d(p,m)<rng).sort((a,b)=>b.p-a.p)[0];if(tar)fire(u,tar)}});
 shots.forEach(s=>{if(!s.target||s.target.hp<=0){s.dead=true;return}let dx=s.target.x-s.x,dy=s.target.y-s.y,dd=Math.hypot(dx,dy);if(dd<13){s.dead=true;let mlv=getLv(s.type,s.lv),dmg=s.dmg;if(s.kind==='fire'&&mlv>=5&&Math.random()<.15)dmg*=1.5;hit(s.target,dmg,s.kind,mlv);if(s.kind==='volt'){let near=mobs.filter(m=>m!==s.target&&d(m,s.target)<75).slice(0,mlv>=5?3:2);near.forEach(m=>hit(m,s.dmg*.5,'volt',mlv))}}else{s.x+=dx/dd*440*dt;s.y+=dy/dd*440*dt}});
 shots=shots.filter(s=>!s.dead);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;p.t-=dt});particles=particles.filter(p=>p.t>0);floaters.forEach(f=>{f.y-=25*dt;f.t-=dt});floaters=floaters.filter(f=>f.t>0);
 document.querySelector('#coin').textContent=S.coin;document.querySelector('#life').textContent=mobs.length;document.querySelector('#wave').textContent=String(S.wave).padStart(2,'0')+' / 30';
 document.querySelector('#stageProgress span').style.width=Math.min(100,(S.t-S.stageStart)/20*100)+'%';
 document.querySelector('#ult').textContent=relicCooldown>0?'충전 '+Math.ceil(relicCooldown)+'s':'✦ 별빛 강림';
 document.querySelector('#summon').disabled=S.coin<summonCost();
 refreshBattleUpgrade();
 if(document.querySelector('#recipeOverlay').style.display==='block'&&recipeStamp!==inventoryStamp())renderRecipes();
 let b=mobs.find(m=>m.boss),bw=document.querySelector('#bossWrap');bw.style.display=b?'block':'none';if(b)document.querySelector('#bossBar').style.width=100*b.hp/b.max+'%';
}
function draw(){ctx.save();ctx.clearRect(0,0,W,H);
 drawArena();
 // Selected unit: show its real attack radius.
 if(S.sel){
   let sp=slot(S.sel.slot),sr=battleRange(S.sel);
   ctx.save();
   ctx.fillStyle='#e8d59b0c';
   ctx.strokeStyle='#f0d28a88';
   ctx.lineWidth=1.5;
   ctx.setLineDash([6,5]);
   ctx.beginPath();ctx.arc(sp.x,sp.y,sr,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.setLineDash([]);
   ctx.fillStyle='#f4dfaa';ctx.font='800 10px system-ui';ctx.textAlign='center';
   ctx.fillText('RANGE '+sr,sp.x,Math.max(78,sp.y-sr-7));
   ctx.restore();
 }
 units.forEach(u=>{let p=slot(u.slot);if(S.sel===u){ctx.strokeStyle='#f1d087';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,24,0,7);ctx.stroke()}body(ctx,p.x,p.y-u.anim*3,u,unitScale()+u.anim*.03)});
 mobs.forEach(m=>{ctx.save();ctx.translate(m.x,m.y);ctx.shadowBlur=m.boss?20:8;ctx.shadowColor='#b94a52';ctx.fillStyle=m.hit?'#f3e6d4':'#7b3c43';ctx.beginPath();ctx.roundRect(-m.r,-m.r,m.r*2,m.r*2,8);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#12181c';ctx.beginPath();ctx.arc(-4,-2,2,0,7);ctx.arc(4,-2,2,0,7);ctx.fill();ctx.fillStyle='#171d21';ctx.fillRect(-m.r,-m.r-7,m.r*2,3);ctx.fillStyle='#d8585f';ctx.fillRect(-m.r,-m.r-7,m.r*2*m.hp/m.max,3);ctx.restore()});
 shots.forEach(s=>{let T=U[s.type],col=T.accent;ctx.shadowBlur=12;ctx.shadowColor=col;ctx.fillStyle=col;ctx.beginPath();ctx.arc(s.x,s.y,s.kind==='fire'?5:3,0,7);ctx.fill();ctx.shadowBlur=0});
 particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.t*3);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,7);ctx.fill();ctx.globalAlpha=1});
 floaters.forEach(f=>{ctx.globalAlpha=Math.min(1,f.t*3);ctx.fillStyle=f.col;ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(f.s,f.x,f.y);ctx.globalAlpha=1});
 ctx.restore()}
function resetGame(){battleUpgrades={};Object.assign(S,{coin:80,wave:1,t:0,next:0,spawn:0,max:30,sel:null,stageStart:0,summons:0,drag:null,runEssence:0});units=[];mobs=[];shots=[];particles=[];floaters=[];paused=false;ended=false;relicCooldown=0;for(let i=0;i<4;i++)summon();S.summons=0;S.coin=80;updateSummonPrice();document.querySelector('#pause').textContent='Ⅱ';document.querySelector('#pause').setAttribute('aria-label','일시정지');refreshSelection()}
function finish(won){if(ended)return;ended=true;battleUpgrades={};refreshSelection();playSound(won?'victory':'defeat');let gained=Math.floor(S.wave*1.5)+(won?30:0);grantEssence(gained);document.querySelector('#resultTitle').textContent=won?'VICTORY':'다시, 전설을 향해';document.querySelector('#resultText').textContent=`${S.wave} 웨이브 · ${units.length}명의 영웅${won?' · 유적 방어 성공':' · 몬스터 수용 한계 도달'} · 이번 전투 정수 +${gained+(S.runEssence||0)} ✦`;document.querySelector('#resultScreen').hidden=false;closeModal('#recipeOverlay');closeModal('#drawer')}
document.querySelector('#startGame').onclick=()=>{if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}started=true;resetGame();document.querySelector('#startScreen').hidden=true};
document.querySelector('#restartGame').onclick=()=>{if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}resetGame();document.querySelector('#resultScreen').hidden=true};
document.querySelector('#previewCodex').onclick=openGrowth;
document.querySelector('#pause').onclick=()=>{if(typeof window!=='undefined'&&window.ForgeAccount&&!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}paused=!paused;document.querySelector('#pause').textContent=paused?'▶':'Ⅱ';document.querySelector('#pause').setAttribute('aria-label',paused?'전투 계속':'일시정지');toast(paused?'전투 일시정지':'전투 계속')};
document.querySelector('#closeRecipe').onclick=()=>closeModal('#recipeOverlay');
document.querySelector('#recipeOverlay').addEventListener('pointerdown',e=>{if(e.target.id==='recipeOverlay')closeModal('#recipeOverlay')});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{recipeFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderRecipes()});
addEventListener('keydown',e=>{let id=['#recipeOverlay','#drawer'].find(id=>document.querySelector(id).style.display==='block');if(e.key==='Escape'&&id)closeModal(id);if(e.key==='Tab'&&id){let buttons=[...document.querySelector(id).querySelectorAll('button:not(:disabled)')];let first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===document.querySelector(id))){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
C.addEventListener('pointercancel',()=>S.drag=null);
let last=performance.now();function loop(n){let dt=Math.min(.034,(n-last)/1000);last=n;if((typeof window==='undefined'||!window.ForgeAccount||window.ForgeAccount.allowed())&&started&&!paused&&!ended&&!document.hidden&&!(W>H&&H<=520))update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
refreshCodex();renderHeroLab();

function unitInvestment(u){return u.invested??10*([0,1,3,9,27,54][u.lv]||1)}
function sellValue(u){return Math.floor(unitInvestment(u)*.5)}
function refreshSelection(){const u=S.sel,valid=!!u&&units.includes(u);document.querySelector('#selectionPanel').hidden=!valid;document.querySelector('#codex').hidden=valid;if(!valid)return;refreshBattleUpgrade();document.querySelector('#selectedName').textContent=heroLabel(u);document.querySelector('#selectedTier').textContent=`T${u.lv} · Lv.${getLv(u.type,u.lv)} · 공격 ${battleAttack(u).toFixed(1)}`;document.querySelector('#sellUnit').textContent=`되팔기 +${sellValue(u)} ◈`}
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
function sellSelected(){const u=S.sel;if(!started||ended||!u||!units.includes(u))return false;const value=sellValue(u);playSound('coin');removeUnit(u);S.coin+=value;S.drag=null;refreshSelection();document.querySelector('#coin').textContent=S.coin;document.querySelector('#summon').disabled=S.coin<summonCost();if(document.querySelector('#recipeOverlay').style.display==='block')renderRecipes();toast(`${heroLabel(u)} 판매 · +${value} ◈ (50% 환급)`);return true}
document.querySelector('#sellUnit').onclick=sellSelected;
document.querySelector('#deselectUnit').onclick=()=>{S.sel=null;refreshSelection()};


document.querySelectorAll('[data-lab-filter]').forEach(b=>b.onclick=()=>{labFilter=b.dataset.labFilter;document.querySelectorAll('[data-lab-filter]').forEach(x=>x.classList.toggle('active',x===b));renderHeroLab()});
document.querySelector('#homeButton').onclick=()=>{if(started&&!ended){paused=true;document.querySelector('#pause').textContent='▶';document.querySelector('#pause').setAttribute('aria-label','전투 계속');document.querySelector('#leaveBattle').hidden=false}else goLobby()};
document.querySelector('#confirmLeave').onclick=goLobby;
document.querySelector('#cancelLeave').onclick=()=>{document.querySelector('#leaveBattle').hidden=true};
document.querySelector('#resultLobby').onclick=goLobby;
document.querySelector('#resultGrowth').onclick=()=>{goLobby();openGrowth()};
renderWallet();

// Account adapter: authentication never writes over the original guest save.
if(typeof window!=='undefined')window.ForgeGame={
 snapshot:()=>({version:3,levels:{...heroLevels},essence}),
 guestSnapshot:()=>readMeta(),
 inBattle:()=>started&&!ended,
 pause:()=>{if(started&&!ended){paused=true;document.querySelector('#pause').textContent='▶';document.querySelector('#pause').setAttribute('aria-label','전투 계속')}},
 apply:(value,owner)=>{const clean=sanitizeMeta(value);metaStorageKey='ff_progress_account_'+owner;heroLevels=clean.levels;essence=clean.essence;renderHeroLab();refreshCodex()},
 guest:()=>{const value=readMeta();metaStorageKey=META_KEY;heroLevels=value.levels;essence=value.essence;renderHeroLab();refreshCodex()}
};
