-- Apply this migration in the Supabase SQL editor before deploying this revision.
-- Server environment variables required: SUPABASE_URL, SUPABASE_ANON_KEY,
-- SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, READING_APP_WEBHOOK_SECRET.

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'));
$$;

alter table public.users enable row level security;
alter table public.reading_logs enable row level security;

drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Teachers and Admins can update users" on public.users;
drop policy if exists "Teachers can update student group codes" on public.users;
create policy "Users can read own profile; staff can read profiles" on public.users
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists "Users can view own logs" on public.reading_logs;
create policy "Users can read own logs; staff can read logs" on public.reading_logs
  for select using (user_id = auth.uid() or public.is_staff());

-- The browser may create and edit only its own reading log. Economy values are
-- never accepted through this policy and are changed only by the RPCs below.
create policy "Users can create own logs" on public.reading_logs for insert with check (user_id = auth.uid());
create policy "Users can edit own logs" on public.reading_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.buy_item(p_item text)
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
  if p_item not in ('water', 'sun', 'wind') then raise exception 'Invalid item'; end if;
  update public.users set points = points - 1,
    item_water = item_water + case when p_item = 'water' then 1 else 0 end,
    item_sun = item_sun + case when p_item = 'sun' then 1 else 0 end,
    item_wind = item_wind + case when p_item = 'wind' then 1 else 0 end
  where id = auth.uid() and points >= 1 returning * into result;
  if result.id is null then raise exception 'Insufficient points'; end if;
  return result;
end $$;

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
    and ((p_item = 'water' and item_water > 0) or (p_item = 'sun' and item_sun > 0) or (p_item = 'wind' and item_wind > 0))
  returning * into result;
  if result.id is null then raise exception 'Item cannot be used'; end if;
  return result;
end $$;

create or replace function public.plant_seed(p_x real, p_z real, p_class_id text)
returns public.users language plpgsql security definer set search_path = public as $$
declare result public.users;
begin
  if p_x is null or p_z is null or abs(p_x) > 100 or abs(p_z) > 100 then raise exception 'Invalid position'; end if;
  update public.users set plant_position_x = p_x, plant_position_z = p_z, class_id = p_class_id
  where id = auth.uid() and plant_growth > 0 and plant_position_x is null returning * into result;
  if result.id is null then raise exception 'Planting is not available'; end if;
  return result;
end $$;

revoke all on function public.buy_item(text), public.buy_seed(), public.use_plant_item(text), public.plant_seed(real, real, text) from public;
grant execute on function public.buy_item(text), public.buy_seed(), public.use_plant_item(text), public.plant_seed(real, real, text) to authenticated;
