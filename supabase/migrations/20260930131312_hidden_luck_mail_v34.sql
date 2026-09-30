-- Additive V34: no existing wallet, unit or progression data is reset.
create table private.luck_catalog(mission_id text primary key, ordinal int unique not null, name text not null, description text not null, reward int not null, battle_coin int not null);
insert into private.luck_catalog values
 ('first_step',1,'첫 발걸음','WAVE 1에 주인공을 시작 위치에서 다른 칸으로 실제 이동한다.',100,100),
 ('swap',2,'자리 바꿔!','WAVE 1에 주인공과 일반 유닛의 위치를 서로 교환한다.',100,100),
 ('greedy',3,'욕심쟁이','WAVE 2 종료 전에 주인공을 포함해 유닛 10기를 동시에 배치한다.',100,100),
 ('pressure',4,'아슬아슬','WAVE 3 종료 전에 살아있는 몬스터가 동시에 30기 이상이 된다.',100,100),
 ('escape',5,'위기탈출','같은 전투에서 몬스터 30기 이상을 만든 뒤 WAVE 3 종료 전에 10기 이하로 줄인다.',100,100),
 ('collector',6,'정령 수집가','한 전투의 WAVE 1~3에 1단계 정령 6종을 각각 한 번 이상 획득한다.',100,100),
 ('hunter',7,'행운 사냥꾼','여러 전투에 걸쳐 앞의 숨겨진 행운 6개를 모두 발견한다.',200,200);
create table private.luck_discoveries(user_id uuid references auth.users(id) on delete cascade,mission_id text references private.luck_catalog(mission_id),discovered_at timestamptz not null default now(),run_id uuid,primary key(user_id,mission_id));
create table private.reward_mail(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,source_key text not null,title text not null,body text not null default '',reward jsonb not null,created_at timestamptz not null default now(),expires_at timestamptz,claimed_at timestamptz,unique(user_id,source_key));
create index reward_mail_owner_pending on private.reward_mail(user_id,created_at desc) where claimed_at is null;
create table private.luck_runs(user_id uuid references auth.users(id) on delete cascade,run_id uuid,state jsonb not null default '{}',started_at timestamptz not null,primary key(user_id,run_id));
create table private.luck_requests(user_id uuid references auth.users(id) on delete cascade,request_id uuid,action text not null,payload jsonb not null,result jsonb not null,primary key(user_id,request_id));
create table private.luck_event_winners(event_id text primary key,user_id uuid not null references auth.users(id),submitted_at timestamptz not null,evidence_url text not null,awarded_at timestamptz not null default now());
alter table private.luck_catalog enable row level security;
alter table private.luck_discoveries enable row level security;
alter table private.reward_mail enable row level security;
alter table private.luck_runs enable row level security;
alter table private.luck_requests enable row level security;
alter table private.luck_event_winners enable row level security;
revoke all on private.luck_catalog,private.luck_discoveries,private.reward_mail,private.luck_runs,private.luck_requests,private.luck_event_winners from public,anon,authenticated;

-- Internal/admin only. A source key makes campaigns and operator rewards replay-safe.
create function private.send_reward_mail(p_user uuid,p_source text,p_title text,p_body text,p_reward jsonb,p_expires timestamptz default null) returns uuid language plpgsql set search_path='' as $$
declare k text;v jsonb;mid uuid;
begin
 if p_source is null or length(p_source) not between 1 and 160 or length(p_title) not between 1 and 100 or length(p_body)>1500 or jsonb_typeof(p_reward)<>'object' or p_reward='{}' then raise exception 'Invalid mail';end if;
 for k,v in select * from jsonb_each(p_reward) loop
  if k not in('gold','diamonds','tickets','rare') or jsonb_typeof(v)<>'number' or v::text !~ '^[0-9]+$' or v::text::bigint not between 1 and 100000 then raise exception 'Invalid reward';end if;
 end loop;
 insert into private.reward_mail(user_id,source_key,title,body,reward,expires_at) values(p_user,p_source,p_title,p_body,p_reward,p_expires) on conflict(user_id,source_key) do nothing returning id into mid;
 if mid is null then select id into mid from private.reward_mail where user_id=p_user and source_key=p_source;end if;return mid;
