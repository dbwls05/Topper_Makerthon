import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginStubPage from './pages/LoginStubPage.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import AgentPage from './pages/AgentPage.jsx'
import MyGrantsPage from './pages/MyGrantsPage.jsx'
import MyPage from './pages/MyPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginStubPage />} />

      {/* 사이드바 + 상단바가 있는 페이지들 */}
      <Route element={<AppLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/my-grants" element={<MyGrantsPage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
