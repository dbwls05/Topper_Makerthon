import { supabase } from '../lib/supabaseClient.js'
import {
  MOCK_AGENT_REPLIES,
  MOCK_GRANTS,
  MOCK_NOTIFICATIONS,
  MOCK_PROGRESS,
  MOCK_SAVED,
} from './mockData.js'

// 화면은 이 파일의 함수만 호출한다.
// 로그인한 상태면 Supabase(DB/Edge Function)를, 아니면(데모 모드) mockData 를 쓴다.

const MOCK_DELAY_MS = 200
const URGENT_DAYS = 7
const RECOMMEND_LIMIT = 12
const URGENT_LOOKAHEAD_DAYS = 14

function mockResponse(data) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), MOCK_DELAY_MS))
}

function todayString() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now - offset).toISOString().slice(0, 10)
}

// 'YYYY-MM-DD' 까지 남은 일수. 상시 모집(null)이면 null
function daysUntil(deadline) {
  if (!deadline) return null
  const ms = new Date(`${deadline}T00:00:00`) - new Date(`${todayString()}T00:00:00`)
  return Math.round(ms / 86400000)
}

const GRANT_COLUMNS =
  'id, category, title, description, agency, region, region_sido, deadline, apply_period, benefit, apply_url, documents, age_min, age_max'

// 정부24 데이터에서 합쳐진 지역명 — 프로필의 옛 이름으로도 찾을 수 있게
const MERGED_SIDO = {
  광주광역시: '전남광주통합특별시',
  전라남도: '전남광주통합특별시',
}

// 마감일이 없는 사업은 신청기한 글(상시신청, 접수기관 별 상이 …)로 표시
function periodLabel(applyPeriod) {
  if (!applyPeriod || /상시|연중|수시/.test(applyPeriod)) return '상시'
  return '공고 확인'
}

// DB grants 행 → 화면용
function toGrant(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    agency: row.agency ?? '',
    region: row.region,
    deadline: row.deadline,
    dDay: daysUntil(row.deadline),
    periodLabel: periodLabel(row.apply_period),
    benefit: row.benefit ?? '',
    applyUrl: row.apply_url,
    documents: row.documents ?? [],
  }
}

function ageFromBirthYear(birthYear) {
  return birthYear ? new Date().getFullYear() - birthYear : null
}

/**
 * 추천 조건: 신청 가능(마감 전) + 전국/내 지역 + 내 나이 + 관심 분야
 * PostgREST 에서 or 필터를 여러 번 쓰면 서로 덮어쓸 수 있어서 하나의 and(...) 로 묶는다.
 */
function recommendFilter(profile) {
  const conditions = [`or(deadline.is.null,deadline.gte.${todayString()})`]

  if (profile.region) {
    const sidos = [profile.region, MERGED_SIDO[profile.region]].filter(Boolean)
    conditions.push(`or(region_sido.is.null,region_sido.in.(${sidos.join(',')}))`)
  }

  const age = ageFromBirthYear(profile.birthYear)
  if (age !== null) {
    conditions.push(`or(age_min.is.null,age_min.lte.${age})`, `or(age_max.is.null,age_max.gte.${age})`)
  }

  return `and(${conditions.join(',')})`
}

/**
 * 사용자에게 추천하는 혜택 목록
 * - 앞쪽: 조건에 맞는 것 중 정부24 조회수(인기) 순 → 홈 카드
 * - 뒤쪽: 14일 안에 마감되는 것 → 홈의 "놓치면 아쉬운 지원"
 *   (마감순으로만 정렬하면 에너지 설비 지원 같은 관련 적은 사업이 앞에 와서 둘로 나눈다)
 */
