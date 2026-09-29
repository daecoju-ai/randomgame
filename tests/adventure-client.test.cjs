const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function client({pending={},failLoad=false,failClaim=false,race=false,guest=false}={}){
 const elements=new Map(),data=new Map(),calls=[],errors=[],gates=[];let starts=0,claimCount=0;
 const noop=()=>{};
 const element=s=>{if(!elements.has(s))elements.set(s,{textContent:'',innerHTML:'',hidden:true,disabled:false,open:false,getContext:()=>({}),click(){starts++},close(){this.open=false}});return elements.get(s)};
 const state={owner:'test',gold:15,diamonds:24,rare:0,levels:{},skills:{},unlocks:{},stats:{},claimed:{},attendanceCount:0,attendanceToday:false,talismanLevels:{},pendingBattle:pending,notes:[],activeRun:'run-1'};
 const options={failLoad,failClaim,race};
 const w={ForgeAccount:{currentUser:()=>guest?null:{id:'test'},allowed:()=>false},ForgeGame:{applyGrowth:noop,inBattle:()=>false,difficulty:()=> 'easy'},ForgeEconomy:{beforeBattle:async()=>true},ForgeUX:{entryTarget:'#startGame',art:()=>'',celebrate:noop,entryError:m=>errors.push(m),pendingBattle:r=>gates.push({...r})},ForgeTalismans:{catalog:[]}};
 const ctx=vm.createContext({window:w,document:{querySelector:element,querySelectorAll:()=>[]},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},AbortSignal:{timeout:()=>undefined},toast:noop,playSound:noop,body:noop,console,fetch:async(url,req)=>{
  const b=JSON.parse(req.body);calls.push(b.action);
  if(options.failLoad&&b.action==='load')return{ok:false,status:503,json:async()=>({error:'CONNECTION',message:'서버 연결 실패'})};
  if(options.failClaim&&b.action==='claim_battle')return{ok:false,status:503,json:async()=>({error:'CONNECTION',message:'보상 연결 실패'})};
  if(options.race&&b.action==='run_start'){options.race=false;state.pendingBattle={gold:42,diamonds:2};return{ok:true,status:200,json:async()=>({error:'PENDING_REWARD',message:'이전 보상부터 수령'})}};
  if(b.action==='claim_battle'){claimCount++;state.pendingBattle={}};
  return{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(state))};
 }});
 for(const f of ['adventure-data','adventure'])vm.runInContext(fs.readFileSync('public/'+f+'.js','utf8'),ctx);
 return{api:w.ForgeAdventure,element,calls,errors,gates,state,options,data,starts:()=>starts,claims:()=>claimCount};
}
test('pending rewards show an explicit claim gate without requesting a new run',async()=>{const c=client({pending:{gold:42,diamonds:2}});assert.equal(await c.api.begin(),false);assert.deepEqual(c.gates,[{gold:42,diamonds:2}]);assert.equal(c.calls.includes('run_start'),false);assert.equal(c.claims(),0);await c.element('#claimAndStart').onclick();assert.equal(c.claims(),1);assert.equal(c.starts(),1);assert.deepEqual(c.state.pendingBattle,{})});
test('zero-value rewards remain claimable and repeated taps claim once',async()=>{const c=client({pending:{gold:0,diamonds:0,difficulty:'easy'}});await c.api.begin();const first=c.element('#claimAndStart').onclick();await c.element('#claimAndStart').onclick();await first;assert.equal(c.claims(),1);assert.equal(c.starts(),1)});
test('failed claims stay visible and can recover the same pending request',async()=>{const c=client({pending:{gold:42},failClaim:true});await c.api.begin();await c.element('#claimAndStart').onclick();assert.equal(c.starts(),0);assert.equal(c.element('#battleEntryError').hidden,false);assert.match(c.element('#battleEntryError').textContent,/보상 연결 실패/);assert.equal(c.element('#claimAndStart').disabled,false);assert.equal(c.data.size,1);c.options.failClaim=false;await c.element('#claimAndStart').onclick();assert.equal(c.claims(),1);assert.equal(c.starts(),1);assert.equal(c.data.size,0)});
test('server-side pending reward discovered during start opens the reward gate',async()=>{const c=client({race:true});assert.equal(await c.api.begin(),false);assert.deepEqual(c.gates,[{gold:42,diamonds:2}]);assert.equal(c.data.size,0);await c.element('#claimAndStart').onclick();assert.equal(c.claims(),1);assert.equal(await c.api.begin(),true)});
test('connection failure is surfaced and guest entry does not depend on rewards API',async()=>{const c=client({failLoad:true});assert.equal(await c.api.begin(),false);assert.match(c.errors.at(-1),/서버 연결 실패/);c.options.failLoad=false;assert.equal(await c.api.begin(),true);const guest=client({guest:true});assert.equal(await guest.api.begin(),true);assert.equal(guest.calls.length,0)});
