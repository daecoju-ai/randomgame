create or replace function private.save_player_progress(payload jsonb, expected_revision bigint)
returns table(data jsonb, revision bigint)
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); k text; v jsonb; currency numeric;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if payload is null or jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'levels') is distinct from 'object' or jsonb_typeof(payload->'essence') is distinct from 'number' or octet_length(payload::text)>16000 then raise exception 'Invalid data'; end if;
 currency:=(payload->>'essence')::numeric;
 if currency<0 or currency>10000000 or currency<>trunc(currency) then raise exception 'Invalid currency'; end if;
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
 if expected_revision is null then
  return query insert into public.player_progress as p(user_id,data) values(uid,payload) on conflict(user_id) do nothing returning p.data,p.revision;
 else
  return query update public.player_progress as p set data=payload,revision=p.revision+1,updated_at=now() where p.user_id=uid and p.revision=expected_revision returning p.data,p.revision;
 end if;
end $$;
