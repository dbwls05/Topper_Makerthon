import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { askAgent } from '../api/benefits.js'
import { ChevronRightIcon } from '../components/icons.jsx'
import SaveGrantButton from '../components/SaveGrantButton.jsx'
import orbImage from '../assets/agent/orb.webp'
import searchIcon from '../assets/agent/icon-search.webp'
import compareIcon from '../assets/agent/icon-compare.webp'
import manageIcon from '../assets/agent/icon-manage.webp'
import '../styles/agent.css'

// 첫 화면의 바로가기 카드 — 누르면 해당 질문을 바로 보낸다
const QUICK_ACTIONS = [
  {
    title: '지원 찾기',
    description: '나에게 맞는 다양한\n지원 혜택들을 찾아보세요.',
    icon: searchIcon,
    tone: 'violet',
    prompt: '나에게 맞는 지원 혜택을 찾아줘',
  },
  {
    title: '지원 비교',
    description: '여러 지원 혜택을 비교하고\n나에게 적합한 지원을 확인하세요.',
    icon: compareIcon,
    tone: 'sky',
    prompt: '받을 수 있는 지원 혜택들을 비교해줘',
  },
  {
    title: '신청 관리',
    description: '신청한 지원 혜택의 진행사항을\n간편하게 확인하세요.',
    icon: manageIcon,
    tone: 'mint',
    prompt: '신청 준비 중인 지원 혜택의 진행 상황을 알려줘',
  },
]

const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_SIDE = 1280

// 첨부 이미지를 긴 변 1280px 이하 JPEG 로 줄여서 data URL 로 만든다 (전송량/토큰 절약)
async function imageToDataUrl(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff' // 투명 PNG 도 흰 배경으로
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

// AI 답변의 **굵게** 와 줄바꿈만 처리한다 (HTML 로 넣지 않아서 안전)
function RichText({ text }) {
  return text.split(/\n{2,}/).map((paragraph, index) => (
    <p key={index}>
      {paragraph.split('\n').map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={partIndex}>{part.slice(2, -2)}</strong>
            ) : (
              <Fragment key={partIndex}>{part}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </p>
  ))
}

function GrantCards({ grants }) {
  return (
    <div className="agent-grants">
      {grants.map((grant) => (
        <div key={grant.id} className="agent-grant">
          <Link to="/search" className="agent-grant-link">
            <span className="agent-grant-title">{grant.title}</span>
            <span className="agent-grant-benefit">
              {grant.benefit}
              <ChevronRightIcon size={16} color="#9ca1ab" />
            </span>
          </Link>
          <SaveGrantButton grantId={grant.id} className="agent-grant-save" />
        </div>
      ))}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export default function AgentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null) // 첨부한 이미지 data URL
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const handledPromptRef = useRef(false)

  const started = messages.length > 0

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, error])

  async function send(text, attachedImage = null) {
    const content = text.trim()
    if ((!content && !attachedImage) || sending) return

    const next = [...messages, { role: 'user', content, image: attachedImage }]
    setMessages(next)
    setInput('')
    setImage(null)
    setError('')
    setSending(true)
    try {
      // AI 에는 텍스트 대화만 보내고, 이미지는 방금 보낸 메시지 것만 붙인다 (카드 목록은 화면 표시용)
      const history = next.map(({ role, content: body }, index) => ({
        role,
        content: body,
        ...(index === next.length - 1 && attachedImage ? { image: attachedImage } : {}),
      }))
      const { reply, grants = [] } = await askAgent(history)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, grants }])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  // 다른 화면(서류 체크의 NUDGE 패널 등)에서 넘겨준 질문은 바로 보낸다
  useEffect(() => {
    const prompt = location.state?.prompt
    if (!prompt || handledPromptRef.current) return
    handledPromptRef.current = true
    navigate(location.pathname, { replace: true, state: null })
    send(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  async function handleImageSelect(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // 같은 파일을 다시 골라도 동작하게
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 첨부할 수 있어요.')
      return
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      setError('10MB 이하 이미지만 첨부할 수 있어요.')
      return
    }
    try {
      setImage(await imageToDataUrl(file))
      setError('')
      inputRef.current?.focus()
    } catch {
      setError('이미지를 읽지 못했어요. 다른 파일로 시도해 주세요.')
    }
  }

  function handleKeyDown(event) {
    // Enter 전송, Shift+Enter 줄바꿈 (한글 조합 중 Enter 는 무시)
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(input, image)
    }
  }

  return (
    <div className={`agent${started ? ' is-started' : ''}`}>
      <div className="agent-scroll" ref={scrollRef}>
        <div className="agent-column">
          {!started ? (
            <section className="agent-hero">
              <div className="agent-orb">
                <img src={orbImage} alt="" />
              </div>
              <h1 className="agent-hero-title">
                안녕하세요, 저는 NUDGE예요.
                <br />
                지금 받을 수 있는 혜택들을 <span className="agent-gradient">함께 찾아볼까요?</span>
              </h1>
            </section>
          ) : (
            <div className="agent-thread">
              {messages.map((message, index) =>
                message.role === 'user' ? (
                  <div key={index} className="agent-user-group">
                    {message.image && (
                      <img className="agent-user-image" src={message.image} alt="첨부한 이미지" />
                    )}
                    {message.content && <div className="agent-user">{message.content}</div>}
                  </div>
                ) : (
                  <div key={index} className="agent-reply">
                    <RichText text={message.content} />
                    {message.grants?.length > 0 && <GrantCards grants={message.grants} />}
                  </div>
                ),
              )}
              {sending && (
                <div className="agent-typing" aria-label="답변 작성 중">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              {error && <p className="agent-error">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="agent-footer">
        <div className="agent-column">
          {!started && (
            <div className="agent-actions">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.title}
                  type="button"
                  className={`agent-action agent-action--${action.tone}`}
                  onClick={() => send(action.prompt)}
                >
                  <img className="agent-action-icon" src={action.icon} alt="" />
                  <span className="agent-action-title">{action.title}</span>
                  <span className="agent-action-desc">{action.description}</span>
                </button>
              ))}
            </div>
          )}

          {/* 첫 화면에서도 첨부 오류가 보이도록 */}
          {!started && error && <p className="agent-error agent-error--footer">{error}</p>}

          <form
            className={`agent-input${image ? ' has-image' : ''}`}
            onSubmit={(event) => {
              event.preventDefault()
              send(input, image)
            }}
          >
            {image && (
              <div className="agent-attachment">
                <img src={image} alt="첨부할 이미지 미리보기" />
                <button type="button" onClick={() => setImage(null)} aria-label="첨부 이미지 빼기">
                  <CloseIcon />
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageSelect}
            />
            <button
              type="button"
              className="agent-input-plus"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              aria-label="이미지 첨부"
              title="이미지 첨부"
            >
              <PlusIcon />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="지금 떠오르는 생각을 적어보세요"
              aria-label="NUDGE 에게 질문하기"
            />
            <button
              type="submit"
              className="agent-send"
              disabled={(!input.trim() && !image) || sending}
              aria-label="보내기"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
