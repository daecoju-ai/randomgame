(function(root){const weights=[7000,2000,700,290,10],maxStars=20;
function tier(roll){let sum=0;for(let i=0;i<weights.length;i++){sum+=weights[i];if(roll<sum)return i+1}return 5}
const stars=n=>Math.max(0,Math.min(maxStars,Math.floor(Number(n)||0)));
const factor=n=>1+stars(n)*.2;
const growthFactor=(level,n)=>1+.05*(Math.max(1,Math.min(30,Math.floor(Number(level)||1)))-1)+.2*stars(n);
const skillUnlocked=(tier,slot,n)=>slot===0||slot<tier-1||stars(n)>=5;
const api={weights,maxStars,factor,growthFactor,skillUnlocked,tier,cost:50};if(typeof module!=='undefined')module.exports=api;else root.ForgeDrawRules=api;
})(typeof window!=='undefined'?window:globalThis);
