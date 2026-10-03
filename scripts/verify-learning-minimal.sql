begin;
do $test$ declare uid uuid:=gen_random_uuid();run uuid;old_run uuid;v jsonb;again jsonb;stamp bigint:=floor(extract(epoch from clock_timestamp())*1000);i int;proof jsonb:='{"id":"E1-MATH-NUM-000001","version":1,"subject":"math","domain":"number_operations","mode":"choice","prefixes":["ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d"],"fingerprint":"318aa1981bad22816621fc53cabf164408a07e1f959c1f8e64a4e6dfe4db68cb"}';begin
insert into auth.users(id,aud,role,email) values(uid,'authenticated','authenticated','learning-minimal-'||uid::text||'@example.invalid');
perform set_config('request.jwt.claim.sub',uid::text,true);
insert into public.player_progress(user_id,data) values(uid,'{"version":4,"essence":0,"levels":{},"skills":{}}');
for i in 0..102 loop
run:=(lpad(to_hex(stamp+i),12,'0')||'70008000000000000000')::uuid;
v:=public.forge_learning('start',run,proof);
if v ? 'error' then raise exception 'start failed %',v;end if;
v:=public.forge_learning('finish',gen_random_uuid(),jsonb_build_object('run',run,'events','[{"kind":"pick","token":"5","ms":0}]'::jsonb));
if v ? 'error' or (v->'reward'->>'gold')::int<>(case when i=0 then 30 else 1 end) then raise exception 'reward failed %',v;end if;
again:=public.forge_learning('finish',gen_random_uuid(),jsonb_build_object('run',run,'events','[]'::jsonb));
if again<>v then raise exception 'retry changed';end if;
if old_run is not null then
 again:=public.forge_learning('start',old_run,proof);if again->>'error'<>'STALE' then raise exception 'old start replay accepted %',again;end if;
 again:=public.forge_learning('finish',gen_random_uuid(),jsonb_build_object('run',old_run,'events','[{"kind":"pick","token":"5","ms":0}]'::jsonb));if again->>'error'<>'RUN' then raise exception 'old completion replay accepted';end if;
end if;old_run:=run;
end loop;
if (select count(*) from private.learning_current where user_id=uid)<>1 then raise exception 'session accumulated';end if;
if exists(select 1 from private.learning_mastery where user_id=uid) then raise exception 'question stats stored';end if;
if exists(select 1 from private.learning_current where user_id=uid and (question_id<>'' or prefixes<>'[]'::jsonb or events is not null)) then raise exception 'question history stored';end if;
if (select gold from private.adventure_wallets where user_id=uid)<>132 then raise exception 'wallet total';end if;
perform public.forge_learning('profile',gen_random_uuid(),'{"preferences":{"school":"elementary","grade":1,"subjects":["math"]}}');v:=public.forge_learning('load',null,'{}');if v ? 'mastery' or v->'profile'->>'grade'<>'1' then raise exception 'profile/statistics wrong';end if;
end $test$;
select 'PASS: 103 completions, one session, no question history, no mastery, idempotent rewards, retired start/finish rejected, freely changed profile (rollback)' as checks;
rollback;
