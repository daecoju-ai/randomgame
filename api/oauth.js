const A=require('../lib/account.cjs');
const {randomBytes,createHash}=require('node:crypto');
const providers=['google','kakao'];
module.exports=async(req,res)=>{try{
 A.guard(req,res);const b=A.input(req),c=A.config();if(!c)throw new A.Fault(503,'NOT_CONFIGURED','간편 로그인 연결 준비 중입니다.');
 const settings=await A.upstream('/auth/v1/settings');const enabled=Object.fromEntries(providers.map(p=>[p,settings.external?.[p]===true]));
 if(b.action==='providers')return res.status(200).json({providers:enabled});
 if(b.action!=='start'||!providers.includes(b.provider))throw new A.Fault(400,'PROVIDER','지원하지 않는 로그인 방식입니다.');
 if(!enabled[b.provider])throw new A.Fault(503,'PROVIDER_DISABLED','아직 연결 준비 중입니다. 이메일 로그인을 이용해 주세요.');
 const verifier=randomBytes(48).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const origin=process.env.APP_ORIGIN||'https://randomfortune-game.vercel.app';
 const url=new URL(c.url+'/auth/v1/authorize');url.searchParams.set('provider',b.provider);url.searchParams.set('redirect_to',origin+'/api/oauth-callback');url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','s256');
 res.setHeader('Set-Cookie',`__Host-ff-pkce=${verifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
 return res.status(200).json({url:url.href});
}catch(e){A.fail(res,e)}};
