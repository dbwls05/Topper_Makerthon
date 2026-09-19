// 맞춤 프로필 설정 화면의 선택지 아이콘 (시안의 하늘색 톤)

const LIGHT = '#bae6fd'
const MID = '#7dd3fc'
const DEEP = '#38bdf8'

export function CapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 1.5 9 12 14l10.5-5z" fill={DEEP} />
      <path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5L12 14.5z" fill={MID} />
    </svg>
  )
}

export function LaptopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="1.8" fill={MID} />
      <rect x="6" y="7" width="12" height="7" rx="0.8" fill={LIGHT} />
      <path d="M2 17.5h20l-1.2 2H3.2z" fill={DEEP} />
    </svg>
  )
}

export function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6V4.8C9 4.4 9.4 4 9.8 4h4.4c.4 0 .8.4.8.8V6" stroke={DEEP} strokeWidth="1.8" fill="none" />
      <rect x="3" y="6" width="18" height="14" rx="2.5" fill={MID} />
      <path d="M3 11.5h18" stroke={LIGHT} strokeWidth="1.6" />
    </svg>
  )
}

export function StoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 4h17l1 5H2.5z" fill={DEEP} />
      <rect x="4" y="9" width="16" height="11" rx="1.5" fill={MID} />
      <rect x="9.5" y="13" width="5" height="7" rx="0.8" fill={LIGHT} />
    </svg>
  )
}

export function WalkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="13.5" cy="4" r="2.2" fill={DEEP} />
      <path
        d="m12.5 8-2.5 5 3 2.5-1 5.5M12.5 8l3 3.5 3 1M10 13l-3 2.5M9.5 8.5 7 11"
        stroke={MID}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17.5 13v8" stroke={DEEP} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function HouseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.5 10.5h19z" fill={MID} />
      <rect x="4.5" y="10" width="15" height="10.5" rx="1.8" fill={DEEP} />
    </svg>
  )
}

export function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5S3 15 3 8.8C3 6.1 5.1 4 7.7 4c1.8 0 3.3 1 4.3 2.4C13 5 14.5 4 16.3 4 18.9 4 21 6.1 21 8.8 21 15 12 20.5 12 20.5Z"
        fill={MID}
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
