import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import { UserProvider } from './lib/UserContext.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import AgentPage from './pages/AgentPage.jsx'
import DocumentsPage from './pages/DocumentsPage.jsx'
import GrantDetailPage from './pages/GrantDetailPage.jsx'
import MyPage from './pages/MyPage.jsx'
import ProfileSetupPage from './pages/ProfileSetupPage.jsx'

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* 로그인해야 볼 수 있는 화면들 */}
        <Route element={<RequireAuth />}>
          {/* 메인의 '맞춤 프로필' 카드 → 4단계 입력 + 분석 화면 */}
          <Route path="/profile/setup" element={<ProfileSetupPage />} />

          {/* 사이드바 + 상단바가 있는 페이지들 */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/grants/:grantId" element={<GrantDetailPage />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/:grantId" element={<DocumentsPage />} />
            {/* 예전 주소 */}
            <Route path="/my-grants" element={<Navigate to="/documents" replace />} />
            <Route path="/mypage" element={<MyPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </UserProvider>
  )
}
