import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

const INITIAL_FORM = { email: '', password: '' }

// Supabase가 내려주는 에러를 사용자가 읽을 수 있는 메시지로 바꾼다
function toFriendlyError(error) {
  const message = error.message ?? ''
  if (/invalid login credentials/i.test(message)) {
    return '이메일 또는 비밀번호가 맞지 않아요.'
  }
  if (/email not confirmed/i.test(message)) {
    return '이메일 인증이 아직 끝나지 않았어요. 메일함을 확인해 주세요.'
  }
  if (/rate|too many/i.test(message)) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  return `로그인 중 문제가 발생했어요: ${message}`
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(key) {
    return (event) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
      setFormError('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.email.trim() || !form.password) {
      setFormError('이메일과 비밀번호를 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      if (!supabase) {
        // Supabase 미설정 시 데모 모드: 확인 없이 메인으로 보낸다
        await new Promise((resolve) => setTimeout(resolve, 400))
        navigate('/home', { replace: true })
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })

      if (error) {
        setFormError(toFriendlyError(error))
        return
      }

      navigate('/home', { replace: true })
    } catch {
      setFormError('네트워크 문제로 로그인에 실패했어요. 인터넷 연결을 확인해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="signup-title">
        <strong>다시 오셨네요!</strong>
        <br />
        로그인하고 이어서 볼까요?
      </h1>
      <p className="signup-subtitle">가입할 때 쓴 이메일과 비밀번호를 입력해주세요.</p>

      {!supabase && (
        <p className="demo-banner">
          Supabase가 연결되지 않았어요. <code>.env</code> 에<code>VITE_SUPABASE_URL</code>,{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> 를 채우면 실제 로그인이 동작해요. (지금은 데모 모드)
        </p>
      )}
      {formError && <p className="form-error">{formError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            placeholder="이메일을 입력해주세요"
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={updateField('password')}
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        <button className="btn btn--primary btn--lg btn--spaced" type="submit" disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="auth-switch">
        아직 계정이 없나요? <Link to="/signup">회원가입</Link>
      </p>
    </AuthLayout>
  )
}
