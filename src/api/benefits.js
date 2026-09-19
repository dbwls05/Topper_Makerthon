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
