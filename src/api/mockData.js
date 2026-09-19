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
  },
]

export const MOCK_PROGRESS = { preparing: 1, total: MOCK_GRANTS.length }

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
