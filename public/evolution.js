// Stable type IDs retain account identity. Add future final forms here and in progression validation.
const ELEMENTS=[
 {id:'fire',label:'불',base:8,support:11,color:'#ef5445',accent:'#ffb16f',kind:'fire',atk:7,rate:.95,role:'화력 · 화상',final:['불의 지배자','불의 무희']},
 {id:'water',label:'물',base:10,support:3,color:'#299df0',accent:'#96e9ff',kind:'ice',atk:6,rate:1,role:'광역 · 빙결 · 회복',final:['심해의 군주','물의 치유사']},
 {id:'earth',label:'땅',base:0,support:2,color:'#ab7745',accent:'#edc58a',kind:'bash',atk:8,rate:1.2,role:'제어 · 방어',final:['대지의 파괴자','생명의 나무']},
 {id:'wind',label:'바람',base:7,support:4,color:'#37c981',accent:'#a0ffcb',kind:'arrow',atk:5,rate:.65,role:'공격속도 · 회오리',final:['폭풍의 지배자','바람의 선율사']},
 {id:'electric',label:'전기',base:9,support:5,color:'#f1c72e',accent:'#fff1a1',kind:'volt',atk:6,rate:.85,role:'연쇄 · 감전',final:['천둥의 왕','빛의 인도자']},
 {id:'shadow',label:'암흑',base:1,support:6,color:'#282238',accent:'#b994ff',kind:'slash',atk:10,rate:1.1,role:'단일 폭딜 · 처형',final:['어둠의 암살자','그림자의 인도자']}
];
const BASE_TYPES=ELEMENTS.map(e=>e.base);
const elementFor=type=>ELEMENTS.find(e=>e.base===type||e.support===type);
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
 return {version:4,levels,skills,essence:Math.min(10000000,Math.max(0,Number(value?.essence)||0)+refund)};
}
function cleanProgress(value){
 value=migrateProgress(value);const levels={},skills={};
 for(const [key,n] of Object.entries(value.levels||{})){const m=/^(\d+):([1-5])$/.exec(key);if(m&&validHero(+m[1],+m[2])&&Number.isInteger(n)&&n>=1&&n<=30)levels[key]=n}
 for(const [key,rank] of Object.entries(value.skills||{})){const m=/^(\d+):([1-5]):([0-6])$/.exec(key);if(m&&validHero(+m[1],+m[2])&&Number.isInteger(rank)&&rank>=1&&rank<=10&&(levels[`${m[1]}:${m[2]}`]||1)>=skillUnlockLevel(+m[2],+m[3]))skills[key]=rank}
 return {version:4,levels,skills,essence:Math.min(10000000,Math.max(0,Math.floor(Number(value.essence)||0)))};
}
if(typeof module!=='undefined')module.exports={validHero,skillUnlockLevel,cleanProgress,migrateProgress};
