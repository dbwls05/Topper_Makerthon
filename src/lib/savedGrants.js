import { useEffect, useSyncExternalStore } from 'react'
import { getSavedGrants, saveGrant, unsaveGrant } from '../api/benefits.js'

// "담은 혜택" id 목록을 여러 화면(홈 카드, AI Agent 카드, 서류 체크)이 같이 쓰는 작은 저장소.
// 한 곳에서 담기를 누르면 다른 화면의 버튼 상태도 같이 바뀐다.

let savedIds = new Set()
let loaded = false
let loading = null
const listeners = new Set()

function emit() {
  savedIds = new Set(savedIds) // 새 객체로 바꿔야 React 가 변경을 알아챈다
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function refreshSavedGrants() {
  loading = getSavedGrants()
    .then((list) => {
      savedIds = new Set(list.map((grant) => grant.id))
      loaded = true
      emit()
      return list
    })
    .finally(() => {
      loading = null
    })
  return loading
}

/** 담기/취소 토글. 실패하면 원래 상태로 되돌린다 */
export async function toggleSavedGrant(grantId) {
  const wasSaved = savedIds.has(grantId)
  if (wasSaved) savedIds.delete(grantId)
  else savedIds.add(grantId)
  emit()
  try {
    await (wasSaved ? unsaveGrant(grantId) : saveGrant(grantId))
  } catch (error) {
    if (wasSaved) savedIds.add(grantId)
    else savedIds.delete(grantId)
    emit()
    throw error
  }
}

export function markGrantSaved(grantId) {
  if (savedIds.has(grantId)) return
  savedIds.add(grantId)
  emit()
}

export function useSavedGrantIds() {
  useEffect(() => {
    if (!loaded && !loading) refreshSavedGrants().catch(() => {})
  }, [])
  return useSyncExternalStore(subscribe, () => savedIds)
}
