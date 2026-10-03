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
 if fp <> coalesce(p_payload->>'fingerprint','') or fp not in ('af6606cf921df958a14b2c753e6fcf3de5e494499292351ffc11134acc746dd0','075b29fd6847a5c04542319015e8bf5c7ddb8fb24f1b932bcfb39690f8b5529f','c83426c2f8fd822e9c40f0b4c11066cea49b3e034ca545747aa2abe3db1d4224','434856821b99e98473f99f4e287655de38254f3e6ea651bcdd20ccdd504de773','4e9fe6f4829468d15db780d7bd2b7632f76a29bde0206ffb24f07721c0e8a298','683ad289ec412f72345d0286735cbed5d261cffeedc173b14bba003bec3ba4e8','f5b699f5748fab0724741af7ac22ef7ea91195a45e7c3f4ff56a907c7605df7e','06421599df2999c378165b0dd408d70b56bedf9ce7934f5a6d3d864f93f9a78a','78b740816c810ec06bf71deb2a0fe8c94b04bbfb7d0766654407c88051e71d06','8222494d42e0af373a551e45f8f346645b875fa40347cc4c811ddbeb66ff4d95','bf8002a6f26b10a25bade1adecff0a53611d05808e19bad22f3fc9023fd1a52d','d2016f6a5218e11210b2ea4e61d9bc4f1b23acab7f50c31bc746c16faddf2685','523c6989c4bea831fe01d2d4309427fa2f0a3f097ce4018689628e58d4dfc19c','786b50f82fbf401ac7870b95dbd09e90f41fcedfdc2855e9af6beeb05767ff1b','5372271bd542b8806ef6e02a6a486132bf404f5f5d672cb42de2201fc042d694','951be00ea26a9ca39df56f9313e6bccd1a2dbc51b7966627d9e0de5c0454ace6','6db18dcfcbd1ba3b9f248903aa34e6dd6119c7a74e6dd0f40dd7f68471e421ee','23a983a3bddce5ebb1f73c0d661decf8faa17ef990574641a9ad75ef63fc6dc4','c9feeec6221e25f75bc8612a7f0e8b559143e0e9816c42421f7abc9d2ca8925c','318aa1981bad22816621fc53cabf164408a07e1f959c1f8e64a4e6dfe4db68cb','a6e8f8c908aa447cc6f9e45ed3fd17cac59ef06575249d4f3d9659aa3cb5c9d9','ee831dc435260bdb629b38ec9069040914031b80692a504d749ffbf18d3f8d24','ced9c3d8563663cded50821b9894bbcd638f7c3d0b1a16ef3c27dd4f75cfbf96','bd17bb8af78d9aa6c1e1a8013e494aeb066d90d03c6e721a07d611f02199252a','f17c7d0e910a208ad1576bdbe77e7e8774758dd52fb3835de92a023580230168','470a9bbab6c8ad0de15021495417a111e1e3a59e8a79f4044db6d6eae37fe144','8a6650f56597ca3bf801ed659ea18b8e531bf4482266a25947222bc28124087d','4f0cdb8d5fd9d9a153b4d84a6a089f81aec67c15f5289c62edf12bc6375539f8','9dcb8581c816ac91ce65038f4df6f237226d793dbdc8334619dbb31158170e2c','ff01324012a14efaa9144e8dfb716690a321b4c1cd8d001815be25beee06eda6','bf607951d5096d12279797a2e0fed0f1ba52a1b660eb024b64d6e5deefe500cd','35040b5d13b403b7f26b968c7540d8c049aaad6f7741eeda6d9dfeec3a53a42e','4c235e9b259fa9733785b7006866394f9ff576bae4cd04a1774794f03b768b46','d719a5e96ec4ed597a39ff4562e1916098943e19455c00dd5b7272791b80ac7e','bfc3b88cdd673a380f5ff4cbf32e3551c8a26f705d967954fa671b43082f7c26','90e3114aecfa9d04fafe96f9fabf87547b8685f47becea7b185bce12f58c412c','f295cd37d9a434af42894e136f15201f71b67a711ec0b7f3396f0c70660daeae','cfe923f33a74aaa61d4a6df5c7a342587ea7e0d2df28914ca353ea4ea3155be8','c1343df25aec85f9cd81425835a857fd32b258a03b246ba2a7b21351408efa8b','a5149fbba5b69680f8c6d74dfac5a04fa5a83412ba2771b72a2e5380a0e6f53e') then return jsonb_build_object('error','QUESTION','message','검수되지 않았거나 버전이 바뀐 문제입니다.');end if;
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
