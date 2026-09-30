alter table private.adventure_wallets add column unit_stars jsonb not null default '{}';
update private.talisman_wallets set owned=(select coalesce(jsonb_object_agg(k,least(20,greatest(v::int,case when v::int>=31 then 11 when v::int>=15 then 9 when v::int>=7 then 6 when v::int>=3 then 4 else 1 end))),'{}') from jsonb_each_text(owned) as e(k,v) where v::int>0);
create function private.forge_talisman(operation text, request_id uuid default null, draw_count int default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); w private.talisman_wallets%rowtype; event private.talisman_events%rowtype;
 today date:=(now() at time zone 'Asia/Seoul')::date; result jsonb; drops jsonb:='[]'; picked text;
 r double precision; rolled_grade int; copies int; i int; message text:='';
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if operation not in ('load','daily','draw') or operation is null or draw_count is null or draw_count not in (1,10) then raise exception 'Invalid action'; end if;
 if operation<>'load' and request_id is null then raise exception 'Request ID required'; end if;
 insert into private.talisman_wallets(user_id) values(uid) on conflict do nothing;
 select * into w from private.talisman_wallets where user_id=uid for update;
 if operation<>'load' then
  select * into event from private.talisman_events e where e.user_id=uid and e.request_id=forge_talisman.request_id;
  if found then
   if event.operation<>operation or event.draw_count<>draw_count then raise exception 'Request ID reused'; end if;
   return event.response;
  end if;
 end if;
 if operation='daily' then
  if w.daily_date=today then message:='오늘의 소환권은 이미 받았습니다.';
  else w.tickets:=w.tickets+1;w.daily_date:=today;message:='일일 소환권 1장을 받았습니다.';end if;
 elsif operation='draw' then
  if w.tickets<draw_count then return jsonb_build_object('error','TICKETS','message','소환권이 부족합니다.'); end if;
  w.tickets:=w.tickets-draw_count;
  for i in 1..draw_count loop
   r:=random();rolled_grade:=case when r<0.6 then 0 when r<0.9 then 1 when r<0.99 then 2 else 3 end;
   if w.pity_legend>=99 then rolled_grade:=3;elsif w.pity_epic>=49 then rolled_grade:=greatest(rolled_grade,2);elsif w.pity_rare>=9 then rolled_grade:=greatest(rolled_grade,1);end if;
   select c.id into picked from private.talisman_catalog c where c.grade=rolled_grade order by random() limit 1;
   copies:=coalesce((w.owned->>picked)::int,0);
   if copies>=20 then w.dust:=w.dust+case rolled_grade when 0 then 1 when 1 then 3 when 2 then 10 else 30 end;
   else w.owned:=jsonb_set(w.owned,array[picked],to_jsonb(copies+1));end if;
   drops:=drops||jsonb_build_array(jsonb_build_object('id',picked,'before',copies,'after',least(20,copies+1),'dust',case when copies>=20 then case rolled_grade when 0 then 1 when 1 then 3 when 2 then 10 else 30 end else 0 end));
   w.pity_rare:=case when rolled_grade>=1 then 0 else w.pity_rare+1 end;
   w.pity_epic:=case when rolled_grade>=2 then 0 else w.pity_epic+1 end;
   w.pity_legend:=case when rolled_grade=3 then 0 else w.pity_legend+1 end;
  end loop;
 end if;
 update private.talisman_wallets set tickets=w.tickets,dust=w.dust,owned=w.owned,pity_rare=w.pity_rare,pity_epic=w.pity_epic,pity_legend=w.pity_legend,daily_date=w.daily_date,updated_at=now() where user_id=uid;
 result:=jsonb_build_object('owner',uid,'tickets',w.tickets,'dust',w.dust,'owned',w.owned,'pity',jsonb_build_array(w.pity_rare,w.pity_epic,w.pity_legend),'dailyAvailable',w.daily_date is distinct from today,'drops',drops,'message',message);
 if operation<>'load' then insert into private.talisman_events(user_id,request_id,operation,draw_count,response) values(uid,request_id,operation,draw_count,result);end if;
 return result;
