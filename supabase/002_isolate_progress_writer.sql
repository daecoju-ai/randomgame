create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
alter function public.save_player_progress(jsonb,bigint) set schema private;
create function public.save_player_progress(payload jsonb, expected_revision bigint)
returns table(data jsonb, revision bigint)
language sql security invoker set search_path='' as $$
 select * from private.save_player_progress(payload,expected_revision);
$$;
revoke all on function public.save_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_player_progress(jsonb,bigint) to authenticated;
