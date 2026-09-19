// 회원가입 / 로그인 공통 레이아웃 (왼쪽 비주얼 + 오른쪽 폼)
export default function AuthLayout({ children }) {
  return (
    <main className="signup-page">
      <aside className="signup-visual">
        <img
          src="/signin.svg"
          alt="알아서 찾고, 끝까지 챙겨요. 내 상황에 맞는 혜택을 발견하고 신청 준비까지 놓치지 않도록."
        />
      </aside>
      <section className="signup-content">
        <div className="signup-inner">{children}</div>
      </section>
    </main>
  )
}
