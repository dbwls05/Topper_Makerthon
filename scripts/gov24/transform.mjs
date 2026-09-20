// 정부24 "대한민국 공공서비스 정보" API 응답 → grants 테이블 행 변환 (순수 함수만)
// API 문서: https://infuser.odcloud.kr/api/stages/44436/api-docs

// 서비스분야 → 앱 카테고리 (profiles.interests 와 매칭되는 값)
const CATEGORY_BY_FIELD = {
  '고용·창업': '취업',
  '주거·자립': '주거',
  '보육·교육': '교육',
  생활안정: '복지',
  '보호·돌봄': '복지',
  '보건·의료': '복지',
  '임신·출산': '복지',
}

// 지원조건 코드 → 대상 라벨 (연령·성별·소득·해당사항없음 제외)
const TARGET_CODES = {
  JA0301: '예비부모/난임',
  JA0302: '임산부',
  JA0303: '출산/입양',
  JA0313: '농업인',
  JA0314: '어업인',
  JA0315: '축산업인',
  JA0316: '임업인',
  JA0317: '초등학생',
  JA0318: '중학생',
  JA0319: '고등학생',
  JA0320: '대학생/대학원생',
  JA0326: '근로자/직장인',
  JA0327: '구직자/실업자',
  JA0328: '장애인',
  JA0329: '국가보훈대상자',
  JA0330: '질병/질환자',
  JA0401: '다문화가족',
  JA0402: '북한이탈주민',
  JA0403: '한부모가정/조손가정',
  JA0404: '1인가구',
  JA0411: '다자녀가구',
  JA0412: '무주택세대',
  JA0413: '신규전입',
  JA0414: '확대가족',
  JA1101: '예비창업자',
  JA1102: '영업중',
  JA1103: '생계곤란/폐업예정자',
}

const INCOME_CODES = {
  JA0201: '중위소득 0~50%',
  JA0202: '중위소득 51~75%',
  JA0203: '중위소득 76~100%',
  JA0204: '중위소득 101~200%',
  JA0205: '중위소득 200% 초과',
}

// 지자체 이름이 바뀐 곳은 현재 이름으로 맞춘다 (프로필의 옛 이름은 화면 쪽에서 합쳐서 찾는다)
const SIDO_ALIASES = {
  강원도: '강원특별자치도',
  전라북도: '전북특별자치도',
  제주도: '제주특별자치도',
}

// 기관명 속 시도 약칭 (예: '경기주택도시공사', '전남광주통합특별시교육청')
const SIDO_SHORT = [
  ['전남광주통합특별시', '전남광주통합특별시'],
  ['세종특별자치시', '세종특별자치시'],
  ['서울', '서울특별시'],
  ['부산', '부산광역시'],
  ['대구', '대구광역시'],
  ['인천', '인천광역시'],
  ['대전', '대전광역시'],
  ['울산', '울산광역시'],
  ['세종', '세종특별자치시'],
  ['경기', '경기도'],
  ['강원', '강원특별자치도'],
  ['충북', '충청북도'],
  ['충청북도', '충청북도'],
  ['충남', '충청남도'],
  ['충청남도', '충청남도'],
  ['전북', '전북특별자치도'],
  ['전라북도', '전북특별자치도'],
  ['전남', '전남광주통합특별시'],
  ['경북', '경상북도'],
  ['경상북도', '경상북도'],
  ['경남', '경상남도'],
  ['경상남도', '경상남도'],
  ['제주', '제주특별자치도'],
]

// 중앙부처·공공기관은 전국 사업, 나머지는 지역 사업
const NATIONAL_AGENCY_TYPES = new Set(['중앙행정기관', '공공기관'])

