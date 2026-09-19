import { Navigate, Route, Routes } from 'react-router-dom'
import SignupPage from './pages/SignupPage.jsx'
import LoginStubPage from './pages/LoginStubPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginStubPage />} />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}
