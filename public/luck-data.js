(function(root){'use strict';const missions=[
 {missionId:'first_step',name:'첫 발걸음',description:'WAVE 1에 주인공을 시작 위치에서 다른 칸으로 실제 이동한다.',reward:100,battleCoin:100},
 {missionId:'swap',name:'자리 바꿔!',description:'WAVE 1에 주인공과 일반 유닛의 위치를 서로 교환한다.',reward:100,battleCoin:100},
 {missionId:'greedy',name:'욕심쟁이',description:'WAVE 2 종료 전에 주인공을 포함해 유닛 10기를 동시에 배치한다.',reward:100,battleCoin:100},
 {missionId:'pressure',name:'아슬아슬',description:'WAVE 3 종료 전에 살아있는 몬스터가 동시에 30기 이상이 된다.',reward:100,battleCoin:100},
 {missionId:'escape',name:'위기탈출',description:'같은 전투에서 몬스터 30기 이상을 만든 뒤 WAVE 3 종료 전에 10기 이하로 줄인다.',reward:100,battleCoin:100},
 {missionId:'collector',name:'정령 수집가',description:'한 전투의 WAVE 1~3에 1단계 정령 6종을 각각 한 번 이상 획득한다.',reward:100,battleCoin:100},
 {missionId:'hunter',name:'행운 사냥꾼',description:'여러 전투에 걸쳐 앞의 숨겨진 행운 6개를 모두 발견한다.',reward:200,battleCoin:200}
];const value={missions,email:'daecoju@gmail.com',eventId:'hidden-luck-first-answer-v34',eventReward:2000};if(typeof module!=='undefined')module.exports=value;else root.ForgeLuckData=value;})(typeof window!=='undefined'?window:globalThis);
