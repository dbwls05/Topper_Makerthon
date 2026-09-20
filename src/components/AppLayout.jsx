import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../lib/UserContext.jsx'
import { ChevronRightIcon } from './icons.jsx'
import NotificationMenu from './NotificationMenu.jsx'
import { ALL_NAV, BOTTOM_NAV, MAIN_NAV } from './navItems.js'

function NavItem({ to, label, Icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
      <span className="nav-icon">
        <Icon />
      </span>
      {label}
    </NavLink>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/home" className="sidebar-logo" aria-label="NUDGE 홈">
        <img src="/logo.svg" alt="nudge" width="85" height="29" />
      </NavLink>
      <p className="sidebar-section">WORKSPACE</p>
      <nav className="sidebar-nav">
        {MAIN_NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <nav className="sidebar-nav sidebar-nav--bottom">
        {BOTTOM_NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  )
}

// 모바일 하단 탭바 (데스크톱에서는 사이드바가 대신 보인다)
function MobileTabBar() {
  return (
    <nav className="tabbar" aria-label="모바일 메뉴">
      {ALL_NAV.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `tabbar-item${isActive ? ' is-active' : ''}`}>
          <span className="tabbar-icon">
            <Icon />
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function Topbar() {
  const { pathname } = useLocation()
  const { name } = useCurrentUser()
  const current = ALL_NAV.find((item) => pathname.startsWith(item.to))

  return (
    <header className="topbar">
      {/* 모바일에서는 경로 대신 로고 */}
      <NavLink to="/home" className="topbar-logo" aria-label="NUDGE 홈">
        <img src="/logo.svg" alt="nudge" width="72" height="25" />
      </NavLink>
      <p className="breadcrumb">
        <span>나의 workspace</span>
        <ChevronRightIcon size={14} />
        <strong>{current?.label ?? ''}</strong>
      </p>
      <div className="topbar-right">
        <NotificationMenu />
        <NavLink to="/mypage" className="profile-chip">
          <span className="profile-chip-name">{name}</span>
          <span className="avatar">{name.slice(0, 1)}</span>
        </NavLink>
      </div>
    </header>
  )
}

// 여백 없이 화면을 꽉 채우는 페이지 (입력창이 하단에 붙는 채팅 화면)
const FLUSH_PATHS = ['/agent']

export default function AppLayout() {
  const { pathname } = useLocation()
  const flush = FLUSH_PATHS.some((path) => pathname.startsWith(path))

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className={`app-content${flush ? ' app-content--flush' : ''}`}>
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
