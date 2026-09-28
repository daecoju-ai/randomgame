/* Paid and ad rewards remain disabled until providers can verify delivery. */
(()=>{'use strict';
const T=window.ForgeTalismans,$=s=>document.querySelector(s);let owner=null,state=null,busy=false,epoch=0,battleOwned={},notice='로그인하면 부적을 영구 보관할 수 있습니다.';
const pendingKey=id=>'ff_talisman_pending_'+id;
function pending(){try{return JSON.parse(localStorage.getItem(pendingKey(owner))||'null')}catch{return null}}
async function api(body){const r=await fetch('/api/talismans',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Forge-Request':'1'},body:JSON.stringify({...body,owner}),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok||data.error)throw Object.assign(Error(data.message||'부적 서버에 연결하지 못했습니다.'),{status:r.status,code:data.error});return data}
function effect(t,n=1){return `${T.elements[t.element]} ${T.labels[t.stat]} ${T.format(t.stat,t.value*T.factor(n))}`}
function render(){
 $('#talismanStatus').textContent=notice;$('#talismanWallet').textContent=`소환권 ${state?.tickets||0}장 · 부적 가루 ${state?.dust||0}`;
 const p=state?.pity||[0,0,0];$('#talismanPity').textContent=`희귀 이상 ${10-p[0]}회 · 영웅 이상 ${50-p[1]}회 · 전설 ${100-p[2]}회 이내 보장`;
 $('#talismanDaily').disabled=busy;
 for(const count of [1,10])$('#talismanDraw'+count).disabled=busy||!owner||!state||state.tickets<count||!!pending();
 $('#talismanRetry').hidden=!owner||!pending();$('#talismanRetry').disabled=busy;$('#talismanLogin').hidden=!!owner;
 $('#talismanRefresh').disabled=busy||!owner;
 $('#talismanCards').innerHTML=T.catalog.map(t=>{const n=state?.owned?.[t.id]||0,stars=T.stars(n),next=T.thresholds[stars];return `<article class="talismanCard ${n?'owned':'unowned'} grade-${t.grade}"><span>${T.grades[t.grade]} · ${T.elements[t.element]}</span><div class="talismanSeal" aria-hidden="true">${['火','水','土','風','雷','影'][['fire','water','earth','wind','electric','shadow'].indexOf(t.element)]||'✦'}</div><h3>${t.name}</h3><b>${stars?'★'.repeat(stars):'미보유'}</b><p>${effect(t,n||1)}</p><small>${n?(next?`다음 강화 ${n}/${next}개 · 중복 획득 시 자동 강화`:'5성 최대 · 추가 중복은 가루로 전환'):'획득하면 영구 효과 활성화'}</small></article>`}).join('');
 const lines=Object.keys(T.elements).flatMap(e=>{const bonuses=T.totals(state?.owned,e);return Object.entries(bonuses).filter(([k,v])=>v>0&&(e==='all'||v!==T.totals(state?.owned,'all')[k])).map(([k,v])=>`<li>${T.elements[e]} ${T.labels[k]} <b>${T.format(k,v)}</b>${v>=T.caps[k]?' · 상한':''}</li>`)});
 $('#talismanSummary').innerHTML=lines.length?`<ul>${lines.join('')}</ul>`:'아직 보유한 부적이 없습니다. 첫 부적을 뽑아 보세요.';
 $('#talismanOdds').innerHTML=`<p>기본 등급 확률: 일반 60% · 희귀 30% · 영웅 9% · 전설 1%. 등급 안에서는 균등 추첨합니다. 아래는 보장을 반영한 다음 1회 확률입니다. 10회 뽑기는 매 회차 보장 횟수를 갱신합니다.</p><ul>${T.odds(p).map(o=>`<li>${T.catalog.find(t=>t.id===o.id).name}: ${(o.chance*100).toFixed(4)}%</li>`).join('')}</ul><p>보장 등급 이상 획득 시 해당 보장 횟수가 초기화됩니다. 1·3·7·15·31개 누적 시 1~5성. 5성 이후 중복 가루: 일반 1 / 희귀 3 / 영웅 10 / 전설 30. 가루 제작 기능은 준비 중입니다.</p>`;
}
async function load(){const token=epoch;if(!owner)return;const r=await api({action:'load'});if(token!==epoch||r.owner!==owner)return;state=r;notice='보유 효과 자동 적용 · 다음 전투 시작 시 반영';render()}
async function request(action,count=1){if(busy||!owner||window.ForgeGame.inBattle())return;busy=true;render();const token=epoch,account=owner;try{
 let body=pending();if(!body){body={action,count,requestId:crypto.randomUUID()};localStorage.setItem(pendingKey(account),JSON.stringify(body))}
 const r=await api(body);if(token!==epoch||r.owner!==owner)return;localStorage.removeItem(pendingKey(account));state=r;
 $('#talismanResult').textContent=(r.drops||[]).map(drop=>{const t=T.catalog.find(t=>t.id===drop.id);return `${t.name} · ${drop.dust?`최대 강화 중복 → 가루 +${drop.dust}`:drop.before===0?'신규 획득! 영구 효과 활성화':T.stars(drop.after)>T.stars(drop.before)?`${T.stars(drop.after)}성 자동 강화!`:`중복 ${drop.after}/${T.thresholds[T.stars(drop.after)]||31}`}`}).join('\n')||r.message;
 await load();
 }catch(e){if(token!==epoch)return;if(e.code==='TICKETS'||(e.status>=400&&e.status<500))localStorage.removeItem(pendingKey(account));notice=(e.message||'연결을 확인해 주세요.')+(pending()?' 동일 요청 재확인으로 결과를 복구할 수 있습니다.':'');}finally{if(token===epoch){busy=false;render()}}}
window.ForgeEconomy={
 accountChanged(id){epoch++;owner=id;state=null;battleOwned={};busy=false;notice=id?'부적 화면을 열어 보유 효과를 확인하세요.':'로그인하면 부적을 영구 보관할 수 있습니다.';render()},
 async beforeBattle(){owner=window.ForgeAccount?.currentUser()?.id||null;if(!owner){battleOwned={};return true}try{await load();if(!state||state.owner!==owner)return false;battleOwned={...state.owned};return true}catch(e){toast('부적 정보를 불러오지 못했습니다. 연결을 확인해 주세요.');return false}},
 bonus(element,stat){return T.totals(battleOwned,element)[stat]||0}
};
$('#openTalismans').onclick=async()=>{if(window.ForgeGame.inBattle())return;$('#talismanDialog').showModal();render();if(owner&&!busy){busy=true;render();try{await load()}catch(e){notice=e.message}finally{busy=false;render()}}};
$('#closeTalismans').onclick=()=>$('#talismanDialog').close();$('#talismanLogin').onclick=()=>{$('#talismanDialog').close();window.ForgeAccount.open()};
$('#talismanDaily').onclick=()=>request('daily');$('#talismanDraw1').onclick=()=>request('draw',1);$('#talismanDraw10').onclick=()=>request('draw',10);$('#talismanRetry').onclick=()=>request('draw');
$('#talismanRefresh').onclick=async()=>{if(busy)return;busy=true;try{await load()}catch(e){notice=e.message}finally{busy=false;render()}};
for(const id of ['#startGame','#restartGame']){const original=$(id).onclick;$(id).onclick=async()=>{if(!window.ForgeAccount.allowed()){window.ForgeAccount.open();return}$(id).disabled=true;try{if(await window.ForgeEconomy.beforeBattle())original()}finally{$(id).disabled=false}}}
render();
})();
