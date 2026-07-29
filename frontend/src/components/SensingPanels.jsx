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
