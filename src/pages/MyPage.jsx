import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../lib/UserContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { EMPTY_PROFILE, getMyProfile } from '../api/benefits.js'
import ProfileForm from '../components/ProfileForm.jsx'
import robotProfile from '../assets/robot-profile.png'
import {
  BriefcaseIcon,
  CalendarIcon,
  PinIcon,
  SlidersIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
} from '../components/icons.jsx'

const PROFILE_FIELDS = [
  { key: 'region', label: '거주 지역', Icon: PinIcon },
  { key: 'birthYear', label: '출생 연도', Icon: CalendarIcon, format: (value) => `${value}년생` },
  { key: 'incomeLevel', label: '소득 구간', Icon: WalletIcon },
  { key: 'householdType', label: '가구 형태', Icon: UsersIcon },
  { key: 'employmentStatus', label: '취업 상태', Icon: BriefcaseIcon },
  { key: 'interests', label: '관심 카테고리', Icon: TagIcon, format: (value) => value.join(', ') },
]

function isEmptyValue(value) {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0)
}

export default function MyPage() {
  const { name, email, isLoggedIn, signOut } = useCurrentUser()
  const { data: loadedProfile, loading, error } = useApi(getMyProfile, EMPTY_PROFILE)
  const [savedProfile, setSavedProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()

  const profile = savedProfile ?? loadedProfile
  const hasProfile = PROFILE_FIELDS.some(({ key }) => !isEmptyValue(profile[key]))
  const emailId = email.split('@')[0]

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function handleSaved(saved) {
    setSavedProfile(saved)
    setEditing(false)
  }

  return (
    <div className="mypage">
      <section className="profile-header">
        <span className="profile-avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <h1 className="profile-name">{name}님</h1>
        <p className="profile-sub">{emailId || '맞춤 추천을 위한 내 프로필을 관리해요'}</p>
      </section>

      {loading ? null : error ? (
        <p className="form-error">프로필을 불러오지 못했어요. 새로고침해 주세요.</p>
      ) : editing ? (
        <section className="mypage-section">
          <div className="mypage-section-head">
            <h2 className="section-title">{hasProfile ? '내 프로필 정보 수정' : '내 정보 입력'}</h2>
          </div>
          <ProfileForm initial={profile} onSaved={handleSaved} onCancel={() => setEditing(false)} />
        </section>
      ) : !hasProfile ? (
        <section className="card profile-empty">
          <img className="profile-empty-robot" src={robotProfile} alt="" />
          <h2 className="profile-empty-title">아직 내 정보를 입력하지 않았어요</h2>
          <p className="profile-empty-desc">
            거주 지역, 출생 연도, 관심 카테고리 등을 알려주시면
            <br />
            나에게 딱 맞는 혜택을 추천해드려요.
          </p>
          <button type="button" className="edit-button" onClick={() => setEditing(true)}>
            내 정보 입력하기
          </button>
        </section>
      ) : (
        <section className="mypage-section">
          <div className="mypage-section-head">
            <h2 className="section-title">내 프로필 정보</h2>
            <button type="button" className="edit-button" onClick={() => setEditing(true)}>
              <SlidersIcon />
              정보 수정
            </button>
          </div>

          <div className="profile-grid">
            {PROFILE_FIELDS.map(({ key, label, Icon, format }) => {
              const value = profile[key]
              const isEmpty = isEmptyValue(value)
              return (
                <div className="card profile-field-card" key={key}>
                  <span className="profile-field-icon">
                    <Icon />
                  </span>
                  <div>
                    <p className="profile-field-label">{label}</p>
                    <p className={`profile-field-value${isEmpty ? ' is-empty' : ''}`}>
                      {isEmpty ? '입력하기' : format ? format(value) : value}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="account-card card">
        <p className="card-eyebrow">내 계정</p>
        {isLoggedIn && <p className="account-email">{email}</p>}
        <button type="button" className="btn btn--secondary" onClick={handleSignOut}>
          {isLoggedIn ? '로그아웃' : '로그인하러 가기'}
        </button>
      </section>
    </div>
  )
}
