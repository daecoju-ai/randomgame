-- Align server talisman copies with the advertised ★20 maximum.
create or replace function public.forge_talisman(operation text, request_id uuid default null, draw_count int default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); w private.talisman_wallets%rowtype; event private.talisman_events%rowtype;
 today date:=(now() at time zone 'Asia/Seoul')::date; result jsonb; drops jsonb:='[]'; picked text;
 r double precision; rolled_grade int; copies int; i int; message text:='';
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if operation not in ('load','daily','draw') or operation is null or draw_count is null or draw_count not in (1,10) then raise exception 'Invalid action'; end if;
 if operation<>'load' and request_id is null then raise exception 'Request ID required'; end if;
 insert into private.talisman_wallets(user_id) values(uid) on conflict do nothing;
 select * into w from private.talisman_wallets where user_id=uid for update;
 if operation<>'load' then
  select * into event from private.talisman_events e where e.user_id=uid and e.request_id=forge_talisman.request_id;
  if found then
   if event.operation<>operation or event.draw_count<>draw_count then raise exception 'Request ID reused'; end if;
   return event.response;
  end if;
 end if;
 if operation='daily' then
  if w.daily_date=today then message:='오늘의 소환권은 이미 받았습니다.';
  else w.tickets:=w.tickets+1;w.daily_date:=today;message:='일일 소환권 1장을 받았습니다.';end if;
 elsif operation='draw' then
  if w.tickets<draw_count then return jsonb_build_object('error','TICKETS','message','소환권이 부족합니다.'); end if;
  w.tickets:=w.tickets-draw_count;
  for i in 1..draw_count loop
   r:=random();rolled_grade:=case when r<0.6 then 0 when r<0.9 then 1 when r<0.99 then 2 else 3 end;
   if w.pity_legend>=99 then rolled_grade:=3;elsif w.pity_epic>=49 then rolled_grade:=greatest(rolled_grade,2);elsif w.pity_rare>=9 then rolled_grade:=greatest(rolled_grade,1);end if;
   select c.id into picked from private.talisman_catalog c where c.grade=rolled_grade order by random() limit 1;
   copies:=coalesce((w.owned->>picked)::int,0);
   if copies>=20 then w.dust:=w.dust+case rolled_grade when 0 then 1 when 1 then 3 when 2 then 10 else 30 end;
   else w.owned:=jsonb_set(w.owned,array[picked],to_jsonb(copies+1));end if;
   drops:=drops||jsonb_build_array(jsonb_build_object('id',picked,'before',copies,'after',least(20,copies+1),'dust',case when copies>=20 then case rolled_grade when 0 then 1 when 1 then 3 when 2 then 10 else 30 end else 0 end));
   w.pity_rare:=case when rolled_grade>=1 then 0 else w.pity_rare+1 end;
   w.pity_epic:=case when rolled_grade>=2 then 0 else w.pity_epic+1 end;
   w.pity_legend:=case when rolled_grade=3 then 0 else w.pity_legend+1 end;
  end loop;
 end if;
 update private.talisman_wallets set tickets=w.tickets,dust=w.dust,owned=w.owned,pity_rare=w.pity_rare,pity_epic=w.pity_epic,pity_legend=w.pity_legend,daily_date=w.daily_date,updated_at=now() where user_id=uid;
 result:=jsonb_build_object('owner',uid,'tickets',w.tickets,'dust',w.dust,'owned',w.owned,'pity',jsonb_build_array(w.pity_rare,w.pity_epic,w.pity_legend),'dailyAvailable',w.daily_date is distinct from today,'drops',drops,'message',message);
 if operation<>'load' then insert into private.talisman_events(user_id,request_id,operation,draw_count,response) values(uid,request_id,operation,draw_count,result);end if;
 return result;
end $$;
revoke all on function public.forge_talisman(text,uuid,int) from public,anon;
grant execute on function public.forge_talisman(text,uuid,int) to authenticated;
