-- Versioned automatic legendary formation and reachable slime route.
create or replace function private.event_simulate(c jsonb,actions jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare kind text:=c->>'kind';dur int:=case when kind='luck' then 90 else 60 end;seed bigint:=(c->>'seed')::bigint;us jsonb[]:=array[null,null,null,null,null,null]::jsonb[];a jsonb;u jsonb;b jsonb;t int;i int;j int;si int;idx int;n int;typ int;tier int;r bigint;last_t int:=-1;lastspin int:=-8;spins int:=0;progress double precision:=0;px double precision;py double precision;d double precision;ux numeric;uy numeric;bx numeric;buff_y numeric;buff numeric;hit bigint;total bigint;control numeric;damage bigint:=0;gold int:=0;stage int:=0;hp bigint;maxhp bigint;kills int:=0;life int:=30;king boolean:=false;kingat int;ore int[]:=array[1200,3500,8000,18000,45000,110000,260000];hist jsonb:='[]';unitdamage jsonb:='{}';ky text;take bigint;duplicate boolean;formation boolean:=coalesce((c->>'formation')::int=47,false);from_slot int;tmp jsonb;
begin
if jsonb_typeof(actions) is distinct from 'array' or jsonb_array_length(actions)>120 then raise exception 'Invalid event actions';end if;
for a in select value from jsonb_array_elements(actions) loop
 if jsonb_typeof(a->'t') is distinct from 'number' or (a->>'t') !~ '^\d+$' or (a->>'t')::int<last_t or (a->>'t')::int>=dur or a->>'kind' not in('place','spin') or (a->>'slot') !~ '^[0-5]$' then raise exception 'Invalid action time';end if;last_t:=(a->>'t')::int;
end loop;
hp:=case when kind='slime' then 90000 when kind='mine' then ore[1] else 240 end;maxhp:=hp;
if formation or coalesce((c->>'legends')::int=48,false) then for i in 1..6 loop us[i]:=c->'roster'->(i-1)||jsonb_build_object('index',i-1);end loop;end if;
for t in 0..dur-1 loop
 for a in select value from jsonb_array_elements(actions) where (value->>'t')::int=t loop
 si:=(a->>'slot')::int+1;
 if a->>'kind'='place' and kind<>'luck' then
 if (a->>'index') !~ '^\d+$' then raise exception 'Invalid roster selection';end if;idx:=(a->>'index')::int;u:=c->'roster'->idx;
 if (formation or coalesce((c->>'legends')::int=48,false)) and u is not null then from_slot:=null;for j in 1..6 loop if (us[j]->>'index')::int=idx then from_slot:=j;end if;end loop;if from_slot is not null then tmp:=us[si];us[si]:=us[from_slot];us[from_slot]:=tmp;end if;
 elsif u is not null then duplicate:=false;for j in 1..6 loop if j<>si and (us[j]->>'index')::int=idx then duplicate:=true;end if;end loop;if not duplicate then us[si]:=u||jsonb_build_object('index',idx);end if;end if;
 elsif a->>'kind'='spin' and kind='luck' and t-lastspin>=8 and spins<12 then
 r:=(seed*16807+t*9973)%2147483647;n:=r%1000;tier:=case when n<20 then 5 when n<80 then 4 when n<250 then 3 when n<550 then 2 else 1 end;
 typ:=case when tier=5 then (r/1000)%17 else (array[8,10,0,7,9,1])[((r/1000)%6)::int+1] end;
 if coalesce((c->>'legends')::int=48,false) then tier:=5;typ:=(array[8,10,0,7,9,1])[((r/1000)%6)::int+1];end if;u:=private.event_unit(typ,tier,c->'growth');us[si]:=u;lastspin:=t;spins:=spins+1;hist:=hist||jsonb_build_array(u||jsonb_build_object('at',t));end if;
 end loop;
 if formation then d:=((progress-floor(progress))*192);if d<36 then px:=12+d;py:=20;elsif d<96 then px:=48;py:=20+d-36;elsif d<132 then px:=48-(d-96);py:=80;else px:=12;py:=80-(d-132);end if;elsif kind='mine' then px:=30;py:=50;else d:=((progress-floor(progress))*280);if d<50 then px:=5+d;py:=5;elsif d<140 then px:=55;py:=5+d-50;elsif d<190 then px:=55-(d-140);py:=95;else px:=5;py:=95-(d-190);end if;end if;
 total:=0;control:=0;
 for i in 1..6 loop u:=us[i];if u is null then continue;end if;ux:=case when i%2=0 then 40 else 20 end;uy:=30+((i-1)/2)*20;
 if kind<>'mine' and sqrt(power(ux-px,2)+power(uy-py,2))>(u->>'reach')::numeric then continue;end if;buff:=1;
 for j in 1..6 loop b:=us[j];bx:=case when j%2=0 then 40 else 20 end;buff_y:=30+((j-1)/2)*20;
 if coalesce((b->>'support')::boolean,false) and sqrt(power(ux-bx,2)+power(uy-buff_y,2))<=40 then buff:=buff+coalesce((array[.35,.25,.45,.55,.15,.25])[(b->>'e')::int+1],0);end if;end loop;
 hit:=floor((u->>'dps')::numeric*buff*case when kind='slime' then 100.0/180*case when formation then .5 else 2.4 end else 1 end);if (kind='slime' and king) or (kind='mine' and stage>=7) then hit:=0;end if;total:=total+hit;ky:=(u->>'type')||':'||(u->>'tier');unitdamage:=jsonb_set(unitdamage,array[ky],to_jsonb(coalesce((unitdamage->>ky)::bigint,0)+hit));
 if (u->>'e')::int in(1,2,3,4,6,8) then control:=greatest(control,least(.65,.16*(u->>'control')::numeric+case when (u->>'e')::int=1 then .18 else 0 end));end if;
 end loop;
 damage:=damage+total;
 if kind='slime' then hp:=greatest(0,hp-total);n:=((seed*16807+t*9973)%2147483647)%1000;gold:=gold+(total/220)*case when n<8 then 12 when n<80 then 5 when n<320 then 2 else 1 end;
 if hp=0 and not king then king:=true;kingat:=t+1;gold:=gold+150;end if;if not king then progress:=progress+.019*(1-control);end if;
 elsif kind='mine' then hit:=total;while hit>0 and stage<7 loop take:=least(hp,hit);hp:=hp-take;hit:=hit-take;if hp=0 then stage:=stage+1;hp:=case when stage<7 then ore[stage+1] else 0 end;maxhp:=hp;end if;end loop;
 else hit:=total;while hit>0 loop take:=least(hp,hit);hp:=hp-take;hit:=hit-take;if hp=0 then kills:=kills+1;maxhp:=240+kills*45;hp:=maxhp;end if;end loop;progress:=progress+.03*(1-control);if progress>=1 then progress:=0;life:=life-1;hp:=maxhp;end if;end if;
end loop;
return jsonb_build_object('damage',damage,'gold',gold,'stage',stage,'hp',hp,'kills',kills,'life',life,'king',king,'kingAt',kingat,'history',hist,'unitDamage',unitdamage,'grade',case when damage>=90000 then 'S' when damage>=55000 then 'A' when damage>=25000 then 'B' else 'C' end);
end $$;

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
 -- Main battle results stay available for delayed settlement.
 foreach typ in array array[8,10,0,7,9,1] loop roster:=roster||jsonb_build_array(private.event_unit(typ,5,g));end loop;

 conf:=jsonb_build_object('kind',k,'seed',floor(random()*1000000)::int+1,'growth',jsonb_build_object('levels',w.levels,'skills',w.skills,'unitStars',w.unit_stars),'roster',roster,'legends',48)||case when k='slime' then '{"formation":47}'::jsonb else '{}'::jsonb end;
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
