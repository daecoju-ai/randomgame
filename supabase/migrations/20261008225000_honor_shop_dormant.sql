-- Dormant Honor Shop. Activation is deliberately server-controlled.
create table if not exists private.honor_wallets(user_id uuid primary key references auth.users(id) on delete cascade,badges int not null default 0 check(badges>=0),owned jsonb not null default '{}'::jsonb,equipped text,updated_at timestamptz not null default now());
create table if not exists private.live_ops(key text primary key,value jsonb not null,updated_at timestamptz not null default now());
insert into private.live_ops(key,value) values('honor_shop','{"enabled":false,"metric":"monthly_active_ranked_users","threshold":1000,"season_weeks":13,"badge_target":1200}'::jsonb) on conflict(key) do nothing;
alter table private.honor_wallets enable row level security;alter table private.live_ops enable row level security;
revoke all on private.honor_wallets,private.live_ops from public,anon,authenticated;

create or replace function public.forge_honor_shop(p_action text default 'load',p_relic text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); cfg jsonb; w private.honor_wallets%rowtype; cost int:=1200; valid text[]:=array['honor_fire','honor_water','honor_earth','honor_wind','honor_electric','honor_shadow'];
begin
 if uid is null then raise exception 'Authentication required';end if;
 select value into cfg from private.live_ops where key='honor_shop';
 insert into private.honor_wallets(user_id) values(uid) on conflict do nothing;select * into w from private.honor_wallets where user_id=uid for update;
 if p_action='load' then return jsonb_build_object('enabled',coalesce((cfg->>'enabled')::boolean,false),'badges',w.badges,'owned',w.owned,'equipped',w.equipped,'target',cost);end if;
 if not coalesce((cfg->>'enabled')::boolean,false) then return jsonb_build_object('error','EVENT_LOCKED','message','명예 상점은 아직 개방되지 않았습니다.');end if;
 if p_relic is null or not(p_relic=any(valid)) then raise exception 'Invalid relic';end if;
 if p_action='buy' then if coalesce((w.owned->>p_relic)::boolean,false) then return jsonb_build_object('error','OWNED');end if;if w.badges<cost then return jsonb_build_object('error','FUNDS');end if;w.badges:=w.badges-cost;w.owned:=jsonb_set(w.owned,array[p_relic],'true');end if;
 if p_action='equip' and not coalesce((w.owned->>p_relic)::boolean,false) then return jsonb_build_object('error','OWNED');end if;
 if p_action='equip' then w.equipped:=p_relic;end if;
 update private.honor_wallets set badges=w.badges,owned=w.owned,equipped=w.equipped,updated_at=now() where user_id=uid;
 return jsonb_build_object('enabled',true,'badges',w.badges,'owned',w.owned,'equipped',w.equipped,'target',cost);
end $$;
revoke all on function public.forge_honor_shop(text,text) from public,anon;grant execute on function public.forge_honor_shop(text,text) to authenticated;
