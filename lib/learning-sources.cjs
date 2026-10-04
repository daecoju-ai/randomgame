'use strict';
// Fixed, small verification requests. Credentials and upstream responses never leave the build.
const providers={
 krdict:{key:'KRDIC_API_KEY',url:'https://krdict.korean.go.kr/api/search',params:{q:'약속',num:'10',start:'1'},keyParam:'key',success:/<item[\s>]/},
 stdict:{key:'STDICT_API_KEY',url:'https://stdict.korean.go.kr/api/search.do',params:{q:'안전',num:'10',start:'1',req_type:'xml'},keyParam:'key',success:/<item[\s>]/},
 law:{key:'LAW_API_KEY',url:'https://apis.data.go.kr/1170000/law/lawSearchList.do',params:{target:'law',query:'근로기준법'},keyParam:'serviceKey',success:/<(?:law|법령)[\s>]/},
 qnet:{key:'QNET_API_KEY',urlEnv:'QNET_QUALIFICATIONS_ENDPOINT',params:{},keyParam:'serviceKey',success:/(?:<item[\\s>]|\"items\"|\"item\")/}
};
function credential(value,param){value=value.trim();if(param==='serviceKey'&&/%[0-9a-f]{2}/i.test(value)){try{return decodeURIComponent(value)}catch{}}return value}
function classify(body,p){if(/(?:SERVICE_KEY_IS_NOT_REGISTERED|INVALID_REQUEST_PARAMETER|UNREGISTERED_IP|SERVICE_ACCESS_DENIED|<error|<err_code|<returnReasonCode>)/i.test(body))return'provider_rejected';return p.success.test(body)?'ok':'unexpected_response'}
async function probe(name,env=process.env,fetcher=fetch){const p=providers[name];if(!env[p.key]?.trim())return{provider:name,status:'missing_key'};const upstream=p.urlEnv?env[p.urlEnv]:p.url;if(!upstream?.trim())return{provider:name,status:'missing_endpoint'};const url=new URL(upstream);for(const [k,v]of Object.entries(p.params))url.searchParams.set(k,v);url.searchParams.set(p.keyParam,credential(env[p.key],p.keyParam));try{const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(12000)});const body=await r.text();const code=body.match(/<(?:returnReasonCode|resultCode|error_code)>\s*(\d{1,3})\s*<\//i)?.[1];if(!r.ok)return{provider:name,status:'http_error',httpStatus:r.status,...(code?{providerCode:code}:{})};if(body.length>1000000)return{provider:name,status:'oversized_response'};return{provider:name,status:classify(body,p),...(code?{providerCode:code}:{})}}catch(e){const reason=e.name==='TimeoutError'?'timeout':['ENOTFOUND','ETIMEDOUT','ECONNREFUSED','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(e.cause?.code)?e.cause.code:'network';return{provider:name,status:'connection_failed',reason}}}
module.exports={providers,credential,classify,probe};
