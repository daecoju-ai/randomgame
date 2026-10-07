-- Weekly Honor leaderboard. Scores are written only from server-validated battle completion.
create table if not exists private.weekly_rankings(
 user_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null,
 mode text not null check(mode in ('easy','normal','hard')),
 score bigint not null check(score>=0),
 wave int not null check(wave between 1 and 30),
 bosses int not null default 0,
 kills int not null default 0,
 won boolean not null default false,
 elapsed numeric not null default 0,
 updated_at timestamptz not null default now(),
 primary key(user_id,week_start,mode)
);
alter table private.weekly_rankings enable row level security;
revoke all on private.weekly_rankings from public,anon,authenticated;

create or replace function public.forge_weekly_ranking(p_mode text default 'easy')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ws date:=date_trunc('week',now() at time zone 'Asia/Seoul')::date; rows jsonb; mine jsonb;
begin
 if p_mode not in ('easy','normal','hard') then raise exception 'Invalid mode';end if;
 select coalesce(jsonb_agg(jsonb_build_object('name','모험가 '||right(user_id::text,4),'score',score,'wave',wave,'bosses',bosses,'won',won) order by score desc,elapsed asc),'[]') into rows
 from (select * from private.weekly_rankings where week_start=ws and mode=p_mode order by score desc,elapsed asc limit 100) r;
 if uid is not null then
  select jsonb_build_object('rank',1+(select count(*) from private.weekly_rankings x where x.week_start=ws and x.mode=p_mode and (x.score>r.score or (x.score=r.score and x.elapsed<r.elapsed))),'score',r.score) into mine
  from private.weekly_rankings r where r.user_id=uid and r.week_start=ws and r.mode=p_mode;
 end if;
 return jsonb_build_object('week',ws,'mode',p_mode,'modeLabel',case p_mode when 'easy' then '쉬움' when 'normal' then '보통' else '어려움' end,'rows',rows,'mine',mine);
end $$;
revoke all on function public.forge_weekly_ranking(text) from public,anon;
grant execute on function public.forge_weekly_ranking(text) to authenticated;

-- Hook helper: call from private.adventure run_end after its existing duration/stat validation.
create or replace function private.record_weekly_rank(p_user uuid,p_mode text,p_wave int,p_kills int,p_bosses int,p_won boolean,p_elapsed numeric)
returns void language plpgsql security definer set search_path='' as $$
declare ws date:=date_trunc('week',now() at time zone 'Asia/Seoul')::date; s bigint;
begin
 s:=p_wave*10000+p_kills*10+p_bosses*1000+(case when p_won then 50000 else 0 end)+(case when p_won then greatest(0,1200-floor(p_elapsed)) else 0 end);
 insert into private.weekly_rankings(user_id,week_start,mode,score,wave,bosses,kills,won,elapsed)
 values(p_user,ws,p_mode,s,p_wave,p_bosses,p_kills,p_won,p_elapsed)
 on conflict(user_id,week_start,mode) do update set score=excluded.score,wave=excluded.wave,bosses=excluded.bosses,kills=excluded.kills,won=excluded.won,elapsed=excluded.elapsed,updated_at=now()
 where excluded.score>private.weekly_rankings.score or (excluded.score=private.weekly_rankings.score and excluded.elapsed<private.weekly_rankings.elapsed);
end $$;
