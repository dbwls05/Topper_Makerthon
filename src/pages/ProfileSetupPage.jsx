import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { useCurrentUser } from '../lib/UserContext.jsx'
import { getMyProfile, saveMyProfile } from '../api/benefits.js'
import {
  EMPLOYMENT_STATUSES,
  INCOME_LEVELS,
  REGIONS,
  SETUP_INTERESTS,
} from '../constants/profileOptions.js'
import {
  BriefcaseIcon,
  CapIcon,
  CheckIcon,
  ChevronDownIcon,
  HeartIcon,
  HouseIcon,
  LaptopIcon,
  StoreIcon,
  WalkIcon,
} from '../components/profileSetupIcons.jsx'
import '../styles/profile-setup.css'

const INPUT_STEPS = 4 // 1~4: 입력, 5: 분석 화면
const CHECK_INTERVAL_MS = 450

const STATUS_ICONS = [CapIcon, LaptopIcon, BriefcaseIcon, StoreIcon, WalkIcon]
const INTEREST_ICONS = [BriefcaseIcon, HouseIcon, CapIcon, HeartIcon, StoreIcon]
const ANALYSIS_ITEMS = ['거주 지역 확인', '현재 상황 확인', '관심 분야 확인', '소득 조건 확인']

const TODAY = new Date().toISOString().slice(0, 10)

const INITIAL_FORM = {
  region: '',
  birthDate: '', // profiles 에는 birth_year 만 저장된다
  employmentStatus: '',
  interests: [],
  incomeLevel: '',
}

function isStepValid(step, form) {
  if (step === 1) return Boolean(form.region) && Boolean(form.birthDate) && form.birthDate <= TODAY
  if (step === 2) return Boolean(form.employmentStatus)
  if (step === 3) return form.interests.length > 0
  if (step === 4) return Boolean(form.incomeLevel)
  return true
}

