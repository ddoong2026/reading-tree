-- Run this file once in Supabase SQL Editor. It supersedes the individual
-- flower, animal, coin, reward, and planting migrations from this project.

create table if not exists public.user_plants (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  owner_name text not null, class_id text, seed_level integer not null, plant_growth integer not null,
  used_water integer not null default 0, used_sun integer not null default 0, used_wind integer not null default 0,
  plant_position_x real not null, plant_position_z real not null, seed_bought_at timestamptz, flowered_at timestamptz, created_at timestamptz not null default now()
);
alter table public.user_plants enable row level security;
drop policy if exists "Authenticated users can view completed flowers" on public.user_plants;
create policy "Authenticated users can view completed flowers" on public.user_plants for select to authenticated using (true);

alter table public.users add column if not exists rabbit_count integer not null default 0;
alter table public.users add column if not exists animal_coins integer not null default 0;
alter table public.users add column if not exists flowered_at timestamptz;
alter table public.user_plants add column if not exists flowered_at timestamptz;
alter table public.reading_logs add column if not exists feedback_annotations jsonb not null default '[]'::jsonb;

create table if not exists public.user_animals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  animal_type text not null check (animal_type in ('grasshopper','frog','snake','hawk','rabbit','fox')),
  created_at timestamptz not null default now(), unique (user_id, animal_type)
);
alter table public.user_animals enable row level security;
drop policy if exists "Authenticated users can view animals" on public.user_animals;
create policy "Authenticated users can view animals" on public.user_animals for select to authenticated using (true);
insert into public.user_animals (user_id, animal_type) select id, 'rabbit' from public.users where rabbit_count > 0 on conflict do nothing;

create table if not exists public.daily_quest_rewards (
  user_id uuid not null references public.users(id) on delete cascade, reward_date date not null default current_date,
  category text not null, created_at timestamptz not null default now(), primary key (user_id, reward_date)
);
alter table public.daily_quest_rewards enable row level security;

create or replace function public.buy_item(p_item text) returns public.users language plpgsql security definer set search_path=public as $$
declare result public.users; begin
  if p_item not in ('water','sun','wind') then raise exception 'Invalid item'; end if;
  update public.users set points=points-1, item_water=item_water+case when p_item='water' then 1 else 0 end, item_sun=item_sun+case when p_item='sun' then 1 else 0 end, item_wind=item_wind+case when p_item='wind' then 1 else 0 end where id=auth.uid() and points>=1 returning * into result;
  if result.id is null then raise exception 'Insufficient points'; end if; return result;
end $$;

create or replace function public.buy_seed() returns public.users language plpgsql security definer set search_path=public as $$
declare result public.users; begin
  insert into public.user_plants (user_id,owner_name,class_id,seed_level,plant_growth,used_water,used_sun,used_wind,plant_position_x,plant_position_z,seed_bought_at,flowered_at)
  select id,name,class_id,seed_level,plant_growth,used_water,used_sun,used_wind,plant_position_x,plant_position_z,seed_bought_at,flowered_at from public.users where id=auth.uid() and points>=1 and plant_growth>0 and plant_position_x is not null and used_water+used_sun+used_wind>=seed_level+1;
  update public.users set points=points-1,plant_growth=1,seed_level=case when plant_growth>0 then seed_level+1 else seed_level end,seed_bought_at=now(),flowered_at=null,used_water=0,used_sun=0,used_wind=0,plant_position_x=null,plant_position_z=null where id=auth.uid() and points>=1 and (plant_growth=0 or used_water+used_sun+used_wind>=seed_level+1) returning * into result;
  if result.id is null then raise exception 'Seed purchase is not available'; end if; return result;
end $$;

create or replace function public.use_plant_item(p_item text) returns public.users language plpgsql security definer set search_path=public as $$
declare result public.users; begin
  if p_item not in ('water','sun','wind') then raise exception 'Invalid item'; end if;
  update public.users set plant_growth=plant_growth+1,tree_exp=coalesce(tree_exp,0)+1,flowered_at=case when used_water+used_sun+used_wind+1>=seed_level+1 then coalesce(flowered_at,now()) else flowered_at end,item_water=item_water-case when p_item='water' then 1 else 0 end,item_sun=item_sun-case when p_item='sun' then 1 else 0 end,item_wind=item_wind-case when p_item='wind' then 1 else 0 end,used_water=used_water+case when p_item='water' then 1 else 0 end,used_sun=used_sun+case when p_item='sun' then 1 else 0 end,used_wind=used_wind+case when p_item='wind' then 1 else 0 end where id=auth.uid() and plant_growth>0 and plant_position_x is not null and used_water+used_sun+used_wind<seed_level+1 and ((p_item='water' and item_water>0) or (p_item='sun' and item_sun>0) or (p_item='wind' and item_wind>0)) returning * into result;
  if result.id is null then raise exception 'Item cannot be used'; end if; return result;
end $$;

