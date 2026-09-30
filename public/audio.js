(function(){
const AC=window.AudioContext||window.webkitAudioContext;
let actx=null,master=null,musicGain=null,sfxGain=null,musicMuted=false,sfxMuted=false;
try{const legacy=localStorage.getItem('ff_muted');musicMuted=(localStorage.getItem('ff_music_muted')??legacy)==='1';sfxMuted=(localStorage.getItem('ff_sfx_muted')??legacy)==='1'}catch{}
const voices=new Set();
function track(node,connections,isMusic){const v={node,connections,isMusic};voices.add(v);node.onended=()=>{voices.delete(v);for(const n of [node,...connections])try{n.disconnect()}catch{}}}
function stopVoices(kind='all'){for(const v of voices){if(kind==='music'&&!v.isMusic||kind==='sfx'&&v.isMusic)continue;try{v.node.stop()}catch{}for(const n of [v.node,...v.connections])try{n.disconnect()}catch{}voices.delete(v)}}
function rnd(a,b){return a+Math.random()*(b-a)}
function tone(freq,t0,dur,o={}){
 const {type='sine',gain=.3,dest=sfxGain,attack=.006,decay=dur*.8,detune=0,cutoff=0}=o;
 const osc=actx.createOscillator(),g=actx.createGain();
 osc.type=type;osc.frequency.value=freq;osc.detune.value=detune;
 g.gain.setValueAtTime(0,t0);
 g.gain.linearRampToValueAtTime(gain,t0+attack);
 g.gain.exponentialRampToValueAtTime(.0001,t0+attack+decay);
 const filter=cutoff?actx.createBiquadFilter():null;if(filter){filter.type='lowpass';filter.frequency.value=cutoff;osc.connect(filter);filter.connect(g)}else osc.connect(g);g.connect(dest);track(osc,filter?[filter,g]:[g],dest===musicGain);osc.start(t0);osc.stop(t0+attack+decay+.05);
}
function noiseBurst(t0,dur,o={}){
 const {gain=.35,dest=sfxGain,filterFreq=1200,filterType='lowpass'}=o;
 const len=Math.max(1,Math.floor(actx.sampleRate*dur)),buf=actx.createBuffer(1,len,actx.sampleRate),data=buf.getChannelData(0);
 for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
 const src=actx.createBufferSource();src.buffer=buf;
 const f=actx.createBiquadFilter();f.type=filterType;f.frequency.value=filterFreq;
 const g=actx.createGain();g.gain.setValueAtTime(gain,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 src.connect(f);f.connect(g);g.connect(dest);track(src,[f,g],dest===musicGain);src.start(t0);src.stop(t0+dur+.02);
}
const KIND_TONE={bash:[110,'square'],slash:[880,'sawtooth'],arrow:[1400,'triangle'],fire:[300,'sawtooth'],volt:[1800,'square'],ice:[1200,'sine']};
let lastHit=0,lastDeath=0;
const SFX={
 drawCharge(){if(!actx)return;const t=actx.currentTime;for(let i=0;i<8;i++)tone(110*Math.pow(2,i/5),t+i*.09,.5,{type:'triangle',gain:.12});noiseBurst(t,.7,{gain:.08,filterFreq:800})},
 drawReveal(rarity=1){if(!actx)return;const t=actx.currentTime;[130.81,261.63,329.63,392,523.25].forEach(f=>tone(f,t,1.6,{type:'triangle',gain:.12,decay:1.5}));[523,659,784,1046,1318].forEach((f,i)=>tone(f,t+i*.1,.7,{gain:.16}));noiseBurst(t,.6,{gain:.14,filterFreq:2400});if(rarity>=4){tone(65.4,t,2,{gain:.22});for(let i=0;i<8;i++)tone(1046+i*90,t+.5+i*.08,.4,{gain:.08})}},
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
// Original K-pop-inspired instrumental: 122 BPM, four-chord pop harmony,
// syncopated pluck hook, warm bass, kick/snare and offbeat hats. No sampled song.
const BPM=122,EIGHTH=60/BPM/2;
const CHORDS=[[48,52,55],[43,47,50],[45,48,52],[41,45,48]];
const HOOK=[76,null,79,76,null,74,72,74, 71,null,74,79,null,74,71,null, 72,null,76,79,81,null,79,76, 77,null,76,72,null,74,76,null];
let musicTimer=null,step=0,nextMusicTime=0;
const hz=n=>440*Math.pow(2,(n-69)/12);
function kick(t){const osc=actx.createOscillator(),g=actx.createGain();osc.type='sine';osc.frequency.setValueAtTime(145,t);osc.frequency.exponentialRampToValueAtTime(48,t+.13);g.gain.setValueAtTime(.52,t);g.gain.exponentialRampToValueAtTime(.0001,t+.23);osc.connect(g);g.connect(musicGain);track(osc,[g],true);osc.start(t);osc.stop(t+.25)}
function musicStep(index,t){
 const eighth=index%8,bar=Math.floor(index/8)%16,chord=CHORDS[bar%4];
 if(eighth===0||eighth===4||(bar%4===3&&eighth===7))kick(t);
 if(eighth===2||eighth===6){noiseBurst(t,.14,{gain:.19,dest:musicGain,filterFreq:1900,filterType:'highpass'});tone(185,t,.11,{type:'triangle',gain:.1,dest:musicGain})}
 noiseBurst(t,eighth%2?.06:.035,{gain:eighth%2?.045:.025,dest:musicGain,filterFreq:6500,filterType:'highpass'});
 if([0,3,4,6].includes(eighth))tone(hz(chord[0]-12+(eighth===6?12:0)),t,.22,{type:'triangle',gain:.24,dest:musicGain,decay:.2,cutoff:650});
 if(eighth===0||eighth===4)for(const note of chord)tone(hz(note+12),t,.75,{type:'sawtooth',gain:.035,dest:musicGain,attack:.025,decay:.7,cutoff:1800});
 const note=HOOK[index%HOOK.length];if(note!==null){const octave=bar>=8&&bar<12?12:0;tone(hz(note+octave),t,.2,{type:'triangle',gain:.12,dest:musicGain,attack:.008,decay:.19});tone(hz(note+octave),t+.12,.15,{type:'sine',gain:.025,dest:musicGain,decay:.14})}
 if(bar>=4&&eighth%2===1)tone(hz(chord[(eighth>>1)%3]+24),t,.14,{type:'sine',gain:.045,dest:musicGain,decay:.12});
}
function scheduleMusic(){
 if(!actx||musicMuted||document.hidden||actx.state!=='running')return;
 if(nextMusicTime<actx.currentTime-.25)nextMusicTime=actx.currentTime+.03;
 while(nextMusicTime<actx.currentTime+.16){musicStep(step,nextMusicTime);step=(step+1)%128;nextMusicTime+=EIGHTH}
}
function startMusic(){if(musicTimer!==null||musicMuted||document.hidden||!actx||actx.state!=='running')return;nextMusicTime=actx.currentTime+.03;scheduleMusic();musicTimer=setInterval(scheduleMusic,80)}
function stopMusic(){if(musicTimer!==null)clearInterval(musicTimer);musicTimer=null;nextMusicTime=0;step=0;stopVoices('music')}
function ensureCtx(){
 if(actx)return true;if(!AC)return false;
 try{actx=new AC();master=actx.createGain();master.gain.value=.7;master.connect(actx.destination);musicGain=actx.createGain();musicGain.gain.value=musicMuted?0:.32;musicGain.connect(master);sfxGain=actx.createGain();sfxGain.gain.value=sfxMuted?0:.6;sfxGain.connect(master);return true}catch{actx=null;return false}
}
function unlock(){if(document.hidden||!ensureCtx())return;try{if(actx.state==='running')startMusic();else Promise.resolve(actx.resume()).then(startMusic).catch(()=>{})}catch{}}
const settings=document.querySelector('#soundSettingsDialog');
function syncButtons(){
 document.querySelectorAll('[data-sound-toggle]').forEach(b=>{b.textContent='소리 설정';b.setAttribute('aria-label','배경음·효과음 설정');b.disabled=!AC});
 for(const [id,off,label]of [['musicToggle',musicMuted,'배경음'],['sfxToggle',sfxMuted,'효과음']]){const b=document.querySelector('#'+id);if(!b)continue;b.textContent=off?'OFF':'ON';b.setAttribute('aria-label',label+(off?' 켜기':' 끄기'));b.setAttribute('aria-pressed',String(!off));b.disabled=!AC}
}
function setChannel(kind,off){
 off=!!off;if(kind==='music')musicMuted=off;else sfxMuted=off;
 try{localStorage.setItem(kind==='music'?'ff_music_muted':'ff_sfx_muted',off?'1':'0')}catch{}
 const bus=kind==='music'?musicGain:sfxGain;if(bus)bus.gain.setTargetAtTime(off?0:kind==='music'?.32:.6,actx.currentTime,.02);
 if(off){if(kind==='music')stopMusic();else stopVoices('sfx')}else unlock();syncButtons();
}
addEventListener('pointerdown',unlock,{capture:true});
addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')unlock()},{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMusic();stopVoices();if(actx)try{Promise.resolve(actx.suspend()).catch(()=>{})}catch{}}else if(actx)unlock()});
addEventListener('pagehide',()=>{stopMusic();stopVoices();if(actx)try{Promise.resolve(actx.suspend()).catch(()=>{})}catch{}});
addEventListener('pageshow',()=>{if(actx)unlock()});
window.SFX=Object.fromEntries(Object.entries(SFX).map(([name,fn])=>[name,(...args)=>{if(sfxMuted||document.hidden||!actx||actx.state!=='running')return;try{fn(...args)}catch{}}]));
window.ForgeAudio={setMusic:enabled=>setChannel('music',!enabled),setSfx:enabled=>setChannel('sfx',!enabled),state:()=>({music:!musicMuted,sfx:!sfxMuted})};
window.ToggleMute=()=>{const off=!(musicMuted&&sfxMuted);setChannel('music',off);setChannel('sfx',off);return off};window.IsMuted=()=>musicMuted&&sfxMuted;
document.querySelectorAll('[data-sound-toggle]').forEach(b=>b.addEventListener('click',()=>{if(settings&&!settings.open)settings.showModal()}));
document.querySelector('#musicToggle')?.addEventListener('click',()=>setChannel('music',!musicMuted));
document.querySelector('#sfxToggle')?.addEventListener('click',()=>setChannel('sfx',!sfxMuted));
document.querySelector('#closeSoundSettings')?.addEventListener('click',()=>settings.close());syncButtons();
})();
