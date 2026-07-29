import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

// 트리거유형·소스 분포 (2-C)
export function TriggerDist({ events }) {
  const counts = {}
  events.forEach(e => {
    const key = e.triggerType.replace(/^TRG-\d+\s*/, '')
    counts[key] = (counts[key] ?? 0) + 1
  })
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(r => r[1]))
  return (
    <div className="panel" aria-label="트리거유형 분포">
      <div className="phead"><div className="ptitle">트리거유형 분포</div></div>
      {rows.length === 0 ? (
        <div className="statebox" style={{ padding: '24px 16px' }}>기간 내 이벤트 없음</div>
      ) : (
        <div className="dist">
          {rows.map(([label, n]) => (
            <div key={label} style={{ display: 'contents' }}>
              <span className="dlabel" title={label}>{label}</span>
              <div><div className="dbar" style={{ width: `${(n / max) * 100}%` }} /></div>
              <span className="dnum num">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 승격 퍼널 (2-D): 수집 → 검토 → 승격 → 수주
export function PromoFunnel({ events, wonCount }) {
  const collected = events.length
  const reviewed = events.filter(e => ['검토중', '승격', '기각', '보류'].includes(e.status)).length
  const promoted = events.filter(e => e.status === '승격').length
  const steps = [
    ['수집', collected],
    ['검토', reviewed],
    ['승격', promoted],
    ['수주', wonCount],
  ]
  const max = Math.max(1, collected)
  return (
    <div className="panel" aria-label="승격 퍼널">
      <div className="phead"><div className="ptitle">승격 퍼널 <span style={{ color: 'var(--text-sub)', fontWeight: 400 }}>(센싱 ROI)</span></div></div>
      <div className="funnel">
        {steps.map(([label, n], i) => (
          <div key={label} className="frow">
            <span style={{ color: 'var(--text-sub)' }}>{label}</span>
            <div><div className="fbar" style={{ width: `${(n / max) * 100}%`, opacity: 1 - i * 0.18 }} /></div>
            <span className="fnum num">
              {n}건{i > 0 && steps[i - 1][1] > 0 && (
                <span className="fconv"> · {Math.round((n / steps[i - 1][1]) * 100)}%</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 검색량 추이 (2-G) — 네이버 데이터랩
const TREND_COLORS = ['#0e8fa5', '#2e56c2', '#7c5cd1'] // 키워드 고정 매핑 (사업부 팔레트 재사용)

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #d9dee8', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,26,86,.12)', padding: '8px 10px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label} 주</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: '#5a6478' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.stroke, marginRight: 5 }} />
          {p.name} <b style={{ color: '#1a2233' }}>{p.value}</b>
        </div>
      ))}
    </div>
  )
}

export function TrendChart({ trends }) {
  if (!trends) return null
  return (
    <div className="panel" aria-label="검색량 추이">
      <div className="phead">
        <div>
          <div className="ptitle">검색량 추이 <span style={{ color: 'var(--text-sub)', fontWeight: 400 }}>(데이터랩 · 주간 지수)</span></div>
          <div className="legend" style={{ marginTop: 4 }}>
            {trends.keywords.map((k, i) => (
              <span key={k} className="li">
                <span className="swatch line" style={{ background: TREND_COLORS[i] }} /> {k}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={trends.weekly} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="#d9dee8" strokeWidth={1} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#5a6478' }} axisLine={{ stroke: '#d9dee8' }} tickLine={false} interval={2} />
          <YAxis tick={{ fontSize: 11, fill: '#5a6478' }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip content={<TrendTooltip />} />
          {trends.keywords.map((k, i) => (
            <Line key={k} dataKey={k} name={k} stroke={TREND_COLORS[i]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} type="monotone" animationDuration={400} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
