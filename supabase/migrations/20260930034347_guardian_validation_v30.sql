-- Reject null payloads and missing XP for direct RPC callers.
create or replace function private.guardian_profile(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); g private.guardian_profiles; legacy jsonb; seed_name text:='아스트라'; seed_xp integer:=0; n text; x integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_action not in ('load','save') or p_action is null then raise exception 'Invalid action';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload';end if;
 if p_action='save' then
  if not (p_payload ? 'xp') or jsonb_typeof(p_payload)<>'object' or jsonb_typeof(p_payload->'xp')<>'number' or (p_payload->>'xp') !~ '^[0-9]{1,5}$' then raise exception 'Invalid experience';end if;
  x:=(p_payload->>'xp')::integer;if x<0 or x>49500 then raise exception 'Invalid experience';end if;
  if p_payload ? 'nickname' then
   if jsonb_typeof(p_payload->'nickname')<>'string' then raise exception 'Invalid nickname';end if;
   n:=normalize(btrim(p_payload->>'nickname'),NFC);
   if char_length(n) not between 1 and 12 or n ~ '[<>[:cntrl:]]' then raise exception 'Invalid nickname';end if;
  end if;
  select data->'guardian' into legacy from public.player_progress where user_id=uid;
  if jsonb_typeof(legacy->'nickname')='string' and char_length(btrim(legacy->>'nickname')) between 1 and 12 and (legacy->>'nickname') !~ '[<>[:cntrl:]]' then seed_name:=normalize(btrim(legacy->>'nickname'),NFC);end if;
  if jsonb_typeof(legacy->'xp')='number' and (legacy->>'xp') ~ '^[0-9]{1,5}$' then seed_xp:=least(49500,(legacy->>'xp')::integer);end if;
  insert into private.guardian_profiles(user_id,nickname,xp) values(uid,coalesce(n,seed_name),greatest(x,seed_xp))
  on conflict(user_id) do update set nickname=coalesce(n,guardian_profiles.nickname),xp=greatest(guardian_profiles.xp,excluded.xp),updated_at=now();
 end if;
 select * into g from private.guardian_profiles where user_id=uid;
 return jsonb_build_object('owner',uid,'guardian',case when g.user_id is null then null else jsonb_build_object('nickname',g.nickname,'xp',g.xp) end);
end;
$$;
