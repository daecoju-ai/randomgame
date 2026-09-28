(function(root){const specials=[
 {type:12,id:'poison',name:'독화여왕 베노라',label:'독',color:'#ce4c96',accent:'#ff9bd4',atk:6,rate:1.1,reach:1.8,kind:'poison',role:'중독 중첩 · 독성 폭발',support:false,price:200,condition:'kills',goal:1000},
 {type:13,id:'metal',name:'강철심판관 페로스',label:'금속',color:'#8398ac',accent:'#e3edf5',atk:9,rate:1.25,reach:1.2,kind:'metal',role:'관통 · 도탄 · 파편',support:false,price:200,condition:'crafts',goal:100},
 {type:14,id:'time',name:'시계술사 크로니아',label:'시간',color:'#30b0a7',accent:'#dfc592',atk:5,rate:1.15,reach:1.8,kind:'time',role:'지연 타격 · 기록 재현',support:false,price:250,condition:'wins',goal:5},
 {type:15,id:'star',name:'성운지기 아스트라',label:'별',color:'#5368b3',accent:'#eee7c6',atk:7,rate:1.3,reach:2.2,kind:'star',role:'낙하 예고 · 중심 집중 피해',support:false,price:250,condition:'bosses',goal:50},
 {type:16,id:'void',name:'공허군주 니힐',label:'공허',color:'#643ac4',accent:'#ddc7ff',atk:6,rate:1.1,reach:1.5,kind:'void',role:'균열 표식 · 표식 소모',support:false,price:300,condition:'uniqueFinals',goal:6}
];
const missions=[
 ['kills','몬스터 사냥',[1000,10000,50000],'gold',[300,1500,5000]],['bosses','보스 토벌',[10,50,200],'diamonds',[20,60,150]],['crafts','진화의 달인',[30,150,500],'tickets',[2,5,10]],['uniqueFinals','최종진화 연구',[3,6,12],'diamonds',[30,80,200]],['wins','끝까지 살아남기',[1,10,50],'diamonds',[30,100,300]],['collection','부적 수집가',[5,10,19],'tickets',[3,5,10]],['level20','육성 전문가',[1,6,12],'gold',[500,2000,5000]],['attendance','꾸준한 모험가',[7,30,100],'diamonds',[20,100,300]],
 ['firekills','불의 숙련자',[5000],'diamonds',[80]],['freezes','물의 숙련자',[2000],'diamonds',[80]],['mudkills','땅의 숙련자',[3000],'diamonds',[80]],['windcasts','바람의 숙련자',[3000],'diamonds',[80]],['shadowbosses','암흑의 숙련자',[100],'diamonds',[80]],['chains','전기의 숙련자',[200],'diamonds',[80]]
].map(([stat,name,goals,currency,rewards])=>({stat,name,goals,currency,rewards}));
const attendance=[{tickets:1,gold:30},{tickets:1,gold:40},{tickets:2,diamonds:10},{tickets:1,gold:50},{tickets:1,gold:70},{tickets:2},{rare:1,gold:100,diamonds:30}];
const names={gold:'금화',diamonds:'다이아',tickets:'부적 소환권',rare:'희귀 부적 확정권'};
const data={specials,missions,attendance,names};if(typeof module!=='undefined')module.exports=data;else root.ForgeAdventureData=data;
})(typeof window!=='undefined'?window:globalThis);
