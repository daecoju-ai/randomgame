/* Account-scoped companion data never writes the server-managed currency save. */
(()=>{'use strict';
const game=window.ForgeGame;let owner=null,epoch=0,ready=false,pending=null,saving=null,lastXp=0;
const key=id=>'ff_guardian_pending_'+id;
function cache(){if(!owner)return;try{if(pending)localStorage.setItem(key(owner),JSON.stringify(pending));else localStorage.removeItem(key(owner))}catch{}}
function stored(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
function reset(){owner=null;epoch++;ready=false;pending=null;saving=null;lastXp=0}
async function api(action,payload,id){let r;try{r=await fetch('/api/guardian',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Forge-Request':'1'},body:JSON.stringify({action,owner:id,payload}),signal:AbortSignal.timeout(15000)})}catch{throw Error('이름·경험치를 임시 저장했습니다. 연결 후 다시 저장해 주세요.')}const data=await r.json();if(!r.ok)throw Error(data.message||'주인공 계정 저장에 실패했습니다.');if(data.owner!==id)throw Error('계정이 변경되었습니다. 다시 로그인해 주세요.');return data.guardian}
function queue(payload){pending={...pending,...payload,xp:Math.max(pending?.xp||0,payload.xp||0)};cache()}
async function flush(){if(saving)return saving;if(!owner||!ready||!pending)return;const id=owner,stamp=epoch;
 const task=(async()=>{while(pending&&owner===id&&epoch===stamp){const sent=pending;const value=await api('save',sent,id);if(owner!==id||epoch!==stamp)return;lastXp=Math.max(lastXp,value.xp);if(pending===sent)pending=null;else if(pending.nickname===sent.nickname)delete pending.nickname;const live=game.guardianSnapshot();game.guardianApply({curve:2,nickname:pending?.nickname??value.nickname,xp:Math.max(live.xp,value.xp)});cache()}})();saving=task;try{await task}finally{if(epoch===stamp)saving=null}
}
async function load(id){owner=id;ready=false;const stamp=++epoch;pending=stored(key(id));if(pending&&(!Number.isSafeInteger(pending.xp)||pending.xp<0||pending.xp>63572695152691))pending=null;
 const legacy=stored('ff_progress_account_'+id)?.guardian;const seed=legacy&&typeof legacy.nickname==='string'?(game.guardianNormalize?.(legacy)||legacy):game.guardianSnapshot();const value=await api('load',{},id);if(owner!==id||epoch!==stamp)return;
 if(value){lastXp=value.xp;game.guardianApply({curve:2,nickname:pending?.nickname??value.nickname,xp:Math.max(value.xp,seed.xp||0,pending?.xp||0)});if((seed.xp||0)>value.xp)queue({xp:seed.xp})}
 else{queue({nickname:pending?.nickname??seed.nickname,xp:Math.max(seed.xp||0,pending?.xp||0)});game.guardianApply({...pending,curve:2})}ready=true;await flush();
}
function changed(){if(!owner||!ready)return;const xp=game.guardianSnapshot().xp;if(xp<=lastXp&&!pending)return;queue({xp});void flush().catch(()=>{})}
async function rename(nickname){if(!owner||!ready||window.ForgeAccount?.currentUser()?.id!==owner)throw Error('계정 기록을 먼저 불러와 주세요.');const xp=game.guardianSnapshot().xp;queue({nickname,xp});game.guardianApply({nickname,xp,curve:2});await flush()}
window.ForgeGuardianSync={load,reset,changed,rename,pending:()=>!!pending};
addEventListener('online',()=>{if(owner&&ready)void flush().catch(()=>{})});
addEventListener('beforeunload',e=>{if(owner&&pending){cache();e.preventDefault();e.returnValue=''}});
})();
