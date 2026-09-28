'use strict';
const accessCookie='__Host-ff-access', refreshCookie='__Host-ff-refresh';
class Fault extends Error {constructor(status,code,message){super(message);Object.assign(this,{status,code})}}
function config(){const defaults=require('./public-config.cjs'),url=(process.env.SUPABASE_URL||defaults.url).trim(),key=(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||(url===defaults.url?defaults.key:'')).trim();return url&&key&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)?{url,key}:null}
function cookieMap(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(x=>x.length>1))}
function setSession(res,data){if(!data.access_token||!data.refresh_token)throw new Fault(502,'AUTH_RESPONSE','인증 응답을 확인할 수 없습니다.');res.setHeader('Set-Cookie',[
 `${accessCookie}=${encodeURIComponent(data.access_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.min(3600,Math.max(60,data.expires_in||3600))}`,
 `${refreshCookie}=${encodeURIComponent(data.refresh_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
])}
function clearSession(res){res.setHeader('Set-Cookie',[accessCookie,refreshCookie].map(k=>`${k}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`))}
async function upstream(path,{method='GET',body,token,headers={}}={}){const c=config();if(!c)throw new Fault(503,'NOT_CONFIGURED','계정 서비스 연결 준비 중입니다. 비회원 플레이를 이용해 주세요.');let r;try{r=await fetch(c.url+path,{method,headers:{apikey:c.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)})}catch{throw new Fault(503,'NETWORK','서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')}
 const data=await r.json().catch(()=>null);if(!r.ok){let status=r.status===429?429:r.status>=500?503:400,code=data?.error_code||data?.code||'AUTH_FAILED',message='요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.';
 if(path.includes('/rest/')){status=r.status===409?409:503;code=status===409?'CONFLICT':'STORAGE_UNAVAILABLE';message=status===409?'다른 기기에서 저장한 기록이 있습니다. 서버 기록을 불러와 주세요.':'계정 저장소에 연결하지 못했습니다.'}
 if(path==='/rest/v1/rpc/forge_adventure'&&['P0001','22P02'].includes(data?.code)){status=400;code='INVALID_ADVENTURE';message='요청이 만료되었거나 조건이 맞지 않습니다. 기록을 새로 불러와 주세요.'}
 else if(r.status===429)message='요청이 많습니다. 잠시 후 다시 시도해 주세요.';
 else if(code==='email_not_confirmed')message='이메일 인증을 먼저 완료해 주세요.';
 else if(code==='invalid_credentials'||path.includes('/token')){status=401;message='이메일 또는 비밀번호를 확인해 주세요.'}
 else if(path.includes('/verify'))message='인증번호가 만료되었거나 올바르지 않습니다.';
 else if(code==='weak_password')message='더 강한 비밀번호를 사용해 주세요.';
 throw new Fault(status,code,message)}return data}
async function identity(req,res){const cookies=cookieMap(req);let token=cookies[accessCookie];if(token){try{token=decodeURIComponent(token);const user=await upstream('/auth/v1/user',{token});return{token,user}}catch(e){if(e.status===503)throw e}}
 const refresh=cookies[refreshCookie];if(!refresh)return null;try{const data=await upstream('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:decodeURIComponent(refresh)}});setSession(res,data);const user=await upstream('/auth/v1/user',{token:data.access_token});return{token:data.access_token,user}}catch(e){if(e.status===503||e.status===429)throw e;clearSession(res);return null}}
function publicUser(user){return{id:user.id,email:user.email}}
function input(req){let b=req.body;if(typeof b==='string'){if(b.length>16000)throw new Fault(413,'TOO_LARGE','요청이 너무 큽니다.');try{b=JSON.parse(b)}catch{throw new Fault(400,'INVALID_JSON','요청을 확인해 주세요.')}}if(!b||typeof b!=='object'||Array.isArray(b)||JSON.stringify(b).length>16000)throw new Fault(400,'INVALID_BODY','요청을 확인해 주세요.');return b}
function guard(req,res){res.setHeader('Cache-Control','no-store, private');res.setHeader('Vary','Cookie');res.setHeader('X-Content-Type-Options','nosniff');if(req.method!=='POST')throw new Fault(405,'METHOD','지원하지 않는 요청입니다.');const origin=process.env.APP_ORIGIN||'https://randomfortune-game.vercel.app';if(req.headers.origin!==origin||req.headers['x-forge-request']!=='1'||!String(req.headers['content-type']).startsWith('application/json'))throw new Fault(403,'ORIGIN','페이지를 새로고침한 뒤 다시 시도해 주세요.')}
function email(value){if(typeof value!=='string'||value.length>254||!/^\S+@\S+\.\S+$/.test(value.trim()))throw new Fault(400,'EMAIL','이메일 주소를 확인해 주세요.');return value.trim().toLowerCase()}
function password(value){if(typeof value!=='string'||value.length<10||value.length>128)throw new Fault(400,'PASSWORD','비밀번호는 10~128자로 입력해 주세요.');return value}
function progress(value){
 if(value?.version===4){
  const {validHero,skillUnlockLevel}=require('../public/evolution.js');
  const fail=()=>{throw new Fault(400,'PROGRESS','저장 데이터를 확인해 주세요.')};
  if(!value.levels||typeof value.levels!=='object'||Array.isArray(value.levels)||!Number.isInteger(value.essence)||value.essence<0||value.essence>10000000)fail();
  const levels={},skills={};
  for(const [key,n] of Object.entries(value.levels)){const m=/^(\d+):([1-5])$/.exec(key);if(!m||!validHero(+m[1],+m[2])||!Number.isInteger(n)||n<1||n>30)fail();levels[key]=n}
  if(value.skills!==undefined&&(!value.skills||typeof value.skills!=='object'||Array.isArray(value.skills)))fail();
  for(const [key,rank] of Object.entries(value.skills||{})){const m=/^(\d+):([1-5]):([0-6])$/.exec(key);if(!m||!validHero(+m[1],+m[2])||!Number.isInteger(rank)||rank<1||rank>10||(levels[`${m[1]}:${m[2]}`]||1)<skillUnlockLevel(+m[2],+m[3]))fail();skills[key]=rank}
  return {version:4,levels,skills,essence:value.essence};
 }
if(!value||typeof value!=='object'||!value.levels||typeof value.levels!=='object'||Array.isArray(value.levels)||!Number.isInteger(value.essence)||value.essence<0||value.essence>10000000)throw new Fault(400,'PROGRESS','저장 데이터를 확인해 주세요.');const levels={};for(const [key,n]of Object.entries(value.levels)){if(!/^(?:[0-9]|1[01]):[1-6]$/.test(key)||!Number.isInteger(n)||n<1||n>30||key.endsWith(':1')&&![0,1,4,6,8,10].includes(+key.split(':')[0]))throw new Fault(400,'PROGRESS','저장 데이터를 확인해 주세요.');levels[key]=n}const skills={};if(value.skills!==undefined&&(!value.skills||typeof value.skills!=='object'||Array.isArray(value.skills)))throw new Fault(400,'PROGRESS','스킬 데이터를 확인해 주세요.');for(const [key,rank]of Object.entries(value.skills||{})){const m=/^([0-9]|1[01]):([1-6]):([0-5])$/.exec(key);if(!m||Number(m[3])>=Number(m[2])||!Number.isInteger(rank)||rank<1||rank>10||(levels[m[1]+':'+m[2]]||1)<(Number(m[3])+1)*5)throw new Fault(400,'PROGRESS','스킬 데이터를 확인해 주세요.');skills[key]=rank}return{version:3,levels,skills,essence:value.essence}}
function fail(res,e){res.status(e.status||500).json({error:e.code||'SERVER_ERROR',message:e.status?e.message:'잠시 후 다시 시도해 주세요.'})}
module.exports={Fault,config,upstream,identity,setSession,clearSession,publicUser,input,guard,email,password,progress,fail};
