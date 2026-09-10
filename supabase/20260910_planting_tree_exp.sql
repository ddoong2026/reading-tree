-- Award one class-tree experience point when a student successfully plants a seed.
create or replace function public.plant_seed(p_x real, p_z real, p_class_id text)
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
  if p_x is null or p_z is null or abs(p_x) > 47 or abs(p_z) > 47 then
    raise exception 'Invalid position';
  end if;

  update public.users
  set plant_position_x = p_x,
      plant_position_z = p_z,
      class_id = p_class_id,
      tree_exp = tree_exp + 1
  where id = auth.uid() and plant_growth > 0 and plant_position_x is null
  returning * into result;

  if result.id is null then raise exception 'Planting is not available'; end if;
  return result;
end $$;
