/* Static balance lives in GitHub/Vercel, not Supabase. User-owned state only goes to Supabase. */
(()=>{'use strict';
window.ForgeBalance=Object.freeze({
 schema:6,
 waves:Object.freeze({count:30,spawnInterval:20,hpGrowth:1.155,normalBaseHp:84,eliteBaseHp:136,bossBaseHp:700,eliteEvery:10}),
 combat:Object.freeze({shadowNormal:2.4,shadowBoss:1.8,shadowCrit:.15,critMultiplier:2,fireSplash:.25}),
 supportCaps:Object.freeze({attack:.60,speed:.55,mana:.80,haste:.45,splash:.45,crit:.40,critPower:.60,shock:.60}),
 ultimate:Object.freeze({power:64,mp:80,cooldown:45,radius:3,duration:8}),
 difficulties:Object.freeze({
  easy:Object.freeze({label:'쉬움',hp:.50,speed:.80,start:130,waveCoin:12,gold:.70,diamonds:1,cap:80,final:105}),
  normal:Object.freeze({label:'보통',hp:1,speed:1,start:95,waveCoin:9,gold:1,diamonds:2,cap:80,final:90}),
  hard:Object.freeze({label:'어려움',hp:1.45,speed:1.08,start:78,waveCoin:7,gold:1.45,diamonds:3,cap:80,final:75})
 }),
 storage:Object.freeze({
  staticSource:'github',
  accountState:'supabase',
  guestState:'localStorage'
 })
});
})();