function clean(text) {
  return (text ?? '').replace(/\r/g, '').trim()
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** 개인/가구가 신청할 수 있는 서비스만 쓴다 (법인·단체 전용 제외) */
export function isForIndividuals(item) {
  return /개인|가구/.test(item['사용자구분'] ?? '')
}

export function toCategory(field, title) {
  if (/적금|통장|계좌|자산형성/.test(title)) return '자산형성'
  if (field === '고용·창업' && /창업/.test(title)) return '창업'
  return CATEGORY_BY_FIELD[field] ?? '기타'
}

function normalizeSido(name) {
  return SIDO_ALIASES[name] ?? name
}

/**
 * 시군구 서비스("서울특별시 종로구")로 시군구 → 시도 사전을 만든다.
 * 여러 시도에 같은 이름이 있는 곳(중구, 강서구, 광주 …)은 모호해서 뺀다.
 */
export function buildSigunguIndex(items) {
  const index = new Map()
  const ambiguous = new Set()
  const add = (token, sido) => {
    if (token.length < 2 || ambiguous.has(token)) return
    const prev = index.get(token)
    if (prev && prev !== sido) {
      index.delete(token)
      ambiguous.add(token)
    } else {
      index.set(token, sido)
    }
  }
  for (const item of items) {
    if (item['소관기관유형'] !== '시군구') continue
    const [first, ...rest] = clean(item['소관기관명']).split(/\s+/)
    const sido = normalizeSido(first)
    for (const token of rest) {
      add(token, sido) // 동해시
      if (/[시군구]$/.test(token)) add(token.slice(0, -1), sido) // 동해 (예: '동해시설관리공단' 이 아닌 '춘천도시공사' 같은 이름용)
    }
  }
  // 긴 이름부터 찾도록 정렬
  return [...index.entries()].sort((a, b) => b[0].length - a[0].length)
}

function findSido(name, sigunguIndex) {
  for (const [short, sido] of SIDO_SHORT) {
    if (name.startsWith(short) || name.includes(`${short}특별`) || name.includes(`${short}광역`)) return sido
  }
  for (const [token, sido] of sigunguIndex) {
    if (name.includes(token)) return sido
  }
  for (const [short, sido] of SIDO_SHORT) {
    if (name.includes(short)) return sido
  }
  return null
}

/**
 * 전국 사업이면 { region: '전국', regionSido: null }
 * 지역 사업이면 시도를 찾는다. 기관명으로 시도를 알 수 없으면 '지역 미상'(추천에서 빠지고 검색으로만 보임)
 */
export function toRegion(item, sigunguIndex = []) {
  const type = item['소관기관유형']
  const agency = clean(item['소관기관명'])
  if (NATIONAL_AGENCY_TYPES.has(type)) return { region: '전국', regionSido: null }
  if (type === '시군구') {
    return { region: agency, regionSido: normalizeSido(agency.split(/\s+/)[0]) }
  }
  if (type === '광역시도') {
    const sido = normalizeSido(agency)
    return { region: sido, regionSido: sido }
  }
  const sido = findSido(agency.replace(/^(재단법인|사단법인|\(재\)|\(사\))\s*/, ''), sigunguIndex)
  return sido ? { region: sido, regionSido: sido } : { region: agency, regionSido: '지역 미상' }
}

/**
 * 신청기한 → 마감일 (YYYY-MM-DD). 대부분 "상시신청" 같은 글이라 날짜가 있을 때만 쓴다.
 * "2026. 3. 1~2027.2.28" 처럼 여러 날짜가 있으면 마지막 날짜를 마감일로 본다.
 */
export function parseDeadline(text) {
  const matches = [...clean(text).matchAll(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g)]
  if (matches.length === 0) return null
  const [, y, m, d] = matches[matches.length - 1]
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  // 원문에 "2024.4.31" 같은 없는 날짜도 있어서 실제 달력 날짜인지 확인한다
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 지원내용 첫 줄 → 카드에 쓰는 한 줄 요약 */
export function toBenefit(text) {
  const first = clean(text)
    .split('\n')
    .map((line) => line.replace(/^[\s\-–•·○●◦ㅇ□■▶※*]+/, '').trim())
    // "지원대상", "지원내용 :" 같은 머리말 줄은 건너뛴다
    .find((line) => line.length > 1 && !/^(지원\s*)?(대상|내용|금액|기간|방법)\s*[:：]?$/.test(line) && !/[:：]$/.test(line))
  return first ? truncate(first, 60) : ''
}

// 괄호 밖의 쉼표로만 나눈다 ("신분증(주민등록증, 운전면허증)" 은 하나로)
function splitOutsideParens(line) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of line) {
    if ('(（[「'.includes(ch)) depth += 1
    if (')）]」'.includes(ch)) depth = Math.max(0, depth - 1)
    if ((ch === ',' || ch === '、') && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

/**
 * 구비서류(자유 텍스트) → 서류 이름 목록
 * 머리말("신청인 제출서류:"), 설명 문장, 참고(※)는 빼고 짧은 서류 이름만 남긴다.
 */
export function parseDocuments(...texts) {
  const seen = new Set()
  const result = []
  for (const raw of texts) {
    const text = clean(raw)
    if (!text || /^(해당\s*없음|없음|-|해당사항\s*없음)$/.test(text)) continue
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('※')) continue
      const body = line
        .replace(/^[\-–•·○●◦ㅇ□■▶*]+\s*/, '')
        .replace(/^(\d+|[가-하])\s*[.)]\s*/, '')
        .trim()
      if (!body || /[:：]\s*$/.test(body)) continue // 머리말
      // "~한 경우 : 국세청에서 확인한…" 처럼 콜론 뒤에 설명이 붙은 줄은 서류 목록이 아니다
      if (/[:：]\s*\S.{10,}/.test(body) || /경우$/.test(body)) continue
      if (/(제출\s*서류|구비\s*서류|공통\s*서류|추가\s*서류)$/.test(body)) continue
      for (const part of splitOutsideParens(body)) {
        const name = part
          .trim()
          .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
          .replace(/\s*(각\s*)?\d+\s*부$/, '')
          .replace(/\s*등(\s*대상에\s*따라.*)?$/, '')
          .trim()
        // 설명 문장(길거나 ':' 포함)이나 너무 짧은 조각은 뺀다
        if (name.length < 2 || name.length > 40 || /[:：]|경우$/.test(name)) continue
        if (!seen.has(name)) {
          seen.add(name)
          result.push(name)
        }
      }
    }
  }
  return result.slice(0, 12)
}

