(function(){
const AC=window.AudioContext||window.webkitAudioContext;
let actx=null,master=null,musicGain=null,sfxGain=null,muted=(localStorage.getItem('ff_muted')==='1');
function rnd(a,b){return a+Math.random()*(b-a)}
function tone(freq,t0,dur,o={}){
 const {type='sine',gain=.3,dest=sfxGain,attack=.006,decay=dur*.8,detune=0}=o;
 const osc=actx.createOscillator(),g=actx.createGain();
 osc.type=type;osc.frequency.value=freq;osc.detune.value=detune;
 g.gain.setValueAtTime(0,t0);
 g.gain.linearRampToValueAtTime(gain,t0+attack);
 g.gain.exponentialRampToValueAtTime(.0001,t0+attack+decay);
 osc.connect(g);g.connect(dest);osc.start(t0);osc.stop(t0+attack+decay+.05);
}
function noiseBurst(t0,dur,o={}){
 const {gain=.35,dest=sfxGain,filterFreq=1200}=o;
 const len=Math.max(1,Math.floor(actx.sampleRate*dur)),buf=actx.createBuffer(1,len,actx.sampleRate),data=buf.getChannelData(0);
 for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
 const src=actx.createBufferSource();src.buffer=buf;
 const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=filterFreq;
 const g=actx.createGain();g.gain.setValueAtTime(gain,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 src.connect(f);f.connect(g);g.connect(dest);src.start(t0);src.stop(t0+dur+.02);
}
const KIND_TONE={bash:[110,'square'],slash:[880,'sawtooth'],arrow:[1400,'triangle'],fire:[300,'sawtooth'],volt:[1800,'square'],ice:[1200,'sine']};
let lastHit=0,lastDeath=0;
const SFX={
 summon(){if(!actx)return;const t=actx.currentTime;tone(660,t,.16,{type:'triangle',gain:.32});tone(990,t+.05,.18,{type:'triangle',gain:.24})},
 fuse(){if(!actx)return;const t=actx.currentTime;[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.06,.22,{type:'sine',gain:.26}))},
 hit(kind){if(!actx)return;const t=actx.currentTime;if(t-lastHit<.045)return;lastHit=t;const[f,ty]=KIND_TONE[kind]||[440,'sine'];tone(f,t,.07,{type:ty,gain:.1,decay:.06})},
 death(boss){if(!actx)return;const t=actx.currentTime;if(!boss){if(t-lastDeath<.05)return;lastDeath=t}noiseBurst(t,boss?.5:.2,{gain:boss?.45:.18,filterFreq:boss?2500:1400});if(boss)tone(80,t,.5,{type:'sawtooth',gain:.28,decay:.45})},
 wave(){if(!actx)return;const t=actx.currentTime;[440,554.37,659.25].forEach((f,i)=>tone(f,t+i*.09,.28,{type:'triangle',gain:.28}))},
 levelUp(){if(!actx)return;const t=actx.currentTime;[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>tone(f,t+i*.05,.25,{type:'sine',gain:.26}))},
 ultimate(){if(!actx)return;const t=actx.currentTime;for(let i=0;i<6;i++)tone(440+i*220,t+i*.03,.4,{type:'sine',gain:.18,detune:rnd(-8,8)});noiseBurst(t,.6,{gain:.18,filterFreq:3000})},
 victory(){if(!actx)return;const t=actx.currentTime;[523.25,659.25,783.99,1046.5,1318.5,1567.98].forEach((f,i)=>tone(f,t+i*.12,.4,{type:'triangle',gain:.3}))},
 defeat(){if(!actx)return;const t=actx.currentTime;[440,392,349.23,293.66].forEach((f,i)=>tone(f,t+i*.18,.5,{type:'sawtooth',gain:.24}))},
 coin(){if(!actx)return;const t=actx.currentTime;tone(1200,t,.08,{type:'square',gain:.13,decay:.07});tone(1600,t+.04,.08,{type:'square',gain:.1,decay:.06})}
};
const SCALE=[220,246.94,261.63,293.66,329.63,349.23,392];
let musicTimer=null,step=0;
function scheduleMusic(){
 if(!actx||muted)return;
 const now=actx.currentTime,root=110;
 const o1=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
 o1.type='sine';o1.frequency.value=root;o2.type='sine';o2.frequency.value=root*1.5;
 g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.1,now+1.2);g.gain.linearRampToValueAtTime(0,now+7.8);
 o1.connect(g);o2.connect(g);g.connect(musicGain);o1.start(now);o2.start(now);o1.stop(now+8);o2.stop(now+8);
 for(let i=0;i<8;i++){const f=SCALE[(step+i)%SCALE.length]*(i%4===0?2:1);tone(f,now+i*1.0,.9,{type:'sine',gain:.08,dest:musicGain,attack:.02,decay:.8})}
 step+=3;
}
function startMusic(){if(musicTimer)return;scheduleMusic();musicTimer=setInterval(scheduleMusic,8000)}
function ensureCtx(){
 if(actx)return;
 actx=new AC();
 master=actx.createGain();master.gain.value=muted?0:1;master.connect(actx.destination);
 musicGain=actx.createGain();musicGain.gain.value=.4;musicGain.connect(master);
 sfxGain=actx.createGain();sfxGain.gain.value=.6;sfxGain.connect(master);
 startMusic();
}
function setMuted(v){muted=v;localStorage.setItem('ff_muted',v?'1':'0');if(master)master.gain.setTargetAtTime(muted?0:1,actx.currentTime,.05)}
addEventListener('pointerdown',()=>{ensureCtx();if(actx.state==='suspended')actx.resume()},{once:true});
window.SFX=SFX;
window.ToggleMute=()=>{setMuted(!muted);return muted};
window.IsMuted=()=>muted;
})();
