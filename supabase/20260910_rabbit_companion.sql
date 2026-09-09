-- Lets students buy rabbit companions and renders their count beside their plant.
alter table public.users add column if not exists rabbit_count integer not null default 0;

create or replace function public.buy_rabbit_companion()
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
  update public.users
  set points = points - 3, rabbit_count = rabbit_count + 1
  where id = auth.uid() and points >= 3
  returning * into result;

  if result.id is null then raise exception 'Insufficient points'; end if;
  return result;
end $$;

revoke all on function public.buy_rabbit_companion() from public;
grant execute on function public.buy_rabbit_companion() to authenticated;
