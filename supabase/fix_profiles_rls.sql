-- ============================================================
-- profiles 저장 시 403 (Forbidden) 해결
-- 증상: 맞춤 프로필 저장 → POST /rest/v1/profiles 403
-- 원인: profiles 테이블에 본인 행 insert/update 를 허용하는 RLS 정책(또는 권한)이 없음
--       (schema.sql 이 끝까지 적용되지 않아 grants/user_grants/notifications 테이블도 없는 상태였음)
--
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
-- 여러 번 실행해도 안전하다.
-- ============================================================

-- (확인용) 지금 profiles 에 걸려 있는 정책 보기 — 실행 전후로 비교해볼 때 이 줄만 따로 실행
-- select policyname, permissive, cmd, roles, qual, with_check from pg_policies where tablename = 'profiles';

-- 1. API 역할 권한
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- 2. RLS 켜고, profiles 정책을 schema.sql 과 같게 다시 만든다
--    (기존 정책이 이름만 다르거나 RESTRICTIVE 로 막고 있을 수 있어서 모두 지우고 새로 만든다)
alter table public.profiles enable row level security;

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end;
$$;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 3. 가입 트리거가 없던 시기에 가입한 사용자도 profiles 행을 갖도록 채운다
insert into public.profiles (id, name)
select id, coalesce(raw_user_meta_data ->> 'name', '')
from auth.users
on conflict (id) do nothing;

-- 4. PostgREST 가 바뀐 권한/정책을 바로 반영하도록
notify pgrst, 'reload schema';
