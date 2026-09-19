import { supabase } from '../lib/supabaseClient.js'
import { MOCK_GRANTS, MOCK_NOTIFICATIONS, MOCK_PROGRESS } from './mockData.js'

// 화면은 이 파일의 함수만 호출한다.
// TODO: API 연동 시 각 함수 안을 실제 요청(fetch/supabase)으로 바꾸고, 반환 형태만 유지하면 된다.

const MOCK_DELAY_MS = 200

function mockResponse(data) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), MOCK_DELAY_MS))
}

/** 사용자에게 추천하는 혜택 목록 */
export function getRecommendedGrants() {
  return mockResponse(MOCK_GRANTS)
}

/** 신청 준비 현황 { preparing, total } */
export function getPreparationProgress() {
  return mockResponse(MOCK_PROGRESS)
}

/** 알림 목록 (type: 'deadline' = 마감 임박) */
export function getNotifications() {
  return mockResponse(MOCK_NOTIFICATIONS)
}

/** 알림 읽음 처리 */
export function markNotificationsRead(ids) {
  return mockResponse({ ids })
}

export const EMPTY_PROFILE = {
  region: null,
  birthYear: null,
  incomeLevel: null,
  householdType: null,
  employmentStatus: null,
  interests: [],
}

const PROFILE_COLUMNS =
  'region, birth_year, income_level, household_type, employment_status, interests'

// Supabase가 없거나 로그인 전(데모 모드)에는 메모리에만 저장한다. 새로고침하면 다시 비어 있다.
let demoProfile = EMPTY_PROFILE

async function currentUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// DB(snake_case) → 화면(camelCase)
function fromRow(row) {
  return {
    region: row.region,
    birthYear: row.birth_year,
    incomeLevel: row.income_level,
    householdType: row.household_type,
    employmentStatus: row.employment_status,
    interests: row.interests ?? [],
  }
}

/** 맞춤 추천을 위한 내 프로필 정보 (profiles 테이블) */
export async function getMyProfile() {
  const userId = await currentUserId()
  if (!userId) return mockResponse(demoProfile)

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data) : EMPTY_PROFILE
}

/** 내 프로필 저장. 저장된 프로필을 그대로 돌려준다 */
export async function saveMyProfile(profile) {
  const userId = await currentUserId()
  if (!userId) {
    demoProfile = structuredClone(profile)
    return mockResponse(demoProfile)
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      region: profile.region,
      birth_year: profile.birthYear,
      income_level: profile.incomeLevel,
      household_type: profile.householdType,
      employment_status: profile.employmentStatus,
      interests: profile.interests,
    })
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}
