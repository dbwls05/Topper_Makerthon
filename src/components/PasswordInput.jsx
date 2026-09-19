import { useState } from 'react'

function EyeIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12C4 7.5 7.6 5 12 5s8 2.5 10 7c-2 4.5-5.6 7-10 7s-8-2.5-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      {!open && (
        <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  placeholder = '8자이상 입력하세요',
  autoComplete = 'new-password',
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="input-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={invalid ? 'invalid' : ''}
      />
      <button
        type="button"
        className="input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  )
}