end $$;
revoke all on function private.forge_talisman(text,uuid,int) from public,anon;
grant execute on function private.forge_talisman(text,uuid,int) to authenticated;
create or replace function public.forge_talisman(operation text,request_id uuid default null,draw_count int default 1) returns jsonb language sql security invoker set search_path='' as $$select private.forge_talisman(operation,request_id,draw_count)$$;
create or replace function private.adventure(p_action text,p_request uuid default null,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();w private.adventure_wallets%rowtype;ev private.adventure_events%rowtype;old jsonb;tw private.talisman_wallets%rowtype;
 today date:=(now() at time zone 'Asia/Seoul')::date;notes jsonb:='[]';data jsonb;reward jsonb;k text;v jsonb;n int;lev int;rank int;cost int;t int;tier int;sk int;ky text;mission jsonb;goal int;i int;stat int;cur text;amount int;hero jsonb;
 wave int;elapsed numeric;real_seconds numeric;won boolean;gold_gain int;diamond_gain int;statkeys text[]:=array['kills','bosses','crafts','firekills','freezes','mudkills','windcasts','shadowbosses','chains'];
 mission_defs constant jsonb:='[{"stat":"kills","name":"몬스터 사냥","goals":[1000,10000,50000],"currency":"gold","rewards":[300,1500,5000]},{"stat":"bosses","name":"보스 토벌","goals":[10,50,200],"currency":"diamonds","rewards":[20,60,150]},{"stat":"crafts","name":"진화의 달인","goals":[30,150,500],"currency":"tickets","rewards":[2,5,10]},{"stat":"uniqueFinals","name":"최종진화 연구","goals":[3,6,12],"currency":"diamonds","rewards":[30,80,200]},{"stat":"wins","name":"끝까지 살아남기","goals":[1,10,50],"currency":"diamonds","rewards":[30,100,300]},{"stat":"collection","name":"부적 수집가","goals":[5,10,19],"currency":"tickets","rewards":[3,5,10]},{"stat":"level20","name":"육성 전문가","goals":[1,6,12],"currency":"gold","rewards":[500,2000,5000]},{"stat":"attendance","name":"꾸준한 모험가","goals":[7,30,100],"currency":"diamonds","rewards":[20,100,300]},{"stat":"firekills","name":"불의 숙련자","goals":[5000],"currency":"diamonds","rewards":[80]},{"stat":"freezes","name":"물의 숙련자","goals":[2000],"currency":"diamonds","rewards":[80]},{"stat":"mudkills","name":"땅의 숙련자","goals":[3000],"currency":"diamonds","rewards":[80]},{"stat":"windcasts","name":"바람의 숙련자","goals":[3000],"currency":"diamonds","rewards":[80]},{"stat":"shadowbosses","name":"암흑의 숙련자","goals":[100],"currency":"diamonds","rewards":[80]},{"stat":"chains","name":"전기의 숙련자","goals":[200],"currency":"diamonds","rewards":[80]}]';special_defs constant jsonb:='[{"type":12,"id":"poison","name":"독화여왕 베노라","label":"독","color":"#ce4c96","accent":"#ff9bd4","atk":6,"rate":1.1,"reach":1.8,"kind":"poison","role":"중독 중첩 · 독성 폭발","support":false,"price":200,"condition":"kills","goal":1000,"parts":[10,0,1]},{"type":13,"id":"metal","name":"강철심판관 페로스","label":"금속","color":"#8398ac","accent":"#e3edf5","atk":9,"rate":1.25,"reach":1.2,"kind":"metal","role":"관통 · 도탄 · 파편","support":false,"price":200,"condition":"crafts","goal":100,"parts":[0,0,9]},{"type":14,"id":"time","name":"시계술사 크로니아","label":"시간","color":"#30b0a7","accent":"#dfc592","atk":5,"rate":1.15,"reach":1.8,"kind":"time","role":"지연 타격 · 기록 재현","support":false,"price":250,"condition":"wins","goal":5,"parts":[7,7,10]},{"type":15,"id":"star","name":"성운지기 아스트라","label":"별","color":"#5368b3","accent":"#eee7c6","atk":7,"rate":1.3,"reach":2.2,"kind":"star","role":"낙하 예고 · 중심 집중 피해","support":false,"price":250,"condition":"bosses","goal":50,"parts":[8,10,9]},{"type":16,"id":"void","name":"공허군주 니힐","label":"공허","color":"#643ac4","accent":"#ddc7ff","atk":6,"rate":1.1,"reach":1.5,"kind":"void","role":"균열 표식 · 표식 소모","support":false,"price":300,"condition":"uniqueFinals","goal":6,"parts":[1,1,7]}]';daily_defs constant jsonb:='[{"tickets":1,"gold":30},{"tickets":1,"gold":40},{"tickets":2,"diamonds":10},{"tickets":1,"gold":50},{"tickets":1,"gold":70},{"tickets":2},{"rare":1,"gold":100,"diamonds":30}]';
begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_action is null or p_action not in ('load','attend','level','skill','unlock','run_start','run_end','rare_draw','claim_mission','claim_battle','talisman_level','unit_draw') then raise exception 'Invalid action';end if;
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
   if sk is null or sk not between 0 and 6 or (tier<5 and sk>=tier) or lev<(case when sk<=4 then 1 when sk=5 then 10 else 20 end) then raise exception 'Locked skill';end if;
   ky:=ky||':'||sk;rank:=coalesce((w.skills->>ky)::int,1);cost:=rank*2*tier;
   if rank>=10 or w.diamonds<cost then return jsonb_build_object('error','FUNDS','message','다이아가 부족하거나 최대 스킬 레벨입니다.');end if;
   w.diamonds:=w.diamonds-cost;w.skills:=jsonb_set(w.skills,array[ky],to_jsonb(rank+1));
  end if;
 elsif p_action='unlock' then
  t:=(p_payload->>'type')::int;select x into hero from jsonb_array_elements(special_defs) x where (x->>'type')::int=t;
  if hero is null then raise exception 'Unknown hero';end if;
  if coalesce((w.unlocks->>t::text)::boolean,false) then return jsonb_build_object('error','OWNED','message','이미 영구 해금한 유닛입니다.');end if;
  if coalesce((w.stats->>(hero->>'condition'))::int,0)<(hero->>'goal')::int then return jsonb_build_object('error','MISSION','message','해금 미션 조건을 먼저 달성해 주세요.');end if;
  cost:=(hero->>'price')::int;if w.diamonds<cost then return jsonb_build_object('error','FUNDS','message','다이아가 부족합니다.');end if;
  w.diamonds:=w.diamonds-cost;w.unlocks:=jsonb_set(w.unlocks,array[t::text],'true');
 elsif p_action='unit_draw' then
  if w.diamonds<50 then return jsonb_build_object('error','FUNDS','message','다이아 50개가 필요합니다.');end if;
  w.diamonds:=w.diamonds-50;stat:=floor(random()*10000)::int;tier:=case when stat<7000 then 1 when stat<9000 then 2 when stat<9700 then 3 when stat<9990 then 4 else 5 end;
  if tier<5 then t:=(array[0,1,7,8,9,10])[1+floor(random()*6)::int];
  else select id into t from generate_series(0,16) as x(id) where id<12 or coalesce((w.unlocks->>id::text)::boolean,false) order by random() limit 1;end if;
  ky:=t||':'||tier;n:=coalesce((w.unit_stars->>ky)::int,0);
  w.unit_stars:=jsonb_set(w.unit_stars,array[ky],to_jsonb(least(20,n+1)));if n>=20 then w.diamonds:=w.diamonds+5;end if;
  notes:=notes||jsonb_build_array(jsonb_build_object('kind','unit','type',t,'tier',tier,'before',n,'after',least(20,n+1),'refund',case when n>=20 then 5 else 0 end));
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
 update private.adventure_wallets set unit_stars=w.unit_stars,talisman_levels=w.talisman_levels,run_mode=w.run_mode,pending_battle=w.pending_battle,gold=w.gold,diamonds=w.diamonds,rare=w.rare,levels=w.levels,skills=w.skills,unlocks=w.unlocks,stats=w.stats,claimed=w.claimed,finals=w.finals,attendance_count=w.attendance_count,attendance_date=w.attendance_date,active_run=w.active_run,run_started=w.run_started,updated_at=now() where user_id=uid;
 data:=jsonb_build_object('owner',uid,'unitStars',w.unit_stars,'talismanLevels',w.talisman_levels,'pendingBattle',w.pending_battle,'runMode',w.run_mode,'gold',w.gold,'diamonds',w.diamonds,'rare',w.rare,'levels',w.levels,'skills',w.skills,'unlocks',w.unlocks,'stats',w.stats,'claimed',w.claimed,'attendanceCount',w.attendance_count,'attendanceToday',w.attendance_date=today,'activeRun',w.active_run,'notes',notes);
 if p_action<>'load' then insert into private.adventure_events(user_id,request_id,action,payload,result) values(uid,p_request,p_action,p_payload,data);end if;return data;
end $$;

alter table private.guardian_profiles drop constraint guardian_profiles_xp_check;
alter table private.guardian_profiles alter column xp type bigint;
alter table private.guardian_profiles add constraint guardian_profiles_xp_check check(xp between 0 and 63572695152692);
create function private.guardian_legacy_xp(x bigint) returns bigint language sql immutable set search_path='' as $$ with curve(lv,total,cost) as (values (1,0,100),(2,100,130),(3,230,170),(4,400,220),(5,620,286),(6,906,372),(7,1278,483),(8,1761,628),(9,2389,816),(10,3205,1061),(11,4266,1379),(12,5645,1793),(13,7438,2330),(14,9768,3029),(15,12797,3938),(16,16735,5119),(17,21854,6655),(18,28509,8651),(19,37160,11246),(20,48406,14620),(21,63026,19005),(22,82031,24707),(23,106738,32119),(24,138857,41754),(25,180611,54281),(26,234892,70565),(27,305457,91734),(28,397191,119254),(29,516445,155030),(30,671475,201539),(31,873014,262000),(32,1135014,340600),(33,1475614,442780),(34,1918394,575614),(35,2494008,748297),(36,3242305,972787),(37,4215092,1264622),(38,5479714,1644009),(39,7123723,2137211),(40,9260934,2778375),(41,12039309,3611887),(42,15651196,4695453),(43,20346649,6104089),(44,26450738,7935315),(45,34386053,10315909),(46,44701962,13410682),(47,58112644,17433887),(48,75546531,22664053),(49,98210584,29463268),(50,127673852,38302248),(51,165976100,49792923),(52,215769023,64730799),(53,280499822,84150039),(54,364649861,109395051),(55,474044912,142213566),(56,616258478,184877635),(57,801136113,240340926),(58,1041477039,312443204),(59,1353920243,406176165),(60,1760096408,528029014),(61,2288125422,686437718),(62,2974563140,892369033),(63,3866932173,1160079743),(64,5027011916,1508103665),(65,6535115581,1960534765),(66,8495650346,2548695194),(67,11044345540,3313303752),(68,14357649292,4307294878),(69,18664944170,5599483341),(70,24264427511,7279328343),(71,31543755854,9463126846),(72,41006882700,12302064899),(73,53308947599,15992684369),(74,69301631968,20790489679),(75,90092121647,27027636583),(76,117119758230,35135927558),(77,152255685788,45676705825),(78,197932391613,59379717572),(79,257312109185,77193632844),(80,334505742029,100351722697),(81,434857464726,130457239506),(82,565314704232,169594411357),(83,734909115589,220472734764),(84,955381850353,286614555193),(85,1241996405546,372598921751),(86,1614595327297,484378598276),(87,2098973925573,629692177759),(88,2728666103332,818599831087),(89,3547265934419,1064179780412),(90,4611445714831,1383433714536),(91,5994879429367,1798463828897),(92,7793343258264,2338002977565),(93,10131346235829,3039403870835),(94,13170750106664,3951225032085),(95,17121975138749,5136592541711),(96,22258567680460,6677570304224),(97,28936137984684,8680841395491),(98,37616979380175,11285093814138),(99,48902073194313,14670621958379),(100,63572695152692,0)) select case when l.lv=100 then c.total else c.total+floor((least(49500,greatest(0,x))-5*l.lv*(l.lv-1))::numeric/(10*l.lv)*c.cost)::bigint end from (select least(100,1+floor((sqrt(1+8*least(49500,greatest(0,x))::numeric/10)-1)/2))::int lv) l join curve c on c.lv=l.lv $$;
revoke all on function private.guardian_legacy_xp(bigint) from public,anon,authenticated;
update private.guardian_profiles set xp=private.guardian_legacy_xp(xp);
create or replace function private.guardian_profile(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); g private.guardian_profiles; legacy jsonb; seed_name text:='아스트라'; seed_xp bigint:=0; n text; x bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_action not in ('load','save') or p_action is null then raise exception 'Invalid action';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload';end if;
 if p_action='save' then
  if not (p_payload ? 'xp') or jsonb_typeof(p_payload)<>'object' or jsonb_typeof(p_payload->'xp')<>'number' or (p_payload->>'xp') !~ '^[0-9]{1,15}$' then raise exception 'Invalid experience';end if;
  x:=(p_payload->>'xp')::bigint;if x<0 or x>63572695152692 then raise exception 'Invalid experience';end if;
  if p_payload ? 'nickname' then
   if jsonb_typeof(p_payload->'nickname')<>'string' then raise exception 'Invalid nickname';end if;
   n:=normalize(btrim(p_payload->>'nickname'),NFC);
   if char_length(n) not between 1 and 12 or n ~ '[<>[:cntrl:]]' then raise exception 'Invalid nickname';end if;
  end if;
  select data->'guardian' into legacy from public.player_progress where user_id=uid;
  if jsonb_typeof(legacy->'nickname')='string' and char_length(btrim(legacy->>'nickname')) between 1 and 12 and (legacy->>'nickname') !~ '[<>[:cntrl:]]' then seed_name:=normalize(btrim(legacy->>'nickname'),NFC);end if;
  if jsonb_typeof(legacy->'xp')='number' and (legacy->>'xp') ~ '^[0-9]{1,15}$' then seed_xp:=case when legacy->>'curve'='2' then least(63572695152692,(legacy->>'xp')::bigint) else private.guardian_legacy_xp((legacy->>'xp')::bigint) end;end if;
  insert into private.guardian_profiles(user_id,nickname,xp) values(uid,coalesce(n,seed_name),greatest(x,seed_xp))
  on conflict(user_id) do update set nickname=coalesce(n,guardian_profiles.nickname),xp=greatest(guardian_profiles.xp,excluded.xp),updated_at=now();
 end if;
 select * into g from private.guardian_profiles where user_id=uid;
 return jsonb_build_object('owner',uid,'guardian',case when g.user_id is null then null else jsonb_build_object('nickname',g.nickname,'xp',g.xp,'curve',2) end);
end;
$$;
