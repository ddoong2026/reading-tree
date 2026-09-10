create table if not exists public.user_animals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  animal_type text not null check (animal_type in ('grasshopper','frog','snake','hawk','rabbit','fox')),
  created_at timestamptz not null default now(), unique (user_id, animal_type)
);
alter table public.user_animals enable row level security;
drop policy if exists "Authenticated users can view animals" on public.user_animals;
create policy "Authenticated users can view animals" on public.user_animals for select to authenticated using (true);
insert into public.user_animals (user_id, animal_type) select id, 'rabbit' from public.users where rabbit_count > 0 on conflict do nothing;
create or replace function public.buy_ecosystem_animal(p_animal text) returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users; needed text; cost integer;
begin
  select case p_animal when 'grasshopper' then null when 'frog' then 'grasshopper' when 'snake' then 'frog' when 'hawk' then 'snake' when 'rabbit' then null when 'fox' then 'rabbit' end,
         case p_animal when 'grasshopper' then 2 when 'frog' then 3 when 'snake' then 4 when 'hawk' then 5 when 'rabbit' then 3 when 'fox' then 5 end into needed, cost;
  if cost is null or exists(select 1 from public.user_animals where user_id=auth.uid() and animal_type=p_animal) or (needed is not null and not exists(select 1 from public.user_animals where user_id=auth.uid() and animal_type=needed)) then raise exception 'Animal is locked or already owned'; end if;
  update public.users set points=points-cost where id=auth.uid() and points>=cost returning * into result;
  if result.id is null then raise exception 'Insufficient points'; end if;
  insert into public.user_animals(user_id,animal_type) values(auth.uid(),p_animal); return result;
end $$;
revoke all on function public.buy_ecosystem_animal(text) from public; grant execute on function public.buy_ecosystem_animal(text) to authenticated;
