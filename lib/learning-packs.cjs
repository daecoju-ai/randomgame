'use strict';
const catalog=require('../data/certifications/targets.json');
function groupQuestions(bank){
 const groups=new Map();
 for(const q of bank){
  const routes=q.certification_routes?.length?q.certification_routes:[null];
  for(const route of routes){
   const target=route&&(catalog.targets||catalog.legacy_pilot_targets||[]).find(t=>t.id===route.target);
   const area=target?.subjects?.find(s=>s.id===route.area);
   if(route&&(!target||!area))throw Error(`Unknown certification route: ${q.id}`);
   const id=route?`cert-${target.id}-${area.id}`:`${q.school}-${q.grade}-${q.subject}`;
   if(!groups.has(id))groups.set(id,{id,subject:q.subject,school:q.school,grade:q.grade,certification:target?.id||null,area:area?.id||null,title:route?`${target.name} · ${area.name}`:({math:`초${q.grade} 수학 · 정답 타일 원정`,english:'영어 한 문장 듣고 만들기',korean:'국어·어휘 · 단어 원정',law:'생활법률 · 상황 원정',certification:'공통 기초 · 안전·공식 원정'})[q.subject]||'학습 원정',rows:[]});
   groups.get(id).rows.push(q);
  }
 }
 return [...groups.values()];
}
module.exports={groupQuestions,catalog};
