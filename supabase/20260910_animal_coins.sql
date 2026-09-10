alter table public.users add column if not exists animal_coins integer not null default 0;
create or replace function public.buy_ecosystem_animal(p_animal text) returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users; needed text; cost integer;
begin
  select case p_animal when 'grasshopper' then null when 'frog' then 'grasshopper' when 'snake' then 'frog' when 'hawk' then 'snake' when 'rabbit' then null when 'fox' then 'rabbit' end,
    case p_animal when 'grasshopper' then 4 when 'frog' then 6 when 'snake' then 8 when 'hawk' then 10 when 'rabbit' then 5 when 'fox' then 10 end into needed, cost;
  if cost is null or exists(select 1 from public.user_animals where user_id=auth.uid() and animal_type=p_animal) or (needed is not null and not exists(select 1 from public.user_animals where user_id=auth.uid() and animal_type=needed)) then raise exception 'Animal is locked or already owned'; end if;
  update public.users set animal_coins=animal_coins-cost where id=auth.uid() and animal_coins>=cost returning * into result;
  if result.id is null then raise exception 'Insufficient animal coins'; end if;
  insert into public.user_animals(user_id,animal_type) values(auth.uid(),p_animal); return result;
end $$;
