create or replace function private.events(p_action text,p_request uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if w.active_run is not null then update private.adventure_wallets set active_run=null,run_started=null where user_id=uid;w.active_run:=null;w.run_started:=null;end if;
 foreach typ in array array[8,10,0,7,9,1] loop roster:=roster||jsonb_build_array(private.event_unit(typ,4,g));end loop;
 for typ in 0..16 loop if coalesce((w.unit_stars->>(typ||':5'))::int,0)>0 then roster:=roster||jsonb_build_array(private.event_unit(typ,5,g));end if;end loop;
 conf:=jsonb_build_object('kind',k,'seed',floor(random()*1000000)::int+1,'growth',jsonb_build_object('levels',w.levels,'skills',w.skills,'unitStars',w.unit_stars),'roster',roster);
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
end $$;
