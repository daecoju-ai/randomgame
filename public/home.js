/* Compact home navigation. Prices and previews come from the existing game rules. */
(()=>{
'use strict';
const $=s=>document.querySelector(s),icon=()=>window.ForgeUX.icon('diamonds');
for(const [button,dialog] of [['openShopHub','shopHub'],['openEventHub','eventHub']])$('#'+button).onclick=()=>$('#'+dialog).showModal();
document.querySelectorAll('[data-close-hub]').forEach(b=>b.onclick=()=>$('#'+b.dataset.closeHub).close());
for(const id of ['previewCodex','openUnitDraw','openAdventure','openLuck','luckEvent'])$('#'+id).addEventListener('click',()=>{$('#shopHub').close();$('#eventHub').close()});
function talismanMode(mode){const d=$('#talismanDialog');d.dataset.mode=mode;$('#talismanTitle').textContent=mode==='growth'?'부적 성장':'부적 뽑기';$('#shopHub').close()}
$('#openTalismans').addEventListener('click',()=>talismanMode('growth'));
$('#openTalismanDraw').onclick=()=>{$('#openTalismans').click();talismanMode('draw')};
function openLegend(type){$('#shopHub').close();window.ForgeSummons.openProduct(type,'hidden')}

function card(type,compact=false){
const u={type,lv:5},data=unitData(u),skills=skillRows(u).filter(s=>s.slot>=4),attack=baseAttack(u),rate=1.5/data.rate;
return '<button class="legendCard '+(compact?'compact':'')+'" data-legend="'+type+'"><canvas width="220" height="190" data-legend-art="'+type+'" aria-label="'+heroLabel(u)+'"></canvas><div><small>HIDDEN LEGEND · 5단계</small><b>'+heroLabel(u)+'</b><p>'+elementFor(type).role+'</p><span class="legendPower">공격력 '+attack.toFixed(1)+' · 초당 '+rate.toFixed(2)+'회</span><p class="legendSkill">'+(skills[0]?.name||'전용 스킬')+'</p>'+(compact?'':'<p class="legendDescription">'+(skills[0]?.description||'')+' · Lv.'+(skills[0]?.unlock||1)+' 개방</p>')+'<span class="legendPrice">'+icon()+' 2,000 <em>상세 보기 →</em></span></div></button>'
}
window.ForgeHome={showFeatured(type){$('#featuredLegend').innerHTML=card(type,true);$('#featuredLegend [data-legend]').onclick=()=>openLegend(type);paint()}};$('#featuredLegend').innerHTML=card(13,true);
$('#legendCatalog').innerHTML='<h3>히든 전설 컬렉션</h3><p>구매하면 영구 해금 + ★1 획득<br>전투 중 랜덤 조합 후보에 추가됩니다.</p>'+[12,13,14,15,16].map(t=>card(t)).join('')+'<small class="legendNote">표시 공격력은 Lv.1 · ★1 · 버프 적용 전 기준입니다. 유닛별 특성과 스킬이 다르며 모든 유닛이 기본 유닛보다 강한 것은 아닙니다. 전용 스킬의 해금 레벨은 상세 화면에서 확인하세요.</small>';
function paint(){const friends=$('#spiritFriends'),fg=friends.getContext('2d');fg.clearRect(0,0,320,64);for(let type=0;type<6;type++)body(fg,28+type*53,35,{type,lv:1},.43,true);document.querySelectorAll('[data-legend-art]').forEach(c=>{const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);body(g,110,100,{type:Number(c.dataset.legendArt),lv:5},1.65,true)})}
document.querySelectorAll('[data-legend]').forEach(b=>b.onclick=()=>openLegend(Number(b.dataset.legend)));
paint();paintedAtlas?.addEventListener('load',paint);specialAtlas?.addEventListener('load',paint);
})();
