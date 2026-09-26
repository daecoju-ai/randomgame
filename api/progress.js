const A=require('../lib/account.cjs');
module.exports=async(req,res)=>{try{A.guard(req,res);const b=A.input(req),auth=await A.identity(req,res);if(!auth)throw new A.Fault(401,'SIGN_IN','다시 로그인해 주세요.');if(b.owner!==auth.user.id)throw new A.Fault(409,'ACCOUNT_CHANGED','다른 탭에서 계정이 변경되었습니다. 새로고침해 주세요.');
 if(b.action==='load'){const rows=await A.upstream('/rest/v1/player_progress?user_id=eq.'+encodeURIComponent(auth.user.id)+'&select=data,revision',{token:auth.token});return res.status(200).json({record:rows[0]||null})}
 if(b.action==='save'){const data=A.progress(b.data);if(b.revision!==null&&(!Number.isSafeInteger(b.revision)||b.revision<1))throw new A.Fault(400,'REVISION','저장 버전을 확인해 주세요.');const rows=await A.upstream('/rest/v1/rpc/save_player_progress',{method:'POST',token:auth.token,body:{payload:data,expected_revision:b.revision}});if(!rows?.length)throw new A.Fault(409,'CONFLICT','다른 기기의 기록과 충돌했습니다. 서버 기록을 불러와 주세요.');return res.status(200).json({record:rows[0]})}
 throw new A.Fault(400,'ACTION','지원하지 않는 요청입니다.');
}catch(e){A.fail(res,e)}};
