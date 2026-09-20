import { useEffect, useState } from 'react'
import { findGrants } from '../api/benefits.js'
import { CATEGORY_COLORS } from '../components/categoryColors.js'
import { REGIONS } from '../constants/profileOptions.js'
import SaveGrantButton from '../components/SaveGrantButton.jsx'
import { CalendarIcon, ChevronRightIcon, PinIcon } from '../components/icons.jsx'
import '../styles/search.css'

const PAGE_SIZE = 12

// 시안의 필터 칩 — '생활'은 정부24 분야를 묶은 우리 카테고리 '복지'
const CATEGORY_CHIPS = [
  { label: '전체', value: '' },
  { label: '취업', value: '취업' },
  { label: '주거', value: '주거' },
  { label: '교육', value: '교육' },
  { label: '생활', value: '복지' },
]

function formatDDay(grant) {
  if (grant.dDay === null) return grant.periodLabel ?? '상시'
  return grant.dDay === 0 ? 'D-Day' : `D-${grant.dDay}`
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function GrantCard({ grant }) {
  return (
    <article className="card grant-card">
      <div className="grant-card-top">
        <p className="grant-category">
          <span className="dot" style={{ background: CATEGORY_COLORS[grant.category] ?? '#9ca1ab' }} />
          {grant.category}
        </p>
        <SaveGrantButton grantId={grant.id} />
      </div>
      <h3 className="grant-title">{grant.title}</h3>
      <p className="grant-desc">{grant.description}</p>
      <p className="grant-meta">
        <span>
          <PinIcon /> {grant.agency || grant.region}
        </span>
        <span>
          <CalendarIcon /> {formatDDay(grant)}
        </span>
      </p>
      {grant.applyUrl ? (
        <a className="grant-benefit" href={grant.applyUrl} target="_blank" rel="noreferrer noopener">
          <span className="grant-benefit-text">{grant.benefit || '신청 안내 보기'}</span>
          <ChevronRightIcon color="#9ca1ab" />
        </a>
      ) : (
        <p className="grant-benefit">
          <span className="grant-benefit-text">{grant.benefit}</span>
        </p>
      )}
    </article>
  )
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState('') // 입력 중인 값
  const [query, setQuery] = useState('') // 실제로 검색에 쓰는 값 (입력이 멈추면 반영)
  const [category, setCategory] = useState('')
  const [sido, setSido] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState({ grants: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(keyword)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    let alive = true
    setLoading(true)
    findGrants({ keyword: query, category, sido, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!alive) return
        // 더 보기로 넘어온 페이지는 뒤에 이어 붙인다
        setResult((prev) =>
          page === 0 ? data : { grants: [...prev.grants, ...data.grants], total: data.total },
        )
        setError('')
      })
      .catch((err) => {
        if (!alive) return
        console.error('[지원금 찾기 실패]', err)
        setError('지원금을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query, category, sido, page])

  function changeFilter(setter) {
    return (value) => {
      setter(value)
      setPage(0)
    }
  }

  const hasMore = result.grants.length < result.total

  return (
    <div className="search-page">
      <div className="search-bar">
        <span className="search-bar-icon">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="어떤 지원을 찾고 계신가요?"
          aria-label="지원금 검색"
        />
      </div>

      <div className="search-chips" role="group" aria-label="분야 선택">
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={`search-chip${category === chip.value ? ' is-on' : ''}`}
            aria-pressed={category === chip.value}
            onClick={() => changeFilter(setCategory)(chip.value)}
          >
            {chip.label}
          </button>
        ))}

        <label className={`search-chip search-chip--region${sido ? ' is-on' : ''}`}>
          <span className="sr-only">지역</span>
          <select value={sido} onChange={(event) => changeFilter(setSido)(event.target.value)}>
            <option value="">지역</option>
            <option value="전국">전국 사업만</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading && page === 0 ? (
        <p className="search-status">찾는 중...</p>
      ) : result.grants.length === 0 ? (
        <div className="search-empty">검색 결과가 없어요. 다른 낱말이나 분야로 찾아보세요.</div>
      ) : (
        <div className="grant-grid search-grid">
          {result.grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          className="search-more"
          onClick={() => setPage((current) => current + 1)}
          disabled={loading}
        >
          {loading ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  )
}
