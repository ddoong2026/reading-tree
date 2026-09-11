-- 학생 건의를 수신자별 쪽지로 저장하고, 담당자가 답장할 수 있게 합니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.student_feedbacks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

alter table public.student_feedbacks
  add column if not exists recipient text,
  add column if not exists reply_content text,
  add column if not exists replied_at timestamptz;

-- 기존 건의는 관리자가 확인할 수 있도록 개발자 앞으로 보냅니다.
update public.student_feedbacks set recipient = 'developer' where recipient is null;
alter table public.student_feedbacks alter column recipient set default 'developer';
alter table public.student_feedbacks alter column recipient set not null;

alter table public.student_feedbacks drop constraint if exists student_feedbacks_recipient_check;
alter table public.student_feedbacks add constraint student_feedbacks_recipient_check
  check (recipient in ('teacher_1', 'teacher_2', 'developer'));

create index if not exists student_feedbacks_user_created_at_idx
  on public.student_feedbacks (user_id, created_at desc);
create index if not exists student_feedbacks_recipient_created_at_idx
  on public.student_feedbacks (recipient, created_at desc);

-- 교사는 본인 반으로 온 쪽지만, 관리자는 모든 쪽지를 볼 수 있습니다.
-- 교사 계정의 users.class_id는 끝이 -1 또는 -2인 반 ID(예: 2026-1-1)여야 합니다.
create or replace function public.can_access_feedback(p_recipient text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users me
    where me.id = auth.uid()
      and (
        me.role = 'admin'
        or (
          me.role = 'teacher'
          and (
            (p_recipient = 'teacher_1' and coalesce(me.class_id, '') ~ '(^|-)1$')
            or (p_recipient = 'teacher_2' and coalesce(me.class_id, '') ~ '(^|-)2$')
          )
        )
      )
  );
$$;

alter table public.student_feedbacks enable row level security;

drop policy if exists "Students can read their own feedback messages" on public.student_feedbacks;
drop policy if exists "Recipients can read feedback messages" on public.student_feedbacks;
drop policy if exists "Students can send feedback messages" on public.student_feedbacks;
drop policy if exists "Recipients can reply to feedback messages" on public.student_feedbacks;
drop policy if exists "Recipients can delete feedback messages" on public.student_feedbacks;

create policy "Students can read their own feedback messages"
  on public.student_feedbacks for select using (user_id = auth.uid());
create policy "Recipients can read feedback messages"
  on public.student_feedbacks for select using (public.can_access_feedback(recipient));
create policy "Students can send feedback messages"
  on public.student_feedbacks for insert with check (user_id = auth.uid());
create policy "Recipients can reply to feedback messages"
  on public.student_feedbacks for update
  using (public.can_access_feedback(recipient))
  with check (public.can_access_feedback(recipient));
create policy "Recipients can delete feedback messages"
  on public.student_feedbacks for delete using (public.can_access_feedback(recipient));

grant execute on function public.can_access_feedback(text) to authenticated;
