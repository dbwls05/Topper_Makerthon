-- ============================================================
-- 지원금 AI 도우미 · 초기 스키마
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
--
-- 회원가입 정보는 Supabase Authentication(auth.users)이 관리하므로
-- 여기서 만들지 않고, profiles가 auth.uid와 1:1로 연결됨.
--
-- 만들어지는 테이블 (사용자 정보 = profiles 하나로 충분)
--   profiles       사용자 프로필. 마이페이지 화면이 읽고/저장하는 테이블 (src/api/benefits.js)
--                    화면 필드 ↔ 컬럼: 거주 지역=region, 출생 연도=birth_year, 소득 구간=income_level,
--                    가구 형태=household_type, 취업 상태=employment_status, 관심 카테고리=interests[],
--                    이름/전화번호=name/phone (회원가입 때 자동 저장)
--   grants         지원금 마스터 (홈 추천 카드)
--   user_grants    사용자 ↔ 지원금 신청 준비 현황 (홈 진행 상황)
--   notifications  알림 (상단 알림 메뉴)
--   * 이메일/비밀번호는 Supabase Auth(auth.users)가 관리하므로 만들지 않음
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles — 사용자 프로필 (auth.users와 1:1)
--    회원가입 시 5번 트리거가 자동 생성. 이후 프로필 화면에서 나머지 컬럼 채움.
-- ------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text not null default '',
  phone             text,                          -- 숫자만 저장. 예: '01012345678'
  region          text,                          -- 예: '서울시 노원구'
  birth_year        int,                           -- 예: 1996
  income_level      text,                          -- 예: '중위소득 150% 이하' (자유 텍스트)
  household_type    text,                          -- 예: '1인가구', '신혼부부', '다자녀'
  employment_status text,                          -- 예: '재직', '구직', '자영업', '기타'
  interests         text[] not null default '{}',  -- 예: '{취업,주거}' — grants.category와 매칭
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 관심 카테고리로 사용자/지원금 매칭 쿼리를 낼 때 쓰는 GIN 인덱스
create index profiles_interests_gin on public.profiles using gin (interests);

-- ------------------------------------------------------------
-- 2. grants — 지원금 마스터 (관리자/크롤러/시드 데이터가 채움)
--    프론트는 읽기만 하고, 쓰기는 service_role(서버) 또는 대시보드에서만.
-- ------------------------------------------------------------
create table public.grants (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,               -- '취업','주거','교육','복지','자산형성','창업' 등
  title       text not null,
  description text,
  agency      text,                        -- 주관기관
  region      text not null default '전국',
  deadline    date,                        -- null = 상시 모집
  benefit     text,                        -- 지원 내용 요약
  apply_url   text,                        -- 신청 링크 ("신청까지 도와주기"용)
  source      text,                        -- 데이터 출처 (bokjiro, 보건복지부 API 등)
  external_id text unique,                 -- 크롤러 재수집 시 upsert 기준 키
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index grants_category_idx on public.grants (category);
create index grants_deadline_idx on public.grants (deadline);

-- ------------------------------------------------------------
-- 3. user_grants — 사용자 ↔ 지원금 다대다 (신청 준비 현황)
--    PK를 (user_id, grant_id) 복합키로 → 같은 지원금 중복 저장 불가, upsert에 유리.
--    status: interested(관심) → preparing(준비중) → applied(신청완료)
-- ------------------------------------------------------------
create table public.user_grants (
  user_id    uuid not null references auth.users (id) on delete cascade,
  grant_id   uuid not null references public.grants (id) on delete cascade,
  status     text not null default 'interested'
             check (status in ('interested', 'preparing', 'applied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, grant_id)
);

create index user_grants_status_idx on public.user_grants (user_id, status);
create index user_grants_grant_idx  on public.user_grants (grant_id);

-- ------------------------------------------------------------
-- 4. notifications — 알림
--    생성은 트리거/서버(service_role)가 하고, 프론트는 조회 + 읽음 처리만.
-- ------------------------------------------------------------
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  grant_id   uuid references public.grants (id) on delete cascade,  -- null = 일반 알림
  type       text not null default 'system',   -- 'deadline' | 'new_grant' | 'system'
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id, created_at desc) where read = false;

-- ------------------------------------------------------------
-- 5. 회원가입 시 profiles 자동 생성 트리거
--    signUp()에 넣은 options.data.name / phone 이 raw_user_meta_data에 저장되므로 그 값을 복사.
--    → 프론트 코드 수정 없이 가입하면 프로필이 생김.
-- ------------------------------------------------------------
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6. updated_at 자동 갱신 트리거
-- ------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at    before update on public.profiles    for each row execute function public.set_updated_at();
create trigger grants_set_updated_at      before update on public.grants      for each row execute function public.set_updated_at();
create trigger user_grants_set_updated_at before update on public.user_grants for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 7. RLS (Row Level Security) — anon key는 브라우저에 공개되므로 반드시 활성화
-- ------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.grants        enable row level security;
alter table public.user_grants   enable row level security;
alter table public.notifications enable row level security;

-- profiles: 본인 것만 (소득 수준 등 민감정보라 타인 조회 차단)
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- grants: 로그인 사용자 누구나 읽기. 쓰기 정책이 없으므로 service_role/대시보드만 가능
create policy "grants_select_authenticated" on public.grants
  for select to authenticated using (true);

-- user_grants: 본인 것만 전부 허용
create policy "user_grants_select_own" on public.user_grants
  for select to authenticated using (auth.uid() = user_id);
create policy "user_grants_insert_own" on public.user_grants
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_grants_update_own" on public.user_grants
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_grants_delete_own" on public.user_grants
  for delete to authenticated using (auth.uid() = user_id);

-- notifications: 본인 것만 조회/수정(읽음 처리)/삭제
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. (편의) 상태를 바꾸면 알림이 자동 생성되는 트리거
--    홈/마이그랜트 화면에서 status를 바꾸면 알림 화면에 바로 내용이 쌓임.
--    필요 없으면 이 블록만 삭제해도 나머지는 영향 없음.
-- ------------------------------------------------------------
create function public.on_user_grant_change()
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

create trigger user_grants_notify
  after insert or update of status on public.user_grants
  for each row execute function public.on_user_grant_change();
