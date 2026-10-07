-- Public-safe player nickname used by Guardian and Weekly Honor.
create table if not exists private.player_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null,
 updated_at timestamptz not null default now(),
 constraint player_nickname_len check(char_length(nickname) between 2 and 12)
);
alter table private.player_profiles enable row level security;
revoke all on private.player_profiles from public,anon,authenticated;

create or replace function private.ensure_player_profile(p_user uuid)
returns text language plpgsql security definer set search_path='' as $$
declare n text;
begin
 select nickname into n from private.player_profiles where user_id=p_user;
 if n is null then
  select left(trim(coalesce(raw_user_meta_data->>'nickname','모험가'||right(id::text,4))),12) into n from auth.users where id=p_user;
  if char_length(n)<2 then n:='모험가'||right(p_user::text,4);end if;
  insert into private.player_profiles(user_id,nickname) values(p_user,n) on conflict(user_id) do nothing;
 end if;
 return n;
end $$;

create or replace function public.forge_weekly_ranking(p_mode text default 'easy')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ws date:=date_trunc('week',now() at time zone 'Asia/Seoul')::date; rows jsonb; mine jsonb;
begin
 if p_mode not in ('easy','normal','hard') then raise exception 'Invalid mode';end if;
 if uid is not null then perform private.ensure_player_profile(uid);end if;
 select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(p.nickname,'모험가'),'score',r.score,'wave',r.wave,'bosses',r.bosses,'won',r.won) order by r.score desc,r.elapsed asc),'[]') into rows
 from (select * from private.weekly_rankings where week_start=ws and mode=p_mode order by score desc,elapsed asc limit 100) r
 left join private.player_profiles p on p.user_id=r.user_id;
 if uid is not null then
  select jsonb_build_object('rank',1+(select count(*) from private.weekly_rankings x where x.week_start=ws and x.mode=p_mode and (x.score>r.score or (x.score=r.score and x.elapsed<r.elapsed))),'score',r.score,'name',private.ensure_player_profile(uid)) into mine
  from private.weekly_rankings r where r.user_id=uid and r.week_start=ws and r.mode=p_mode;
 end if;
 return jsonb_build_object('week',ws,'mode',p_mode,'modeLabel',case p_mode when 'easy' then '쉬움' when 'normal' then '보통' else '어려움' end,'rows',rows,'mine',mine);
end $$;
revoke all on function public.forge_weekly_ranking(text) from public,anon;grant execute on function public.forge_weekly_ranking(text) to authenticated;
