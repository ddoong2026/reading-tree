create table if not exists public.daily_quest_rewards (
  user_id uuid not null references public.users(id) on delete cascade,
  reward_date date not null default current_date,
  category text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, reward_date)
);
alter table public.daily_quest_rewards enable row level security;

create or replace function public.reward_completed_quest(p_category text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.daily_quest_rewards (user_id, reward_date, category)
  values (auth.uid(), current_date, p_category)
  on conflict do nothing;

  if not found then return false; end if;

  update public.users
  set points = points + 1, animal_coins = animal_coins + 1
  where id = auth.uid();
  return true;
end $$;

revoke all on function public.reward_completed_quest(text) from public;
grant execute on function public.reward_completed_quest(text) to authenticated;
