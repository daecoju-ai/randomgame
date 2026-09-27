// The same compact vector character is used in battle, recipes and growth.
function drawElementHero(g,x,y,u,s=1,mini=false){
 const e=elementFor(u.type);if(!e)return false;const tier=u.lv,support=isSupport(u),bob=mini?0:Math.sin(S.t*2+(u.slot||0))*1.3;
 g.save();g.translate(x,y+bob);g.scale(s,s);
 const ellipse=(x,y,rx,ry,c)=>{g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()};
 const line=(points,c,w=2)=>{g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()};
 const poly=(points,c)=>{g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill()};
 ellipse(0,24,22,5,'#00000050');
 if(tier===5){g.strokeStyle=e.accent+'90';g.lineWidth=1.5;g.beginPath();g.arc(0,-5,37,0,Math.PI*2);g.stroke();for(const a of [-2.5,-.65,1.57])ellipse(Math.cos(a)*37,-5+Math.sin(a)*37,2.5,2.5,e.accent)}
 if(tier<=2){const rx=tier===1?22:23,ry=tier===1?22:32,cy=tier===1?-2:-8;
  if(e.id==='fire')poly([[-21,1],[-25,-19],[-11,-12],[-6,-38],[6,-23],[14,-30],[24,-6],[20,11]],e.accent);
  if(e.id==='water')poly([[-14,-21],[0,-42],[12,-23]],e.accent);
  if(e.id==='earth'){poly([[-6,cy-ry],[0,cy-ry-11],[11,cy-ry-14],[6,cy-ry-3]],'#83c768')}
  if(e.id==='wind'){line([[-27,6],[-31,-5],[-22,-20],[-4,-28],[15,-21]],e.accent,3)}
  if(e.id==='electric'){poly([[-25,-17],[-31,-7],[-25,-6],[-29,8],[-17,-6],[-24,-7]],e.accent);poly([[22,-29],[16,-15],[24,-16],[19,-4],[32,-21],[25,-20]],e.accent)}
  ellipse(0,cy,rx+1,ry+1,e.accent);const grad=g.createLinearGradient(-20,cy-ry,20,cy+ry);grad.addColorStop(0,e.accent);grad.addColorStop(.45,e.color);grad.addColorStop(1,e.id==='shadow'?'#100e19':e.color);ellipse(0,cy,rx,ry,grad);ellipse(-9,cy-ry*.55,5,3,'#ffffff65');
  for(const side of [-1,1]){const ex=side*8,ey=cy+2;ellipse(ex,ey,4.5,6.5,e.id==='shadow'?'#eee4ff':'#1b2131');if(e.id!=='shadow')ellipse(ex-1,ey-2,1.6,2,'#fff');if(tier===2)line([[ex-side*4,ey-8],[ex+side*4,ey-11]],'#252338',2.5)}
 }else{const child=tier===3,headY=child?-12:-24,headR=child?16:13;
  poly([[-11,0],[-20,23],[20,23],[11,0]],e.id==='shadow'?'#171521':e.color);
  if(!support){line([[-7,15],[-9,25]],'#26313e',7);line([[7,15],[9,25]],'#26313e',7)}
  poly([[-13,-1],[13,-1],[10,16],[0,21],[-10,16]],e.color);line([[-11,3],[-20,12]],e.color,7);line([[11,3],[19,9]],e.color,7);
  if(tier>=4){poly([[-11,-2],[-21,-6],[-23,2],[-11,5]],e.accent);poly([[11,-2],[21,-6],[23,2],[11,5]],e.accent);line([[-7,1],[0,10],[7,1]],e.accent,1.5)}
  ellipse(0,headY,headR+1,headR+1,e.color);ellipse(0,headY+2,headR-2,headR-2,'#ffe1c3');
  poly([[-headR,headY+1],[-headR,headY-9],[-5,headY-headR-3],[7,headY-headR],[headR,headY-7],[headR,headY+2],[6,headY-4],[0,headY-8],[-3,headY-1],[-8,headY-5]],e.color);
  for(const side of [-1,1]){ellipse(side*5.5,headY+3,2.5,child?4:3,e.id==='shadow'?e.accent:'#263044');ellipse(side*5.5-.6,headY+2,1,1,'#fff')}
  if(tier===5){if(support){g.strokeStyle=e.accent;g.lineWidth=2;g.beginPath();g.ellipse(0,headY-20,12,3,0,0,Math.PI*2);g.stroke();line([[22,-24],[22,25]],e.accent,3);ellipse(22,-27,6,6,e.accent);ellipse(22,-27,3,3,'#fff')}else{poly([[-11,headY-12],[-14,headY-25],[-5,headY-18],[0,headY-28],[5,headY-18],[14,headY-25],[11,headY-12]],e.accent);line([[19,17],[30,-23]],e.accent,4);poly([[25,-9],[32,-31],[34,-8],[28,-2]],'#eff9ff')}}
  else{line([[20,15],[23,-13]],e.accent,3);ellipse(23,-16,4,4,e.accent)}
 }
 if(!mini){g.fillStyle=e.accent;g.font='bold 9px system-ui';g.textAlign='center';g.fillText(tier===5?(support?'지원':'공격'):'·'.repeat(tier),0,36)}
 g.restore();return true;
}
