// 사이드바/카드에서 쓰는 작은 아이콘 모음

export function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.2 12 3l9 7.2V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" fill="#7dd3fc" />
      <rect x="9.5" y="14" width="5" height="7.5" rx="1" fill="#e0f2fe" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="7" fill="#60a5fa" />
      <circle cx="10.5" cy="10.5" r="4.2" fill="#dbeafe" />
      <path d="m16 16 5 5" stroke="#3b82f6" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3.5 12 10l6.5 2-6.5 2-2 6.5L8 14l-6.5-2L8 10z" fill="#38bdf8" />
      <path d="m18.5 2 .9 2.6L22 5.5l-2.6.9-.9 2.6-.9-2.6L15 5.5l2.6-.9z" fill="#7dd3fc" />
    </svg>
  )
}

export function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="18" rx="3" fill="#38bdf8" />
      <rect x="8" y="2" width="8" height="4.5" rx="1.5" fill="#bae6fd" />
      <path d="m8.5 13.5 2.3 2.3 4.7-4.8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4.5" fill="#60a5fa" />
      <path d="M3.5 21c.8-4.3 4.2-7 8.5-7s7.7 2.7 8.5 7z" fill="#93c5fd" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5zM10 20.5a2 2 0 0 0 4 0"
        stroke="#3b3f47"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10.5h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 20c.6-3.6 3-5.8 5.5-5.8s4.9 2.2 5.5 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 14.6c1.8.2 3.4 1.8 4 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="18" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 13.5h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function TagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11.6 3.5h5.4A1.5 1.5 0 0 1 18.5 5v5.4a1.5 1.5 0 0 1-.44 1.06l-7.2 7.2a1.5 1.5 0 0 1-2.12 0l-5.3-5.3a1.5 1.5 0 0 1 0-2.12l7.2-7.2a1.5 1.5 0 0 1 1.06-.44Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="14.5" cy="8" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h4M12 7h8M4 17h10M18 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.8" fill="#273071" />
      <circle cx="15" cy="17" r="2.3" stroke="currentColor" strokeWidth="1.8" fill="#273071" />
    </svg>
  )
}
