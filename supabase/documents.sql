-- ============================================================
-- 서류 체크 기능용 컬럼 추가 + 예시 서류 목록
--   grants.documents            : 그 지원금 신청에 필요한 서류 이름 목록
--   user_grants.checked_documents : 사용자가 준비 완료로 체크한 서류 이름 목록
-- "담기" = user_grants 에 행 추가 (status 'interested'), 서류를 하나라도 체크하면 'preparing'
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 전체 붙여넣기 → Run
-- (missing_tables.sql, seed.sql 을 먼저 실행한 상태여야 한다. 여러 번 실행해도 안전)
-- ============================================================

alter table public.grants
  add column if not exists documents text[] not null default '{}';

alter table public.user_grants
  add column if not exists checked_documents text[] not null default '{}';

-- 예시 지원금(seed.sql)의 필요 서류 — 실제 공고 기준으로 나중에 교체
update public.grants set documents = array['주민등록등본', '신분증 사본', '소득 증빙 서류', '청년도약계좌 가입 신청서']
  where external_id = 'seed-001';
update public.grants set documents = array['주민등록등본', '임대차 계약서 사본', '월세 이체 내역', '소득 증빙 서류', '가족 관계 증명서']
  where external_id = 'seed-002';
update public.grants set documents = array['주민등록등본', '신분증 사본', '소득 증빙 서류', '가족 관계 증명서', '구직 활동 계획서']
  where external_id = 'seed-003';
update public.grants set documents = array['신분증 사본', '소득 증빙 서류', '가족 관계 증명서']
  where external_id = 'seed-004';
update public.grants set documents = array['신분증 사본', '가족 관계 증명서', '재학 증명서']
  where external_id = 'seed-005';
update public.grants set documents = array['주민등록등본', '신분증 사본', '임대차 계약서 사본', '소득 증빙 서류']
  where external_id = 'seed-006';

notify pgrst, 'reload schema';
