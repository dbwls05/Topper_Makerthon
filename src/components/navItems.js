import { ClipboardIcon, HomeIcon, SearchIcon, SparkleIcon, UserIcon } from './icons.jsx'

export const MAIN_NAV = [
  { to: '/home', label: '홈', Icon: HomeIcon },
  { to: '/search', label: '지원금 찾기', Icon: SearchIcon },
  { to: '/agent', label: 'AI Agent', Icon: SparkleIcon },
  { to: '/my-grants', label: '내 지원금', Icon: ClipboardIcon },
]

export const BOTTOM_NAV = [{ to: '/mypage', label: '마이페이지', Icon: UserIcon }]

export const ALL_NAV = [...MAIN_NAV, ...BOTTOM_NAV]
