// 아직 디자인이 나오지 않은 페이지에서 쓰는 빈 템플릿
export default function PageTemplate({ title, description }) {
  return (
    <div className="page">
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-desc">{description}</p>}
      <div className="page-empty">페이지 준비 중이에요.</div>
    </div>
  )
}