export function toConditions(cond) {
  if (!cond) return { ageMin: null, ageMax: null, incomeLevels: [], targets: [] }
  const num = (value) => (value === null || value === undefined || value === '' ? null : Number(value))
  return {
    ageMin: num(cond.JA0110),
    ageMax: num(cond.JA0111),
    incomeLevels: Object.entries(INCOME_CODES)
      .filter(([code]) => cond[code] === 'Y')
      .map(([, label]) => label),
    targets: Object.entries(TARGET_CODES)
      .filter(([code]) => cond[code] === 'Y')
      .map(([, label]) => label),
  }
}

/** serviceList 항목 + serviceDetail + supportConditions → grants 행 */
export function toGrantRow(item, detail, cond, sigunguIndex) {
  const title = clean(item['서비스명'])
  const field = clean(item['서비스분야'])
  const { region, regionSido } = toRegion(item, sigunguIndex)
  const { ageMin, ageMax, incomeLevels, targets } = toConditions(cond)
  const applyPeriod = clean(item['신청기한'])

  return {
    external_id: `gov24-${item['서비스ID']}`,
    source: 'gov24',
    category: toCategory(field, title),
    field,
    title,
    description: truncate(clean(item['서비스목적요약']), 300),
    agency: clean(item['소관기관명']),
    region,
    region_sido: regionSido,
    deadline: parseDeadline(applyPeriod),
    apply_period: applyPeriod,
    benefit: toBenefit(item['지원내용']),
    support_type: clean(item['지원유형']),
    target: clean(item['지원대상']),
    criteria: clean(item['선정기준']),
    support_detail: clean(item['지원내용']),
    how_to_apply: clean(detail?.['신청방법'] ?? item['신청방법']),
    contact: clean(item['전화문의']),
    apply_url: clean(detail?.['온라인신청사이트URL']) || clean(item['상세조회URL']) || null,
    documents: parseDocuments(detail?.['구비서류'], detail?.['본인확인필요구비서류']),
    age_min: ageMin,
    age_max: ageMax,
    income_levels: incomeLevels,
    targets,
    view_count: Number(item['조회수']) || 0,
    is_active: true,
  }
}
