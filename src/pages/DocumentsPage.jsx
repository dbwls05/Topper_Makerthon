import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSavedGrants, saveGrant, searchGrants, updateCheckedDocuments } from '../api/benefits.js'
import { markGrantSaved, useSavedGrantIds } from '../lib/savedGrants.js'
import { CATEGORY_COLORS } from '../components/categoryColors.js'
import { ChevronRightIcon } from '../components/icons.jsx'
import SaveGrantButton from '../components/SaveGrantButton.jsx'
import heroBg from '../assets/hero-bg.png'
import '../styles/documents.css'

// 서류 체크
//   /documents          담은 혜택 목록 → 서류를 체크할 혜택 고르기
//   /documents/:grantId 선택한 혜택의 필요 서류 체크리스트 (시안: 서류체크.svg)
// 오른쪽 "NUDGE 에게 물어보세요" 패널은 질문을 AI Agent 화면으로 넘긴다.

function formatDeadline(dDay) {
  if (dDay === null) return '상시 모집'
  if (dDay < 0) return '마감'
  return dDay === 0 ? '오늘 마감' : `마감 D-${dDay}`
}

// 받침 유무로 은/는 고르기 ("주민등록등본은", "신분증 사본은", "서류는")
function withTopicParticle(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0
  return `${word}${hasBatchim ? '은' : '는'}`
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 3 3 10.5l7 2.5 2.5 7z" fill="currentColor" />
      <path d="m10 13 5-5" stroke="#273071" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// 상단 검색창 — 지원금을 찾아 바로 담고 서류 체크로 이동
function GrantSearch({ onPick }) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const savedIds = useSavedGrantIds()
  const rootRef = useRef(null)

  useEffect(() => {
    const text = keyword.trim()
    if (!text) {
      setResults([])
      return undefined
    }
    let alive = true
    const timer = setTimeout(() => {
      searchGrants(text)
        .then((list) => alive && setResults(list))
        .catch(() => alive && setResults([]))
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [keyword])

  useEffect(() => {
    if (!open) return undefined
    function handlePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  function pick(grant) {
    setOpen(false)
    setKeyword('')
    onPick(grant)
  }

  return (
    <div className="docs-search" ref={rootRef}>
      <span className="docs-search-icon">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={keyword}
        onChange={(event) => {
          setKeyword(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        placeholder="어떤 지원을 찾고 계신가요?"
        aria-label="지원금 검색"
      />
      {open && keyword.trim() && (
        <ul className="docs-search-results">
          {results.length === 0 ? (
            <li className="docs-search-empty">검색 결과가 없어요.</li>
          ) : (
            results.map((grant) => (
              <li key={grant.id}>
                <button type="button" onClick={() => pick(grant)}>
                  <span className="docs-search-title">{grant.title}</span>
                  <span className="docs-search-meta">
                    {grant.category} · {formatDeadline(grant.dDay)}
                  </span>
                  <span className="docs-search-action">
                    {savedIds.has(grant.id) ? '서류 보기' : '담고 서류 보기'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

// 오른쪽: 서류가 헷갈릴땐 NUDGE 에게 물어보세요
function AskNudgePanel({ question, onQuestionChange, inputRef }) {
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    navigate('/agent', { state: { prompt: text } })
  }

  return (
    <aside className="docs-ask" style={{ backgroundImage: `url(${heroBg})` }}>
      <h2 className="docs-ask-title">
        서류가 헷갈릴땐
        <br />
        <strong>NUDGE</strong>에게 물어보세요
      </h2>
      <p className="docs-ask-sub">
        어떤 서류가
        <br />
        <strong>필요한지 모르겠어요...</strong>
      </p>
      <p className="docs-ask-desc">지원사업과 서류 이름을 알려주시면 NUDGE가 쉽게 설명해드릴게요.</p>
      <form className="docs-ask-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="소득 증빙 서류가 뭔지 모르겠어요"
          aria-label="NUDGE 에게 서류 질문하기"
        />
        <button type="submit" disabled={!question.trim()} aria-label="AI Agent 에게 물어보기">
          <SendIcon />
        </button>
      </form>
    </aside>
  )
}

function SavedGrantList({ grants }) {
  if (grants.length === 0) {
    return (
      <div className="docs-empty">
        <p className="docs-empty-title">아직 담은 혜택이 없어요</p>
        <p className="docs-empty-desc">
          홈이나 AI Agent 에서 혜택 카드의 <strong>담기</strong> 버튼을 누르거나,
          <br />위 검색창에서 지원금을 찾아 담아보세요.
        </p>
        <Link to="/home" className="docs-empty-link">
          추천 혜택 보러 가기
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="docs-section-title">
        내가 담은 혜택 <span>{grants.length}</span>
      </h2>
      <p className="docs-section-desc">서류를 체크할 혜택을 골라주세요.</p>
      <div className="docs-saved-grid">
        {grants.map((grant) => {
          const total = grant.documents.length
          const done = grant.checkedDocuments.length
          return (
            <Link key={grant.id} to={`/documents/${grant.id}`} className="docs-saved-card">
              <span className="docs-saved-top">
                <span className="docs-saved-category">
                  <span className="dot" style={{ background: CATEGORY_COLORS[grant.category] ?? '#9ca1ab' }} />
                  {grant.category} · {formatDeadline(grant.dDay)}
                </span>
                <SaveGrantButton grantId={grant.id} />
              </span>
              <span className="docs-saved-title">{grant.title}</span>
              <span className="docs-saved-progress">
                <span className="docs-saved-bar">
                  <span style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
                </span>
                서류 {done}/{total}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function DocumentChecklist({ grant, onToggle, onAsk }) {
  const checked = new Set(grant.checkedDocuments)
  const status = grant.status === 'applied' ? '신청 완료' : grant.dDay !== null && grant.dDay < 0 ? '마감' : '신청가능'

  return (
    <>
      <section className="docs-grant">
        <Link to="/documents" className="docs-back">
          다른 혜택 보기
          <ChevronRightIcon size={14} />
        </Link>
        <p className="docs-grant-eyebrow">
          {status} · {formatDeadline(grant.dDay)}
        </p>
        <h1 className="docs-grant-title">{grant.title}</h1>
        <p className="docs-grant-sub">신청에 필요한 서류 {grant.documents.length}개</p>
      </section>

      <h2 className="docs-section-title docs-section-title--list">신청에 필요한 서류</h2>
      {grant.documents.length === 0 ? (
        <p className="docs-section-desc">
          아직 등록된 서류 정보가 없어요. 오른쪽에서 NUDGE 에게 물어보세요.
        </p>
      ) : (
        <ul className="docs-list">
          {grant.documents.map((doc) => {
            const isChecked = checked.has(doc)
            return (
              <li key={doc} className={`docs-item${isChecked ? ' is-checked' : ''}`}>
                <label className="docs-item-check">
                  <input type="checkbox" checked={isChecked} onChange={() => onToggle(doc)} />
                  <span className="docs-checkbox" aria-hidden="true">
                    {isChecked && <CheckIcon />}
                  </span>
                  {doc}
                </label>
                <button type="button" className="docs-item-action" onClick={() => onAsk(doc)}>
                  {isChecked ? '확인하기' : '준비하기'}
                  <ChevronRightIcon size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export default function DocumentsPage() {
  const { grantId } = useParams()
  const navigate = useNavigate()
  const savedIds = useSavedGrantIds()
  const [grants, setGrants] = useState(null)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const askInputRef = useRef(null)

  function load() {
    return getSavedGrants()
      .then((list) => {
        setGrants(list)
        setError('')
      })
      .catch((err) => {
        console.error('[담은 혜택 불러오기 실패]', err)
        setError('담은 혜택을 불러오지 못했어요. 새로고침해 주세요.')
      })
  }

  useEffect(() => {
    load()
  }, [])

  // 다른 화면에서 담기/취소하면 목록도 맞춘다
  const visibleGrants = (grants ?? []).filter((grant) => savedIds.has(grant.id))
  useEffect(() => {
    if (grants && [...savedIds].some((id) => !grants.some((grant) => grant.id === id))) load()
  }, [savedIds, grants])

  async function handlePick(grant) {
    try {
      if (!savedIds.has(grant.id)) {
        await saveGrant(grant.id)
        markGrantSaved(grant.id)
      }
      await load()
      navigate(`/documents/${grant.id}`)
    } catch (err) {
      console.error('[혜택 담기 실패]', err)
      setError('혜택을 담지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function handleToggle(grant, doc) {
    const next = grant.checkedDocuments.includes(doc)
      ? grant.checkedDocuments.filter((item) => item !== doc)
      : [...grant.checkedDocuments, doc]
    const patch = (checkedDocuments) =>
      setGrants((prev) =>
        prev.map((item) => (item.id === grant.id ? { ...item, checkedDocuments } : item)),
      )
    patch(next)
    try {
      await updateCheckedDocuments(grant.id, next)
    } catch (err) {
      console.error('[서류 체크 저장 실패]', err)
      patch(grant.checkedDocuments)
      setError('체크한 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  function handleAsk(grant, doc) {
    setQuestion(`${grant.title} 신청에 필요한 ${withTopicParticle(doc)} 어떻게 준비하나요?`)
    askInputRef.current?.focus()
  }

  const selected = grantId ? visibleGrants.find((grant) => grant.id === grantId) : null

  let main
  if (grants === null) {
    main = <p className="docs-loading">불러오는 중...</p>
  } else if (grantId && !selected) {
    main = (
      <div className="docs-empty">
        <p className="docs-empty-title">담은 혜택에서 찾을 수 없어요</p>
        <Link to="/documents" className="docs-empty-link">
          담은 혜택 목록으로
        </Link>
      </div>
    )
  } else if (selected) {
    main = (
      <DocumentChecklist
        grant={selected}
        onToggle={(doc) => handleToggle(selected, doc)}
        onAsk={(doc) => handleAsk(selected, doc)}
      />
    )
  } else {
    main = <SavedGrantList grants={visibleGrants} />
  }

  return (
    <div className="docs">
      <GrantSearch onPick={handlePick} />
      {error && <p className="form-error docs-error">{error}</p>}
      <div className="docs-layout">
        <div className="docs-main">{main}</div>
        <AskNudgePanel question={question} onQuestionChange={setQuestion} inputRef={askInputRef} />
      </div>
    </div>
  )
}
