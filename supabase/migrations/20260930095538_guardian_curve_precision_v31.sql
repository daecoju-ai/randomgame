-- Correct one floating-point ceiling at Lv.3; preserve levels and progress.
alter table private.guardian_profiles drop constraint guardian_profiles_xp_check;
update private.guardian_profiles set xp=case when xp>=400 then xp-1 when xp>=230 then 230+floor((xp-230)::numeric/170*169)::bigint else xp end;
alter table private.guardian_profiles add constraint guardian_profiles_xp_check check(xp between 0 and 63572695152691);
create or replace function private.guardian_legacy_xp(x bigint) returns bigint language sql immutable set search_path='' as $$ with curve(lv,total,cost) as (values (1,0,100),(2,100,130),(3,230,169),(4,399,220),(5,619,286),(6,905,372),(7,1277,483),(8,1760,628),(9,2388,816),(10,3204,1061),(11,4265,1379),(12,5644,1793),(13,7437,2330),(14,9767,3029),(15,12796,3938),(16,16734,5119),(17,21853,6655),(18,28508,8651),(19,37159,11246),(20,48405,14620),(21,63025,19005),(22,82030,24707),(23,106737,32119),(24,138856,41754),(25,180610,54281),(26,234891,70565),(27,305456,91734),(28,397190,119254),(29,516444,155030),(30,671474,201539),(31,873013,262000),(32,1135013,340600),(33,1475613,442780),(34,1918393,575614),(35,2494007,748297),(36,3242304,972787),(37,4215091,1264622),(38,5479713,1644009),(39,7123722,2137211),(40,9260933,2778375),(41,12039308,3611887),(42,15651195,4695453),(43,20346648,6104089),(44,26450737,7935315),(45,34386052,10315909),(46,44701961,13410682),(47,58112643,17433887),(48,75546530,22664053),(49,98210583,29463268),(50,127673851,38302248),(51,165976099,49792923),(52,215769022,64730799),(53,280499821,84150039),(54,364649860,109395051),(55,474044911,142213566),(56,616258477,184877635),(57,801136112,240340926),(58,1041477038,312443204),(59,1353920242,406176165),(60,1760096407,528029014),(61,2288125421,686437718),(62,2974563139,892369033),(63,3866932172,1160079743),(64,5027011915,1508103665),(65,6535115580,1960534765),(66,8495650345,2548695194),(67,11044345539,3313303752),(68,14357649291,4307294878),(69,18664944169,5599483341),(70,24264427510,7279328343),(71,31543755853,9463126846),(72,41006882699,12302064899),(73,53308947598,15992684369),(74,69301631967,20790489679),(75,90092121646,27027636583),(76,117119758229,35135927558),(77,152255685787,45676705825),(78,197932391612,59379717572),(79,257312109184,77193632844),(80,334505742028,100351722697),(81,434857464725,130457239506),(82,565314704231,169594411357),(83,734909115588,220472734764),(84,955381850352,286614555193),(85,1241996405545,372598921751),(86,1614595327296,484378598276),(87,2098973925572,629692177759),(88,2728666103331,818599831087),(89,3547265934418,1064179780412),(90,4611445714830,1383433714536),(91,5994879429366,1798463828897),(92,7793343258263,2338002977565),(93,10131346235828,3039403870835),(94,13170750106663,3951225032085),(95,17121975138748,5136592541711),(96,22258567680459,6677570304224),(97,28936137984683,8680841395491),(98,37616979380174,11285093814138),(99,48902073194312,14670621958379),(100,63572695152691,0)) select case when l.lv=100 then c.total else c.total+floor((least(49500,greatest(0,x))-5*l.lv*(l.lv-1))::numeric/(10*l.lv)*c.cost)::bigint end from (select least(100,1+floor((sqrt(1+8*least(49500,greatest(0,x))::numeric/10)-1)/2))::int lv) l join curve c on c.lv=l.lv $$;
create or replace function private.guardian_profile(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); g private.guardian_profiles; legacy jsonb; seed_name text:='아스트라'; seed_xp bigint:=0; n text; x bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_action not in ('load','save') or p_action is null then raise exception 'Invalid action';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload';end if;
 if p_action='save' then
  if not (p_payload ? 'xp') or jsonb_typeof(p_payload)<>'object' or jsonb_typeof(p_payload->'xp')<>'number' or (p_payload->>'xp') !~ '^[0-9]{1,15}$' then raise exception 'Invalid experience';end if;
  x:=(p_payload->>'xp')::bigint;if x<0 or x>63572695152691 then raise exception 'Invalid experience';end if;
  if p_payload ? 'nickname' then
   if jsonb_typeof(p_payload->'nickname')<>'string' then raise exception 'Invalid nickname';end if;
   n:=normalize(btrim(p_payload->>'nickname'),NFC);
   if char_length(n) not between 1 and 12 or n ~ '[<>[:cntrl:]]' then raise exception 'Invalid nickname';end if;
  end if;
  select data->'guardian' into legacy from public.player_progress where user_id=uid;
  if jsonb_typeof(legacy->'nickname')='string' and char_length(btrim(legacy->>'nickname')) between 1 and 12 and (legacy->>'nickname') !~ '[<>[:cntrl:]]' then seed_name:=normalize(btrim(legacy->>'nickname'),NFC);end if;
  if jsonb_typeof(legacy->'xp')='number' and (legacy->>'xp') ~ '^[0-9]{1,15}$' then seed_xp:=case when legacy->>'curve'='2' then least(63572695152691,(legacy->>'xp')::bigint) else private.guardian_legacy_xp((legacy->>'xp')::bigint) end;end if;
  insert into private.guardian_profiles(user_id,nickname,xp) values(uid,coalesce(n,seed_name),greatest(x,seed_xp))
  on conflict(user_id) do update set nickname=coalesce(n,guardian_profiles.nickname),xp=greatest(guardian_profiles.xp,excluded.xp),updated_at=now();
 end if;
 select * into g from private.guardian_profiles where user_id=uid;
 return jsonb_build_object('owner',uid,'guardian',case when g.user_id is null then null else jsonb_build_object('nickname',g.nickname,'xp',g.xp,'curve',2) end);
end;
$$;
