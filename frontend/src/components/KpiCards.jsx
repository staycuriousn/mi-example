import { fmtEok, fmtPct, rateBand } from '../lib/model.js'

const Rate = ({ r }) => {
  if (r == null) return <span className="rate">계획 없음</span>
  const band = rateBand(r)
  const arrow = r >= 1 ? '▲' : '▼'
  return (
    <span className={`rate ${band}`}>
      {arrow} 달성률 {fmtPct(r)}
    </span>
  )
}

export default function KpiCards({ kpi, label }) {
  return (
    <div className="kpis" aria-label={`${label} 계획 대비 실적 요약`}>
      <div className="kpi">
        <div className="cap">{label} · 판매 계획</div>
        <div className="val num">
          {fmtEok(kpi.plan)}<span className="unit">억</span>
        </div>
        <div className="meta">사업부·채널 필터 기준 (담당 필터 미적용)</div>
      </div>
      <div className="kpi">
        <div className="cap">진행 중 사업기회</div>
        <div className="val num">
          {fmtEok(kpi.open.amount)}<span className="unit">억</span>
        </div>
        <div className="meta num">{kpi.open.count}건 · 단계 1~5 합계</div>
      </div>
      <div className="kpi">
        <div className="cap">계약 완료(수주)</div>
        <div className="val num">
          {fmtEok(kpi.won.amount)}<span className="unit">억</span>
        </div>
        <div className="meta num">
          {kpi.won.count}건 · <Rate r={kpi.won.rate} />
        </div>
      </div>
      <div className="kpi">
        <div className="cap">매출 인식</div>
        <div className="val num">
          {fmtEok(kpi.revenue.amount)}<span className="unit">억</span>
        </div>
        <div className="meta num">
          {kpi.revenue.count}건 · <Rate r={kpi.revenue.rate} />
        </div>
      </div>
    </div>
  )
}
