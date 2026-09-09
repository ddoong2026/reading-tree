-- Apply after 20260909_security.sql. Completed flowers remain in the forest
-- when their owner buys the next seed.
create table if not exists public.user_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  owner_name text not null,
  class_id text,
  seed_level integer not null,
  plant_growth integer not null,
  used_water integer not null default 0,
  used_sun integer not null default 0,
  used_wind integer not null default 0,
  plant_position_x real not null,
  plant_position_z real not null,
  seed_bought_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_plants enable row level security;
create policy "Authenticated users can view completed flowers" on public.user_plants
  for select to authenticated using (true);

create or replace function public.buy_seed()
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
  insert into public.user_plants (user_id, owner_name, class_id, seed_level, plant_growth, used_water, used_sun, used_wind, plant_position_x, plant_position_z, seed_bought_at)
  select id, name, class_id, seed_level, plant_growth, used_water, used_sun, used_wind, plant_position_x, plant_position_z, seed_bought_at
  from public.users
  where id = auth.uid() and points >= 1 and plant_growth > 0 and plant_position_x is not null
    and used_water + used_sun + used_wind >= seed_level + 1;

  update public.users set points = points - 1, plant_growth = 1,
    seed_level = case when plant_growth > 0 then seed_level + 1 else seed_level end,
    seed_bought_at = now(), used_water = 0, used_sun = 0, used_wind = 0,
    plant_position_x = null, plant_position_z = null
  where id = auth.uid() and points >= 1
    and (plant_growth = 0 or (used_water + used_sun + used_wind >= seed_level + 1))
  returning * into result;
  if result.id is null then raise exception 'Seed purchase is not available'; end if;
  return result;
end $$;
