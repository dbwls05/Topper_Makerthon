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
  'id, category, title, description, agency, region, deadline, benefit, apply_url, documents'

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
    benefit: row.benefit ?? '',
    applyUrl: row.apply_url,
    documents: row.documents ?? [],
  }
}

/** 사용자에게 추천하는 혜택 목록 (마감 임박 순, 상시 모집은 뒤로) */
export async function getRecommendedGrants() {
  const userId = await currentUserId()
  if (!userId) return mockResponse(MOCK_GRANTS)

  const profile = await getMyProfile()
  let query = supabase
    .from('grants')
    .select(GRANT_COLUMNS)
    .eq('is_active', true)
    .or(`deadline.is.null,deadline.gte.${todayString()}`)
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(RECOMMEND_LIMIT)
  if (profile.region) query = query.in('region', ['전국', profile.region])
  if (profile.interests.length > 0) query = query.in('category', profile.interests)

  const { data, error } = await query
  if (error) throw error
  return data.map(toGrant)
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
  const userId = await currentUserId()
  if (!userId) return mockResponse(MOCK_NOTIFICATIONS)

  const [grants, { data: rows, error }] = await Promise.all([
    getRecommendedGrants(),
    supabase
      .from('notifications')
      .select('id, type, message, read, created_at, grant:grants(id, title, deadline)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])
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

/** 지원금 이름으로 검색 (서류 체크 화면 상단 검색창) */
export async function searchGrants(keyword) {
  const text = keyword.trim()
  if (!text) return []
  const userId = await currentUserId()
  if (!userId) {
    return mockResponse(MOCK_GRANTS.filter((grant) => grant.title.includes(text)))
  }
  const { data, error } = await supabase
    .from('grants')
    .select(GRANT_COLUMNS)
    .eq('is_active', true)
    .ilike('title', `%${text.replace(/[%_,()]/g, '')}%`)
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
