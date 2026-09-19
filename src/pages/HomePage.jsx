import { Link } from 'react-router-dom'
import { useCurrentUser } from '../lib/UserContext.jsx'
import { getPreparationProgress, getRecommendedGrants } from '../api/benefits.js'
import { useApi } from '../hooks/useApi.js'
import { CATEGORY_COLORS } from '../components/categoryColors.js'
import { ArrowRightIcon, CalendarIcon, ChevronRightIcon, PinIcon } from '../components/icons.jsx'
import heroBg from '../assets/hero-bg.png'
import robotHero from '../assets/robot-hero.png'
import robotProfile from '../assets/robot-profile.png'

const URGENT_DAYS = 7

// 예: "MONDAY · SEPTEMBER 19"
function formatToday(date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  return `${weekday} · ${month} ${date.getDate()}`
}

function DeadlineCard({ grants }) {
  return (
    <section className="card deadline-card">
      <p className="deadline-eyebrow">신청 마감 임박</p>
      <h2 className="card-title">놓치면 아쉬운 지원</h2>
      {grants.length === 0 ? (
        <p className="deadline-empty">마감이 임박한 지원이 없어요.</p>
      ) : (
        <ul className="deadline-list">
          {grants.map((grant) => {
            const deadline = new Date(grant.deadline)
            return (
              <li key={grant.id} className="deadline-item">
                <span className="date-badge">
                  <strong>{deadline.getDate()}</strong>
                  {deadline.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                </span>
                <div className="deadline-info">
                  <p className="deadline-name">{grant.title}</p>
                  <p className="deadline-meta">
                    {grant.region} · {grant.category}
                  </p>
                </div>
                <span className="deadline-dday">D-{grant.dDay}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function GrantCard({ grant }) {
  return (
    <article className="card grant-card">
      <p className="grant-category">
        <span className="dot" style={{ background: CATEGORY_COLORS[grant.category] }} />
        {grant.category}
      </p>
      <h3 className="grant-title">{grant.title}</h3>
      <p className="grant-desc">{grant.description}</p>
      <p className="grant-meta">
        <span>
          <PinIcon /> {grant.agency}
        </span>
        <span>
          <CalendarIcon /> D-{grant.dDay}
        </span>
      </p>
      <Link to="/search" className="grant-benefit">
        {grant.benefit}
        <ChevronRightIcon color="#9ca1ab" />
      </Link>
    </article>
  )
}

// 12시 방향에서 시계 반대 방향으로 채워지는 도넛 차트
function ProgressRing({ done, total }) {
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const ratio = total === 0 ? 0 : done / total

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <linearGradient id="ringGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fd3fb" />
            <stop offset="100%" stopColor="#3aa8f0" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r={radius} fill="none" stroke="#eef7fe" strokeWidth="30" />
        <circle
          cx="120"
          cy="120"
          r="66"
          fill="none"
          stroke="#9fd5f7"
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform="translate(240 0) scale(-1 1) rotate(-90 120 120)"
        />
      </svg>
      <span className="progress-label">
        {done}/{total}
      </span>
    </div>
  )
}

export default function HomePage() {
  const { givenName } = useCurrentUser()
  const { data: grants } = useApi(getRecommendedGrants, [])
  const { data: progress } = useApi(getPreparationProgress, { preparing: 0, total: 0 })
  const urgentGrants = grants.filter((grant) => grant.dDay <= URGENT_DAYS)

  return (
    <div className="home">
      <section className="greeting">
        <p className="greeting-date">{formatToday(new Date())} · 서울</p>
        <h1 className="greeting-title">안녕하세요, {givenName}님!</h1>
        <p className="greeting-desc">
          지금 받을 수 있는 지원을 확인하고, 신청까지 차근차근 준비해보세요
        </p>
      </section>

      <div className="home-top">
        <section className="hero" style={{ backgroundImage: `url(${heroBg})` }}>
          <div className="hero-text">
            <h2 className="hero-title">
              어떤 <strong>지원</strong>이
              <br />
              나에게 맞을까요?
            </h2>
            <p className="hero-desc">
              {givenName}님의 상황에 맞는 지원을 찾고
              <br />
              신청 준비까지 함께 관리해드려요.
            </p>
            <Link to="/agent" className="hero-button">
              AI에게 물어보기 <ArrowRightIcon />
            </Link>
          </div>
          <img className="hero-robot" src={robotHero} alt="" />
        </section>
        <DeadlineCard grants={urgentGrants} />
      </div>

      <section className="home-section">
        <h2 className="section-title">{givenName}님이 신청 가능한 지원금</h2>
        <div className="grant-grid">
          {grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      </section>

      <div className="home-bottom">
        <Link to="/my-grants" className="card progress-card">
          <div>
            <p className="card-eyebrow">MY PROGRESS</p>
            <h2 className="card-title">신청 준비 현황</h2>
            <p className="progress-summary">
              맞춤 지원금 {progress.total}개중
              <br />
              <strong>{progress.preparing}개</strong>를 준비 중이에요
            </p>
            <p className="progress-hint">가장 가까운 마감부터 챙겨볼까요?</p>
          </div>
          <ProgressRing done={progress.preparing} total={progress.total} />
        </Link>

        <Link to="/mypage" className="card profile-card">
          <div>
            <p className="card-eyebrow">MY PROFILE</p>
            <h2 className="card-title">맞춤 프로필</h2>
            <p className="profile-cta">
              나에게 맞는 지원을 찾도록
              <br />
              NUDGE에게 나를 알려주세요
            </p>
          </div>
          <div className="profile-visual">
            <img className="profile-robot" src={robotProfile} alt="" />
          </div>
        </Link>
      </div>
    </div>
  )
}
