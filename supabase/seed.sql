-- ============================================================
-- 지원금 AI 도우미 · 예시 시드 데이터
-- 실행 방법: schema.sql 실행 후, SQL Editor에서 이 파일을 붙여넣고 Run
--
-- ⚠ 실제 서비스용 데이터가 아니라 화면 개발/데모용 예시예요.
--   운영 시에는 공공 API(복지로 등) 크롤러 데이터로 교체하고,
--   그 때 external_id를 수집 소스의 고유 ID로 쓰면 중복 없이 upsert할 수 있어요.
-- (외래키 user_grants가 없어서 몇 번 재실행해도 안전하게 upsert 됩니다)
-- ============================================================

insert into public.grants
  (external_id, category, title, description, agency, region, deadline, benefit, apply_url, source, is_active)
values
  ('seed-001', '자산형성',
   '청년도약계좌',
   '만 19~34세 청년이 매월 납입하면 정부 기여금과 세제혜택을 더해 목돈을 만드는 청년 자산형성 상품.',
   '기획재정부 · 서민금융진흥원', '전국', '2026-12-31',
   '월 최대 70만원 납입, 기여금+이자혜택 지원', null, 'seed(예시)', true),
  ('seed-002', '주거',
   '청년 월세 특별지원',
   '주거비 부담이 큰 청년 1인가구를 대상으로 월세의 일부를 현금으로 지원하는 제도.',
   '국토교통부', '전국', null,
   '월 최대 20만원, 최대 12개월', null, 'seed(예시)', true),
  ('seed-003', '취업',
   '국민취업지원제도',
   '취업 준비에 필요한 구직활동비를 지원하고, 취업 성공 시 수당을 지급하는 통합 취업지원 제도.',
   '고용노동부', '전국', null,
   '구직활동비 + 취업성공수당 지원', null, 'seed(예시)', true),
  ('seed-004', '복지',
   '근로장려금',
   '일은 하지만 소득이 적은 근로자·자영업자 가구에 연말에 돌려주는 세금 환급 제도.',
   '국세청', '전국', '2027-05-31',
   '가구 유형·소득에 따른 환급금 지급 (5월 정기 신청)', null, 'seed(예시)', true),
  ('seed-005', '교육',
   '국가장학금 Ⅰ유형',
   '소득연계형 장학금으로 가구 소득인정액에 따라 대학 등록금의 일부를 지원.',
   '교육부 · 한국장학재단', '전국', null,
   '소득분위별 등록금 지원', null, 'seed(예시)', true),
  ('seed-006', '주거',
   '청년전용 버팀목 전세자금보증',
   '무주택 청년의 전세보증금을 보증해주는 청년 특화 전세자금 보증 상품.',
   'SGI서울보증보험 · 국토교통부', '전국', null,
   '보증한도 최대 1억원, 보증료 대부분 면제', null, 'seed(예시)', true)
on conflict (external_id) do update set
  category    = excluded.category,
  title       = excluded.title,
  description = excluded.description,
  agency      = excluded.agency,
  region      = excluded.region,
  deadline    = excluded.deadline,
  benefit     = excluded.benefit;

-- ============================================================
-- (선택) 테스트용 신청 현황 + 알림 만들기
-- 실제로 회원가입을 한 번 하고 나서, 아래 주석을 풀고
-- '여기에-user-uuid-붙여넣기' 부분을 auth.users의 id 값으로 바꾼 뒤 실행.
-- (Authentication → Users 화면에서 사용자를 눌러 UUID 확인 가능)
-- ============================================================
-- insert into public.user_grants (user_id, grant_id, status)
-- select '여기에-user-uuid-붙여넣기', id, 'preparing'
-- from public.grants where external_id in ('seed-002', 'seed-003')
-- on conflict (user_id, grant_id) do update set status = excluded.status;
--
-- insert into public.notifications (user_id, type, message)
-- values ('여기에-user-uuid-붙여넣기', 'deadline', '청년도약계좌 모집이 곧 마감돼요!');
