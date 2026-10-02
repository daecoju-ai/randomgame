/* Paid and ad rewards remain disabled until providers can verify delivery. */
(()=>{'use strict';
const T=window.ForgeTalismans,$=s=>document.querySelector(s);let owner=null,state=null,busy=false,epoch=0,battleOwned={},notice='로그인하면 부적을 영구 보관할 수 있습니다.';
const pendingKey=id=>'ff_talisman_pending_'+id;
function pending(){try{return JSON.parse(localStorage.getItem(pendingKey(owner))||'null')}catch{return null}}
async function api(body){const r=await fetch('/api/talismans',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Forge-Request':'1'},body:JSON.stringify({...body,owner}),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok||data.error)throw Object.assign(Error(data.message||'부적 서버에 연결하지 못했습니다.'),{status:r.status,code:data.error});return data}
const statIcons={attack:'⚔',skill:'✦',splash:'◎',mana:'✧',control:'❄',speed:'➤',haste:'◷',crit:'✧',critPower:'⚔',startCoin:'◈',killCoin:'◈',sell:'↗',essence:'★'};
let collectionFilter='all',elementFilter='all';
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function talismanArt(t){return `<img src="/assets/talismans-v28/${t.element}.webp" alt="" width="88" height="88" loading="lazy"><span class="talismanAbility" title="${T.labels[t.stat]}">${statIcons[t.stat]}</span>`}
function renderCollection(){
 const owned=state?.owned||{},list=T.catalog.filter(t=>(collectionFilter==='all'||owned[t.id]>0)&&(elementFilter==='all'||t.element===elementFilter));
 $('#talismanCollectionCount').textContent=`보유 ${T.catalog.filter(t=>owned[t.id]>0).length} / ${T.catalog.length}종`;
 document.querySelectorAll('[data-talisman-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.talismanFilter===collectionFilter)));
 document.querySelectorAll('[data-talisman-element]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.talismanElement===elementFilter)));
 $('#talismanCards').innerHTML=list.map(t=>{const n=owned[t.id]||0,stars=T.stars(n),next=T.thresholds[stars],level=window.ForgeAdventure?.talismanLevels()?.[t.id]||1,cost=T.upgradeCost(t.grade,level);return `<article class="talismanCard ${n?'owned':'unowned'} grade-${t.grade}" style="--item-color:${{fire:'#b95433',water:'#327d9e',earth:'#674631',wind:'#38804c',electric:'#9b7621',shadow:'#7954a4',all:'#327765'}[t.element]}"><div class="talismanSeal" aria-hidden="true">${talismanArt(t)}</div><div class="talismanInfo"><span class="talismanMeta">${T.grades[t.grade]} · ${T.elements[t.element]}<em>${n?`Lv.${level} / 20`:'미보유'}</em></span><h3>${t.name}</h3><p class="talismanEffect">${effect(t,n||1,level)}</p><span class="talismanStars">${n?`★ ${stars} / 20 · 효과 +${(stars-1)*10}%`:'획득 시 자동 적용'}</span></div><details class="talismanDetail"><summary>성장 정보</summary><p>${n?(next?`중복 1개 자동 소모 → ★${stars+1} · 기본 효과 +10%`:'20성 최대 · 추가 중복은 가루로 전환'):'획득하면 보유 효과가 영구 활성화됩니다.'}</p>${n?`<p>${level<20?`다음 레벨: ${effect(t,n,level+1)}`:'Lv.20 최대 달성'}</p><small>합산 효과에는 상한이 적용됩니다.</small>`:''}</details>${n?`<button class="talismanUpgrade" data-talisman-upgrade="${t.id}" ${busy||level>=20||!window.ForgeAdventure?.active()||window.ForgeAdventure.diamonds()<cost?'disabled':''}>${level>=20?'Lv.20 최대':`강화 <span>◆ ${cost}</span>`}</button>`:'<span class="talismanAcquire">부적 뽑기로 획득</span>'}</article>`}).join('')||'<p class="talismanEmpty">이 조건에 맞는 부적이 없습니다.</p>';
 document.querySelectorAll('[data-talisman-upgrade]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;render();try{if(await window.ForgeAdventure.upgrade('talisman_level',{id:b.dataset.talismanUpgrade})){notice='부적 강화 완료 · 다음 전투부터 적용';window.ForgeUX.celebrate()}}finally{busy=false;render()}});
}
function renderDrops(r){
 const drops=r.drops||[];
 $('#talismanResult').innerHTML=drops.length?`<h3>부적을 획득했어요!</h3><div class="talismanDrops">${drops.map(drop=>{const t=T.catalog.find(t=>t.id===drop.id);if(!t)return '';const message=drop.dust?`가루 +${drop.dust}`:drop.before===0?'NEW · 신규 획득':T.stars(drop.after)>T.stars(drop.before)?`${T.stars(drop.after)}성 달성!`:`중복 수집 ${drop.after}개`;return `<article class="grade-${t.grade}"><div class="talismanSeal">${talismanArt(t)}</div><b>${t.name}</b><small>${message}</small></article>`}).join('')}</div>`:escapeText(r.message||'');
}
function effect(t,n=1,level=1){return `${T.elements[t.element]} ${T.labels[t.stat]} ${T.format(t.stat,t.value*T.factor(n)*T.levelFactor(level))}`}
function render(){
 $('#talismanStatus').textContent=notice;$('#talismanWallet').innerHTML=`<span><small>다이아</small><b>${window.ForgeUX.icon("diamonds")} ${window.ForgeAdventure?.diamonds()||0}</b></span><span><small>소환권</small><b>▱ ${state?.tickets||0}</b></span><span><small>가루</small><b>✧ ${state?.dust||0}</b></span>`;
 const p=state?.pity||[0,0,0];$('#talismanPity').textContent=`희귀 이상 ${10-p[0]}회 · 영웅 이상 ${50-p[1]}회 · 전설 ${100-p[2]}회 이내 보장`;
 $('#talismanDaily').disabled=busy||!owner;
 for(const count of [1,10])$('#talismanDraw'+count).disabled=busy||!owner||!state||state.tickets<count||!!pending();
 $('#talismanRetry').hidden=!owner||!pending();$('#talismanRetry').disabled=busy;$('#talismanLogin').hidden=!!owner;
 $('#talismanRefresh').disabled=busy||!owner;
 renderCollection();
 const lines=Object.keys(T.elements).flatMap(e=>{const bonuses=T.totals(state?.owned,e,window.ForgeAdventure?.talismanLevels());return Object.entries(bonuses).filter(([k,v])=>v>0&&(e==='all'||v!==T.totals(state?.owned,'all',window.ForgeAdventure?.talismanLevels())[k])).map(([k,v])=>`<li>${T.elements[e]} ${T.labels[k]} <b>${T.format(k,v)}</b>${v>=T.caps[k]?' · 상한':''}</li>`)});
 $('#talismanSummary').innerHTML=lines.length?`<ul>${lines.join('')}</ul>`:'아직 보유한 부적이 없습니다. 첫 부적을 뽑아 보세요.';
 $('#talismanOdds').innerHTML=`<p>기본 등급 확률: 일반 60% · 희귀 30% · 영웅 9% · 전설 1%. 등급 안에서는 균등 추첨합니다. 아래는 보장을 반영한 다음 1회 확률입니다. 10회 뽑기는 매 회차 보장 횟수를 갱신합니다.</p><ul>${T.odds(p).map(o=>`<li>${T.catalog.find(t=>t.id===o.id).name}: ${(o.chance*100).toFixed(4)}%</li>`).join('')}</ul><p>보장 등급 이상 획득 시 해당 보장 횟수가 초기화됩니다. 첫 획득 ★1 · 같은 부적 1개 자동 소모마다 ★+1, 기본 효과 +10% · 최대 ★20. 20성 이후 중복 가루: 일반 1 / 희귀 3 / 영웅 10 / 전설 30. 가루 제작 기능은 준비 중입니다.</p>`;
}
async function load(){const token=epoch;if(!owner)return;const r=await api({action:'load'});if(token!==epoch||r.owner!==owner)return;state=r;notice='보유 효과 자동 적용 · Lv.20까지 다이아 강화 · 다음 전투부터 반영';render()}
async function request(action,count=1){if(busy||!owner||window.ForgeGame.inBattle())return;busy=true;render();const token=epoch,account=owner;try{
 let body=pending();if(!body){body={action,count,requestId:crypto.randomUUID()};localStorage.setItem(pendingKey(account),JSON.stringify(body))}
 const r=await api(body);if(token!==epoch||r.owner!==owner)return;localStorage.removeItem(pendingKey(account));state=r;
 renderDrops(r);
 if(r.drops?.length)await window.ForgeSummons?.revealTalismans(r.drops);
 await load();
 }catch(e){if(token!==epoch)return;if(e.code==='TICKETS'||(e.status>=400&&e.status<500))localStorage.removeItem(pendingKey(account));notice=(e.message||'연결을 확인해 주세요.')+(pending()?' 동일 요청 재확인으로 결과를 복구할 수 있습니다.':'');}finally{if(token===epoch){busy=false;render()}}}
window.ForgeEconomy={
 accountChanged(id){epoch++;owner=id;state=null;battleOwned={};busy=false;notice=id?'부적 화면을 열어 보유 효과를 확인하세요.':'로그인하면 부적을 영구 보관할 수 있습니다.';render()},
 async beforeBattle(){owner=window.ForgeAccount?.currentUser()?.id||null;if(!owner){battleOwned={};return true}try{await load();if(!state||state.owner!==owner)return false;battleOwned={...state.owned};return true}catch(e){window.ForgeUX?.entryError('부적 정보를 불러오지 못했습니다. 연결을 확인한 뒤 다시 눌러 주세요.');return false}},
 bonus(element,stat){return T.totals(battleOwned,element,window.ForgeAdventure?.battleTalismanLevels())[stat]||0}
};
$('#openTalismans').onclick=async()=>{if(window.ForgeGame.inBattle())return;$('#talismanDialog').showModal();render();if(owner&&!busy){busy=true;render();try{await load()}catch(e){notice=e.message}finally{busy=false;render()}}};
$('#closeTalismans').onclick=()=>$('#talismanDialog').close();$('#talismanLogin').onclick=()=>{$('#talismanDialog').close();window.ForgeAccount.open()};
$('#talismanDaily').onclick=()=>request('daily');$('#talismanDraw1').onclick=()=>request('draw',1);$('#talismanDraw10').onclick=()=>request('draw',10);$('#talismanRetry').onclick=()=>request('draw');
$('#talismanRefresh').onclick=async()=>{if(busy)return;busy=true;try{await load()}catch(e){notice=e.message}finally{busy=false;render()}};
for(const id of ['#confirmBattle','#restartGame']){const original=$(id).onclick;$(id).onclick=async()=>{if($(id).disabled)return;if(!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}window.ForgeUX.entryTarget=id;window.ForgeUX.entryError('');const label=$(id).innerHTML;$(id).disabled=true;$(id).textContent='모험 준비 중…';try{if(await window.ForgeEconomy.beforeBattle())original()}catch(e){window.ForgeUX.entryError(e.message||'전투를 준비하지 못했습니다. 다시 눌러 주세요.')}finally{$(id).disabled=false;$(id).innerHTML=label}}}
document.querySelectorAll('[data-talisman-filter]').forEach(b=>b.onclick=()=>{collectionFilter=b.dataset.talismanFilter;renderCollection()});
document.querySelectorAll('[data-talisman-element]').forEach(b=>b.onclick=()=>{elementFilter=b.dataset.talismanElement;renderCollection()});
render();
})();
