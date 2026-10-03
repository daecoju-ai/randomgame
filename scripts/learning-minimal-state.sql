-- Preserve all existing historical tables. New writes use bounded per-user state only.
alter table private.learning_profiles add column if not exists last_start uuid;
create table if not exists private.learning_current (like private.learning_sessions including defaults including constraints, primary key(user_id), foreign key(user_id) references auth.users(id) on delete cascade);
create table if not exists private.learning_daily (like private.learning_rewards including defaults including constraints, primary key(user_id,subject), foreign key(user_id) references auth.users(id) on delete cascade);
alter table private.learning_current enable row level security;
alter table private.learning_daily enable row level security;
revoke all on private.learning_current,private.learning_daily from public,anon,authenticated;
-- Carry only an existing in-progress session forward without removing historical data.
insert into private.learning_current select distinct on(user_id) * from private.learning_sessions where finished_at is null order by user_id,started_at desc,id desc on conflict(user_id) do nothing;
create or replace function private.learning(p_action text,p_request uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();today date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;r private.learning_current%rowtype;e jsonb;prefix jsonb;fp text;tokens text[]:=array[]::text[];step int:=0;mistakes int:=0;streak int:=0;heard boolean:=false;last_ms int:=-1;elapsed numeric;v jsonb;reward jsonb:='{}';gr int:=0;di int:=0;claim_count int;prefs jsonb;active jsonb;request_ms bigint;highwater uuid;
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
 select * into r from private.learning_current where user_id=uid and id=p_request;
 if not found then
 -- UUIDv7 order is the per-account high-water mark. Retired start IDs cannot mint rewards again.
 if substring(p_request::text,15,1)<>'7' then return jsonb_build_object('error','OLD_CLIENT','message','새로고침 후 새 학습을 시작해 주세요.');end if;
 request_ms:=('x'||substring(replace(p_request::text,'-',''),1,12))::bit(48)::bigint;
 select last_start into highwater from private.learning_profiles where user_id=uid;
 if request_ms < extract(epoch from clock_timestamp())*1000-7200000 or request_ms > extract(epoch from clock_timestamp())*1000+5000 or (highwater is not null and p_request<=highwater) then return jsonb_build_object('error','STALE','message','이전 요청입니다. 새 학습을 시작해 주세요.');end if;
 prefix:=p_payload->'prefixes';
 if jsonb_typeof(prefix) is distinct from 'array' or jsonb_array_length(prefix) not between 1 and 20 then return jsonb_build_object('error','QUESTION','message','문제 정보를 확인해 주세요.');end if;
 fp:=encode(extensions.digest(convert_to(concat_ws('|',p_payload->>'id',p_payload->>'version',p_payload->>'subject',p_payload->>'domain',p_payload->>'mode',(select string_agg(x,':' order by n) from jsonb_array_elements_text(prefix) with ordinality a(x,n))),'UTF8'),'sha256'),'hex');
 if fp <> coalesce(p_payload->>'fingerprint','') or fp not in ('c9feeec6221e25f75bc8612a7f0e8b559143e0e9816c42421f7abc9d2ca8925c','318aa1981bad22816621fc53cabf164408a07e1f959c1f8e64a4e6dfe4db68cb','a6e8f8c908aa447cc6f9e45ed3fd17cac59ef06575249d4f3d9659aa3cb5c9d9','ee831dc435260bdb629b38ec9069040914031b80692a504d749ffbf18d3f8d24','470a9bbab6c8ad0de15021495417a111e1e3a59e8a79f4044db6d6eae37fe144','8a6650f56597ca3bf801ed659ea18b8e531bf4482266a25947222bc28124087d','4f0cdb8d5fd9d9a153b4d84a6a089f81aec67c15f5289c62edf12bc6375539f8') then return jsonb_build_object('error','QUESTION','message','검수되지 않았거나 버전이 바뀐 문제입니다.');end if;
 insert into private.learning_current(user_id,id,question_id,question_version,subject,domain,mode,prefixes) values(uid,p_request,p_payload->>'id',(p_payload->>'version')::int,p_payload->>'subject',p_payload->>'domain',p_payload->>'mode',prefix) on conflict(user_id) do update set id=excluded.id,question_id=excluded.question_id,question_version=excluded.question_version,subject=excluded.subject,domain=excluded.domain,mode=excluded.mode,prefixes=excluded.prefixes,started_at=clock_timestamp(),finished_at=null,result=null,events=null returning * into r;
 update private.learning_profiles set last_start=p_request,last_area=r.subject||'/'||r.domain,updated_at=clock_timestamp() where user_id=uid;
 end if;
 active:=jsonb_build_object('id',r.id,'questionId',r.question_id,'version',r.question_version,'started',r.started_at,'completed',r.finished_at is not null);
elsif p_action='finish' then
 select * into r from private.learning_current where user_id=uid and id=(p_payload->>'run')::uuid for update;
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
 -- Existing wallet initializer and one atomic reward claim per subject / KST day.
 perform public.forge_adventure('load',null,'{}');
 if exists(select 1 from private.learning_daily where user_id=uid and subject=r.subject and day=today) or exists(select 1 from private.learning_rewards where user_id=uid and subject=r.subject and day=today) then claim_count:=0;else claim_count:=1;end if;
 if claim_count=1 then gr:=30;di:=1;else gr:=1;di:=0;end if;
 insert into private.learning_daily(user_id,day,subject,run_id,gold,diamonds) values(uid,today,r.subject,r.id,gr,di) on conflict(user_id,subject) do update set day=excluded.day,run_id=excluded.run_id,gold=excluded.gold,diamonds=excluded.diamonds;
 update private.adventure_wallets set gold=gold+gr,diamonds=diamonds+di,updated_at=clock_timestamp() where user_id=uid;
 reward:=jsonb_build_object('gold',gr,'diamonds',di,'dailyClaimed',true,'dailyBonus',claim_count=1);
 v:=jsonb_build_object('reward',reward,'mistakes',mistakes);
 update private.learning_current set result=v,events=null,prefixes='[]'::jsonb,question_id='',question_version=0,subject='',domain='',mode='',finished_at=clock_timestamp() where user_id=uid and id=r.id;
 return v;
end if;
return jsonb_build_object('owner',uid,'profile',(select preferences from private.learning_profiles where user_id=uid),'lastArea',(select last_area from private.learning_profiles where user_id=uid),'active',active,'daily',coalesce((select jsonb_agg(subject) from (select subject from private.learning_daily where user_id=uid and day=today union select subject from private.learning_rewards where user_id=uid and day=today) flags),'[]'::jsonb));
end $$;
