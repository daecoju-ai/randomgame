let installPrompt;
const installButton=document.querySelector('#install');
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installButton.textContent='앱 설치'});
installButton.addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else{document.querySelector('#installHelp').hidden=false}});
document.querySelector('#closeInstall').onclick=()=>document.querySelector('#installHelp').hidden=true;
addEventListener('appinstalled',()=>{installPrompt=null;installButton.hidden=true});
if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)installButton.hidden=true;
if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol))addEventListener('load',async()=>{try{
 const reg=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});let refreshing=false,pending=false;const hadController=!!navigator.serviceWorker.controller;
 const busy=()=>window.ForgeGame?.inBattle()||document.querySelector('#miniDialog[open],#learningDialog[open]');
 const apply=()=>{if(busy())return;if(pending){pending=false;if(!refreshing){refreshing=true;location.reload()}}else reg.waiting?.postMessage({type:'SKIP_WAITING'})};
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadController)return;pending=true;apply()});
 reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',apply)});
 setInterval(apply,2000);addEventListener('visibilitychange',()=>{if(!document.hidden){reg.update().catch(()=>{});apply()}});await reg.update();apply();
}catch{installButton.title='오프라인 준비 실패. 연결 후 새로고침해 주세요.'}});
