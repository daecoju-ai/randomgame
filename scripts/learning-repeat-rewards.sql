-- Repeat rewards, compact future completion records. Existing progress is preserved.
create or replace function private.learning(p_action text,p_request uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();today date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;r private.learning_sessions%rowtype;e jsonb;prefix jsonb;fp text;tokens text[]:=array[]::text[];step int:=0;mistakes int:=0;streak int:=0;heard boolean:=false;last_ms int:=-1;elapsed numeric;v jsonb;reward jsonb:='{}';gr int:=0;di int:=0;claim_count int;prefs jsonb;active jsonb;
begin
if uid is null then raise exception 'Authentication required';end if;
if p_action not in('load','profile','start','finish') or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>14000 or (p_action<>'load' and p_request is null) then return jsonb_build_object('error','REQUEST','message','학습 요청을 확인해 주세요.');end if;
-- Profile row serializes starts, finishes and daily reward claims for each account.
insert into private.learning_profiles(user_id) values(uid) on conflict do nothing;
perform 1 from private.learning_profiles where user_id=uid for update;
if p_action='profile' then
 prefs:=p_payload->'preferences';
 if prefs->>'school' not in('elementary','middle','high','general') or coalesce((prefs->>'grade')::int,0) not between 1 and 12 or jsonb_typeof(prefs->'subjects') is distinct from 'array' or jsonb_array_length(prefs->'subjects')>8 then return jsonb_build_object('error','PROFILE','message','학습 프로필을 확인해 주세요.');end if;
 if exists(select 1 from jsonb_array_elements_text(prefs->'subjects') s where s not in('math','english','korean','social','science','law','certification','ncs')) then return jsonb_build_object('error','PROFILE','message','과목을 확인해 주세요.');end if;
 update private.learning_profiles set preferences=jsonb_build_object('school',prefs->>'school','grade',(prefs->>'grade')::int,'subjects',prefs->'subjects'),updated_at=clock_timestamp() where user_id=uid;
elsif p_action='start' then
 select * into r from private.learning_sessions where user_id=uid and id=p_request;
 if not found then
 prefix:=p_payload->'prefixes';
 if jsonb_typeof(prefix) is distinct from 'array' or jsonb_array_length(prefix) not between 1 and 20 then return jsonb_build_object('error','QUESTION','message','문제 정보를 확인해 주세요.');end if;
 fp:=encode(extensions.digest(convert_to(concat_ws('|',p_payload->>'id',p_payload->>'version',p_payload->>'subject',p_payload->>'domain',p_payload->>'mode',(select string_agg(x,':' order by n) from jsonb_array_elements_text(prefix) with ordinality a(x,n))),'UTF8'),'sha256'),'hex');
 if fp <> coalesce(p_payload->>'fingerprint','') or fp not in ('c9feeec6221e25f75bc8612a7f0e8b559143e0e9816c42421f7abc9d2ca8925c','470a9bbab6c8ad0de15021495417a111e1e3a59e8a79f4044db6d6eae37fe144','8a6650f56597ca3bf801ed659ea18b8e531bf4482266a25947222bc28124087d','4f0cdb8d5fd9d9a153b4d84a6a089f81aec67c15f5289c62edf12bc6375539f8') then return jsonb_build_object('error','QUESTION','message','검수되지 않았거나 버전이 바뀐 문제입니다.');end if;
 insert into private.learning_sessions(user_id,id,question_id,question_version,subject,domain,mode,prefixes) values(uid,p_request,p_payload->>'id',(p_payload->>'version')::int,p_payload->>'subject',p_payload->>'domain',p_payload->>'mode',prefix) returning * into r;
 update private.learning_profiles set last_area=r.subject||'/'||r.domain,updated_at=clock_timestamp() where user_id=uid;
 end if;
 active:=jsonb_build_object('id',r.id,'questionId',r.question_id,'version',r.question_version,'started',r.started_at,'completed',r.finished_at is not null);
elsif p_action='finish' then
 select * into r from private.learning_sessions where user_id=uid and id=(p_payload->>'run')::uuid for update;
 if not found then return jsonb_build_object('error','RUN','message','학습 시작 기록을 찾지 못했습니다.');end if;
 if r.result is not null then return r.result;end if;
 elapsed:=extract(epoch from clock_timestamp()-r.started_at)*1000;
 if elapsed>7200000 or jsonb_typeof(p_payload->'events') is distinct from 'array' or jsonb_array_length(p_payload->'events') not between 1 and 80 then return jsonb_build_object('error','EXPIRED','message','학습 기록이 만료되었습니다. 새 문제를 시작하세요.');end if;
 for e in select value from jsonb_array_elements(p_payload->'events') loop
 if (e->>'ms') is null or (e->>'ms') !~ '^\d+$' or (e->>'ms')::int<last_ms or (e->>'ms')::int>elapsed+3000 then return jsonb_build_object('error','EVENTS','message','풀이 시간을 확인해 주세요.');end if;last_ms:=(e->>'ms')::int;
 if e->>'kind'='listen' then heard:=true;continue;end if;
 if e->>'kind'<>'pick' or e->>'token' is null or length(e->>'token')>100 or position(chr(31) in e->>'token')>0 or step>=jsonb_array_length(r.prefixes) then return jsonb_build_object('error','EVENTS','message','타일 선택 기록을 확인해 주세요.');end if;
 fp:=encode(extensions.digest(convert_to(array_to_string(tokens||array[e->>'token'],chr(31)),'UTF8'),'sha256'),'hex');
 if fp=r.prefixes->>step then tokens:=tokens||array[e->>'token'];step:=step+1;streak:=streak+1;else mistakes:=mistakes+1;streak:=0;end if;
 end loop;
 if step<>jsonb_array_length(r.prefixes) then return jsonb_build_object('error','INCOMPLETE','message','정답 타일을 끝까지 완성하세요.');end if;
 if r.subject='english' and (not heard or elapsed<1000) then return jsonb_build_object('error','LISTEN','message','영어 문장을 들은 뒤 완성하세요.');end if;
 insert into private.learning_mastery(user_id,question_id,subject,domain,attempts,correct,errors,streak,last_version) values(uid,r.question_id,r.subject,r.domain,1,case when mistakes=0 then 1 else 0 end,mistakes,streak,r.question_version) on conflict(user_id,question_id) do update set attempts=private.learning_mastery.attempts+1,correct=private.learning_mastery.correct+case when mistakes=0 then 1 else 0 end,errors=private.learning_mastery.errors+mistakes,streak=case when mistakes=0 then private.learning_mastery.streak+1 else 0 end,last_version=r.question_version,last_at=clock_timestamp();
 -- Existing wallet initializer and one atomic reward claim per subject / KST day.
 perform public.forge_adventure('load',null,'{}');
 insert into private.learning_rewards(user_id,day,subject,run_id,gold,diamonds) values(uid,today,r.subject,r.id,30,1) on conflict do nothing;
 get diagnostics claim_count=row_count;
 if claim_count=1 then gr:=30;di:=1;else gr:=1;di:=0;end if;
 update private.adventure_wallets set gold=gold+gr,diamonds=diamonds+di,updated_at=clock_timestamp() where user_id=uid;
 reward:=jsonb_build_object('gold',gr,'diamonds',di,'dailyClaimed',true,'dailyBonus',claim_count=1);
 v:=jsonb_build_object('owner',uid,'run',r.id,'questionId',r.question_id,'version',r.question_version,'mistakes',mistakes,'streak',streak,'reward',reward,'mastery',(select jsonb_build_object('attempts',lm.attempts,'correct',lm.correct,'errors',lm.errors,'streak',lm.streak,'lastAt',lm.last_at,'version',lm.last_version) from private.learning_mastery lm where lm.user_id=uid and lm.question_id=r.question_id));
 update private.learning_sessions set result=v,events=null,prefixes='[]'::jsonb,finished_at=clock_timestamp() where user_id=uid and id=r.id;
 return v;
end if;
return jsonb_build_object('owner',uid,'profile',(select preferences from private.learning_profiles where user_id=uid),'lastArea',(select last_area from private.learning_profiles where user_id=uid),'active',active,'mastery',coalesce((select jsonb_object_agg(question_id,jsonb_build_object('attempts',attempts,'correct',correct,'errors',errors,'streak',lm.streak,'lastAt',last_at,'version',last_version)) from private.learning_mastery lm where user_id=uid),'{}'::jsonb),'daily',coalesce((select jsonb_agg(subject) from private.learning_rewards where user_id=uid and day=today),'[]'::jsonb));
end $$;
