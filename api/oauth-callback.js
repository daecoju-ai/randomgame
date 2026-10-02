const A=require('../lib/account.cjs');
const clear='__Host-ff-pkce=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Referrer-Policy','no-referrer');
 const redirect=(result)=>{const prior=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...(Array.isArray(prior)?prior:prior?[prior]:[]),clear]);res.setHeader('Location','/?auth_result='+result);res.status(303).end()};
 try{
  if(req.method!=='GET')throw new Error('method');
  const q=req.query||{},code=q.code;
  if(q.error||q.error_code)return redirect('cancelled');
  const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(a=>a.length>1));const verifier=cookies['__Host-ff-pkce'];
  if(typeof code!=='string'||!code||code.length>2048||!verifier||!/^[A-Za-z0-9_-]{64}$/.test(verifier))return redirect('expired');
  const data=await A.upstream('/auth/v1/token?grant_type=pkce',{method:'POST',body:{auth_code:code,code_verifier:verifier}});
  const user=await A.upstream('/auth/v1/user',{token:data.access_token});if(!user?.id)throw new Error('identity');
  A.setSession(res,data);return redirect('success');
 }catch{return redirect('failed')}
};
