'use strict';const A=require('../lib/account.cjs'),B=require('../lib/learning-bank.cjs');
module.exports=async(req,res)=>{try{A.guard(req,res);const b=A.input(req),auth=await A.identity(req,res);if(!auth)throw new A.Fault(401,'SIGN_IN','로그인하면 기본 선택과 보상이 저장됩니다.');if(b.owner!==auth.user.id)throw new A.Fault(409,'ACCOUNT_CHANGED','계정이 변경되었습니다.');if(!['load','profile','start','finish','review-list','review-miss','review-mastered','stars-load'].includes(b.action))throw new A.Fault(400,'ACTION','학습 요청을 확인해 주세요.');if(!['load','review-list'].includes(b.action)&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.requestId||''))throw new A.Fault(400,'REQUEST_ID','요청 번호를 확인해 주세요.');let payload=b.payload||{};
if(b.action==='stars-load'){
 const v=await A.upstream('/rest/v1/rpc/forge_learning_star_balance',{method:'POST',token:auth.token,body:{}});
 return res.status(200).json(v);
}
if(b.action.startsWith('review-')){
 const action=b.action==='review-list'?'list':b.action==='review-miss'?'miss':'mastered';
 if(action!=='list'&&(!payload.id||String(payload.id).length>120))throw new A.Fault(400,'QUESTION','복습 문제를 확인해 주세요.');
 const v=await A.upstream('/rest/v1/rpc/forge_learning_review',{method:'POST',token:auth.token,body:{p_action:action,p_question_id:action==='list'?null:String(payload.id),p_subject:action==='list'?null:String(payload.subject||''),p_domain:action==='list'?null:String(payload.domain||'')}});
 if(v?.error)throw new A.Fault(409,v.error,'복습 기록을 저장하지 못했습니다.');
 return res.status(200).json(v);
}
if(b.action==='start'){const q=B.find(payload.id);if(!q)throw new A.Fault(404,'QUESTION','사용할 수 없는 문제입니다.');payload=B.proof(q)}if(b.action==='finish'){if(!Array.isArray(payload.events)||payload.events.length>80)throw new A.Fault(400,'EVENTS','풀이 기록을 확인해 주세요.');payload={run:payload.run,events:payload.events}}const v=await A.upstream('/rest/v1/rpc/forge_learning',{method:'POST',token:auth.token,body:{p_action:b.action,p_request:b.action==='load'?null:b.requestId,p_payload:payload}});if(v.error)throw new A.Fault(409,v.error,v.message);res.status(200).json(v)}catch(e){A.fail(res,e)}};
