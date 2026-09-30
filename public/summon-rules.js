(function(root){const weights=[7000,2000,700,290,10],maxStars=20;
function tier(roll){let sum=0;for(let i=0;i<weights.length;i++){sum+=weights[i];if(roll<sum)return i+1}return 5}
const factor=n=>1+Math.max(0,Math.min(maxStars,Math.floor(Number(n)||0))-1)*.1;
const api={weights,maxStars,factor,tier,cost:50};if(typeof module!=='undefined')module.exports=api;else root.ForgeDrawRules=api;
})(typeof window!=='undefined'?window:globalThis);
