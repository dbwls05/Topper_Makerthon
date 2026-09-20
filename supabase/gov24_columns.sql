-- ============================================================
-- 정부24 공공서비스 데이터를 담기 위한 grants 컬럼 추가
-- scripts/sync-gov24.mjs 가 이 컬럼들을 채운다.
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 전체 붙여넣기 → Run
-- (missing_tables.sql, documents.sql 을 먼저 실행한 상태. 여러 번 실행해도 안전)
-- ============================================================

alter table public.grants add column if not exists field          text;        -- 정부24 서비스분야 원문 (예: '고용·창업')
alter table public.grants add column if not exists region_sido    text;        -- 시도 (지역 사업만. 전국 사업은 null)
alter table public.grants add column if not exists apply_period   text;        -- 신청기한 원문 (예: '상시신청')
alter table public.grants add column if not exists support_type   text;        -- 지원유형 (현금/현물/서비스…)
alter table public.grants add column if not exists target         text;        -- 지원대상 원문
alter table public.grants add column if not exists criteria       text;        -- 선정기준 원문
alter table public.grants add column if not exists support_detail text;        -- 지원내용 원문
alter table public.grants add column if not exists how_to_apply   text;        -- 신청방법
alter table public.grants add column if not exists contact        text;        -- 전화문의
alter table public.grants add column if not exists age_min        int;         -- 대상연령(시작)
alter table public.grants add column if not exists age_max        int;         -- 대상연령(종료)
alter table public.grants add column if not exists income_levels  text[] not null default '{}';  -- 중위소득 구간
alter table public.grants add column if not exists targets        text[] not null default '{}';  -- 대학생, 구직자, 1인가구 …
alter table public.grants add column if not exists view_count     int not null default 0;        -- 정부24 조회수 (인기순 정렬)

create index if not exists grants_region_sido_idx on public.grants (region_sido);
create index if not exists grants_active_category_idx on public.grants (is_active, category);
create index if not exists grants_view_count_idx on public.grants (view_count desc);

-- 공공서비스 정보는 공개 데이터라 로그인 전(anon)에도 읽을 수 있게 한다
grant select on table public.grants to anon;
drop policy if exists "grants_select_anon" on public.grants;
create policy "grants_select_anon" on public.grants
  for select to anon using (is_active);

notify pgrst, 'reload schema';
