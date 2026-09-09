-- A completed flower must not consume additional care items.
-- Apply this migration in Supabase after 20260909_security.sql.
create or replace function public.use_plant_item(p_item text)
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
  if p_item not in ('water', 'sun', 'wind') then raise exception 'Invalid item'; end if;

  update public.users set plant_growth = plant_growth + 1, tree_exp = tree_exp + 1,
    item_water = item_water - case when p_item = 'water' then 1 else 0 end,
    item_sun = item_sun - case when p_item = 'sun' then 1 else 0 end,
    item_wind = item_wind - case when p_item = 'wind' then 1 else 0 end,
    used_water = used_water + case when p_item = 'water' then 1 else 0 end,
    used_sun = used_sun + case when p_item = 'sun' then 1 else 0 end,
    used_wind = used_wind + case when p_item = 'wind' then 1 else 0 end
  where id = auth.uid() and plant_growth > 0 and plant_position_x is not null
    and used_water + used_sun + used_wind < seed_level + 1
    and ((p_item = 'water' and item_water > 0) or (p_item = 'sun' and item_sun > 0) or (p_item = 'wind' and item_wind > 0))
  returning * into result;

  if result.id is null then raise exception 'Item cannot be used'; end if;
  return result;
end $$;
