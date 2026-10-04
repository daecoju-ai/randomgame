(function(root,factory){const rules=factory();if(typeof module==='object')module.exports=rules;else root.ForgeLearningRules=rules})(typeof globalThis==='object'?globalThis:this,()=>{'use strict';
const TYPES={TILE_SEQUENCE:'sequence',ORDERING:'sequence',tile_order:'choice',TILE_CHOICE:'choice',TARGET_SELECT:'choice',FORMULA:'choice',MULTIPLE_CHOICE:'choice',multiple_choice:'choice',MATCHING:'matching',matching:'matching'};
function mode(q){return TYPES[q.game_type]||null}
function answers(q){return(Array.isArray(q.answer)?q.answer:[q.answer]).map(String)}
function start(q){return{step:0,mistakes:0,streak:0,picked:[],events:[],done:false,heard:false}}
function choose(q,s,token,ms){if(s.done)return false;token=String(token);const expected=answers(q),ok=token===expected[s.step];s.events.push({kind:'pick',token,ms:Math.max(0,Math.floor(ms))});if(ok){s.picked.push(token);s.step++;s.streak++;s.done=s.step===expected.length}else{s.mistakes++;s.streak=0}return ok}
function priority(){return 1}
function select(rows,_unused,last,random=Math.random){const valid=rows.filter(q=>mode(q)),pool=valid.filter(q=>q.id!==last),list=pool.length?pool:valid;return list.length?list[Math.min(list.length-1,Math.floor(random()*list.length))]:null}
function startId(now=Date.now(),previous=0){const ms=Math.max(now,previous+1),bytes=crypto.getRandomValues(new Uint8Array(16));let n=ms;for(let i=5;i>=0;i--){bytes[i]=n%256;n=Math.floor(n/256)}bytes[6]=(bytes[6]&15)|112;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return{id:`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`,ms}}
return{TYPES,mode,answers,start,choose,priority,select,startId}});
