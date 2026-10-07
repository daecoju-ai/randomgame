/* Battle entry energy: natural cap 10, +1 every 144 minutes; rewarded ads add 5 up to 15. */
(()=>{'use strict';
const KEY='ff_battle_energy_v1',NATURAL_CAP=10,BONUS_CAP=15,REGEN_MS=144*60*1000,$=s=>document.querySelector(s);
function clean(v){const now=Date.now();return{value:Math.max(0,Math.min(BONUS_CAP,Number(v?.value??NATURAL_CAP)||0)),anchor:Number(v?.anchor)||now}}
function read(){try{return clean(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{return clean(null)}}
let state=read();
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function regen(){const now=Date.now();if(state.value>=NATURAL_CAP){state.anchor=now;save();return}const n=Math.floor((now-state.anchor)/REGEN_MS);if(n>0){state.value=Math.min(NATURAL_CAP,state.value+n);state.anchor+=n*REGEN_MS;if(state.value>=NATURAL_CAP)state.anchor=now;save()}}
function remain(){regen();return state.value>=NATURAL_CAP?0:Math.max(0,REGEN_MS-(Date.now()-state.anchor))}
function clock(ms){const m=Math.ceil(ms/60000),h=Math.floor(m/60),r=m%60;return h?(h+'시간 '+r+'분'):(r+'분')}
function render(){regen();const a=$('#battleEnergyLobby'),b=$('#battleEnergyCount'),t=$('#battleEnergyTimer'),ad=$('#battleEnergyAd');if(a)a.textContent=state.value+'/'+NATURAL_CAP;if(b)b.textContent=state.value+' / '+NATURAL_CAP;if(t)t.textContent=state.value>=NATURAL_CAP?(state.value>NATURAL_CAP?'광고 보너스 충전됨':'최대 충전'):'다음 1개 · '+clock(remain());if(ad){const available=typeof window.ForgeRewardedAd?.show==='function';ad.disabled=!available||state.value>=BONUS_CAP;ad.textContent=state.value>=BONUS_CAP?'입장권 가득 참':available?'광고 보고 +5':'광고 연결 준비 중'}}
function consume(){regen();if(state.value<1){render();return false}state.value--;if(state.value===NATURAL_CAP-1)state.anchor=Date.now();save();render();return true}
function refund(){state.value=Math.min(BONUS_CAP,state.value+1);save();render()}
function grantAd(){regen();state.value=Math.min(BONUS_CAP,state.value+5);save();render()}
async function watchAd(){if(state.value>=BONUS_CAP)return;if(typeof window.ForgeRewardedAd?.show!=='function'){window.ForgeUX?.entryError('보상형 광고가 아직 앱에 연결되지 않았습니다. 광고 SDK 연결 후 +5 충전이 활성화됩니다.');return}const ok=await window.ForgeRewardedAd.show('battle_energy');if(ok===true){grantAd();window.ForgeUX?.entryError('광고 보상으로 전투 입장권 5개를 충전했습니다.')}}
function wrap(id){const el=$(id);if(!el)return;const original=el.onclick;el.onclick=async e=>{regen();if(state.value<1){window.ForgeUX?.entryError('전투 입장권이 없습니다. '+clock(remain())+' 후 1개가 충전됩니다.');render();return}if(!consume())return;try{const before=window.ForgeGame?.inBattle?.();const result=await original?.call(el,e);setTimeout(()=>{if(!before&&!window.ForgeGame?.inBattle?.())refund()},0);return result}catch(err){refund();throw err}}}
addEventListener('DOMContentLoaded',()=>{render();$('#battleEnergyAd')?.addEventListener('click',watchAd);setInterval(render,30000);setTimeout(()=>{wrap('confirmBattle');wrap('restartGame')},0)});
window.ForgeBattleEnergy={render,value:()=>{regen();return state.value},grantRewardedAd:grantAd};
})();