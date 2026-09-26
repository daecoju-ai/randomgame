/* Authentication tokens live only in Secure HttpOnly cookies, never localStorage. */
(()=>{'use strict';
const $=s=>document.querySelector(s),game=window.ForgeGame,dialog=$('#accountDialog');
let mode='signin',user=null,configured=false,checking=true,busy=false,locked=false,revision=null,dirty=false,conflict=false,awaitingChoice=false,saving=null,generation=0,returnFocus=null;
const key=id=>'ff_account_pending_'+id;
async function api(path,body){let r;try{r=await fetch('/api/'+path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Forge-Request':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)})}catch{throw Error('연결을 확인한 뒤 다시 시도해 주세요.')}const data=await r.json().catch(()=>({message:'계정 서비스를 사용할 수 없습니다.'}));if(!r.ok)throw Object.assign(Error(data.message),{code:data.error,status:r.status});return data}
function message(text){$('#accountMessage').textContent=text}
function cache(){if(!user)return;try{localStorage.setItem(key(user.id),JSON.stringify({revision,data:game.snapshot(),dirty}))}catch{message('기기에 임시 저장할 공간이 없습니다. 이 화면을 닫기 전에 서버 저장을 완료해 주세요.')}}
function cached(id){try{return JSON.parse(localStorage.getItem(key(id))||'null')}catch{return null}}
function status(text){$('#cloudStatus').textContent=text;$('#saveStatus').textContent=text}
function render(){
 $('#accountUser').textContent=user?user.email:'게스트';$('#accountState').textContent=checking?'계정 확인 중':user?'계정으로 플레이':'가입 없이도 플레이할 수 있어요';
 $('#accountMember').hidden=!user;$('#accountGuest').hidden=!!user;$('#accountForm').hidden=!!user||!configured||checking;
 $('#accountSetup').hidden=configured||checking;$('#accountChecking').hidden=!checking;
 $('#accountChoice').hidden=!awaitingChoice;$('#cloudReload').hidden=!conflict;$('#cloudRetry').hidden=!user||awaitingChoice||conflict;
 $('#accountLogout').disabled=busy||!!saving||dirty||game.inBattle();
 $('#accountBattleNote').hidden=!game.inBattle();
 $('#accountTitle').textContent=user?'내 계정':({signin:'다시 만난 영웅',signup:'새로운 모험의 시작',verify:'이메일 인증',recover:'비밀번호 찾기',reset:'새 비밀번호 설정'}[mode]);
 $('#passwordField').hidden=!['signin','signup','reset'].includes(mode);$('#accountPassword').required=!$('#passwordField').hidden;$('#accountPassword').autocomplete=mode==='signin'?'current-password':'new-password';
 $('#codeField').hidden=!['verify','reset'].includes(mode);$('#accountCode').required=!$('#codeField').hidden;
 $('#confirmField').hidden=!['signup','reset'].includes(mode);$('#accountConfirm').required=!$('#confirmField').hidden;
 $('#accountSubmit').textContent={signin:'로그인',signup:'회원가입',verify:'인증 완료',recover:'인증번호 받기',reset:'비밀번호 변경'}[mode];
 $('#accountSubmit').disabled=busy||game.inBattle();$('#accountTabs').hidden=!['signin','signup'].includes(mode);$('#accountForgot').hidden=mode!=='signin';$('#accountVerifyLink').hidden=mode!=='signin';$('#accountBack').hidden=['signin','signup'].includes(mode);$('#accountResend').hidden=mode!=='verify';
 document.querySelectorAll('[data-auth-mode]').forEach(b=>{b.disabled=busy;b.classList.toggle('active',b.dataset.authMode===mode)});
 $('#accountResend').disabled=busy;$('#accountClose').disabled=busy;
 $('#accountBadge').textContent=user?'내 계정':'로그인 / 회원가입';
}
function setMode(next){mode=next;$('#accountPassword').value='';$('#accountConfirm').value='';$('#accountCode').value='';message('');render()}
function open(){if(game.inBattle())game.pause();returnFocus=document.activeElement;render();if(!dialog.open)dialog.showModal();$('#accountEmail').focus()}
function close(){if(busy)return;dialog.close();$('#accountPassword').value='';$('#accountConfirm').value='';$('#accountCode').value='';returnFocus?.focus()}
function hold(text){locked=true;game.pause();status(text);render()}
function localGuest(){user=null;revision=null;dirty=false;conflict=false;awaitingChoice=false;locked=false;generation++;game.guest();status('비회원 · 이 브라우저에만 저장');render()}
async function loadAccount(nextUser){user=nextUser;locked=true;generation++;game.pause();game.apply({levels:{},essence:0},user.id);status('계정 기록 불러오는 중');render();
 try{const response=await api('progress',{action:'load',owner:user.id});const record=response.record,pending=cached(user.id);
  if(pending?.dirty){revision=pending.revision;dirty=true;game.apply(pending.data,user.id);if(record?.revision!==revision&&!(record===null&&revision===null)){conflict=true;hold('저장 충돌 · 계정에서 서버 기록을 확인해 주세요.');open();return}locked=false;await flush();return}
  if(!record){revision=null;awaitingChoice=true;hold('첫 계정 저장 · 기존 기록을 가져올지 선택해 주세요.');open();return}
  revision=record.revision;game.apply(record.data,user.id);dirty=false;locked=false;conflict=false;cache();status('계정에 저장됨 · 다른 기기에서도 이어하기');render();
 }catch(e){hold(e.message);message(e.message);open()}}
async function flush(){if(saving)return saving;if(!user||!dirty||conflict||awaitingChoice)return;const owner=user.id,epoch=generation;
 saving=(async()=>{while(dirty&&user?.id===owner&&epoch===generation){const snapshot=game.snapshot(),stamp=JSON.stringify(snapshot);status('계정에 저장 중…');try{const result=await api('progress',{action:'save',owner,revision,data:snapshot});if(epoch!==generation)return;revision=result.record.revision;dirty=stamp!==JSON.stringify(game.snapshot());locked=false;cache();status(dirty?'계정에 저장 중…':'계정에 저장됨 · 다른 기기에서도 이어하기')}catch(e){if(epoch!==generation)return;conflict=e.status===409;cache();hold(e.message);message(e.message);return}}})();try{await saving}finally{saving=null;render()}}
window.ForgeAccount={allowed:()=>!checking&&!locked,statusText:()=>$('#cloudStatus').textContent,changed:()=>{if(!user){status('비회원 · 이 브라우저에만 저장');return}dirty=true;cache();void flush()},open};
$('#accountForm').onsubmit=async e=>{e.preventDefault();if(busy||game.inBattle())return;busy=true;message('처리 중…');render();const email=$('#accountEmail').value,password=$('#accountPassword').value,code=$('#accountCode').value.trim();
 try{if(['signup','reset'].includes(mode)&&password!==$('#accountConfirm').value)throw Error('비밀번호가 서로 다릅니다.');const action=mode==='signin'?'signin':mode;const result=await api('account',{action,email,password,code});$('#accountPassword').value='';$('#accountConfirm').value='';
 if(result.user){await loadAccount(result.user);message(locked?'계정 저장 연결을 완료해 주세요.':'로그인했습니다.');}
 else if(mode==='signup'){setMode('verify');message('이메일의 인증번호를 입력해 주세요. 이미 가입했다면 로그인해 주세요.')}
 else if(mode==='recover'){setMode('reset');message('인증 가능한 주소라면 메일이 발송됩니다. 인증번호와 새 비밀번호를 입력해 주세요.')}
 else if(mode==='reset'){localGuest();setMode('signin');message('비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.')}
 }catch(e){message(e.message)}finally{busy=false;render()}};
$('#accountResend').onclick=async()=>{if(busy)return;busy=true;render();try{await api('account',{action:'resend',email:$('#accountEmail').value});message('인증 가능한 주소라면 메일이 재발송됩니다. 잠시 기다려 주세요.')}catch(e){message(e.message)}finally{busy=false;render()}};
$('#accountLogout').onclick=async()=>{if(busy||dirty||saving||game.inBattle())return;busy=true;render();try{await api('account',{action:'logout'});localGuest();setMode('signin');message('로그아웃했습니다. 비회원 기록으로 돌아갑니다.')}catch(e){message(e.message)}finally{busy=false;render()}};
$('#cloudRetry').onclick=async()=>{if(busy||saving)return;busy=true;render();try{if(dirty)await flush();else if(user)await loadAccount(user)}finally{busy=false;render()}};
$('#cloudReload').onclick=()=>{$('#cloudConflictConfirm').hidden=false};
$('#cloudConflictCancel').onclick=()=>{$('#cloudConflictConfirm').hidden=true};
$('#cloudConflictAccept').onclick=async()=>{if(busy)return;busy=true;render();try{const r=await api('progress',{action:'load',owner:user.id});if(!r.record)throw Error('서버 기록이 없습니다. 다시 로그인해 주세요.');try{localStorage.setItem(key(user.id)+'_backup',JSON.stringify({revision,data:game.snapshot()}))}catch{}revision=r.record.revision;dirty=false;conflict=false;locked=false;game.apply(r.record.data,user.id);cache();$('#cloudConflictConfirm').hidden=true;status('서버 기록을 불러왔습니다.');message('계정 기록으로 이어서 플레이할 수 있습니다.')}catch(e){message(e.message)}finally{busy=false;render()}};
async function choose(importGuest){if(busy)return;busy=true;awaitingChoice=false;game.apply(importGuest?game.guestSnapshot():{version:3,levels:{},essence:120},user.id);dirty=true;locked=false;cache();render();try{await flush()}finally{busy=false;render()}}
$('#importGuest').onclick=()=>choose(true);$('#newAccountStart').onclick=()=>choose(false);
$('#accountBadge').onclick=open;$('#accountHeaderButton').onclick=open;$('#accountClose').onclick=close;
$('#accountForgot').onclick=()=>setMode('recover');$('#accountVerifyLink').onclick=()=>setMode('verify');$('#accountBack').onclick=()=>setMode('signin');document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.authMode));
dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
addEventListener('online',()=>{if(user&&dirty&&!conflict)void flush()});
addEventListener('beforeunload',e=>{if(user&&dirty){cache();e.preventDefault();e.returnValue=''}});
addEventListener('storage',e=>{if(user&&e.key===key(user.id)){conflict=true;hold('다른 탭에서 기록이 변경되었습니다. 서버 기록을 확인해 주세요.')}});
async function init(){render();try{const result=await api('account',{action:'status'});configured=result.configured;if(result.user)await loadAccount(result.user);else localGuest()}catch(e){configured=false;localGuest();message(e.message)}finally{checking=false;render()}}
void init();
})();
