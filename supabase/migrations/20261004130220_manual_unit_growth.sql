-- Preserve existing applied stars and levels. New drops are unspent cards.
alter table private.adventure_wallets add column if not exists unit_cards jsonb not null default '{}'::jsonb check (jsonb_typeof(unit_cards)='object');
CREATE OR REPLACE FUNCTION private.adventure(p_action text, p_request uuid DEFAULT NULL::uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();w private.adventure_wallets%rowtype;ev private.adventure_events%rowtype;old jsonb;tw private.talisman_wallets%rowtype;
 today date:=(now() at time zone 'Asia/Seoul')::date;notes jsonb:='[]';data jsonb;reward jsonb;k text;v jsonb;n int;cards int;refund int;lev int;rank int;cost int;t int;tier int;sk int;ky text;mission jsonb;goal int;i int;stat int;cur text;amount int;hero jsonb;
 wave int;elapsed numeric;real_seconds numeric;won boolean;gold_gain int;diamond_gain int;statkeys text[]:=array['kills','bosses','crafts','firekills','freezes','mudkills','windcasts','shadowbosses','chains'];
 mission_defs constant jsonb:='[{"stat":"kills","name":"몬스터 사냥","goals":[1000,10000,50000],"currency":"gold","rewards":[300,1500,5000]},{"stat":"bosses","name":"보스 토벌","goals":[10,50,200],"currency":"diamonds","rewards":[20,60,150]},{"stat":"crafts","name":"진화의 달인","goals":[30,150,500],"currency":"tickets","rewards":[2,5,10]},{"stat":"uniqueFinals","name":"최종진화 연구","goals":[3,6,12],"currency":"diamonds","rewards":[30,80,200]},{"stat":"wins","name":"끝까지 살아남기","goals":[1,10,50],"currency":"diamonds","rewards":[30,100,300]},{"stat":"collection","name":"부적 수집가","goals":[5,10,19],"currency":"tickets","rewards":[3,5,10]},{"stat":"level20","name":"육성 전문가","goals":[1,6,12],"currency":"gold","rewards":[500,2000,5000]},{"stat":"attendance","name":"꾸준한 모험가","goals":[7,30,100],"currency":"diamonds","rewards":[20,100,300]},{"stat":"firekills","name":"불의 숙련자","goals":[5000],"currency":"diamonds","rewards":[80]},{"stat":"freezes","name":"물의 숙련자","goals":[2000],"currency":"diamonds","rewards":[80]},{"stat":"mudkills","name":"땅의 숙련자","goals":[3000],"currency":"diamonds","rewards":[80]},{"stat":"windcasts","name":"바람의 숙련자","goals":[3000],"currency":"diamonds","rewards":[80]},{"stat":"shadowbosses","name":"암흑의 숙련자","goals":[100],"currency":"diamonds","rewards":[80]},{"stat":"chains","name":"전기의 숙련자","goals":[200],"currency":"diamonds","rewards":[80]}]';special_defs constant jsonb:='[{"type":12,"id":"poison","name":"독화여왕 베노라","label":"독","color":"#ce4c96","accent":"#ff9bd4","atk":6,"rate":1.1,"reach":1.8,"kind":"poison","role":"중독 중첩 · 독성 폭발","support":false,"price":200,"condition":"kills","goal":1000,"parts":[10,0,1]},{"type":13,"id":"metal","name":"강철심판관 페로스","label":"금속","color":"#8398ac","accent":"#e3edf5","atk":9,"rate":1.25,"reach":1.2,"kind":"metal","role":"관통 · 도탄 · 파편","support":false,"price":200,"condition":"crafts","goal":100,"parts":[0,0,9]},{"type":14,"id":"time","name":"시계술사 크로니아","label":"시간","color":"#30b0a7","accent":"#dfc592","atk":5,"rate":1.15,"reach":1.8,"kind":"time","role":"지연 타격 · 기록 재현","support":false,"price":250,"condition":"wins","goal":5,"parts":[7,7,10]},{"type":15,"id":"star","name":"성운지기 아스트라","label":"별","color":"#5368b3","accent":"#eee7c6","atk":7,"rate":1.3,"reach":2.2,"kind":"star","role":"낙하 예고 · 중심 집중 피해","support":false,"price":250,"condition":"bosses","goal":50,"parts":[8,10,9]},{"type":16,"id":"void","name":"공허군주 니힐","label":"공허","color":"#643ac4","accent":"#ddc7ff","atk":6,"rate":1.1,"reach":1.5,"kind":"void","role":"균열 표식 · 표식 소모","support":false,"price":300,"condition":"uniqueFinals","goal":6,"parts":[1,1,7]}]';daily_defs constant jsonb:='[{"tickets":1,"gold":30},{"tickets":1,"gold":40},{"tickets":2,"diamonds":10},{"tickets":1,"gold":50},{"tickets":1,"gold":70},{"tickets":2},{"rare":1,"gold":100,"diamonds":30}]';
begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_action is null or p_action not in ('load','attend','level','skill','unlock','run_start','run_end','rare_draw','claim_mission','claim_battle','talisman_level','unit_draw','unit_buy','unit_enhance') then raise exception 'Invalid action';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid payload';end if;
 if p_action<>'load' and p_request is null then raise exception 'Request ID required';end if;
 -- Serialize against legacy saves while creating the one-time import.
 select pp.data into old from public.player_progress pp where pp.user_id=uid for update;
 if old is null then raise exception 'Complete initial account save first';end if;
 insert into private.adventure_wallets(user_id,gold,levels,skills) values(uid,least(10000000,greatest(0,coalesce((old->>'essence')::bigint,0))),coalesce(old->'levels','{}'),coalesce(old->'skills','{}')) on conflict do nothing;
 select * into w from private.adventure_wallets where user_id=uid for update;
 perform public.forge_talisman('load',null,1);
 select * into tw from private.talisman_wallets where user_id=uid for update;
 if p_action<>'load' then
  select * into ev from private.adventure_events e where e.user_id=uid and e.request_id=p_request;
  if found then if ev.action<>p_action or ev.payload<>p_payload then raise exception 'Request ID reused';end if;return ev.result;end if;
 end if;
 if p_action='attend' and w.attendance_date is distinct from today then
  reward:=daily_defs->(w.attendance_count%7);w.attendance_count:=w.attendance_count+1;w.attendance_date:=today;
  w.gold:=w.gold+coalesce((reward->>'gold')::int,0);w.diamonds:=w.diamonds+coalesce((reward->>'diamonds')::int,0);w.rare:=w.rare+coalesce((reward->>'rare')::int,0);
  n:=coalesce((reward->>'tickets')::int,0);if tw.daily_date=today then n:=greatest(0,n-1);end if;
  update private.talisman_wallets set tickets=tickets+n,daily_date=today where user_id=uid;
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','attendance','day',(w.attendance_count-1)%7+1,'gold',coalesce((reward->>'gold')::int,0),'diamonds',coalesce((reward->>'diamonds')::int,0),'tickets',n,'rare',coalesce((reward->>'rare')::int,0)));
 elsif p_action in ('level','skill') then
  t:=(p_payload->>'type')::int;tier:=(p_payload->>'tier')::int;
  if t is null or tier is null or t not between 0 and 16 or tier not between 1 and 5 or (tier<5 and t not in(0,1,7,8,9,10)) or (t>=12 and not coalesce((w.unlocks->>t::text)::boolean,false)) then raise exception 'Locked hero';end if;
  ky:=t||':'||tier;lev:=coalesce((w.levels->>ky)::int,1);
  if p_action='level' then cost:=lev*12;if lev>=30 or w.gold<cost then return jsonb_build_object('error','FUNDS','message','금화가 부족하거나 최대 레벨입니다.');end if;w.gold:=w.gold-cost;w.levels:=jsonb_set(w.levels,array[ky],to_jsonb(lev+1));
  else sk:=(p_payload->>'slot')::int;
   if sk is null or sk not between 0 and 5 or (tier<5 and sk>=tier) then raise exception 'Locked skill';end if;
   if sk=5 and coalesce((w.unit_stars->>ky)::int,0)<20 then return jsonb_build_object('error','OWNED','message','전용 스킬은 ★20에서 개방됩니다.');end if;
   if sk>0 and sk<5 and (sk=tier-1 or sk>=4) and coalesce((w.unit_stars->>ky)::int,0)<5 then return jsonb_build_object('error','OWNED','message','새 스킬은 해당 유닛 ★5에서 개방됩니다.');end if;
   ky:=ky||':'||(case when sk=5 then 'ultimate' else sk::text end);rank:=coalesce((w.skills->>ky)::int,1);cost:=rank*2*tier;
   if rank>=20 or w.diamonds<cost then return jsonb_build_object('error','FUNDS','message','다이아가 부족하거나 최대 스킬 레벨입니다.');end if;
   w.diamonds:=w.diamonds-cost;w.skills:=jsonb_set(w.skills,array[ky],to_jsonb(rank+1));
  end if;
 elsif p_action='unlock' then
  t:=(p_payload->>'type')::int;select x into hero from jsonb_array_elements(special_defs) x where (x->>'type')::int=t;
  if hero is null then raise exception 'Unknown hero';end if;
  if coalesce((w.unlocks->>t::text)::boolean,false) then return jsonb_build_object('error','OWNED','message','이미 영구 해금한 유닛입니다.');end if;
  cost:=(hero->>'price')::int;if w.diamonds<cost then return jsonb_build_object('error','FUNDS','message','다이아가 부족합니다.');end if;
  w.diamonds:=w.diamonds-cost;w.unlocks:=jsonb_set(w.unlocks,array[t::text],'true');
 elsif p_action='unit_enhance' then
  t:=(p_payload->>'type')::int;tier:=(p_payload->>'tier')::int;
  if t is null or tier is null or t not between 0 and 16 or tier not between 1 and 5 or (tier<5 and t not in(0,1,7,8,9,10)) or (t>=12 and not coalesce((w.unlocks->>t::text)::boolean,false)) then raise exception 'Locked hero';end if;
  ky:=t||':'||tier;n:=coalesce((w.unit_stars->>ky)::int,0);cards:=coalesce((w.unit_cards->>ky)::int,0);
  if cards<1 or n>=20 then return jsonb_build_object('error','OWNED','message','강화 카드가 없거나 최대 별입니다.');end if;
  cards:=cards-1;refund:=case when n+1=20 then cards*30 else 0 end;
  if n+1=20 then cards:=0;end if;
  w.unit_stars:=jsonb_set(w.unit_stars,array[ky],to_jsonb(n+1));w.unit_cards:=jsonb_set(w.unit_cards,array[ky],to_jsonb(cards));w.diamonds:=w.diamonds+refund;
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','unit','type',t,'tier',tier,'before',n,'after',n+1,'cards',cards,'refund',refund,'enhanced',true));
 elsif p_action='unit_buy' then
  t:=(p_payload->>'type')::int;tier:=5;
  if t is null or t not between 0 and 16 then raise exception 'Unknown hero';end if;
  ky:=t||':5';n:=coalesce((w.unit_stars->>ky)::int,0);
  if n>=20 then return jsonb_build_object('error','OWNED','message','최대 별 유닛은 구매할 수 없습니다.');end if;
  if w.diamonds<2000 then return jsonb_build_object('error','FUNDS','message','다이아 2,000개가 필요합니다.');end if;
  w.diamonds:=w.diamonds-2000;cards:=coalesce((w.unit_cards->>ky)::int,0)+1;w.unit_cards:=jsonb_set(w.unit_cards,array[ky],to_jsonb(cards));w.unit_stars:=jsonb_set(w.unit_stars,array[ky],to_jsonb(n));
  if t>=12 then w.unlocks:=jsonb_set(w.unlocks,array[t::text],'true');end if;
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','unit','type',t,'tier',5,'before',n,'after',n,'cards',cards,'refund',0,'purchase',true));
 elsif p_action='unit_draw' then
  if w.diamonds<50 then return jsonb_build_object('error','FUNDS','message','다이아 50개가 필요합니다.');end if;
  w.diamonds:=w.diamonds-50;stat:=floor(random()*10000)::int;tier:=case when stat<7000 then 1 when stat<9000 then 2 when stat<9700 then 3 when stat<9950 then 4 else 5 end;
  if tier<5 then t:=(array[0,1,7,8,9,10])[1+floor(random()*6)::int];
  else select id into t from generate_series(0,16) as x(id) where id<12 or coalesce((w.unlocks->>id::text)::boolean,false) order by random() limit 1;end if;
  ky:=t||':'||tier;n:=coalesce((w.unit_stars->>ky)::int,0);
  cards:=coalesce((w.unit_cards->>ky)::int,0);w.unit_stars:=jsonb_set(w.unit_stars,array[ky],to_jsonb(n));if n>=20 then w.diamonds:=w.diamonds+30;else cards:=cards+1;w.unit_cards:=jsonb_set(w.unit_cards,array[ky],to_jsonb(cards));end if;
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','unit','type',t,'tier',tier,'before',n,'after',n,'cards',cards,'refund',case when n>=20 then 30 else 0 end));
 elsif p_action='talisman_level' then
  ky:=p_payload->>'id';select grade into n from private.talisman_catalog where id=ky;
  if n is null or coalesce((tw.owned->>ky)::int,0)<1 then raise exception 'Unowned talisman';end if;
  lev:=coalesce((w.talisman_levels->>ky)::int,1);cost:=(n+1)*5*lev;
  if lev>=20 or w.diamonds<cost then return jsonb_build_object('error','FUNDS','message','다이아가 부족하거나 최대 레벨입니다.');end if;
  w.diamonds:=w.diamonds-cost;w.talisman_levels:=jsonb_set(w.talisman_levels,array[ky],to_jsonb(lev+1));
 elsif p_action='claim_battle' then
  if w.pending_battle='{}'::jsonb then return jsonb_build_object('error','OWNED','message','수령할 전투 보상이 없습니다.');end if;
  w.gold:=w.gold+(w.pending_battle->>'gold')::int;w.diamonds:=w.diamonds+(w.pending_battle->>'diamonds')::int;
  notes:=notes||jsonb_build_array(w.pending_battle||'{"kind":"battle"}'::jsonb);w.pending_battle:='{}';
 elsif p_action='run_start' then
  if w.pending_battle<>'{}'::jsonb then return jsonb_build_object('error','PENDING_REWARD','message','이전 전투 보상을 먼저 받아 주세요.');end if;
  w.run_mode:=coalesce(p_payload->>'difficulty','normal');if w.run_mode not in ('easy','normal') then raise exception 'Invalid difficulty';end if;
  w.active_run:=p_request;w.run_started:=now();
 elsif p_action='run_end' then
  if w.active_run is null or w.active_run::text is distinct from p_payload->>'run' then raise exception 'Unknown battle';end if;
  wave:=(p_payload->>'wave')::int;elapsed:=(p_payload->>'elapsed')::numeric;won:=coalesce((p_payload->>'won')::boolean,false);real_seconds:=extract(epoch from now()-w.run_started);
  if wave is null or elapsed is null or wave not between 1 and 30 or elapsed<10 or elapsed>real_seconds+2 or real_seconds>86400 or wave>1+floor(elapsed/20) or (won and (wave<>30 or elapsed<580)) then raise exception 'Invalid battle duration';end if;
  if jsonb_typeof(p_payload->'stats') is distinct from 'object' then raise exception 'Invalid statistics';end if;
  foreach k in array statkeys loop n:=coalesce((p_payload->'stats'->>k)::int,0);if n<0 or n>(case when k='bosses' or k='shadowbosses' then wave/5 when k in('kills','firekills','freezes','mudkills') then wave*30 else least(30000,elapsed*20)::int end) then raise exception 'Invalid statistic';end if;w.stats:=jsonb_set(w.stats,array[k],to_jsonb(least(100000000,coalesce((w.stats->>k)::int,0)+n)));end loop;
  if coalesce((p_payload->'stats'->>'firekills')::int,0)>coalesce((p_payload->'stats'->>'kills')::int,0) or coalesce((p_payload->'stats'->>'mudkills')::int,0)>coalesce((p_payload->'stats'->>'kills')::int,0) or coalesce((p_payload->'stats'->>'shadowbosses')::int,0)>coalesce((p_payload->'stats'->>'bosses')::int,0) then raise exception 'Inconsistent statistics';end if;
  if won then w.stats:=jsonb_set(w.stats,'{wins}',to_jsonb(coalesce((w.stats->>'wins')::int,0)+1));end if;
  if jsonb_typeof(p_payload->'finals') is distinct from 'array' or jsonb_array_length(p_payload->'finals')>17 then raise exception 'Invalid finals';end if;
  for v in select * from jsonb_array_elements(p_payload->'finals') loop t:=(v::text)::int;if t not between 0 and 16 or (t>=12 and not coalesce((w.unlocks->>t::text)::boolean,false)) then raise exception 'Locked final';end if;w.finals:=jsonb_set(w.finals,array[t::text],'true');end loop;
  if jsonb_array_length(p_payload->'finals')>coalesce((p_payload->'stats'->>'crafts')::int,0) then raise exception 'Invalid crafted finals';end if;
  gold_gain:=floor(wave*1.5)+(wave-1)*3+case when won then 30 else 0 end;
  n:=coalesce((tw.owned->>'training')::int,0);gold_gain:=gold_gain+floor(gold_gain*least(.20,(case when n>=1 then .025*(1+(least(20,n)-1)*.1) else 0 end)*(1+(coalesce((w.talisman_levels->>'training')::int,1)-1)*.05)));
  if w.run_mode='easy' then gold_gain:=floor(gold_gain*.7);end if;
  diamond_gain:=coalesce((p_payload->'stats'->>'bosses')::int,0)*case when w.run_mode='easy' then 1 else 2 end;
  w.pending_battle:=jsonb_build_object('gold',gold_gain,'diamonds',diamond_gain,'difficulty',w.run_mode);
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','battle_pending','gold',gold_gain,'diamonds',diamond_gain));w.active_run:=null;w.run_started:=null;
 elsif p_action='rare_draw' then
  if w.rare<1 then return jsonb_build_object('error','FUNDS','message','희귀 확정권이 없습니다.');end if;w.rare:=w.rare-1;
  select id into ky from private.talisman_catalog where grade=1 order by random() limit 1;n:=coalesce((tw.owned->>ky)::int,0);
  update private.talisman_wallets set owned=case when n<20 then jsonb_set(owned,array[ky],to_jsonb(n+1)) else owned end,dust=dust+case when n>=20 then 3 else 0 end where user_id=uid;
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','rare','id',ky,'dust',case when n>=20 then 3 else 0 end));
 end if;
 w.stats:=jsonb_set(w.stats,'{attendance}',to_jsonb(w.attendance_count));
 select count(*) into n from jsonb_each(w.finals);w.stats:=jsonb_set(w.stats,'{uniqueFinals}',to_jsonb(n));
 select count(*) into n from jsonb_each(w.levels) where value::text::int>=20;w.stats:=jsonb_set(w.stats,'{level20}',to_jsonb(n));
 select count(*) into n from private.talisman_wallets a,jsonb_each(a.owned) where a.user_id=uid;w.stats:=jsonb_set(w.stats,'{collection}',to_jsonb(n));
 for mission in select * from jsonb_array_elements(mission_defs) loop
  stat:=coalesce((w.stats->>(mission->>'stat'))::int,0);
  for i in 0..jsonb_array_length(mission->'goals')-1 loop goal:=(mission->'goals'->>i)::int;ky:=(mission->>'stat')||':'||i;
   if p_action='claim_mission' and p_payload->>'key'=ky and stat>=goal and not coalesce((w.claimed->>ky)::boolean,false) then
    cur:=mission->>'currency';amount:=(mission->'rewards'->>i)::int;
    if cur='gold' then w.gold:=w.gold+amount;elsif cur='diamonds' then w.diamonds:=w.diamonds+amount;else update private.talisman_wallets set tickets=tickets+amount where user_id=uid;end if;
    w.claimed:=jsonb_set(w.claimed,array[ky],'true');notes:=notes||jsonb_build_array(jsonb_build_object('kind','mission','name',mission->>'name','goal',goal,'currency',cur,'amount',amount));
   end if;
  end loop;
 end loop;
 if p_action='claim_mission' and jsonb_array_length(notes)=0 then return jsonb_build_object('error','MISSION','message','아직 달성하지 않았거나 이미 수령한 미션입니다.');end if;
 update private.adventure_wallets set unit_cards=w.unit_cards,unit_stars=w.unit_stars,talisman_levels=w.talisman_levels,run_mode=w.run_mode,pending_battle=w.pending_battle,gold=w.gold,diamonds=w.diamonds,rare=w.rare,levels=w.levels,skills=w.skills,unlocks=w.unlocks,stats=w.stats,claimed=w.claimed,finals=w.finals,attendance_count=w.attendance_count,attendance_date=w.attendance_date,active_run=w.active_run,run_started=w.run_started,updated_at=now() where user_id=uid;
 data:=jsonb_build_object('owner',uid,'unitCards',w.unit_cards,'unitStars',w.unit_stars,'talismanLevels',w.talisman_levels,'pendingBattle',w.pending_battle,'runMode',w.run_mode,'gold',w.gold,'diamonds',w.diamonds,'rare',w.rare,'levels',w.levels,'skills',w.skills,'unlocks',w.unlocks,'stats',w.stats,'claimed',w.claimed,'attendanceCount',w.attendance_count,'attendanceToday',w.attendance_date=today,'activeRun',w.active_run,'notes',notes);
 if p_action<>'load' then insert into private.adventure_events(user_id,request_id,action,payload,result) values(uid,p_request,p_action,p_payload,data);end if;return data;
end $function$;

CREATE OR REPLACE FUNCTION private.event_unit(typ integer, tier integer, g jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare bases int[]:=array[8,10,0,7,9,1];supports int[]:=array[11,3,2,4,5,6];e int;k text:=typ||':'||tier;l int;r int;st int;atk numeric;rate numeric;reach numeric;
begin e:=case when typ>=12 then typ-6 else coalesce(array_position(bases,typ),array_position(supports,typ))-1 end;
l:=coalesce((g->'levels'->>k)::int,1);r:=coalesce((g->'skills'->>(k||':1'))::int,1);st:=case when coalesce((g->>'balance')::int,0)>=60 then greatest(0,coalesce((g->'unitStars'->>k)::int,0)) else greatest(1,coalesce((g->'unitStars'->>k)::int,1)) end;
atk:=(array[7,6,8,5,6,10,6,9,5,7,6])[e+1];rate:=(array[.95,1,1.2,.65,.85,1.1,1.1,1.25,1.15,1.3,1.1])[e+1];reach:=(array[1.8,2,1,1.5,1.8,1,1.8,1.2,1.8,2.2,1.5])[e+1]*18;
return jsonb_build_object('type',typ,'tier',tier,'e',e,'support',typ=any(supports),'level',l,'rank',r,'star',st,'dps',floor(atk*power(2.6,tier-1)*1.5/rate*(case when coalesce((g->>'balance')::int,0)>=60 then 1+.05*(l-1)+.2*st else (1+.05*(l-1))*(1+.1*(st-1)) end)*(1+(case when coalesce((g->>'balance')::int,0)>=60 then .10 else .12 end)*(r-1))*(1+.15*(tier-1))),'reach',reach,'control',1+(case when coalesce((g->>'balance')::int,0)>=60 then .10 else .12 end)*(r-1));end $function$;

CREATE OR REPLACE FUNCTION private.luck(p_action text, p_request uuid DEFAULT NULL::uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();w private.adventure_wallets%rowtype;r private.luck_runs%rowtype;prior private.luck_requests%rowtype;
 st jsonb;ev jsonb;u jsonb;other jsonb;item jsonb;seen jsonb;inventory jsonb;monsters jsonb;newly jsonb:='[]';claimed jsonb:='[]';result jsonb;growth jsonb;missions jsonb;mail jsonb;
 run uuid;kind text;id text;oid text;candidate text;wave int;seq int;at numeric;real_time numeric;slot int;oldslot int;tier int;typ int;cnt int;live int;cost int;budget numeric;spawns int;summons int;refund int;bonus int;has_pressure boolean;amount bigint;k text;v jsonb;mc private.reward_mail%rowtype;total_reward jsonb:='{}';initial int;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_action is null or p_action not in('load','events','mail_claim','mail_all') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid request';end if;
 if p_action<>'load' and p_request is null then raise exception 'Request ID required';end if;
 growth:=private.adventure('load',null,'{}'); -- Same lock order as all existing wallet operations.
 select * into w from private.adventure_wallets where user_id=uid for update;
 if p_action<>'load' then
  select * into prior from private.luck_requests where user_id=uid and request_id=p_request;
  if found then if prior.action<>p_action or prior.payload<>p_payload then raise exception 'Request ID reused';end if;return prior.result;end if;
 end if;
 if p_action='events' then
  run:=(p_payload->>'run')::uuid;
  if run is null or w.active_run is distinct from run then raise exception 'Unknown active battle';end if;
  if jsonb_typeof(p_payload->'events') is distinct from 'array' or jsonb_array_length(p_payload->'events') not between 1 and 48 then raise exception 'Invalid event batch';end if;
  insert into private.luck_runs(user_id,run_id,started_at) values(uid,run,w.run_started) on conflict do nothing;
  select * into r from private.luck_runs where user_id=uid and run_id=run for update;st:=r.state;real_time:=extract(epoch from now()-r.started_at);
  for ev in select * from jsonb_array_elements(p_payload->'events') loop
   kind:=ev->>'kind';seq:=(ev->>'seq')::int;wave:=(ev->>'wave')::int;at:=(ev->>'at')::numeric;
   if seq is null or seq<>coalesce((st->>'seq')::int,0)+1 or at is null or at<coalesce((st->>'at')::numeric,0) or at>real_time+3 or at>61 or wave is null or wave not between 1 and 3 or wave>1+floor(at/20) or coalesce((st->>'closed')::boolean,false) then raise exception 'Invalid event order/time';end if;
   inventory:=coalesce(st->'units','{}');seen:=coalesce(st->'seen','{}');monsters:=coalesce(st->'monsters','{}');budget:=coalesce((st->>'coin')::numeric,0);summons:=coalesce((st->>'summons')::int,0);
   if kind='battleInit' then
    if seq<>1 or wave<>1 or at<>0 or jsonb_typeof(ev->'units') is distinct from 'array' or jsonb_array_length(ev->'units') not between 4 and 5 then raise exception 'Invalid initial field';end if;
    initial:=(ev->>'guardianSlot')::int;if initial is null or initial not between 0 and 31 then raise exception 'Invalid guardian';end if;
    st:=jsonb_build_object('initial',initial,'guardian',initial,'spawned',0,'wave',1,'pressure',false,'closed',false);
    for item in select * from jsonb_array_elements(ev->'units') loop
     id:=item->>'id';typ:=(item->>'type')::int;tier:=(item->>'tier')::int;slot:=(item->>'slot')::int;
     if id is null or id !~ '^u[0-9]{1,5}$' or inventory?id or typ is null or tier is null or slot is null or slot not between 0 and 31 or slot=initial or exists(select 1 from jsonb_each(inventory) x where (x.value->>'slot')::int=slot) or typ not between 0 and 16 or tier not between 1 and 5 or (tier<5 and typ not in(0,1,7,8,9,10)) then raise exception 'Invalid initial unit';end if;
     if (item->>'owned')::boolean is true then
      if not w.unit_stars ? (typ||':'||tier) then raise exception 'Unowned loadout';end if;
     elsif typ>=12 then raise exception 'Invalid free starter';end if;
     inventory:=jsonb_set(inventory,array[id],item||jsonb_build_object('invested',case when (item->>'owned')::boolean is true then 0 else 10 end));if tier=1 then seen:=jsonb_set(seen,array[typ::text],'true');end if;
    end loop;
    -- Existing startCoin talismans are capped at 30; never accept arbitrary client balances.
    budget:=case when w.run_mode='easy' then 120 else 80 end;
    select coalesce((owned->>'pioneer')::int,0) into cnt from private.talisman_wallets where user_id=uid;
    if cnt>0 then budget:=budget+floor(least(30,5*(1+(least(20,cnt)-1)*.1)*(1+(coalesce((w.talisman_levels->>'pioneer')::int,1)-1)*.05)));end if;
    if jsonb_array_length(ev->'units')-(select count(*) from jsonb_array_elements(ev->'units') x where coalesce((x->>'owned')::boolean,false))<>4 then raise exception 'Four starters required';end if;
   elsif seq=1 then raise exception 'Initial event required';
   elsif kind='waveStart' then
    if wave<>(st->>'wave')::int+1 or at<(wave-1)*20 then raise exception 'Invalid wave';end if;
    st:=jsonb_set(st,'{wave}',to_jsonb(wave));st:=jsonb_set(st,'{spawned}','0');budget:=budget+case when w.run_mode='easy' then 12 else 8 end;
   elsif kind='waveEnd' then
    if wave<>(st->>'wave')::int or at<wave*20 then raise exception 'Invalid wave end';end if;
    if wave=3 then st:=jsonb_set(st,'{closed}','true');end if;
   elsif wave<>(st->>'wave')::int then raise exception 'Wave not started';
   elsif kind='unitSummoned' then
    id:=ev->>'id';typ:=(ev->>'type')::int;tier:=(ev->>'tier')::int;slot:=(ev->>'slot')::int;cost:=least(40,10+(summons/4)*2);
    if id is null or id !~ '^u[0-9]{1,5}$' or inventory?id or typ is null or typ not between 0 and 11 or tier is null or tier not between 1 and 5 or (tier<5 and typ not in(0,1,7,8,9,10)) or slot is null or slot not between 0 and 31 or slot=(st->>'guardian')::int or exists(select 1 from jsonb_each(inventory) x where (x.value->>'slot')::int=slot) or budget<cost then raise exception 'Invalid summon/funds';end if;
    inventory:=jsonb_set(inventory,array[id],jsonb_build_object('slot',slot,'type',typ,'tier',tier,'invested',cost));budget:=budget-cost;summons:=summons+1;if tier=1 then seen:=jsonb_set(seen,array[typ::text],'true');end if;
   elsif kind='unitRemoved' then
    id:=ev->>'id';u:=inventory->id;refund:=coalesce((ev->>'refund')::int,0);
    if u is null or refund<0 or refund>floor((u->>'invested')::numeric*.7) then raise exception 'Invalid removal';end if;st:=jsonb_set(st,'{removed}',case when refund>0 then '[]'::jsonb else coalesce(st->'removed','[]'::jsonb)||jsonb_build_array(u) end);inventory:=inventory-id;budget:=budget+refund;
   elsif kind='unitTransformed' then
    id:=ev->>'id';u:=inventory->id;tier:=(ev->>'tier')::int;typ:=(ev->>'type')::int;
    if u is null or tier is null or typ is null or tier<>(u->>'tier')::int+1 or typ not between 0 and 16 or (tier<5 and typ not in(0,1,7,8,9,10)) or (typ>=12 and not coalesce((w.unlocks->>typ::text)::boolean,false)) then raise exception 'Invalid transform';end if;
    if jsonb_array_length(coalesce(st->'removed','[]'::jsonb))<2 then raise exception 'Two materials required';end if;
    select sum((x.value->>'invested')::int) into cost from jsonb_array_elements(st->'removed') with ordinality x(value,n) where x.n>jsonb_array_length(st->'removed')-2;
    if exists(select 1 from jsonb_array_elements(st->'removed') with ordinality x(value,n) where x.n>jsonb_array_length(st->'removed')-2 and ((x.value->>'tier')::int<>tier-1 or (tier<5 and (x.value->>'type')::int<>(u->>'type')::int))) or (tier<5 and typ<>(u->>'type')::int) then raise exception 'Invalid materials';end if;
    inventory:=jsonb_set(inventory,array[id],u||jsonb_build_object('type',typ,'tier',tier,'invested',(u->>'invested')::int+cost));st:=jsonb_set(st,'{removed}','[]'::jsonb);
   elsif kind in('unitMoved','unitSwapped') then
    id:=ev->>'id';oid:=ev->>'other';slot:=(ev->>'to')::int;oldslot:=(ev->>'from')::int;
    if id='guardian' then oldslot:=coalesce(oldslot,-1);u:=jsonb_build_object('slot',(st->>'guardian')::int);else u:=inventory->id;end if;
    if u is null or slot is null or oldslot is null or slot not between 0 and 31 or (u->>'slot')::int<>oldslot or slot=oldslot then raise exception 'Invalid move';end if;
    if kind='unitSwapped' then
     if oid='guardian' then other:=jsonb_build_object('slot',(st->>'guardian')::int);else other:=inventory->oid;end if;
     if oid=id or other is null or (other->>'slot')::int<>slot then raise exception 'Invalid swap';end if;
     if oid='guardian' then st:=jsonb_set(st,'{guardian}',to_jsonb(oldslot));else inventory:=jsonb_set(inventory,array[oid,'slot'],to_jsonb(oldslot));end if;
    elsif slot=(st->>'guardian')::int or exists(select 1 from jsonb_each(inventory) x where (x.value->>'slot')::int=slot) then raise exception 'Occupied slot';end if;
    if id='guardian' then st:=jsonb_set(st,'{guardian}',to_jsonb(slot));else inventory:=jsonb_set(inventory,array[id,'slot'],to_jsonb(slot));end if;
   elsif kind='monsterSpawned' then
    id:=ev->>'id';spawns:=coalesce((st->>'spawned')::int,0)+1;
    if id is null or id !~ '^m[0-9]{1,5}$' or monsters?id or spawns>30 or spawns>1+floor((at-(wave-1)*20+.1)/(20.0/30)) then raise exception 'Invalid spawn';end if;
    monsters:=jsonb_set(monsters,array[id],'true');st:=jsonb_set(st,'{spawned}',to_jsonb(spawns));
   elsif kind='monsterKilled' then
    id:=ev->>'id';if coalesce((monsters->>id)::boolean,false) is not true then raise exception 'Invalid kill';end if;monsters:=jsonb_set(monsters,array[id],'false');budget:=budget+2;
    -- A killCoin talisman can add one battle coin, never user-selected currency.
    if coalesce((ev->>'extra')::boolean,false) then
     if not exists(select 1 from private.talisman_wallets x where x.user_id=uid and coalesce((x.owned->>'fortune')::int,0)>0) then raise exception 'Unowned kill bonus';end if;budget:=budget+1;
    end if;
   elsif kind='battleSpend' then
    id:=ev->>'id';u:=inventory->id;k:=(u->>'type')||':'||(u->>'tier');cnt:=coalesce((st->'upgrades'->>k)::int,0);
    if u is null or cnt>=10 or budget<(cnt+1)*10 then raise exception 'Invalid upgrade';end if;budget:=budget-(cnt+1)*10;st:=jsonb_set(st,'{upgrades}',coalesce(st->'upgrades','{}'::jsonb)||jsonb_build_object(k,cnt+1));
   else raise exception 'Unknown event';end if;
   select count(*) into live from jsonb_each(monsters) x where x.value='true'::jsonb;
   has_pressure:=coalesce((st->>'pressure')::boolean,false);if live>=30 then has_pressure:=true;end if;
   for candidate in select mission_id from private.luck_catalog where ordinal<7 order by ordinal loop
    if (candidate='first_step' and wave=1 and kind in('unitMoved','unitSwapped') and ((id='guardian' and oldslot=(st->>'initial')::int) or (oid='guardian' and slot=(st->>'initial')::int)))
     or (candidate='swap' and wave=1 and kind='unitSwapped' and (id='guardian' or oid='guardian'))
     or (candidate='greedy' and wave<=2 and (select count(*) from jsonb_each(inventory))+1>=10)
     or (candidate='pressure' and live>=30)
     or (candidate='escape' and has_pressure and live<=10 and kind='monsterKilled')
     or (candidate='collector' and (select count(*) from jsonb_each(seen))=6) then
     perform private.discover_luck(uid,candidate,run);
     if not coalesce(st->'earned','{}'::jsonb) ? candidate then
      st:=jsonb_set(st,'{earned}',coalesce(st->'earned','{}'::jsonb)||jsonb_build_object(candidate,true));
      select battle_coin into bonus from private.luck_catalog where mission_id=candidate;budget:=budget+bonus;newly:=newly||jsonb_build_array(jsonb_build_object('missionId',candidate,'battleCoin',bonus));
     end if;
    end if;
   end loop;
   if (select count(*) from private.luck_discoveries where user_id=uid and mission_id<>'hunter')=6 then perform private.discover_luck(uid,'hunter',run);end if;
   if (select count(*) from jsonb_each(coalesce(st->'earned','{}'::jsonb)) where key<>'hunter')=6 and not coalesce(st->'earned','{}'::jsonb) ? 'hunter' then st:=jsonb_set(st,'{earned}',coalesce(st->'earned','{}'::jsonb)||jsonb_build_object('hunter',true));select battle_coin into bonus from private.luck_catalog where mission_id='hunter';budget:=budget+bonus;newly:=newly||jsonb_build_array(jsonb_build_object('missionId','hunter','battleCoin',bonus));end if;
   st:=st||jsonb_build_object('seq',seq,'at',at,'units',inventory,'seen',seen,'monsters',monsters,'coin',budget,'summons',summons,'pressure',has_pressure);
  end loop;
  update private.luck_runs set state=st where user_id=uid and run_id=run;
 elsif p_action in('mail_claim','mail_all') then
  for mc in select rm.* from private.reward_mail rm where rm.user_id=uid and rm.claimed_at is null and (rm.expires_at is null or rm.expires_at>now()) and (p_action='mail_all' or rm.id=(p_payload->>'id')::uuid) order by rm.created_at,rm.id for update loop
   update private.reward_mail rm set claimed_at=now() where rm.id=mc.id and rm.claimed_at is null;
   for k,v in select * from jsonb_each(mc.reward) loop
    amount:=v::text::bigint;
    if k='diamonds' then w.diamonds:=w.diamonds+amount;elsif k='gold' then w.gold:=w.gold+amount;elsif k='rare' then w.rare:=w.rare+amount;elsif k='tickets' then update private.talisman_wallets set tickets=tickets+amount where user_id=uid;end if;
    total_reward:=jsonb_set(total_reward,array[k],to_jsonb(coalesce((total_reward->>k)::bigint,0)+amount));
   end loop;claimed:=claimed||jsonb_build_array(mc.id);
  end loop;
  update private.adventure_wallets set gold=w.gold,diamonds=w.diamonds,rare=w.rare,updated_at=now() where user_id=uid;
 end if;
 growth:=private.adventure('load',null,'{}');
 select jsonb_agg(jsonb_build_object('missionId',c.mission_id,'name',case when d.user_id is not null then c.name else '???' end,'description',case when d.user_id is not null then c.description else null end,'reward',c.reward,'discovered',d.user_id is not null,'discoveredAt',d.discovered_at) order by c.ordinal) into missions from private.luck_catalog c left join private.luck_discoveries d on d.mission_id=c.mission_id and d.user_id=uid;
 select coalesce(jsonb_agg(to_jsonb(x)-'user_id'-'source_key'),'[]') into mail from (select * from private.reward_mail where user_id=uid order by (claimed_at is null) desc,created_at desc limit 100) x;
 select count(*) into cnt from private.reward_mail where user_id=uid and claimed_at is null and (expires_at is null or expires_at>now());
 result:=jsonb_build_object('owner',uid,'missions',missions,'mail',mail,'unclaimed',cnt,'newly',newly,'claimed',claimed,'claimedReward',total_reward,'growth',growth);
 if p_action<>'load' then insert into private.luck_requests values(uid,p_request,p_action,p_payload,result);end if;return result;
end $function$;

CREATE OR REPLACE FUNCTION private.events(p_action text, p_request uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
<<evt>>
declare uid uuid:=auth.uid();today date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;p private.event_profiles%rowtype;w private.adventure_wallets%rowtype;run private.event_runs%rowtype;ev private.event_requests%rowtype;g jsonb;data jsonb;conf jsonb;roster jsonb:='[]';result jsonb;reward jsonb:='{}';boost jsonb:='{}';k text;typ int;n int;amount int;gold int:=0;dia int:=0;ticket int:=0;coins int:=0;first_bonus int:=0;record_bonus int:=0;first_mine int:=0;camp private.event_campaign%rowtype;
begin
if uid is null then raise exception 'Authentication required';end if;
if p_action not in('load','start','finish','box','ad_start','ad_claim','bank') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>14000 or (p_action<>'load' and p_request is null) then raise exception 'Invalid event request';end if;
g:=public.forge_adventure('load',null,'{}');select * into w from private.adventure_wallets where user_id=uid for update;
insert into private.event_profiles(user_id,day) values(uid,today) on conflict do nothing;select * into p from private.event_profiles where user_id=uid for update;
if p_action<>'load' then select * into ev from private.event_requests where user_id=uid and id=p_request;if found then if ev.action<>p_action or ev.payload<>p_payload then raise exception 'Request reused';end if;return ev.result;end if;end if;
if p.day is distinct from today then p.day:=today;p.used:='{}';p.completed:='{}';p.box_claimed:=false;p.extra_used:=false;p.extra_credit:=0;p.active_run:=null;p.ad_id:=null;end if;
if p.active_run is not null then select * into run from private.event_runs where user_id=uid and id=p.active_run;if run.started<clock_timestamp()-interval '2 hours' then p.active_run:=null;end if;end if;
if p_action='start' then
 k:=p_payload->>'kind';if k not in('slime','mine','luck') then raise exception 'Invalid event kind';end if;
 if p.active_run is null then
 n:=coalesce((p.used->>k)::int,0);if n>=1 then if p.extra_credit<1 then return jsonb_build_object('error','USED','message','오늘 기본 입장을 사용했습니다. 추가 입장은 하루 한 번 가능합니다.');end if;p.extra_credit:=p.extra_credit-1;end if;
 -- Accepted lobby entry supersedes an interrupted main battle; preserve pending rewards.
 -- Main battle results stay available for delayed settlement.
 foreach typ in array array[8,10,0,7,9,1] loop roster:=roster||jsonb_build_array(private.event_unit(typ,5,g));end loop;

 conf:=jsonb_build_object('kind',k,'seed',floor(random()*1000000)::int+1,'growth',jsonb_build_object('balance',60,'levels',w.levels,'skills',w.skills,'unitStars',w.unit_stars),'roster',roster,'legends',48,'controls',49)||case when k='slime' then '{"formation":47}'::jsonb else '{}'::jsonb end;
 insert into private.event_runs(user_id,id,day,kind,config) values(uid,p_request,today,k,conf);p.active_run:=p_request;p.used:=jsonb_set(p.used,array[k],to_jsonb(n+1));end if;
elsif p_action='finish' then
 select * into run from private.event_runs where user_id=uid and id=(p_payload->>'run')::uuid for update;
 if not found then raise exception 'Unknown event run';end if;
 if run.result is not null then result:=run.result;
 else
 if run.day<>today or p.active_run is distinct from run.id or extract(epoch from clock_timestamp()-run.started)<(case when run.kind='luck' then 90 else 60 end) or run.started<clock_timestamp()-interval '2 hours' then raise exception 'Invalid event duration';end if;
 result:=private.event_simulate(run.config,p_payload->'actions');
 if run.kind='slime' then gold:=least(1600,(result->>'gold')::int+case result->>'grade' when 'S' then 350 when 'A' then 200 when 'B' then 100 else 50 end);
 if (result->>'king')::boolean then select * into camp from private.event_campaign where id='golden_king_first' for update;if camp.won_at is null then update private.event_campaign set winner=uid,won_at=clock_timestamp(),run_id=run.id where id='golden_king_first';first_bonus:=2000;end if;end if;
 elsif run.kind='mine' then n:=(result->>'stage')::int;dia:=2+least(4,n/2);if not p.mine_first then first_mine:=5;p.mine_first:=true;end if;if n>p.mine_best then record_bonus:=(n-p.mine_best)*2;p.mine_best:=n;end if;
 else ticket:=1;coins:=20+least(60,(result->>'kills')::int*2);n:=floor(random()*4);if n=0 then gold:=80;elsif n=1 then dia:=3;elsif n=2 then ticket:=ticket+1;else coins:=coins+20;end if;
 end if;
 boost:=jsonb_build_object('gold',gold,'diamonds',dia,'tickets',ticket,'battle',coins);reward:=boost||jsonb_build_object('diamonds',dia+first_bonus+first_mine+record_bonus);
 result:=result||jsonb_build_object('kind',run.kind,'run',run.id,'reward',reward,'baseReward',boost,'firstWinner',first_bonus=2000,'firstBonus',first_bonus,'firstMine',first_mine,'recordBonus',record_bonus);
 update private.event_runs set result=evt.result where user_id=uid and id=run.id;
 p.completed:=jsonb_set(p.completed,array[run.kind],'true');p.active_run:=null;
 end if;
elsif p_action='box' then
 if p.box_claimed or not (p.completed @> '{"slime":true,"mine":true,"luck":true}') then return jsonb_build_object('error','BOX','message','세 미니게임을 모두 완료하면 상자를 받을 수 있습니다.');end if;p.box_claimed:=true;n:=floor(random()*4);if n=0 then gold:=200;elsif n=1 then dia:=5;elsif n=2 then ticket:=2;else coins:=50;end if;reward:=jsonb_build_object('gold',gold,'diamonds',dia,'tickets',ticket,'battle',coins);
elsif p_action='ad_start' then
 k:=p_payload->>'target';if k='extra' then if p.extra_used or p.extra_credit>0 then return jsonb_build_object('error','AD_USED','message','추가 입장 광고는 하루 한 번입니다.');end if;
 else select * into run from private.event_runs where user_id=uid and id=k::uuid;if not found or run.day<>today or run.result is null or run.boosted then return jsonb_build_object('error','AD_USED','message','보상을 이미 두 배로 받았거나 광고 대상이 만료되었습니다.');end if;end if;
 p.ad_id:=p_request;p.ad_at:=clock_timestamp();p.ad_target:=k;
elsif p_action='ad_claim' then
 if p.ad_id is null or p.ad_id::text is distinct from p_payload->>'ad' or extract(epoch from clock_timestamp()-p.ad_at)<10 then raise exception 'Sponsor view incomplete';end if;
 if p.ad_target='extra' then if p.extra_used then raise exception 'Extra entry already used';end if;p.extra_used:=true;p.extra_credit:=p.extra_credit+1;
 else select * into run from private.event_runs where user_id=uid and id=p.ad_target::uuid for update;if run.boosted or run.result is null or run.day<>today then raise exception 'Invalid sponsor reward';end if;
 reward:=run.result->'baseReward';gold:=(reward->>'gold')::int;dia:=(reward->>'diamonds')::int;ticket:=(reward->>'tickets')::int;coins:=(reward->>'battle')::int;update private.event_runs set boosted=true where user_id=uid and id=run.id;result:=run.result||jsonb_build_object('boosted',true);end if;p.ad_id:=null;
elsif p_action='bank' then
 if w.active_run is null or w.active_run::text is distinct from p_payload->>'run' then raise exception 'Unknown battle';end if;amount:=p.bank;p.bank:=0;
end if;
if p_action='finish' and gold=0 and dia=0 and ticket=0 and coins=0 and first_bonus=0 and first_mine=0 and record_bonus=0 then reward:='{}';end if;
if gold>0 or dia+first_bonus+first_mine+record_bonus>0 then update private.adventure_wallets set gold=private.adventure_wallets.gold+evt.gold,diamonds=private.adventure_wallets.diamonds+dia+first_bonus+first_mine+record_bonus,updated_at=clock_timestamp() where user_id=uid;end if;
if ticket>0 then update private.talisman_wallets set tickets=tickets+ticket where user_id=uid;end if;p.bank:=least(1000,p.bank+coins);
update private.event_profiles set day=p.day,used=p.used,completed=p.completed,box_claimed=p.box_claimed,extra_used=p.extra_used,extra_credit=p.extra_credit,mine_best=p.mine_best,mine_first=p.mine_first,bank=p.bank,active_run=p.active_run,ad_id=p.ad_id,ad_at=p.ad_at,ad_target=p.ad_target where user_id=uid;
g:=public.forge_adventure('load',null,'{}');select * into run from private.event_runs where user_id=uid and id=p.active_run;select * into camp from private.event_campaign where id='golden_king_first';
data:=jsonb_build_object('owner',uid,'day',today,'used',p.used,'completed',p.completed,'boxClaimed',p.box_claimed,'extraUsed',p.extra_used,'extraCredit',p.extra_credit,'mineBest',p.mine_best,'bank',p.bank,'bankTaken',coalesce(amount,0),'active',case when run.id is not null then jsonb_build_object('id',run.id,'config',run.config,'started',run.started) else null end,'ad',case when p.ad_id is not null then jsonb_build_object('id',p.ad_id,'started',p.ad_at,'target',p.ad_target) else null end,'championClaimed',camp.won_at is not null,'championAt',camp.won_at,'championYou',camp.winner=uid,'result',result,'reward',reward,'growth',g);
if p_action<>'load' then insert into private.event_requests(user_id,id,action,payload,result) values(uid,p_request,p_action,p_payload,data);end if;return data;
end $function$;
