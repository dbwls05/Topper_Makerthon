import { useState } from 'react'
import { saveMyProfile } from '../api/benefits.js'

// profiles 테이블의 컬럼 값으로 그대로 저장되는 선택지들
const REGIONS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
]
const INCOME_LEVELS = [
  '기초생활수급',
  '중위소득 50% 이하',
  '중위소득 100% 이하',
  '중위소득 150% 이하',
  '중위소득 150% 초과',
]
const HOUSEHOLD_TYPES = ['1인 가구', '신혼부부', '다자녀', '한부모', '기타']
const EMPLOYMENT_STATUSES = ['재직', '구직 중', '자영업', '학생', '기타']
export const INTEREST_CATEGORIES = ['취업', '주거', '교육', '복지', '자산형성', '창업']

const THIS_YEAR = new Date().getFullYear()

function SelectField({ id, label, value, onChange, options }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={onChange}>
        <option value="">선택해주세요</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function ProfileForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({
    region: initial.region ?? '',
    birthYear: initial.birthYear ?? '',
    incomeLevel: initial.incomeLevel ?? '',
    householdType: initial.householdType ?? '',
    employmentStatus: initial.employmentStatus ?? '',
    interests: initial.interests ?? [],
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function setValue(key) {
    return (event) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
      setError('')
    }
  }

  function toggleInterest(category) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(category)
        ? prev.interests.filter((item) => item !== category)
        : [...prev.interests, category],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const birthYear = form.birthYear === '' ? null : Number(form.birthYear)
    if (birthYear !== null && !(birthYear >= 1900 && birthYear <= THIS_YEAR)) {
      setError('출생 연도를 다시 확인해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      const saved = await saveMyProfile({
        region: form.region || null,
        birthYear,
        incomeLevel: form.incomeLevel || null,
        householdType: form.householdType || null,
        employmentStatus: form.employmentStatus || null,
        interests: form.interests,
      })
      onSaved(saved)
    } catch {
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card profile-form" onSubmit={handleSubmit} noValidate>
      <div className="profile-form-grid">
        <SelectField
          id="region"
          label="거주 지역"
          value={form.region}
          onChange={setValue('region')}
          options={REGIONS}
        />

        <div className="field">
          <label htmlFor="birthYear">출생 연도</label>
          <input
            id="birthYear"
            type="number"
            inputMode="numeric"
            min="1900"
            max={THIS_YEAR}
            value={form.birthYear}
            onChange={setValue('birthYear')}
            placeholder="예: 1999"
          />
        </div>

        <SelectField
          id="incomeLevel"
          label="소득 구간"
          value={form.incomeLevel}
          onChange={setValue('incomeLevel')}
          options={INCOME_LEVELS}
        />
        <SelectField
          id="householdType"
          label="가구 형태"
          value={form.householdType}
          onChange={setValue('householdType')}
          options={HOUSEHOLD_TYPES}
        />
        <SelectField
          id="employmentStatus"
          label="취업 상태"
          value={form.employmentStatus}
          onChange={setValue('employmentStatus')}
          options={EMPLOYMENT_STATUSES}
        />
      </div>

      <div className="field">
        <span className="field-label">관심 카테고리 (여러 개 선택 가능)</span>
        <div className="chip-group">
          {INTEREST_CATEGORIES.map((category) => {
            const selected = form.interests.includes(category)
            return (
              <button
                key={category}
                type="button"
                className={`chip${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => toggleInterest(category)}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="profile-form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>
          취소
        </button>
        <button type="submit" className="btn btn--primary profile-form-save" disabled={submitting}>
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </form>
  )
}
