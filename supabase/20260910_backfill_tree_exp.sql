-- 기존 심기·아이템 사용 기록을 현재 경험치 규칙으로 한 번 재계산한다.
-- 규칙: 씨앗을 심을 때 +1, 물·햇빛·바람 아이템을 한 번 사용할 때마다 +1.
with archived_exp as (
  select
    user_id,
    count(*) + sum(used_water + used_sun + used_wind) as exp
  from public.user_plants
  group by user_id
),
current_exp as (
  select
    id,
    case
      when plant_position_x is not null and plant_position_z is not null
      then 1 + used_water + used_sun + used_wind
      else 0
    end as exp
  from public.users
)
update public.users as u
set tree_exp = (
  coalesce(c.exp, 0) + coalesce(a.exp, 0)
)::integer
from current_exp as c
left join archived_exp as a on a.user_id = c.id
where u.id = c.id;
