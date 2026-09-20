import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../lib/UserContext.jsx'

// 로그인한 사용자만 들어갈 수 있는 화면들.
// 로그인 전에는 회원가입으로 보내고, 가입/로그인 후 원래 가려던 주소로 돌아온다.
export default function RequireAuth() {
  const { isLoggedIn, loading, demoMode } = useCurrentUser()
  const location = useLocation()

  // 새로고침 직후 로그인 확인이 끝나기 전에는 아무것도 하지 않는다 (잘못 내보내지 않으려고)
  if (loading) return null

  if (!isLoggedIn && !demoMode) {
    return <Navigate to="/signup" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
