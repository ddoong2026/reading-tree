-- Apply this after 20260909_security.sql when changing the live rule.
create or replace function public.buy_seed()
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
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