export async function getRecommendedGrants() {
  if (!supabase) return mockResponse(MOCK_GRANTS)

  // 로그인 전에는 프로필 조건 없이 인기 있는 지원금을 보여준다 (공공 데이터라 anon 도 읽을 수 있다)
  const userId = await currentUserId()
  const profile = userId ? await getMyProfile() : EMPTY_PROFILE
  const base = () => {
    const query = supabase
      .from('grants')
      .select(GRANT_COLUMNS)
      .eq('is_active', true)
      .or(recommendFilter(profile))
    // 관심 분야가 없으면 농어업·행정 같은 '기타' 분야는 빼고 보여준다
    return profile.interests.length > 0
      ? query.in('category', profile.interests)
      : query.neq('category', '기타')
  }

  const soon = new Date(Date.now() + URGENT_LOOKAHEAD_DAYS * 86400000).toISOString().slice(0, 10)
  const [popular, urgent] = await Promise.all([
    base().order('view_count', { ascending: false }).limit(RECOMMEND_LIMIT),
    base()
      .not('deadline', 'is', null)
      .lte('deadline', soon)
      .order('deadline', { ascending: true })
      .limit(5),
  ])
  if (popular.error) throw popular.error
  if (urgent.error) throw urgent.error

  const seen = new Set()
  return [...popular.data, ...urgent.data]
    .filter((row) => !seen.has(row.id) && seen.add(row.id))
    .map(toGrant)
}

/** 신청 준비 현황 { preparing, total } */
export async function getPreparationProgress() {
  const userId = await currentUserId()
  if (!userId) return mockResponse(MOCK_PROGRESS)

  const [grants, { count, error }] = await Promise.all([
    getRecommendedGrants(),
    supabase
      .from('user_grants')
      .select('grant_id', { count: 'exact', head: true })
      .in('status', ['preparing', 'applied']),
  ])
  if (error) throw error
  return { preparing: count ?? 0, total: grants.length }
}

/** 마감 임박 여부 (상시 모집 제외) */
export function isUrgent(grant) {
  return grant.dDay !== null && grant.dDay >= 0 && grant.dDay <= URGENT_DAYS
}

/**
 * 알림 목록
 * - type 'deadline': 추천 혜택 중 마감이 7일 이내인 것 (화면에서 계산)
 * - 그 외: notifications 테이블 (신청 현황 변경 등)
 */
export async function getNotifications() {
  if (!supabase) return mockResponse(MOCK_NOTIFICATIONS)
  const userId = await currentUserId()

  const [grants, storedResult] = await Promise.all([
    getRecommendedGrants(),
    userId
      ? supabase
          .from('notifications')
          .select('id, type, message, read, created_at, grant:grants(id, title, deadline)')
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [], error: null },
  ])
  const { data: rows, error } = storedResult
  if (error) throw error

  const deadlineAlerts = grants.filter(isUrgent).map((grant) => ({
    id: `deadline-${grant.id}`,
    type: 'deadline',
    grantId: grant.id,
    title: grant.title,
    message: `신청 마감까지 ${grant.dDay}일 남았어요. 서류를 미리 준비해 두세요.`,
    deadline: grant.deadline,
    dDay: grant.dDay,
    read: false,
  }))

  const stored = rows.map((row) => ({
    id: row.id,
    type: row.type,
    grantId: row.grant?.id ?? null,
    title: row.grant?.title ?? '알림',
    message: row.message,
    deadline: row.grant?.deadline ?? null,
    dDay: daysUntil(row.grant?.deadline),
    read: row.read,
  }))

  return [...deadlineAlerts, ...stored]
}

/** 알림 읽음 처리 (마감 임박 알림은 화면에서 만든 것이라 DB 에 없다) */
export async function markNotificationsRead(ids) {
  const dbIds = ids.filter((id) => typeof id === 'number')
  if (!supabase || dbIds.length === 0) return { ids }
  const { error } = await supabase.from('notifications').update({ read: true }).in('id', dbIds)
  if (error) throw error
  return { ids }
}

// ---------- 담은 혜택 / 서류 체크 ----------

