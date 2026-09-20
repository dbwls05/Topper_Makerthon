import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getGrantById } from '../api/benefits.js'
import { CATEGORY_COLORS } from '../components/categoryColors.js'
import SaveGrantButton from '../components/SaveGrantButton.jsx'
import { useSavedGrantIds } from '../lib/savedGrants.js'
import { CalendarIcon, ChevronRightIcon, PinIcon } from '../components/icons.jsx'
import '../styles/grant-detail.css'

// 지원금 상세 — 카드를 누르면 오는 화면. 정부24 원문 정보를 그대로 보여준다.

function formatDeadline(grant) {
  if (grant.dDay === null) return grant.applyPeriod || '상시 모집'
  if (grant.dDay < 0) return '마감'
  const label = grant.dDay === 0 ? '오늘 마감' : `D-${grant.dDay}`
  return `${grant.deadline} (${label})`
}

function Section({ title, children }) {
  if (!children) return null
  return (
    <section className="detail-section">
      <h2 className="detail-section-title">{title}</h2>
      <div className="detail-section-body">{children}</div>
    </section>
  )
}

export default function GrantDetailPage() {
  const { grantId } = useParams()
  const navigate = useNavigate()
  const savedIds = useSavedGrantIds()
  const [grant, setGrant] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing | error

  useEffect(() => {
    let alive = true
    setState('loading')
    getGrantById(grantId)
      .then((data) => {
        if (!alive) return
        setGrant(data)
        setState(data ? 'ready' : 'missing')
      })
      .catch((error) => {
        if (!alive) return
        console.error('[지원금 상세 불러오기 실패]', error)
        setState('error')
      })
    return () => {
      alive = false
    }
  }, [grantId])

  if (state === 'loading') return <p className="detail-status">불러오는 중...</p>
  if (state !== 'ready') {
    return (
      <div className="detail-status">
        <p>{state === 'missing' ? '지원금을 찾을 수 없어요.' : '정보를 불러오지 못했어요.'}</p>
        <Link to="/search" className="detail-apply detail-apply--ghost">
          지원금 찾기로 가기
        </Link>
      </div>
    )
  }

  const saved = savedIds.has(grant.id)

  return (
    <div className="detail">
      <button type="button" className="detail-back" onClick={() => navigate(-1)}>
        ← 뒤로
      </button>

      <header className="card detail-head">
        <p className="detail-category">
          <span className="dot" style={{ background: CATEGORY_COLORS[grant.category] ?? '#9ca1ab' }} />
          {grant.category}
          {grant.field && <span className="detail-field">{grant.field}</span>}
        </p>
        <h1 className="detail-title">{grant.title}</h1>
        {grant.description && <p className="detail-desc">{grant.description}</p>}

        <div className="detail-meta">
          <span>
            <PinIcon /> {grant.agency || grant.region}
          </span>
          <span>
            <CalendarIcon /> {formatDeadline(grant)}
          </span>
          {grant.supportType && <span className="detail-tag">{grant.supportType}</span>}
        </div>

        <div className="detail-actions">
          {grant.applyUrl ? (
            <a
              className="detail-apply"
              href={grant.applyUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              신청 페이지로 이동
              <ChevronRightIcon size={18} color="#fff" />
            </a>
          ) : (
            <span className="detail-apply detail-apply--off">신청 링크가 제공되지 않는 사업이에요</span>
          )}
          <span className="detail-save">
            <SaveGrantButton grantId={grant.id} />
            {saved ? '서류 체크에 담김' : '담기'}
          </span>
        </div>
      </header>

      <div className="detail-body">
        <Section title="지원 내용">{grant.supportDetail || grant.benefit}</Section>
        <Section title="지원 대상">{grant.target}</Section>
        <Section title="선정 기준">{grant.criteria}</Section>
        <Section title="신청 방법">{grant.howToApply}</Section>
        <Section title="신청 기한">{grant.applyPeriod}</Section>

        {grant.documents.length > 0 && (
          <Section title={`필요한 서류 ${grant.documents.length}개`}>
            <ul className="detail-docs">
              {grant.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
            {saved && (
              <Link to={`/documents/${grant.id}`} className="detail-docs-link">
                서류 체크에서 준비 현황 관리하기
                <ChevronRightIcon size={16} />
              </Link>
            )}
          </Section>
        )}

        {(grant.targets.length > 0 || grant.incomeLevels.length > 0) && (
          <Section title="자격 조건">
            <ul className="detail-tags">
              {grant.ageMin != null || grant.ageMax != null ? (
                <li>
                  나이 {grant.ageMin ?? 0}~{grant.ageMax ?? '제한 없음'}세
                </li>
              ) : null}
              {grant.targets.map((target) => (
                <li key={target}>{target}</li>
              ))}
              {grant.incomeLevels.map((level) => (
                <li key={level}>{level}</li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="문의처">{grant.contact}</Section>
      </div>

      <p className="detail-note">
        정부24 공공서비스 정보를 그대로 보여드려요. 자격과 기한은 신청 전 공고문에서 다시 확인해
        주세요.
      </p>
    </div>
  )
}