function OptionButton({ selected, onClick, Icon, children, centered }) {
  return (
    <button
      type="button"
      className={`setup-option${selected ? ' is-selected' : ''}${centered ? ' is-centered' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {Icon && (
        <span className="setup-option-icon">
          <Icon />
        </span>
      )}
      {children}
    </button>
  )
}

function StepBasics({ form, update }) {
  return (
    <>
      <div className="field">
        <label htmlFor="region">거주지역</label>
        <div className="setup-select">
          <select
            id="region"
            value={form.region}
            onChange={(event) => update({ region: event.target.value })}
          >
            <option value="" disabled>
              거주지역을 선택해주세요
            </option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </div>
      </div>

      <div className="field">
        <label htmlFor="birthDate">생년월일</label>
        <input
          id="birthDate"
          type="date"
          className="setup-date"
          max={TODAY}
          value={form.birthDate}
          onChange={(event) => update({ birthDate: event.target.value })}
        />
      </div>
    </>
  )
}

function StepStatus({ form, update }) {
  return (
    <div className="setup-options" role="radiogroup" aria-label="현재 상황">
      {EMPLOYMENT_STATUSES.map((status, index) => (
        <OptionButton
          key={status}
          Icon={STATUS_ICONS[index]}
          selected={form.employmentStatus === status}
          onClick={() => update({ employmentStatus: status })}
        >
          {status}
        </OptionButton>
      ))}
    </div>
  )
}

function StepInterests({ form, update }) {
  function toggle(value) {
    update({
      interests: form.interests.includes(value)
        ? form.interests.filter((item) => item !== value)
        : [...form.interests, value],
    })
  }

  return (
    <div className="setup-options" aria-label="관심 분야">
      {SETUP_INTERESTS.map(({ label, value }, index) => (
        <OptionButton
          key={value}
          Icon={INTEREST_ICONS[index]}
          selected={form.interests.includes(value)}
          onClick={() => toggle(value)}
        >
          {label}
        </OptionButton>
      ))}
    </div>
  )
}

function StepIncome({ form, update }) {
  return (
    <div className="setup-options" role="radiogroup" aria-label="소득 수준">
      {INCOME_LEVELS.map((level) => (
        <OptionButton
          key={level}
          centered
          selected={form.incomeLevel === level}
          onClick={() => update({ incomeLevel: level })}
        >
          {level}
        </OptionButton>
      ))}
    </div>
  )
}

// 5단계: 저장하는 동안 확인 항목이 하나씩 체크된다
function StepAnalysis({ checkedCount }) {
  return (
    <ul className="setup-checks">
      {ANALYSIS_ITEMS.map((item, index) => (
        <li key={item} className={`setup-check${index < checkedCount ? ' is-done' : ''}`}>
          <CheckIcon />
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function ProfileSetupPage() {
  const navigate = useNavigate()
  const { givenName } = useCurrentUser()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [savedProfile, setSavedProfile] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [checkedCount, setCheckedCount] = useState(0)

  // 이미 저장된 프로필이 있으면 선택지를 미리 채워둔다
  useEffect(() => {
    let alive = true
    getMyProfile()
      .then((profile) => {
        if (!alive) return
        setSavedProfile(profile)
        setForm((prev) => ({
          ...prev,
          region: profile.region ?? '',
          employmentStatus: EMPLOYMENT_STATUSES.includes(profile.employmentStatus)
            ? profile.employmentStatus
            : '',
          interests: profile.interests.filter((value) =>
            SETUP_INTERESTS.some((option) => option.value === value),
          ),
          incomeLevel: INCOME_LEVELS.includes(profile.incomeLevel) ? profile.incomeLevel : '',
        }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 분석 화면에서 체크 표시를 하나씩 채운다
  useEffect(() => {
    if (step !== 5 || checkedCount >= ANALYSIS_ITEMS.length) return undefined
    const timer = setTimeout(() => setCheckedCount((count) => count + 1), CHECK_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [step, checkedCount])

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function save() {
    setSaveState('saving')
    try {
      await saveMyProfile({
        ...savedProfile, // 이 화면에서 묻지 않는 값(가구 형태 등)은 그대로 둔다
        region: form.region,
        birthYear: Number(form.birthDate.slice(0, 4)),
        employmentStatus: form.employmentStatus,
        interests: form.interests,
        incomeLevel: form.incomeLevel,
      })
      setSaveState('saved')
    } catch (error) {
      // Supabase 에러(code/message)를 남겨서 권한·정책 문제를 바로 알 수 있게 한다
      console.error('[맞춤 프로필 저장 실패]', error)
      setSaveState('error')
    }
  }

  function handleNext() {
    if (!isStepValid(step, form)) return
    if (step === INPUT_STEPS) {
      setCheckedCount(0)
      setStep(5)
      save()
      return
    }
    setStep((current) => current + 1)
  }

  const analysisDone = checkedCount >= ANALYSIS_ITEMS.length

  const titles = {
    1: (
      <>
        <strong>{givenName}님</strong>을 알려주세요
      </>
    ),
    2: (
      <>
        <strong>현재</strong> 어떤 상황 인가요?
      </>
    ),
    3: (
      <>
        <strong>어떤 지원</strong>이 필요하신가요?
      </>
    ),
    4: (
      <>
        <strong>현재 소득 수준</strong>을 알려주세요
      </>
    ),
    5: <strong>당신에게 맞는 지원을 찾고있어요...</strong>,
  }

  const subtitles = {
    1: '맞춤 정보를 찾는데 필요한 기본 정보예요.',
    2: '현재 상황을 기준으로 자격 조건을 먼저 살펴볼게요',
    3: '관심있는 분야를 여러개 선택 할 수 있어요',
    4: '지원 자격이 맞는 혜택을 찾기 위해 사용해요',
    5: '지원 자격이 맞는 혜택을 추천드릴게요',
  }

  return (
    <AuthLayout>
      <div className="setup">
        <h1 className="signup-title setup-title">{titles[step]}</h1>
        <p className="setup-subtitle">{subtitles[step]}</p>

        {/* 분석 화면에서는 진행바를 숨기되 자리는 남겨서 시안과 같은 위치를 유지한다 */}
        <div
          className={`setup-progress${step > INPUT_STEPS ? ' is-hidden' : ''}`}
          role="progressbar"
          aria-hidden={step > INPUT_STEPS}
          aria-valuemin={1}
          aria-valuemax={INPUT_STEPS}
          aria-valuenow={Math.min(step, INPUT_STEPS)}
          aria-label={`${INPUT_STEPS}단계 중 ${Math.min(step, INPUT_STEPS)}단계`}
        >
          <span style={{ width: `${(Math.min(step, INPUT_STEPS) / INPUT_STEPS) * 100}%` }} />
        </div>

        <div className="setup-body">
          {step === 1 && <StepBasics form={form} update={update} />}
          {step === 2 && <StepStatus form={form} update={update} />}
          {step === 3 && <StepInterests form={form} update={update} />}
          {step === 4 && <StepIncome form={form} update={update} />}
          {step === 5 && <StepAnalysis checkedCount={checkedCount} />}
        </div>

        {step === 5 && saveState === 'error' && (
          <p className="form-error">
            프로필을 저장하지 못했어요.{' '}
            <button type="button" className="setup-retry" onClick={save}>
              다시 시도
            </button>
          </p>
        )}

        {step <= INPUT_STEPS ? (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            disabled={!isStepValid(step, form)}
            onClick={handleNext}
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            disabled={!analysisDone || saveState !== 'saved'}
            onClick={() => navigate('/search')}
          >
            지원금 찾으러 가기
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