end $$;
revoke all on function private.send_reward_mail(uuid,text,text,text,jsonb,timestamptz) from public,anon,authenticated;

create function private.discover_luck(p_user uuid,p_mission text,p_run uuid) returns boolean language plpgsql set search_path='' as $$
declare c private.luck_catalog%rowtype;n int;
begin
 select * into c from private.luck_catalog where mission_id=p_mission;if not found then raise exception 'Unknown mission';end if;
 insert into private.luck_discoveries(user_id,mission_id,run_id) values(p_user,p_mission,p_run) on conflict do nothing;
 get diagnostics n=row_count;if n=0 then return false;end if;
 perform private.send_reward_mail(p_user,'hidden-luck:'||p_mission,'숨겨진 행운 · '||c.name,'최초 발견 보상입니다. 우편을 수령하면 다이아가 지급됩니다.',jsonb_build_object('diamonds',c.reward));return true;
end $$;
revoke all on function private.discover_luck(uuid,text,uuid) from public,anon,authenticated;

create function private.luck(p_action text,p_request uuid default null,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
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
      if coalesce((w.unit_stars->>(typ||':'||tier))::int,0)<1 then raise exception 'Unowned loadout';end if;
     elsif typ>=12 then raise exception 'Invalid free starter';end if;
     inventory:=jsonb_set(inventory,array[id],item||'{"invested":10}'::jsonb);if tier=1 then seen:=jsonb_set(seen,array[typ::text],'true');end if;
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
    if u is null or refund<0 or refund>floor((u->>'invested')::numeric*.7) then raise exception 'Invalid removal';end if;inventory:=inventory-id;budget:=budget+refund;
   elsif kind='unitTransformed' then
    id:=ev->>'id';u:=inventory->id;tier:=(ev->>'tier')::int;typ:=(ev->>'type')::int;
    if u is null or tier is null or typ is null or tier<>(u->>'tier')::int+1 or typ not between 0 and 16 or (tier<5 and typ not in(0,1,7,8,9,10)) or (typ>=12 and not coalesce((w.unlocks->>typ::text)::boolean,false)) then raise exception 'Invalid transform';end if;
    inventory:=jsonb_set(inventory,array[id],u||jsonb_build_object('type',typ,'tier',tier,'invested',(u->>'invested')::int*3));
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
end $$;
revoke all on function private.luck(text,uuid,jsonb) from public,anon;
grant execute on function private.luck(text,uuid,jsonb) to authenticated;
create function public.forge_luck(p_action text,p_request uuid default null,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.luck(p_action,p_request,p_payload)$$;
revoke all on function public.forge_luck(text,uuid,jsonb) from public,anon;
grant execute on function public.forge_luck(text,uuid,jsonb) to authenticated;

-- Operator-only award after manual verification of the earliest valid SNS submission.
create function private.award_luck_event(p_user uuid,p_submitted timestamptz,p_url text) returns uuid language plpgsql security invoker set search_path='' as $$
declare winner private.luck_event_winners;mail_id uuid;
begin
 if p_submitted is null or p_url is null or p_url !~ '^https://' or length(p_url)>2000 then raise exception 'Invalid verified evidence';end if;
 if (select count(*) from private.luck_discoveries where user_id=p_user)<>7 then raise exception 'Seven discoveries required';end if;
 insert into private.luck_event_winners(event_id,user_id,submitted_at,evidence_url) values('hidden-luck-first-answer-v34',p_user,p_submitted,p_url) on conflict do nothing;
 select * into winner from private.luck_event_winners where event_id='hidden-luck-first-answer-v34' for update;
 if winner.user_id<>p_user then raise exception 'Event already awarded';end if;
 mail_id:=private.send_reward_mail(p_user,'event:hidden-luck-first-answer-v34','숨겨진 행운 최초 정답 이벤트','최초 정답자로 선정되었습니다. 축하합니다!','{"diamonds":2000}',null);
 return mail_id;
end $$;
revoke all on function private.award_luck_event(uuid,timestamptz,text) from public,anon,authenticated;
