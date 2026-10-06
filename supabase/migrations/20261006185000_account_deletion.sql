-- Google Play account deletion support.
-- All game tables that reference auth.users use ON DELETE CASCADE (campaign winner uses SET NULL).
create or replace function public.delete_forge_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = uid;
end
$$;
revoke all on function public.delete_forge_account() from public, anon;
grant execute on function public.delete_forge_account() to authenticated;
