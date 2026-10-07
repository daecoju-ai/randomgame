/* Static balance lives in GitHub/Vercel, not Supabase. User-owned state only goes to Supabase. */
(()=>{'use strict';
window.ForgeBalance=Object.freeze({
 schema:15,
 waves:Object.freeze({count:30,spawnInterval:20,hpGrowth:1.155,normalBaseHp:84,eliteBaseHp:136,bossBaseHp:700,eliteEvery:10}),
 progression:Object.freeze({freeTarget:Object.freeze({easyHours:3,normalDays:30}),snapshots:Object.freeze({hour1:Object.freeze({level:6,stars:1,skill:2}),hour3:Object.freeze({level:12,stars:2,skill:4}),day7:Object.freeze({level:17,stars:4,skill:7}),day14:Object.freeze({level:22,stars:7,skill:11}),day30:Object.freeze({level:26,stars:10,skill:15})}),drawLuck:Object.freeze({bad:Object.freeze({tiers:[2,2,1,1,1,1],mix:.88}),average:Object.freeze({tiers:[3,2,2,2,1,1],mix:1}),good:Object.freeze({tiers:[5,4,3,3,2,2],mix:1.14})}),levelGoldScale:Object.freeze({1:.55,2:.70,3:.85,4:1,5:1.15}),skillDiamondScale:Object.freeze({1:.50,2:.65,3:.80,4:1,5:1.15})}),
 combat:Object.freeze({shadowNormal:2.15,shadowBoss:2.25,shadowCrit:.15,critMultiplier:2,fireSplash:.22,supportAttack:.55,singleSkill:1.28,specialUnit:1.18,specialPremium:Object.freeze({poison:1.00,metal:1.00,time:1.06,star:1.06,void:1.12}),element:Object.freeze({fire:.98,water:1.05,earth:1.08,wind:.92,electric:1.00,shadow:1.00})}),
 supportCaps:Object.freeze({attack:.60,speed:.55,mana:.80,haste:.45,splash:.45,crit:.40,critPower:.60,shock:.60}),
 ultimate:Object.freeze({power:64,mp:80,cooldown:45,radius:3,duration:8}),
 difficulties:Object.freeze({
  easy:Object.freeze({label:'쉬움',hp:.42,speed:.78,start:140,waveCoin:13,gold:.85,diamonds:1,cap:80,final:110}),
  normal:Object.freeze({label:'보통',hp:1.08,speed:1.02,start:92,waveCoin:8,gold:1.05,diamonds:2,cap:80,final:85}),
  hard:Object.freeze({label:'어려움',hp:1.60,speed:1.10,start:74,waveCoin:6,gold:1.55,diamonds:3,cap:80,final:70})
 }),
 storage:Object.freeze({
  staticSource:'github',
  accountState:'supabase',
  guestState:'localStorage'
 })
});
})();
