/* Shared immutable catalog: browser display and server migration seed. */
(function(root){'use strict';
const catalog=[
 ['flame','홍련의 부적',1,'fire','skill',.04],['ember','폭염의 부적',2,'fire','splash',.05],
 ['spring','청명의 부적',0,'water','mana',.05],['frost','빙결의 부적',1,'water','control',.04],
 ['stone','거암의 부적',0,'earth','attack',.04],['mud','진흙의 부적',0,'earth','control',.05],
 ['gale','질풍의 부적',1,'wind','speed',.04],['breeze','순풍의 부적',3,'wind','haste',.025],
 ['moon','흑월의 부적',2,'shadow','crit',.015],['execution','처형의 부적',1,'shadow','critPower',.075],
 ['thunder','뇌명의 부적',0,'electric','skill',.04],['shock','감전의 부적',1,'electric','control',.04],
 ['warrior','투사의 부적',0,'all','attack',.02],['arcane','비술의 부적',1,'all','skill',.02],
 ['mana','마력의 부적',0,'all','mana',.025],['pioneer','개척자의 부적',1,'all','startCoin',5],
 ['fortune','행운의 부적',2,'all','killCoin',.05],['merchant','상인의 부적',2,'all','sell',.025],
 ['training','수련의 부적',0,'all','essence',.025],
 ['inferno','태양심장 부적',3,'fire','attack',.035],['cinder','잿불 문장',1,'fire','splash',.025],
 ['tide','심해의 눈',2,'water','mana',.035],['winter','영원의 서리',3,'water','control',.035],
 ['granite','산맥의 맹세',2,'earth','attack',.035],['bog','늪지의 인장',1,'earth','control',.035],
 ['tempest','폭풍 깃털',2,'wind','speed',.035],['zephyr','시간의 산들바람',1,'wind','haste',.015],
 ['eclipse','일식의 송곳니',3,'shadow','critPower',.05],['dagger','밤사냥꾼의 인장',1,'shadow','crit',.01],
 ['storm','뇌신의 북',3,'electric','skill',.035],['voltage','번개의 사슬',2,'electric','control',.035]
].map(([id,name,grade,element,stat,value])=>({id,name,grade,element,stat,value}));
const grades=['일반','희귀','영웅','전설'],thresholds=[1,3,7,15,31],weights=[.6,.3,.09,.01];
const labels={attack:'공격력',skill:'스킬 피해',splash:'기본 광역 피해 비율',mana:'MP 회복속도',control:'제어 지속시간',speed:'공격속도',haste:'쿨타임 감소',crit:'치명타 확률',critPower:'치명타 피해 배율',startCoin:'시작 코인',killCoin:'처치 시 코인 +1 확률',sell:'판매 환급률',essence:'전투 금화'};
const elements={all:'전체',fire:'불',water:'물',earth:'땅',wind:'바람',electric:'전기',shadow:'암흑'};
const caps={attack:.25,skill:.25,splash:.25,mana:.30,control:.20,speed:.25,haste:.10,crit:.15,critPower:.5,startCoin:30,killCoin:.20,sell:.20,essence:.20};
const stars=n=>thresholds.filter(t=>n>=t).length;
const factor=n=>stars(n)?1+(stars(n)-1)*.25:0;
const levelFactor=l=>(100+(Math.max(1,Math.min(20,Math.floor(Number(l)||1)))-1)*5)/100;
const upgradeCost=(grade,level)=>level>=20?0:(grade+1)*5*Math.max(1,Math.floor(level));
function totals(owned,element='all',levels={}){const out=Object.fromEntries(Object.keys(caps).map(k=>[k,0]));for(const t of catalog)if(t.element==='all'||t.element===element)out[t.stat]+=t.value*factor(owned?.[t.id]||0)*levelFactor(levels[t.id]);for(const k in out)out[k]=Math.min(caps[k],out[k]);return out}
function format(stat,value){return stat==='startCoin'?`+${value.toFixed(0)}`:`+${+(value*100).toFixed(2)}${['crit','critPower','sell','splash'].includes(stat)?'%p':'%'}`}
function odds(pity=[0,0,0]){const w=[...weights],min=pity[2]>=99?3:pity[1]>=49?2:pity[0]>=9?1:0;for(let i=0;i<min;i++){w[min]+=w[i];w[i]=0}return catalog.map(t=>({id:t.id,chance:w[t.grade]/catalog.filter(v=>v.grade===t.grade).length}))}
const api={catalog,grades,thresholds,weights,labels,elements,caps,stars,factor,levelFactor,upgradeCost,totals,format,odds};if(typeof module!=='undefined')module.exports=api;else root.ForgeTalismans=api;
})(typeof window!=='undefined'?window:globalThis);
