begin;
do $$
declare uid uuid;k text;v jsonb;rid uuid;old uuid;gold_before bigint;dia_before bigint;pending jsonb;
begin
select user_id into uid from private.adventure_wallets limit 1;
perform set_config('request.jwt.claim.sub',uid::text,true);
perform public.forge_events('load',null,'{}');
select gold,diamonds,pending_battle into gold_before,dia_before,pending from private.adventure_wallets where user_id=uid;
foreach k in array array['slime','mine','luck'] loop
old:=gen_random_uuid();rid:=gen_random_uuid();
update private.adventure_wallets set active_run=old,run_started=clock_timestamp()-interval '1 hour' where user_id=uid;
update private.event_profiles set day=(clock_timestamp() at time zone 'Asia/Seoul')::date,active_run=null,used='{}',extra_credit=0 where user_id=uid;
perform set_config('role','authenticated',true);
v:=public.forge_events('start',rid,jsonb_build_object('kind',k));
perform set_config('role','postgres',true);
assert v->'active'->>'id'=rid::text,'entry failed';
assert v->'active'->'config'->>'kind'=k,'wrong game';
assert (select active_run is null and run_started is null and gold=gold_before and diamonds=dia_before and pending_battle is not distinct from pending from private.adventure_wallets where user_id=uid),'main rewards changed';
assert (v->'used'->>k)::int=1,'entry count wrong';
v:=public.forge_events('start',rid,jsonb_build_object('kind',k));assert v->'active'->>'id'=rid::text,'retry lost run';
update private.event_profiles set active_run=null where user_id=uid;
update private.adventure_wallets set active_run=old,run_started=clock_timestamp() where user_id=uid;
v:=public.forge_events('start',gen_random_uuid(),jsonb_build_object('kind',k));
assert v->>'error'='USED','daily limit bypass';
assert (select active_run=old from private.adventure_wallets where user_id=uid),'rejected entry changed main run';
end loop;
end $$;
rollback;
select true as three_authenticated_entries_and_reward_preservation_verified;