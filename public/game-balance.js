/* Static balance lives in GitHub/Vercel, not Supabase. User-owned state only goes to Supabase. */
(()=>{'use strict';
window.ForgeBalance=Object.freeze({
 schema:1,
 difficulties:Object.freeze({
  easy:Object.freeze({label:'쉬움',hp:.52,speed:.82,start:125,waveCoin:12,gold:.70,diamonds:1,cap:90,final:105}),
  normal:Object.freeze({label:'보통',hp:1,speed:1,start:90,waveCoin:9,gold:1,diamonds:2,cap:80,final:90}),
  hard:Object.freeze({label:'어려움',hp:1.55,speed:1.10,start:72,waveCoin:7,gold:1.45,diamonds:3,cap:70,final:75})
 }),
 storage:Object.freeze({
  staticSource:'github',
  accountState:'supabase',
  guestState:'localStorage'
 })
});
})();
