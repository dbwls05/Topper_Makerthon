import { Link } from 'react-router-dom'

export default function LoginStubPage() {
  return (
    <main className="auth-page">
      <div className="auth-card auth-card--slim">
        <h1 className="auth-title">로그인</h1>
        <p className="auth-hint">로그인 페이지는 아직 준비 중이에요.</p>
        <Link className="btn btn--secondary" to="/signup">
          회원가입으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
