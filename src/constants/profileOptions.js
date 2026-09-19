// 프로필 선택지. profiles 테이블 컬럼에 value 가 그대로 저장된다.
// 맞춤 프로필 설정(ProfileSetupPage)과 마이페이지 수정 폼(ProfileForm)이 같이 쓴다.

export const REGIONS = [
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

// profiles.employment_status
export const EMPLOYMENT_STATUSES = ['학생', '취업 준비 중', '직장인', '자영업자', '은퇴 / 노후준비']

// profiles.income_level
export const INCOME_LEVELS = [
  '소득 없음',
  '월 100만원 미만',
  '월 100~200만 원',
  '월 200~300만 원',
  '월 300~400만 원',
  '월 400만 원 이상',
]

// profiles.interests — grants.category 와 매칭되는 값
export const INTEREST_CATEGORIES = ['취업', '주거', '교육', '복지', '자산형성', '창업']

// 맞춤 프로필 설정 화면(시안)에 나오는 관심 분야. '생활'은 grants.category '복지'로 저장한다.
export const SETUP_INTERESTS = [
  { label: '취업', value: '취업' },
  { label: '주거', value: '주거' },
  { label: '교육', value: '교육' },
  { label: '생활', value: '복지' },
  { label: '창업', value: '창업' },
]
