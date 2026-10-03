begin;
do $$
declare uid uuid;rid uuid;req uuid;adid uuid;v jsonb;f jsonb;g jsonb;coins int;k text;actions jsonb;base_dia bigint;after_dia bigint;
begin
select user_id into uid from private.adventure_wallets limit 1;
perform set_config('request.jwt.claim.sub',uid::text,true);
update private.adventure_wallets set active_run=null,pending_battle='{}',levels=levels||'{"8:4":30,"10:4":30,"0:4":30,"7:4":30,"9:4":30,"1:4":30}',skills=skills||'{"8:4:1":5,"10:4:1":5,"0:4:1":5,"7:4:1":5,"9:4:1":5,"1:4:1":5}' where user_id=uid;
v:=public.forge_events('load',null,'{}');update private.event_profiles set day=current_date-2 where user_id=uid;
update private.event_campaign set winner=null,won_at=null,run_id=null where id='golden_king_first';
select jsonb_agg(jsonb_build_object('kind','place','t',0,'slot',i,'index',i)) into actions from generate_series(0,5) i;
rid:=gen_random_uuid();v:=public.forge_events('start',rid,'{"kind":"slime"}');update private.event_runs set started=clock_timestamp()-interval '65 seconds' where user_id=uid and id=rid;
select diamonds into base_dia from private.adventure_wallets where user_id=uid;
req:=gen_random_uuid();f:=public.forge_events('finish',req,jsonb_build_object('run',rid,'actions',actions));
assert (f->'result'->>'firstWinner')::boolean,'first king failed';assert (f->'result'->>'firstBonus')::int=2000,'first reward missing';
v:=public.forge_events('finish',req,jsonb_build_object('run',rid,'actions',actions));assert v=f,'request replay changed';
v:=public.forge_events('finish',gen_random_uuid(),jsonb_build_object('run',rid,'actions',actions));select diamonds into after_dia from private.adventure_wallets where user_id=uid;assert after_dia-base_dia=2000,'double champion payment';
adid:=gen_random_uuid();v:=public.forge_events('ad_start',adid,jsonb_build_object('target',rid));
begin v:=public.forge_events('ad_claim',gen_random_uuid(),jsonb_build_object('ad',adid));raise exception 'early ad accepted';exception when raise_exception then if sqlerrm='early ad accepted' then raise;end if;end;
update private.event_profiles set ad_at=clock_timestamp()-interval '11 seconds' where user_id=uid;
v:=public.forge_events('ad_claim',gen_random_uuid(),jsonb_build_object('ad',adid));assert (v->'reward'->>'diamonds')::int=0,'champion doubled';
v:=public.forge_events('ad_start',gen_random_uuid(),jsonb_build_object('target',rid));assert v->>'error'='AD_USED','double ad allowed';
adid:=gen_random_uuid();v:=public.forge_events('ad_start',adid,'{"target":"extra"}');update private.event_profiles set ad_at=clock_timestamp()-interval '11 seconds' where user_id=uid;v:=public.forge_events('ad_claim',gen_random_uuid(),jsonb_build_object('ad',adid));assert (v->>'extraCredit')::int=1,'extra ticket missing';
rid:=gen_random_uuid();v:=public.forge_events('start',rid,'{"kind":"slime"}');update private.event_runs set started=clock_timestamp()-interval '65 seconds' where user_id=uid and id=rid;v:=public.forge_events('finish',gen_random_uuid(),jsonb_build_object('run',rid,'actions',actions));assert (v->'result'->>'firstBonus')::int=0,'second champion';
foreach k in array array['mine','luck'] loop
 rid:=gen_random_uuid();v:=public.forge_events('start',rid,jsonb_build_object('kind',k));update private.event_runs set started=clock_timestamp()-interval '100 seconds' where user_id=uid and id=rid;v:=public.forge_events('finish',gen_random_uuid(),jsonb_build_object('run',rid,'actions',case when k='mine' then actions else '[]'::jsonb end));assert v->'completed'->>k='true','missing completion';
end loop;
v:=public.forge_events('box',gen_random_uuid(),'{}');assert (v->>'boxClaimed')::boolean,'box missing';v:=public.forge_events('box',gen_random_uuid(),'{}');assert v->>'error'='BOX','box duplicated';
rid:=gen_random_uuid();g:=public.forge_adventure('run_start',rid,'{"difficulty":"normal"}');v:=public.forge_events('bank',rid,jsonb_build_object('run',rid));coins:=(v->>'bankTaken')::int;assert coins>0 and (v->>'bank')::int=0,'bank not consumed';f:=public.forge_events('bank',rid,jsonb_build_object('run',rid));assert v=f,'bank retry duplicated';
update private.event_profiles set day=current_date-2 where user_id=uid;v:=public.forge_events('load',null,'{}');assert v->'used'='{}'::jsonb and v->'completed'='{}'::jsonb and not (v->>'extraUsed')::boolean,'daily rollover failed';
end $$;
rollback;
select true as rewards_ads_box_bank_and_champion_verified;
