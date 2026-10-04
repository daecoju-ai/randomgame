const SPECIAL_UNITS=typeof module!=='undefined'?require('./adventure-data.js').specials:window.ForgeAdventureData.specials;
// Stable type IDs retain account identity. Add future final forms here and in progression validation.
const ELEMENTS=[
 {id:'fire',label:'불',base:8,support:11,color:'#ef5445',accent:'#ffb16f',kind:'fire',atk:7,rate:.95,reach:1.8,role:'광역 · 공격력',final:['멸겁의 군주','홍련의 무녀']},
 {id:'water',label:'물',base:10,support:3,color:'#299df0',accent:'#96e9ff',kind:'ice',atk:6,rate:1,reach:2,role:'MP · 정화 · 빙결',final:['빙해의 제왕','청명의 신탁자']},
 {id:'earth',label:'땅',base:0,support:2,color:'#65391f',accent:'#bd8659',kind:'bash',atk:8,rate:1.2,reach:1,role:'공격력 · 진흙 감속',final:['태산의 거신','대지의 현자']},
 {id:'wind',label:'바람',base:7,support:4,color:'#20cb59',accent:'#86ff9b',kind:'arrow',atk:5,rate:.65,reach:1.5,role:'공격속도 · 쿨타임',final:['천공의 폭군','질풍의 지휘자']},
 {id:'electric',label:'전기',base:9,support:5,color:'#f1c72e',accent:'#fff1a1',kind:'volt',atk:6,rate:.85,reach:1.8,role:'연쇄 감전 · 기절',final:['뇌명의 집행자','뇌광의 인도자']},
 {id:'shadow',label:'암흑',base:1,support:6,color:'#282238',accent:'#b994ff',kind:'slash',atk:10,rate:1.1,reach:1,role:'치명타 · 보스 2배 / 일반 3배',final:['월식의 처형자','흑월의 예언자']}
];
const GROWTH_NAMES={fire:['불씨령','홍염령','홍련의 술사','업화의 기사'],water:['물방울령','서리령','빙결의 술사','빙해의 기사'],earth:['조약돌령','암석령','암반의 투사','철산의 파수꾼'],wind:['산들령','질풍령','선풍의 척후','폭풍의 검객'],electric:['전광령','뇌운령','뇌전의 술사','벽력의 기사'],shadow:['그늘령','흑영령','월영의 자객','흑월의 추적자']};
const BASE_TYPES=ELEMENTS.map(e=>e.base);
const elementFor=type=>{const s=SPECIAL_UNITS.find(e=>e.type===type);return s?{...s,base:s.type,support:null,final:[s.name,s.name]}:ELEMENTS.find(e=>e.base===type||e.support===type)};
const ALL_ELEMENTS=[...ELEMENTS,...SPECIAL_UNITS.map(s=>elementFor(s.type))];
const isSupport=u=>u.lv===5&&elementFor(u.type)?.support===u.type;
const validHero=(type,tier)=>Number.isInteger(type)&&!!elementFor(type)&&Number.isInteger(tier)&&tier>=1&&tier<=5&&(tier===5||BASE_TYPES.includes(type));
const skillUnlockLevel=(tier,i)=>i<Math.min(tier,4)?1:tier===5&&i>=4&&i<=6?[1,10,20][i-4]:Infinity;
const levelInvestment=n=>6*n*(n-1);
function migrateProgress(value){
 if(value?.version===4)return value;
 const levels={},skills={};let refund=0;
 for(const [key,n] of Object.entries(value?.levels||{})){
  const m=/^(\d+):([1-6])$/.exec(key);if(!m||+m[1]>11||!Number.isInteger(n)||n<1||n>30)continue;
  const old=+m[1],tier=Math.min(5,+m[2]),type=tier===5?old:elementFor(old).base,newKey=`${type}:${tier}`,existing=levels[newKey]||1;
  refund+=levelInvestment(Math.min(existing,n));levels[newKey]=Math.max(existing,n);
 }
 for(const [key,rank] of Object.entries(value?.skills||{})){const m=/^(\d+):([1-6]):([0-5])$/.exec(key);if(m&&+m[1]<12&&+m[3]<+m[2]&&Number.isInteger(rank)&&rank>=1&&rank<=10&&(value.levels?.[`${m[1]}:${m[2]}`]||1)>=(+m[3]+1)*5)refund+=5*(+m[2])*rank*(rank-1)}
 return {...(value?.guardian?{guardian:value.guardian}:{}),version:4,levels,skills,essence:Math.min(10000000,Math.max(0,Number(value?.essence)||0)+refund)};
}
function cleanProgress(value){
 value=migrateProgress(value);const levels={},skills={};
 for(const [key,n] of Object.entries(value.levels||{})){const m=/^(\d+):([1-5])$/.exec(key);if(m&&validHero(+m[1],+m[2])&&Number.isInteger(n)&&n>=1&&n<=30)levels[key]=n}
 for(const [key,rank] of Object.entries(value.skills||{})){const m=/^(\d+):([1-5]):([0-6]|ultimate)$/.exec(key);if(m&&validHero(+m[1],+m[2])&&Number.isInteger(rank)&&rank>=1&&rank<=20&&(m[3]==='ultimate'?+m[2]===5:(levels[`${m[1]}:${m[2]}`]||1)>=skillUnlockLevel(+m[2],+m[3])))skills[key]=rank}
 return {...(value?.guardian?{guardian:value.guardian}:{}),version:4,levels,skills,essence:Math.min(10000000,Math.max(0,Math.floor(Number(value.essence)||0)))};
}
if(typeof module!=='undefined')module.exports={validHero,skillUnlockLevel,cleanProgress,migrateProgress};
