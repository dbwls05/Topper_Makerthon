import { useCurrentUser } from '../lib/UserContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { getMyProfile } from '../api/benefits.js'
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
  { key: 'interestCategory', label: '관심 카테고리', Icon: TagIcon },
]

export default function MyPage() {
  const { name } = useCurrentUser()
  const { data: profile } = useApi(getMyProfile, {})

  return (
    <div className="mypage">
      <section className="profile-header">
        <span className="profile-avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <h1 className="profile-name">{name}님</h1>
        <p className="profile-sub">맞춤 추천을 위한 내 프로필을 관리해요</p>
      </section>

      <section className="mypage-section">
        <div className="mypage-section-head">
          <h2 className="section-title">내 프로필 정보</h2>
          <button type="button" className="edit-button">
            <SlidersIcon />
            정보 수정
          </button>
        </div>

        <div className="profile-grid">
          {PROFILE_FIELDS.map(({ key, label, Icon, format }) => {
            const value = profile[key]
            const isEmpty = value === null || value === undefined
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
    </div>
  )
}
