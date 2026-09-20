-- ============================================================
-- AI Agent 대화 기록 (세션별)
--   chat_sessions  대화 한 건 (목록에 보이는 제목)
--   chat_messages  그 대화의 메시지들
-- 탭을 옮기거나 새로고침해도 대화가 남고, 세션을 여러 개 만들 수 있다.
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 전체 붙여넣기 → Run
-- 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '새 대화',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_idx
  on public.chat_sessions (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null default '',
  -- 답변에 딸려 나온 지원금 카드 [{ id, title, benefit }]
  grants     jsonb not null default '[]'::jsonb,
  -- 이미지를 첨부한 메시지인지 (이미지 자체는 저장하지 않는다)
  has_image  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on public.chat_messages (session_id, id);

-- 메시지가 쌓이면 세션의 updated_at 을 올려서 목록 맨 위로 오게 한다
create or replace function public.touch_chat_session()
returns trigger
language plpgsql
as $$
begin
  update public.chat_sessions set updated_at = now() where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_session on public.chat_messages;
create trigger chat_messages_touch_session
  after insert on public.chat_messages
  for each row execute function public.touch_chat_session();

-- 권한 + RLS (본인 대화만)
grant select, insert, update, delete on table public.chat_sessions to authenticated;
grant select, insert, delete on table public.chat_messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_sessions_own" on public.chat_sessions;
create policy "chat_sessions_own" on public.chat_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_messages_own" on public.chat_messages;
create policy "chat_messages_own" on public.chat_messages
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