create or replace function public.plant_seed(p_x real,p_z real,p_class_id text) returns public.users language plpgsql security definer set search_path=public as $$
declare result public.users; begin
  if p_x is null or p_z is null or abs(p_x)>47 or abs(p_z)>47 then raise exception 'Invalid position'; end if;
  update public.users set plant_position_x=p_x,plant_position_z=p_z,class_id=p_class_id,tree_exp=coalesce(tree_exp,0)+1 where id=auth.uid() and plant_growth>0 and plant_position_x is null returning * into result;
  if result.id is null then raise exception 'Planting is not available'; end if; return result;
end $$;

create or replace function public.buy_ecosystem_animal(p_animal text) returns public.users language plpgsql security definer set search_path=public as $$
declare result public.users; needed text; cost integer; begin
  select case p_animal when 'grasshopper' then null when 'frog' then 'grasshopper' when 'snake' then 'frog' when 'hawk' then 'snake' when 'rabbit' then null when 'fox' then 'rabbit' end,case p_animal when 'grasshopper' then 4 when 'frog' then 6 when 'snake' then 8 when 'hawk' then 10 when 'rabbit' then 5 when 'fox' then 10 end into needed,cost;
  if cost is null or exists(select 1 from public.user_animals where user_id=auth.uid() and animal_type=p_animal) or (needed is not null and not exists(select 1 from public.user_animals where user_id=auth.uid() and animal_type=needed)) then raise exception 'Animal is locked or already owned'; end if;
  update public.users set animal_coins=animal_coins-cost where id=auth.uid() and animal_coins>=cost returning * into result;
  if result.id is null then raise exception 'Insufficient animal coins'; end if; insert into public.user_animals(user_id,animal_type) values(auth.uid(),p_animal); return result;
end $$;

create or replace function public.reward_completed_quest(p_category text) returns boolean language plpgsql security definer set search_path=public as $$
begin
  insert into public.daily_quest_rewards(user_id,reward_date,category) values(auth.uid(),current_date,p_category) on conflict do nothing;
  if not found then return false; end if;
  update public.users set points=points+1,animal_coins=animal_coins+1 where id=auth.uid(); return true;
end $$;

-- 다른 학생의 개인정보를 노출하지 않고, 숲 렌더링에 필요한 값만 전달한다.
create or replace function public.get_forest_plant_states(p_class_id text default null)
returns table (
  id uuid, name text, plant_growth integer, class_id text,
  plant_position_x real, plant_position_z real,
  used_water integer, used_sun integer, used_wind integer,
  seed_level integer, seed_bought_at timestamptz, flowered_at timestamptz, tree_exp integer
)
language sql security definer set search_path=public as $$
  select u.id, u.name, u.plant_growth, u.class_id,
    u.plant_position_x, u.plant_position_z,
    u.used_water, u.used_sun, u.used_wind,
    u.seed_level, u.seed_bought_at, u.flowered_at, coalesce(u.tree_exp, 0)
  from public.users u
  where auth.uid() is not null
    and (p_class_id is null or u.class_id = p_class_id);
$$;

-- 월드맵에는 개인 EXP가 아닌 반별 누적 EXP만 제공한다.
create or replace function public.get_class_tree_stats()
returns table (class_id text, total_tree_exp bigint)
language sql security definer set search_path=public as $$
  select u.class_id, coalesce(sum(u.tree_exp), 0)::bigint
  from public.users u
  where auth.uid() is not null and u.class_id is not null
  group by u.class_id;
$$;

-- 같은 반 친구의 식물을 눌렀을 때만 독서록을 읽는다. 일반 reading_logs 조회 권한은 유지한다.
create or replace function public.get_forest_reading_logs(
  p_owner_id uuid,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default null
)
returns table (id uuid, book_title text, created_at timestamptz, image_url text, text_content text)
language sql security definer set search_path=public as $$
  select r.id, r.book_title, r.created_at, r.image_url, r.text_content
  from public.reading_logs r
  where r.user_id = p_owner_id
    and auth.uid() is not null
    and (
      public.is_staff()
      or exists (
        select 1 from public.users viewer
        join public.users owner on owner.id = p_owner_id
        where viewer.id = auth.uid()
          and viewer.class_id is not null
          and viewer.class_id = owner.class_id
      )
    )
    and (p_started_at is null or r.created_at >= p_started_at)
    and (p_ended_at is null or r.created_at < p_ended_at)
  order by r.created_at desc;
$$;

revoke all on function public.buy_item(text),public.buy_seed(),public.use_plant_item(text),public.plant_seed(real,real,text),public.buy_ecosystem_animal(text),public.reward_completed_quest(text) from public;
grant execute on function public.buy_item(text),public.buy_seed(),public.use_plant_item(text),public.plant_seed(real,real,text),public.buy_ecosystem_animal(text),public.reward_completed_quest(text) to authenticated;
revoke all on function public.get_forest_plant_states(text) from public;
grant execute on function public.get_forest_plant_states(text) to authenticated;
revoke all on function public.get_class_tree_stats() from public;
grant execute on function public.get_class_tree_stats() to authenticated;
revoke all on function public.get_forest_reading_logs(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_forest_reading_logs(uuid,timestamptz,timestamptz) to authenticated;
