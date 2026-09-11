-- 반별 동물 공동구매 모금함입니다. Supabase SQL Editor에서 실행하세요.

create table if not exists public.class_animal_funds (
  class_id text not null,
  animal_type text not null check (animal_type in ('grasshopper', 'frog', 'snake', 'hawk', 'rabbit', 'fox')),
  collected_coins integer not null default 0 check (collected_coins >= 0),
  target_coins integer not null check (target_coins > 0),
  updated_at timestamptz not null default now(),
  primary key (class_id, animal_type)
);

alter table public.class_animal_funds enable row level security;

create or replace function public.can_view_class_animal_funds(p_class_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users me
    where me.id = auth.uid() and (me.class_id = p_class_id or me.role in ('teacher', 'admin'))
  );
$$;

drop policy if exists "Users can view their class animal funds" on public.class_animal_funds;
create policy "Users can view their class animal funds"
  on public.class_animal_funds for select using (public.can_view_class_animal_funds(class_id));

-- 목표 금액은 현재 상점의 동물 가격과 같습니다. 모금은 본인 반에만 할 수 있습니다.
create or replace function public.contribute_to_class_animal_fund(p_animal text, p_amount integer default 1)
returns table (animal_coins integer, collected_coins integer, target_coins integer)
language plpgsql security definer set search_path = public as $$
declare
  my_class_id text;
  animal_target integer;
  remaining_coins integer;
  fund public.class_animal_funds;
begin
  if p_amount is null or p_amount < 1 then raise exception 'Contribution must be at least one coin'; end if;
  select class_id into my_class_id from public.users where id = auth.uid();
  if my_class_id is null then raise exception 'Join a class before contributing'; end if;
  select case p_animal
    when 'grasshopper' then 2 when 'frog' then 3 when 'snake' then 4
    when 'hawk' then 5 when 'rabbit' then 3 when 'fox' then 5 else null end
  into animal_target;
  if animal_target is null then raise exception 'Unknown animal'; end if;

  update public.users set animal_coins = animal_coins - p_amount
    where id = auth.uid() and animal_coins >= p_amount
    returning animal_coins into remaining_coins;
  if remaining_coins is null then raise exception 'Insufficient animal coins'; end if;

  insert into public.class_animal_funds (class_id, animal_type, collected_coins, target_coins, updated_at)
  values (my_class_id, p_animal, p_amount, animal_target, now())
  on conflict (class_id, animal_type) do update
    set collected_coins = class_animal_funds.collected_coins + excluded.collected_coins,
        updated_at = now()
    where class_animal_funds.collected_coins + excluded.collected_coins <= class_animal_funds.target_coins
  returning * into fund;
  if fund.class_id is null then raise exception 'This animal fund is already full'; end if;

  return query select remaining_coins, fund.collected_coins, fund.target_coins;
end $$;

revoke all on function public.can_view_class_animal_funds(text), public.contribute_to_class_animal_fund(text, integer) from public;
grant execute on function public.can_view_class_animal_funds(text), public.contribute_to_class_animal_fund(text, integer) to authenticated;
