const A=require('../lib/account.cjs');
module.exports=async(req,res)=>{try{
 A.guard(req,res);const b=A.input(req),auth=await A.identity(req,res);
 if(!auth)throw new A.Fault(401,'SIGN_IN','부적은 로그인 계정에 영구 저장됩니다. 로그인해 주세요.');
 if(b.owner!==auth.user.id)throw new A.Fault(409,'ACCOUNT_CHANGED','계정이 변경되었습니다. 다시 열어 주세요.');
 if(!['load','daily','draw'].includes(b.action))throw new A.Fault(400,'ACTION','광고·결제는 아직 준비 중입니다.');
 const count=b.action==='draw'?b.count:1;
 if(![1,10].includes(count))throw new A.Fault(400,'COUNT','1회 또는 10회 뽑기를 선택해 주세요.');
 if(b.action!=='load'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.requestId||''))throw new A.Fault(400,'REQUEST_ID','요청 번호를 확인해 주세요.');
 const result=await A.upstream('/rest/v1/rpc/forge_talisman',{method:'POST',token:auth.token,body:{operation:b.action,request_id:b.action==='load'?null:b.requestId,draw_count:count}});
 return res.status(200).json(result);
}catch(e){A.fail(res,e)}};
