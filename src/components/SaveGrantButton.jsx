import { useState } from 'react'
import { toggleSavedGrant, useSavedGrantIds } from '../lib/savedGrants.js'

function BookmarkIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 혜택 "담기" 버튼 — 담은 혜택은 서류 체크 메뉴에서 모아볼 수 있다
export default function SaveGrantButton({ grantId, className = '' }) {
  const savedIds = useSavedGrantIds()
  const saved = savedIds.has(grantId)
  const [busy, setBusy] = useState(false)

  async function handleClick(event) {
    // 카드 전체가 링크여도 버튼만 동작하게
    event.preventDefault()
    event.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      await toggleSavedGrant(grantId)
    } catch (error) {
      console.error('[혜택 담기 실패]', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`save-button${saved ? ' is-saved' : ''} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? '담기 취소' : '서류 체크에 담기'}
      title={saved ? '담기 취소' : '담기'}
      onClick={handleClick}
      disabled={busy}
    >
      <BookmarkIcon filled={saved} />
    </button>
  )
}
