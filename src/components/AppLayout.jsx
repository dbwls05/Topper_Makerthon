import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserProvider, useCurrentUser } from '../lib/UserContext.jsx'
import { BellIcon, ChevronRightIcon } from './icons.jsx'
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
      <NavLink to="/home" className="sidebar-logo">
        로고
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

function Topbar() {
  const { pathname } = useLocation()
  const { name } = useCurrentUser()
  const current = ALL_NAV.find((item) => pathname.startsWith(item.to))

  return (
    <header className="topbar">
      <p className="breadcrumb">
        <span>나의 workspace</span>
        <ChevronRightIcon size={14} />
        <strong>{current?.label ?? ''}</strong>
      </p>
      <div className="topbar-right">
        <button type="button" className="icon-button" aria-label="알림">
          <BellIcon />
          <span className="badge-dot" />
        </button>
        <NavLink to="/mypage" className="profile-chip">
          {name}
          <span className="avatar">{name.slice(0, 1)}</span>
        </NavLink>
      </div>
    </header>
  )
}

export default function AppLayout() {
  return (
    <UserProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Topbar />
          <main className="app-content">
            <Outlet />
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
