import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../api/benefits.js'
import { useApi } from '../hooks/useApi.js'
import { BellIcon, ChevronRightIcon } from './icons.jsx'

export default function NotificationMenu() {
  const { data: notifications, loading } = useApi(getNotifications, [])
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState(() => new Set())
  const rootRef = useRef(null)

  const unread = notifications.filter((item) => !item.read && !readIds.has(item.id))
  const deadlineCount = notifications.filter((item) => item.type === 'deadline').length

  // 바깥 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!open) return undefined
    function handlePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    // 패널을 열면 안 읽은 알림을 읽음 처리해서 빨간 점을 없앤다
    if (next && unread.length > 0) {
      const ids = unread.map((item) => item.id)
      setReadIds((prev) => new Set([...prev, ...ids]))
      markNotificationsRead(ids)
    }
  }

  return (
    <div className="noti" ref={rootRef}>
      <button
        type="button"
        className="icon-button"
        aria-label={unread.length > 0 ? `알림 ${unread.length}건` : '알림'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        <BellIcon />
        {unread.length > 0 && <span className="badge-dot" />}
      </button>

      {open && (
        <div className="noti-panel" role="dialog" aria-label="알림">
          <div className="noti-header">
            <p className="noti-title">알림</p>
            {deadlineCount > 0 && (
              <span className="noti-count">마감 임박 {deadlineCount}건</span>
            )}
          </div>

          {loading ? (
            <p className="noti-empty">불러오는 중...</p>
          ) : notifications.length === 0 ? (
            <p className="noti-empty">새로운 알림이 없어요.</p>
          ) : (
            <ul className="noti-list">
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.grantId ? `/documents/${item.grantId}` : '/documents'}
                    className="noti-item"
                    onClick={() => setOpen(false)}
                  >
                    {item.type === 'deadline' ? (
                      <span className="noti-dday">{item.dDay === 0 ? 'D-Day' : `D-${item.dDay}`}</span>
                    ) : (
                      <span className="noti-dday noti-dday--info">알림</span>
                    )}
                    <span className="noti-body">
                      {item.type === 'deadline' && (
                        <span className="noti-label">신청 마감 임박</span>
                      )}
                      <strong className="noti-name">{item.title}</strong>
                      <span className="noti-message">{item.message}</span>
                    </span>
                    <ChevronRightIcon color="#b3b7bf" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
