-- ============================================================
-- schema.sql 에서 빠진 테이블/트리거/정책 채우기 + AI 사용량 테이블
-- 현재 DB 상태: profiles 만 있고 grants / user_grants / notifications 가 없음
--
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
--           그 다음 seed.sql 도 같은 방법으로 Run (예시 지원금 데이터)
-- 여러 번 실행해도 안전하다 (if not exists / create or replace / drop ... if exists).
-- ============================================================

-- ------------------------------------------------------------
-- 1. grants — 지원금 마스터
-- ------------------------------------------------------------
create table if not exists public.grants (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  title       text not null,
  description text,
  agency      text,
  region      text not null default '전국',
  deadline    date,                        -- null = 상시 모집
  benefit     text,
  apply_url   text,
  source      text,
  external_id text unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists grants_category_idx on public.grants (category);
create index if not exists grants_deadline_idx on public.grants (deadline);

-- ------------------------------------------------------------
-- 2. user_grants — 사용자 ↔ 지원금 신청 준비 현황
-- ------------------------------------------------------------
create table if not exists public.user_grants (
  user_id    uuid not null references auth.users (id) on delete cascade,
  grant_id   uuid not null references public.grants (id) on delete cascade,
  status     text not null default 'interested'
             check (status in ('interested', 'preparing', 'applied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, grant_id)
);

create index if not exists user_grants_status_idx on public.user_grants (user_id, status);
create index if not exists user_grants_grant_idx  on public.user_grants (grant_id);

-- ------------------------------------------------------------
-- 3. notifications — 알림
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  grant_id   uuid references public.grants (id) on delete cascade,
  type       text not null default 'system',   -- 'deadline' | 'new_grant' | 'system'
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx   on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id, created_at desc) where read = false;

-- ------------------------------------------------------------
-- 4. ai_usage — AI 호출 횟수 (사용자별 하루 제한용)
--    Edge Function 이 service_role 로만 읽고 쓴다. 정책이 없으므로 브라우저에서는 접근 불가.
-- ------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);

-- ------------------------------------------------------------
-- 5. 트리거 함수들
-- ------------------------------------------------------------

-- 회원가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists grants_set_updated_at on public.grants;
create trigger grants_set_updated_at before update on public.grants
  for each row execute function public.set_updated_at();
drop trigger if exists user_grants_set_updated_at on public.user_grants;
create trigger user_grants_set_updated_at before update on public.user_grants
  for each row execute function public.set_updated_at();

-- 신청 현황이 바뀌면 알림 자동 생성
create or replace function public.on_user_grant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_title text;
  label       text;
begin
  select title into grant_title from public.grants where id = new.grant_id;
  if tg_op = 'INSERT' then
    label := '관심 목록에 추가했어요';
  else
    label := case new.status
      when 'interested' then '관심 목록에 추가했어요'
      when 'preparing'  then '신청 준비 중으로 표시했어요'
      when 'applied'    then '신청 완료!'
    end;
  end if;
  insert into public.notifications (user_id, grant_id, type, message)
  values (new.user_id, new.grant_id, 'system', coalesce(grant_title, '지원금') || ' · ' || label);
  return new;
end;
$$;

drop trigger if exists user_grants_notify on public.user_grants;
create trigger user_grants_notify
  after insert or update of status on public.user_grants
  for each row execute function public.on_user_grant_change();

-- ------------------------------------------------------------
-- 6. 권한 + RLS
-- ------------------------------------------------------------
grant select on table public.grants to authenticated;
grant select, insert, update, delete on table public.user_grants to authenticated;
grant select, update, delete on table public.notifications to authenticated;

alter table public.grants        enable row level security;
alter table public.user_grants   enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_usage      enable row level security;

drop policy if exists "grants_select_authenticated" on public.grants;
create policy "grants_select_authenticated" on public.grants
  for select to authenticated using (true);

drop policy if exists "user_grants_select_own" on public.user_grants;
drop policy if exists "user_grants_insert_own" on public.user_grants;
drop policy if exists "user_grants_update_own" on public.user_grants;
drop policy if exists "user_grants_delete_own" on public.user_grants;
create policy "user_grants_select_own" on public.user_grants
  for select to authenticated using (auth.uid() = user_id);
create policy "user_grants_insert_own" on public.user_grants
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_grants_update_own" on public.user_grants
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_grants_delete_own" on public.user_grants
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- PostgREST 가 새 테이블을 바로 인식하도록
notify pgrst, 'reload schema';
