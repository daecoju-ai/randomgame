-- Add hard difficulty to server-authoritative battle validation and rewards.
-- Keeps the existing adventure function intact except for allowed modes and reward multipliers.
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
   ky:=ky||':'||(case when sk=5 then 'ultimate' else sk::text end);rank:=case when sk=4 then greatest(coalesce((w.skills->>ky)::int,1),coalesce((w.skills->>(left(ky,length(ky)-1)||'5'))::int,1),coalesce((w.skills->>(left(ky,length(ky)-1)||'6'))::int,1)) else coalesce((w.skills->>ky)::int,1) end;cost:=rank*2*tier;
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
  w.run_mode:=coalesce(p_payload->>'difficulty','normal');if w.run_mode not in ('easy','normal','hard') then raise exception 'Invalid difficulty';end if;
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
  if w.run_mode='easy' then gold_gain:=floor(gold_gain*.7);elsif w.run_mode='hard' then gold_gain:=floor(gold_gain*1.55);end if;
  diamond_gain:=coalesce((p_payload->'stats'->>'bosses')::int,0)*case when w.run_mode='easy' then 1 when w.run_mode='hard' then 3 else 2 end;
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
