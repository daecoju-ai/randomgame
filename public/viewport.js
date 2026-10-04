/* Horizontal paging without cloning interactive controls or changing game state. */
(()=>{
'use strict';
const editable=e=>e instanceof Element&&!!e.closest('input,textarea,[contenteditable=true]');
for(const type of ['contextmenu','selectstart','dragstart'])document.addEventListener(type,e=>{if(!editable(e.target))e.preventDefault()});
const shells=new Map();let frame=0;
function visible(el){return el.matches('dialog')?el.open:el.matches('#drawer,#recipeOverlay')?el.style.display==='block':!el.hidden&&getComputedStyle(el).display!=='none'}
function prepare(el){
 if(shells.has(el))return shells.get(el);
 const heading=[...el.children].find(n=>n.matches('header,.labHeader,.recipeHeader,#recipeTop,#closeBattleSkills,#closeDrawReveal'));
 const win=document.createElement('div');win.className='viewportWindow';
 const content=document.createElement('div');content.className='viewportContent';
 const nav=document.createElement('nav');nav.className='viewportNavigation';nav.setAttribute('aria-label','화면 페이지');
 nav.innerHTML='<button type="button" aria-label="이전 화면">❮</button><span role="status" aria-live="polite"></span><button type="button" aria-label="다음 화면">❯</button>';
 const state={el,heading,win,content,nav,page:0,count:1,stride:0};shells.set(el,state);el.classList.add('viewportShell');
 if(heading)heading.classList.add('viewportHeading');
 for(const child of [...el.childNodes])if(child!==heading)content.append(child);
 win.append(content);el.append(win,nav);
 const [prev,next]=nav.querySelectorAll('button');prev.onclick=()=>go(state,state.page-1);next.onclick=()=>go(state,state.page+1);
 win.addEventListener('focusin',e=>{const rect=e.target.getBoundingClientRect(),base=win.getBoundingClientRect();const page=Math.floor((rect.left-base.left+win.scrollLeft+1)/state.stride);if(page!==state.page)go(state,page)});
 el.addEventListener('close',()=>{state.page=0;win.scrollLeft=0});
 return state;
}
function go(s,page){s.page=Math.max(0,Math.min(s.count-1,page));s.win.scrollLeft=s.page*s.stride;const [prev,next]=s.nav.querySelectorAll('button');prev.disabled=s.page===0;next.disabled=s.page===s.count-1;s.nav.querySelector('span').textContent=(s.page+1)+' / '+s.count;}
function update(){frame=0;document.documentElement.style.setProperty('--ui-height',(window.visualViewport?.height||innerHeight)+'px');for(const el of document.querySelectorAll('dialog,#drawer,#recipeOverlay,#resultScreen,#leaveBattle,#finish')){
 if(el.dataset.nativePages==='true')continue;if(!visible(el)){el.removeAttribute('data-viewport-open');continue}const s=prepare(el);el.setAttribute('data-viewport-open','');
 // Some existing renderers append fresh nodes directly to the dialog.
 for(const child of [...el.children])if(child!==s.heading&&child!==s.win&&child!==s.nav&&!child.matches('.miniLegendFlash,.revealGlow'))s.content.append(child);
 const width=s.win.clientWidth;if(!width)continue;
 s.content.style.setProperty('--page-width',width+'px');s.stride=width+20;
 s.count=Math.max(1,Math.ceil((s.content.scrollWidth+20)/s.stride));go(s,s.page);
}}
function schedule(){if(!frame)frame=requestAnimationFrame(update)}
new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.viewportNavigation')&&(r.attributeName!=='style'||r.target.matches?.('#drawer,#recipeOverlay'))))schedule()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','class','style']});
addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);document.addEventListener('toggle',schedule,true);document.addEventListener('load',schedule,true);document.fonts?.ready.then(schedule);schedule();
})();
