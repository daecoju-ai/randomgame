/* Honor Shop event contract. Dormant until server activation. */
(()=>{'use strict';
const config=Object.freeze({enabled:false,activation:Object.freeze({metric:'monthly_active_ranked_users',threshold:1000,minimumSeasons:1}),seasonWeeks:13,badgeTarget:1200,weeklyBadges:Object.freeze({participation:40,top100:60,top10:80,first:100})});
const relics=Object.freeze([
 {id:'honor_fire',element:'fire',name:'불멸의 태양 문장',stat:'skill',value:.12,desc:'불 속성 스킬 피해 +12%'},
 {id:'honor_water',element:'water',name:'심연빙해의 성배',stat:'control',value:.10,desc:'물 속성 제어 지속시간 +10%'},
 {id:'honor_earth',element:'earth',name:'대지왕의 핵',stat:'attack',value:.12,desc:'땅 속성 공격력 +12%'},
 {id:'honor_wind',element:'wind',name:'천공왕의 깃',stat:'haste',value:.07,desc:'바람 속성 쿨타임 감소 +7%'},
 {id:'honor_electric',element:'electric',name:'뇌제의 심장',stat:'skill',value:.12,desc:'전기 속성 스킬 피해 +12%'},
 {id:'honor_shadow',element:'shadow',name:'월식왕의 인장',stat:'crit',value:.08,desc:'암흑 속성 치명타 확률 +8%'}
]);
function render(){const el=document.querySelector('#honorShopPreview');if(!el)return;el.innerHTML=relics.map(x=>'<article><b>'+x.name+'</b><span>'+x.desc+'</span><small>명예 배지 '+config.badgeTarget.toLocaleString()+' · 이벤트 개방 후 구매</small></article>').join('')}
window.ForgeHonorShop={config,relics,active:()=>config.enabled};addEventListener('DOMContentLoaded',render);
})();