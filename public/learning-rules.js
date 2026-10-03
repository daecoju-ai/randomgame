(function(root,factory){const rules=factory();if(typeof module==='object')module.exports=rules;else root.ForgeLearningRules=rules})(typeof globalThis==='object'?globalThis:this,()=>{'use strict';
const TYPES={TILE_SEQUENCE:'sequence',ORDERING:'sequence',tile_order:'choice',TILE_CHOICE:'choice',TARGET_SELECT:'choice',MULTIPLE_CHOICE:'choice',multiple_choice:'choice',MATCHING:'matching',matching:'matching'};
function mode(q){return TYPES[q.game_type]||null}
function answers(q){return(Array.isArray(q.answer)?q.answer:[q.answer]).map(String)}
function start(q){return{step:0,mistakes:0,streak:0,picked:[],events:[],done:false,heard:false}}
function choose(q,s,token,ms){if(s.done)return false;token=String(token);const expected=answers(q),ok=token===expected[s.step];s.events.push({kind:'pick',token,ms:Math.max(0,Math.floor(ms))});if(ok){s.picked.push(token);s.step++;s.streak++;s.done=s.step===expected.length}else{s.mistakes++;s.streak=0}return ok}
function priority(q,mastery){const m=mastery?.[q.id];if(!m)return 4;return 1+(m.errors||0)*3/Math.max(1,m.attempts||1)+1/(1+(m.correct||0))}
function select(rows,mastery,last,random=Math.random){const pool=rows.filter(q=>mode(q)&&q.id!==last);const list=pool.length?pool:rows.filter(q=>mode(q));if(!list.length)return null;let n=random()*list.reduce((a,q)=>a+priority(q,mastery),0);return list.find(q=>(n-=priority(q,mastery))<0)||list.at(-1)}
return{TYPES,mode,answers,start,choose,priority,select}});
