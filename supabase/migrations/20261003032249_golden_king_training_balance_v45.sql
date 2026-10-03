-- Event-only treasure hunting multiplier, calibrated against 30 days of free growth.
create or replace function private.event_simulate(c jsonb,actions jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare kind text:=c->>'kind';dur int:=case when kind='luck' then 90 else 60 end;seed bigint:=(c->>'seed')::bigint;us jsonb[]:=array[null,null,null,null,null,null]::jsonb[];a jsonb;u jsonb;b jsonb;t int;i int;j int;si int;idx int;n int;typ int;tier int;r bigint;last_t int:=-1;lastspin int:=-8;spins int:=0;progress double precision:=0;px double precision;py double precision;d double precision;ux numeric;uy numeric;bx numeric;buff_y numeric;buff numeric;hit bigint;total bigint;control numeric;damage bigint:=0;gold int:=0;stage int:=0;hp bigint;maxhp bigint;kills int:=0;life int:=30;king boolean:=false;kingat int;ore int[]:=array[1200,3500,8000,18000,45000,110000,260000];hist jsonb:='[]';unitdamage jsonb:='{}';ky text;take bigint;duplicate boolean;
begin
if jsonb_typeof(actions) is distinct from 'array' or jsonb_array_length(actions)>120 then raise exception 'Invalid event actions';end if;
for a in select value from jsonb_array_elements(actions) loop
 if jsonb_typeof(a->'t') is distinct from 'number' or (a->>'t') !~ '^\d+$' or (a->>'t')::int<last_t or (a->>'t')::int>=dur or a->>'kind' not in('place','spin') or (a->>'slot') !~ '^[0-5]$' then raise exception 'Invalid action time';end if;last_t:=(a->>'t')::int;
end loop;
hp:=case when kind='slime' then 90000 when kind='mine' then ore[1] else 1400 end;maxhp:=hp;
for t in 0..dur-1 loop
 for a in select value from jsonb_array_elements(actions) where (value->>'t')::int=t loop
 si:=(a->>'slot')::int+1;
 if a->>'kind'='place' and kind<>'luck' then
 if (a->>'index') !~ '^\d+$' then raise exception 'Invalid roster selection';end if;idx:=(a->>'index')::int;u:=c->'roster'->idx;
 if u is not null then duplicate:=false;for j in 1..6 loop if j<>si and (us[j]->>'index')::int=idx then duplicate:=true;end if;end loop;if not duplicate then us[si]:=u||jsonb_build_object('index',idx);end if;end if;
 elsif a->>'kind'='spin' and kind='luck' and t-lastspin>=8 and spins<12 then
 r:=(seed*16807+t*9973)%2147483647;n:=r%1000;tier:=case when n<20 then 5 when n<80 then 4 when n<250 then 3 when n<550 then 2 else 1 end;
 typ:=case when tier=5 then (r/1000)%17 else (array[8,10,0,7,9,1])[((r/1000)%6)::int+1] end;
 u:=private.event_unit(typ,tier,c->'growth');us[si]:=u;lastspin:=t;spins:=spins+1;hist:=hist||jsonb_build_array(u||jsonb_build_object('at',t));end if;
 end loop;
 if kind='mine' then px:=30;py:=50;else d:=((progress-floor(progress))*280);if d<50 then px:=5+d;py:=5;elsif d<140 then px:=55;py:=5+d-50;elsif d<190 then px:=55-(d-140);py:=95;else px:=5;py:=95-(d-190);end if;end if;
 total:=0;control:=0;
 for i in 1..6 loop u:=us[i];if u is null then continue;end if;ux:=case when i%2=0 then 40 else 20 end;uy:=30+((i-1)/2)*20;
 if kind<>'mine' and sqrt(power(ux-px,2)+power(uy-py,2))>(u->>'reach')::numeric then continue;end if;buff:=1;
 for j in 1..6 loop b:=us[j];bx:=case when j%2=0 then 40 else 20 end;buff_y:=30+((j-1)/2)*20;
 if coalesce((b->>'support')::boolean,false) and sqrt(power(ux-bx,2)+power(uy-buff_y,2))<=40 then buff:=buff+coalesce((array[.35,.25,.45,.55,.15,.25])[(b->>'e')::int+1],0);end if;end loop;
 hit:=floor((u->>'dps')::numeric*buff*case when kind='slime' then 100.0/180*2.4 else 1 end);if (kind='slime' and king) or (kind='mine' and stage>=7) then hit:=0;end if;total:=total+hit;ky:=(u->>'type')||':'||(u->>'tier');unitdamage:=jsonb_set(unitdamage,array[ky],to_jsonb(coalesce((unitdamage->>ky)::bigint,0)+hit));
 if (u->>'e')::int in(1,2,3,4,6,8) then control:=greatest(control,least(.65,.16*(u->>'control')::numeric+case when (u->>'e')::int=1 then .18 else 0 end));end if;
 end loop;
 damage:=damage+total;
 if kind='slime' then hp:=greatest(0,hp-total);n:=((seed*16807+t*9973)%2147483647)%1000;gold:=gold+(total/220)*case when n<8 then 12 when n<80 then 5 when n<320 then 2 else 1 end;
 if hp=0 and not king then king:=true;kingat:=t+1;gold:=gold+150;end if;if not king then progress:=progress+.019*(1-control);end if;
 elsif kind='mine' then hit:=total;while hit>0 and stage<7 loop take:=least(hp,hit);hp:=hp-take;hit:=hit-take;if hp=0 then stage:=stage+1;hp:=case when stage<7 then ore[stage+1] else 0 end;maxhp:=hp;end if;end loop;
 else hit:=total;while hit>0 loop take:=least(hp,hit);hp:=hp-take;hit:=hit-take;if hp=0 then kills:=kills+1;maxhp:=1400+kills*170;hp:=maxhp;end if;end loop;progress:=progress+.03*(1-control);if progress>=1 then progress:=0;life:=life-1;hp:=maxhp;end if;end if;
end loop;
return jsonb_build_object('damage',damage,'gold',gold,'stage',stage,'hp',hp,'kills',kills,'life',life,'king',king,'kingAt',kingat,'history',hist,'unitDamage',unitdamage,'grade',case when damage>=90000 then 'S' when damage>=55000 then 'A' when damage>=25000 then 'B' else 'C' end);
end $$;
