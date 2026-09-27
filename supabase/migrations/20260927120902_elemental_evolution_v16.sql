-- New payloads use v4. Existing v3 clients can still save until their own record migrates.
create or replace function private.validate_elemental_progress(payload jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; t int; tier int; skill int; needed int;
begin
 if payload->>'version' is distinct from '4' or jsonb_typeof(payload->'levels') is distinct from 'object' or jsonb_typeof(payload->'essence') is distinct from 'number' then raise exception 'Invalid v4 progress'; end if;
 if (payload->>'essence')::numeric not between 0 and 10000000 or (payload->>'essence')::numeric<>trunc((payload->>'essence')::numeric) then raise exception 'Invalid currency'; end if;
 for k,v in select * from jsonb_each(payload->'levels') loop
  if k !~ '^(0|1|2|3|4|5|6|7|8|9|10|11):[1-5]$' or jsonb_typeof(v) is distinct from 'number' then raise exception 'Invalid level'; end if;
  t:=split_part(k,':',1)::int; tier:=split_part(k,':',2)::int;
  if (tier<5 and t not in(0,1,7,8,9,10)) or (v::text)::numeric not between 1 and 30 or (v::text)::numeric<>trunc((v::text)::numeric) then raise exception 'Invalid level'; end if;
 end loop;
 if payload ? 'skills' then
  if jsonb_typeof(payload->'skills') is distinct from 'object' then raise exception 'Invalid skills'; end if;
  for k,v in select * from jsonb_each(payload->'skills') loop
   if k !~ '^(0|1|2|3|4|5|6|7|8|9|10|11):[1-5]:[0-6]$' or jsonb_typeof(v) is distinct from 'number' then raise exception 'Invalid skill'; end if;
   t:=split_part(k,':',1)::int; tier:=split_part(k,':',2)::int; skill:=split_part(k,':',3)::int;
   if (tier<5 and (t not in(0,1,7,8,9,10) or skill>=tier)) or (v::text)::numeric not between 1 and 10 or (v::text)::numeric<>trunc((v::text)::numeric) then raise exception 'Invalid skill'; end if;
   needed:=case when skill<=4 then 1 when skill=5 then 10 else 20 end;
   if coalesce((payload->'levels'->>(t::text||':'||tier::text))::int,1)<needed then raise exception 'Locked skill'; end if;
  end loop;
 end if;
end $$;
revoke all on function private.validate_elemental_progress(jsonb) from public, anon, authenticated;

create or replace function private.save_player_progress(payload jsonb, expected_revision bigint)
returns table(data jsonb, revision bigint)
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); k text; v jsonb; currency numeric;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if payload is null or jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'levels') is distinct from 'object' or jsonb_typeof(payload->'essence') is distinct from 'number' or octet_length(payload::text)>16000 then raise exception 'Invalid data'; end if;
 currency:=(payload->>'essence')::numeric;
 if currency<0 or currency>10000000 or currency<>trunc(currency) then raise exception 'Invalid currency'; end if;
 if payload->>'version'='4' then
  perform private.validate_elemental_progress(payload);
 else
  if exists(select 1 from public.player_progress where user_id=uid and data->>'version'='4') then raise exception 'Please reload the updated game'; end if;
 for k,v in select * from jsonb_each(payload->'levels') loop
  if k !~ '^(0|1|2|3|4|5|6|7|8|9|10|11):[1-6]$' or jsonb_typeof(v)<>'number' then raise exception 'Invalid level'; end if;
  if (v::text)::numeric not between 1 and 30 or (v::text)::numeric<>trunc((v::text)::numeric) or (right(k,2)=':1' and split_part(k,':',1)::int not in(0,1,4,6,8,10)) then raise exception 'Invalid level'; end if;
 end loop;
 if payload ? 'skills' then
  if jsonb_typeof(payload->'skills') is distinct from 'object' then raise exception 'Invalid skills'; end if;
  for k,v in select * from jsonb_each(payload->'skills') loop
   if k !~ '^(0|1|2|3|4|5|6|7|8|9|10|11):[1-6]:[0-5]$' or jsonb_typeof(v)<>'number' then raise exception 'Invalid skill'; end if;
   if (v::text)::numeric not between 1 and 10 or (v::text)::numeric<>trunc((v::text)::numeric) then raise exception 'Invalid skill rank'; end if;
   if split_part(k,':',3)::int>=split_part(k,':',2)::int or coalesce((payload->'levels'->>(split_part(k,':',1)||':'||split_part(k,':',2)))::int,1)<(split_part(k,':',3)::int+1)*5 then raise exception 'Locked skill'; end if;
  end loop;
 end if;
 end if;
 if expected_revision is null then
  return query insert into public.player_progress as p(user_id,data) values(uid,payload) on conflict(user_id) do nothing returning p.data,p.revision;
 else
  return query update public.player_progress as p set data=payload,revision=p.revision+1,updated_at=now() where p.user_id=uid and p.revision=expected_revision returning p.data,p.revision;
 end if;
end $$;
