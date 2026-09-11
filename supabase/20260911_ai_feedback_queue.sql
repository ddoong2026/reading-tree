-- AI 첨삭 요청을 잃지 않고 순서대로 처리하기 위한 영속 대기열입니다.
create table if not exists public.ai_feedback_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  text_content text not null,
  has_image boolean not null default false,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  feedback_text text,
  feedback_annotations jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists ai_feedback_queue_ready_idx
  on public.ai_feedback_queue (status, available_at, created_at);
create index if not exists ai_feedback_queue_user_idx
  on public.ai_feedback_queue (user_id, created_at desc);

alter table public.ai_feedback_queue enable row level security;

drop policy if exists "Users can read their AI feedback jobs" on public.ai_feedback_queue;
create policy "Users can read their AI feedback jobs"
  on public.ai_feedback_queue for select using (user_id = auth.uid());
