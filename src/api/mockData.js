// TODO: API 연동 전까지 쓰는 임시 데이터. 연동 후에는 이 파일을 지운다.

export const MOCK_GRANTS = [
  {
    id: 'youth-job',
    category: '취업',
    title: '청년 취업 지원사업',
    description: '취업 준비 청년의 구직활동과 역량 강화를 지원해요.',
    agency: '서울특별시',
    region: '서울특별시',
    deadline: '2026-09-24',
    dDay: 5,
    benefit: '월 50만원 × 6개월',
    documents: ['주민등록등본', '신분증 사본', '소득 증빙 서류', '가족 관계 증명서', '구직 활동 계획서'],
  },
  {
    id: 'youth-rent',
    category: '주거',
    title: '청년 월세 한시 특별지원',
    description: '독립 거주 청년의 주거비 부담을 덜어드려요',
    agency: '국토 교통부',
    region: '전국',
    deadline: '2026-10-06',
    dDay: 17,
    benefit: '월 최대 20만원 × 6개월',
    documents: ['주민등록등본', '임대차 계약서 사본', '월세 이체 내역', '소득 증빙 서류'],
  },
  {
    id: 'seoul-academy',
    category: '교육',
    title: '서울 청년 취업사관학교',
    description: '독립 거주 청년의 주거비 부담을 덜어드려요',
    agency: '국토 교통부',
    region: '서울특별시',
    deadline: '2026-10-06',
    dDay: 17,
    benefit: '교육비 전액 지원',
    documents: ['신분증 사본', '최종 학력 증명서', '자기소개서'],
  },
]

// 데모: 담은 혜택 (시안처럼 청년 취업 지원사업의 서류 2개가 체크된 상태)
export const MOCK_SAVED = [
  { grantId: 'youth-job', status: 'preparing', checkedDocuments: ['주민등록등본', '신분증 사본'] },
]

export const MOCK_PROGRESS = { preparing: 1, total: MOCK_SAVED.length }

export const MOCK_NOTIFICATIONS = [
  {
    id: 'noti-youth-job',
    type: 'deadline',
    grantId: 'youth-job',
    title: '청년 취업 지원사업',
    message: '신청 마감까지 5일 남았어요. 서류를 미리 준비해 두세요.',
    deadline: '2026-09-24',
    dDay: 5,
    read: false,
  },
]

// AI Agent 데모 대화 (로그인 전/AI 연결 전). 시안(agentai_사용.svg)의 흐름을 따른다.
export const MOCK_AGENT_REPLIES = [
  {
    reply: `좋아요, 은지님의 **서울거주 · 24세 · 취업준비** 정보를 기준으로 찾아볼게요. 아래 조건을 먼저 확인했어요

우선 취업과 생활에 도움이 될 만한 지원부터 살펴볼게요.
다만 지원사업마다 소득이나 세부 조건이 조금씩 달라서, **정확하게 맞는 지원을 찾으려면 소득 정보가 하나 더 필요해요.**

**현재 소득 구간을 알려주실 수 있을까요?**
잘 모르셔도 괜찮아요. 대략적으로 알려주셔도 돼요.`,
    grants: [],
  },
  {
    reply: `확인했어요! 월 소득 약 80만 원으로 볼게요.
이제 지금까지 알려주신 **거주지역, 나이, 취업 상태, 소득 정보**를 기준으로 조건이 맞는 지원을 찾아볼게요.

은지님과 관련성이 높은 **지원금 ${MOCK_GRANTS.length}개**를 찾았어요!`,
    grants: MOCK_GRANTS.map(({ id, title, benefit }) => ({ id, title, benefit })),
  },
]
