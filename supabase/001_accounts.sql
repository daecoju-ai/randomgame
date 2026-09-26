-- Run once in your own Supabase SQL Editor. No service-role key is used by this app.
create table if not exists public.player_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 constraint data_shape check(jsonb_typeof(data)='object' and jsonb_typeof(data->'levels')='object' and jsonb_typeof(data->'essence')='number')
);
alter table public.player_progress enable row level security;
revoke all on public.player_progress from anon, authenticated;
grant select on public.player_progress to authenticated;
drop policy if exists own_progress on public.player_progress;
create policy own_progress on public.player_progress for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.save_player_progress(payload jsonb, expected_revision bigint)
returns table(data jsonb, revision bigint)
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); k text; v jsonb; currency numeric;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if payload is null or jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'levels') is distinct from 'object' or jsonb_typeof(payload->'essence') is distinct from 'number' or octet_length(payload::text)>16000 then raise exception 'Invalid data'; end if;
 currency:=(payload->>'essence')::numeric;
 if currency<0 or currency>10000000 or currency<>trunc(currency) then raise exception 'Invalid currency'; end if;
 for k,v in select * from jsonb_each(payload->'levels') loop
  if k !~ '^(0|1|2|3|4|5|6|7|8|9|10|11):[1-5]$' or jsonb_typeof(v)<>'number' then raise exception 'Invalid level'; end if;
  if (v::text)::numeric not between 1 and 20 or (v::text)::numeric<>trunc((v::text)::numeric) or (right(k,2)=':1' and split_part(k,':',1)::int not in(0,1,4,6,8,10)) then raise exception 'Invalid level'; end if;
 end loop;
 if expected_revision is null then
  return query insert into public.player_progress as p(user_id,data) values(uid,payload) on conflict(user_id) do nothing returning p.data,p.revision;
 else
  return query update public.player_progress as p set data=payload,revision=p.revision+1,updated_at=now() where p.user_id=uid and p.revision=expected_revision returning p.data,p.revision;
 end if;
end $$;
revoke all on function public.save_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_player_progress(jsonb,bigint) to authenticated;
