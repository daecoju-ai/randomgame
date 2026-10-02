/* Keep Android/browser Back inside the game; never replay a purchase or reward. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), trail=[];
let current=null,handling=false,exitArmedAt=null;
const visible=el=>el&&(el.tagName==='DIALOG'?el.open:!el.hidden&&getComputedStyle(el).display!=='none');
function top(){
 const dialogs=[...document.querySelectorAll('dialog[open]')];
 // Nested dialogs are opened after their parent, regardless of HTML order.
 const last=trail.slice().reverse().find(id=>dialogs.some(d=>d.id===id));
 const fresh=dialogs.filter(d=>!trail.includes(d.id));
 if(fresh.length)return fresh.at(-1).id;
 if(last)return last;
 for(const id of ['leaveBattle','recipeOverlay','drawer'])if(visible($(id)))return id;
 return null;
}
function sync(){
 if(handling)return;
 const next=top();if(next===current)return;
 if(next===null)trail.length=0;
 else{const index=trail.indexOf(next);if(index>=0)trail.splice(index+1);else trail.push(next)}
 current=next;
}
function reopen(id){
 const el=$(id);if(!el||visible(el))return;
 if(el.tagName==='DIALOG')el.showModal();
 else if(id==='drawer'||id==='recipeOverlay')openModal('#'+id);
}
function back(){
 sync();handling=true;
 try{
 const id=current,el=$(id);
 if(el){
  if(el.tagName==='DIALOG'){
   // Existing cancel handlers protect in-flight purchases and resolve reveals.
   const event=new Event('cancel',{cancelable:true});el.dispatchEvent(event);
   if(!event.defaultPrevented&&el.open)el.close();
   if(el.open)return;
  }else if(id==='leaveBattle')$('cancelLeave').click();
  else closeModal('#'+id);
  trail.pop();current=trail.at(-1)||null;
  // Only navigation screens are restored; transactional dialogs are never replayed.
  if(['shopHub','eventHub','unitAlbumDialog','hiddenCollectionDialog','albumDetailDialog','drawer'].includes(current))reopen(current);
 }
 }finally{handling=false;sync()}
}
// One guard entry avoids accumulating browser history as menus open and close.
const guard={...(history.state||{}),forgeBackGuard:true};
if(!history.state?.forgeBackGuard)history.pushState(guard,'',location.href);
addEventListener('popstate',()=>{
 sync();
 if(current){exitArmedAt=null;back();history.pushState(guard,'',location.href);return}
 const now=Date.now();
 if(exitArmedAt!==null&&now-exitArmedAt<2000){
  exitArmedAt=null;
  // We are already on the original entry: let the browser/Android host leave it.
  history.back();return;
 }
 exitArmedAt=now;
 toast('한 번 더 누르면 종료됩니다');
 history.pushState(guard,'',location.href);
});
// A normal game interaction cancels an armed exit, avoiding accidental later exits.
addEventListener('pointerdown',()=>{exitArmedAt=null});
new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden','style']});
sync();
})();