// 데모 모드용 메모리 저장소 (새로고침하면 처음 상태로)
let demoSaved = structuredClone(MOCK_SAVED)

function withSavedInfo(grant, saved) {
  return {
    ...grant,
    status: saved.status,
    checkedDocuments: saved.checkedDocuments.filter((doc) => grant.documents.includes(doc)),
  }
}

/** 내가 담은 혜택 목록 (서류 체크 대상). 각 항목에 status, checkedDocuments 가 붙는다 */
export async function getSavedGrants() {
  const userId = await currentUserId()
  if (!userId) {
    const list = demoSaved
      .map((saved) => {
        const grant = MOCK_GRANTS.find((item) => item.id === saved.grantId)
        return grant && withSavedInfo(grant, saved)
      })
      .filter(Boolean)
    return mockResponse(list)
  }

  const { data, error } = await supabase
    .from('user_grants')
    .select(`status, checked_documents, created_at, grant:grants(${GRANT_COLUMNS})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
    .filter((row) => row.grant)
    .map((row) =>
      withSavedInfo(toGrant(row.grant), {
        status: row.status,
        checkedDocuments: row.checked_documents ?? [],
      }),
    )
}

/** 혜택 담기 (이미 담겨 있으면 그대로) */
export async function saveGrant(grantId) {
  const userId = await currentUserId()
  if (!userId) {
    if (!demoSaved.some((saved) => saved.grantId === grantId)) {
      demoSaved = [{ grantId, status: 'interested', checkedDocuments: [] }, ...demoSaved]
    }
    return mockResponse({ grantId })
  }
  const { error } = await supabase
    .from('user_grants')
    .upsert({ user_id: userId, grant_id: grantId }, { ignoreDuplicates: true })
  if (error) throw error
  return { grantId }
}

/** 담기 취소 */
export async function unsaveGrant(grantId) {
  const userId = await currentUserId()
  if (!userId) {
    demoSaved = demoSaved.filter((saved) => saved.grantId !== grantId)
    return mockResponse({ grantId })
  }
  const { error } = await supabase
    .from('user_grants')
    .delete()
    .eq('user_id', userId)
    .eq('grant_id', grantId)
  if (error) throw error
  return { grantId }
}

/** 체크한 서류 저장. 하나라도 체크하면 '신청 준비 중' 으로 바뀐다 */
export async function updateCheckedDocuments(grantId, checkedDocuments) {
  const status = checkedDocuments.length > 0 ? 'preparing' : 'interested'
  const userId = await currentUserId()
  if (!userId) {
    demoSaved = demoSaved.map((saved) =>
      saved.grantId === grantId ? { ...saved, status, checkedDocuments } : saved,
    )
    return mockResponse({ grantId, status, checkedDocuments })
  }
  const { error } = await supabase
    .from('user_grants')
    .update({ checked_documents: checkedDocuments, status })
    .eq('user_id', userId)
    .eq('grant_id', grantId)
    .neq('status', 'applied') // 신청 완료한 건 되돌리지 않는다
  if (error) throw error
  return { grantId, status, checkedDocuments }
}

/**
 * 지원금 찾기 화면용 목록 조회
 * @param {{ keyword?: string, category?: string, sido?: string, page?: number, pageSize?: number }} options
 *   sido: '' 전체 | '전국' 전국 사업만 | 시도 이름 (그 지역 + 전국)
 * @returns {Promise<{ grants: object[], total: number }>}
 */
export async function findGrants({ keyword = '', category = '', sido = '', page = 0, pageSize = 12 } = {}) {
  const text = keyword.trim().replace(/[%_,()]/g, '')

  if (!supabase) {
    const filtered = MOCK_GRANTS.filter(
      (grant) =>
        (!text || grant.title.includes(text)) && (!category || grant.category === category),
    )
    return mockResponse({ grants: filtered, total: filtered.length })
  }

  const conditions = [`or(deadline.is.null,deadline.gte.${todayString()})`]
  if (sido === '전국') {
    conditions.push('region_sido.is.null')
  } else if (sido) {
    const sidos = [sido, MERGED_SIDO[sido]].filter(Boolean)
    conditions.push(`or(region_sido.is.null,region_sido.in.(${sidos.join(',')}))`)
  }
  if (text) conditions.push(`or(title.ilike.*${text}*,description.ilike.*${text}*)`)

  let query = supabase
    .from('grants')
    .select(GRANT_COLUMNS, { count: 'exact' })
    .eq('is_active', true)
    .or(`and(${conditions.join(',')})`)
  if (category) query = query.eq('category', category)

  const { data, error, count } = await query
    .order('view_count', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (error) throw error
  return { grants: data.map(toGrant), total: count ?? 0 }
}

const GRANT_DETAIL_COLUMNS = `${GRANT_COLUMNS}, field, support_type, target, criteria, support_detail, how_to_apply, contact, income_levels, targets`

/** 지원금 상세 (카드를 눌렀을 때 보이는 화면) */
export async function getGrantById(id) {
  if (!supabase) {
    const grant = MOCK_GRANTS.find((item) => item.id === id)
    return grant ? mockResponse(grant) : null
  }
  const { data, error } = await supabase
    .from('grants')
    .select(GRANT_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...toGrant(data),
    field: data.field ?? '',
    supportType: data.support_type ?? '',
    target: data.target ?? '',
    criteria: data.criteria ?? '',
    supportDetail: data.support_detail ?? '',
    howToApply: data.how_to_apply ?? '',
    contact: data.contact ?? '',
    incomeLevels: data.income_levels ?? [],
    targets: data.targets ?? [],
    applyPeriod: data.apply_period ?? '',
  }
}

/** 지원금 이름으로 검색 (서류 체크 화면 상단 검색창) */
export async function searchGrants(keyword) {
  const text = keyword.trim()
  if (!text) return []
  if (!supabase) return mockResponse(MOCK_GRANTS.filter((grant) => grant.title.includes(text)))

  const { data, error } = await supabase
    .from('grants')
    .select(GRANT_COLUMNS)
    .eq('is_active', true)
    .or(`deadline.is.null,deadline.gte.${todayString()}`)
    .ilike('title', `%${text.replace(/[%_,()]/g, '')}%`)
    .order('view_count', { ascending: false })
    .limit(8)
  if (error) throw error
  return data.map(toGrant)
}

/**
 * AI Agent 에게 질문 (Edge Function 'ai-agent' 가 OpenAI 를 대신 호출)
 * @param {{ role: 'user' | 'assistant', content: string }[]} messages 지금까지의 대화
 * @returns {Promise<{ reply: string, grants: { id, title, benefit }[], remaining: number | null }>}
 */
export async function askAgent(messages) {
  const userId = await currentUserId()
  if (!userId) {
    // 데모 모드: 로그인 전에는 시안과 같은 흐름의 예시 답변을 보여준다
    const turn = messages.filter((message) => message.role === 'user').length - 1
    const demo = MOCK_AGENT_REPLIES[Math.min(turn, MOCK_AGENT_REPLIES.length - 1)]
    await new Promise((resolve) => setTimeout(resolve, 900))
    return { ...structuredClone(demo), remaining: null }
  }

  const { data, error } = await supabase.functions.invoke('ai-agent', { body: { messages } })
  if (error) {
    console.error('[AI Agent 호출 실패]', error)
    const status = error.context?.status
    if (status === 404) {
      throw new Error("AI 서버 함수 'ai-agent' 가 배포되지 않았어요. (Supabase → Edge Functions 확인)")
    }
    // Edge Function 이 돌려준 { error: '...' } 메시지를 그대로 보여준다
    const body = await error.context?.json?.().catch(() => null)
    throw new Error(
      body?.error ?? body?.message ?? 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
  }
  return data
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
