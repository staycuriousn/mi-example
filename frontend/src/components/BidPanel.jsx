// 이벤트 타임라인(B2B·B2G 통합, 2-E) + 경쟁사 낙찰 동향(2-F)
const dayOf = s => Math.floor(new Date(`${s}T00:00:00Z`).getTime() / 86400000)

// B2G 입찰(bid)은 공고일→마감일 구간 막대, 그 외(B2B 공시·채용·예산·설치베이스)는 발생 시점 마커
export function EventTimeline({ events, today, onSelect }) {
  if (events.length === 0)
    return (
      <div className="statebox">
        <strong>기간 내 이벤트가 없습니다</strong>
        필터(기간·사업부)를 조정해 보세요.
      </div>
    )

  const t = dayOf(today)
  const items = events
    .map(e => {
      const isBid = e.detail?.type === 'bid'
      const start = dayOf(isBid ? e.detail.noticeDate : e.eventDate)
      const end = isBid ? dayOf(e.detail.bidDeadline) : start
      return { e, isBid, start, end, award: isBid && e.detail.awardDate ? dayOf(e.detail.awardDate) : null }
    })
    .sort((a, b) => a.start - b.start)
  const min = Math.min(...items.map(i => i.start), t) - 3
  const max = Math.max(...items.map(i => i.award ?? i.end), t) + 3
  const span = max - min
  const pct = d => `${(((d - min) / span) * 100).toFixed(1)}%`
  const widthPct = (a, b) => `${(((b - a) / span) * 100).toFixed(1)}%`

  return (
    <div className="panel">
      <div className="tl">
        {/* 축 헤더: 기준일 라벨이 기준선 바로 위에 붙는다 */}
        <div className="tlname" aria-hidden="true" />
        <div className="tlhead num">
          <span className="tltodaylab" style={{ left: pct(t) }}>기준일 {today}</span>
        </div>
        {items.map(i => {
          const closed = i.isBid && i.end < t
          const urgent = i.isBid && !closed && i.end - t <= 7
          return (
            <div key={i.e.eventId} style={{ display: 'contents' }}>
              <button className="tlname linkrow" title={i.e.summary} onClick={() => onSelect(i.e.eventId)}>
                <span className={`catmark ${i.e.category === 'B2G' ? 'g' : 'b'}`}>{i.e.category}</span>
                {i.e.targetName} · {i.e.triggerType.replace(/^TRG-\d+\s*/, '')}
              </button>
              <div className="tltrack">
                {i.isBid ? (
                  <div
                    className={`tlbar ${urgent ? 'urgent' : ''} ${closed ? 'closed' : ''}`}
                    style={{ left: pct(i.start), width: widthPct(i.start, i.end) }}
                    title={`공고 ${i.e.detail.noticeDate} → 마감 ${i.e.detail.bidDeadline}${urgent ? ` (D-${i.end - t})` : ''}`}
                  >
                    {i.e.detail.noticeDate.slice(5)}~{i.e.detail.bidDeadline.slice(5)}
                    {urgent ? ` · D-${i.end - t}` : ''}
                  </div>
                ) : (
                  <div className="tlpoint" style={{ left: pct(i.start) }} title={`발생 ${i.e.eventDate}`}>
                    <span className="tldate num">{i.e.eventDate.slice(5)}</span>
                  </div>
                )}
                {i.award && <div className="tlaward" style={{ left: pct(i.award) }} title={`낙찰 ${i.e.detail.awardDate}`} />}
                <div className="tltoday" style={{ left: pct(t) }} title={`기준일 ${today}`} />
              </div>
            </div>
          )
        })}
        {/* 축 푸터: 시작/종료 일자는 타임라인 아래, 트랙 양 끝점에 정렬 */}
        <div className="tlname" aria-hidden="true" />
        <div className="tlfoot num">
          <span className="tlstart">{new Date(min * 86400000).toISOString().slice(0, 10)}</span>
          <span className="tlend">{new Date(max * 86400000).toISOString().slice(0, 10)}</span>
        </div>
      </div>
      <div className="legend" style={{ marginTop: 12 }}>
        <span className="li"><span className="swatch" style={{ background: 'var(--ink-300)' }} /> B2G 입찰 공고→마감</span>
        <span className="li"><span className="swatch" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn)' }} /> 마감 임박(D-7)</span>
        <span className="li"><span className="swatch" style={{ background: 'var(--ink)', width: 8, height: 8, borderRadius: '50%' }} /> B2B 이벤트 발생 시점</span>
        <span className="li"><span className="swatch" style={{ background: 'var(--risk)', width: 3 }} /> 낙찰일</span>
      </div>
    </div>
  )
}

export function CompetitorTable({ bids }) {
  const rows = bids.filter(e => e.detail.awardedVendor)
  return (
    <div className="tablewrap" style={{ overflowX: 'auto' }}>
      {rows.length === 0 ? (
        <div className="statebox" style={{ border: 'none' }}>
          <strong>낙찰 결과가 확정된 건이 없습니다</strong>
          낙찰 결과는 나라장터 API로 자동 트래킹됩니다(예시).
        </div>
      ) : (
        <table className="mini">
          <thead>
            <tr>
              <th>공고ID</th><th>발주기관</th><th>품목</th><th>낙찰일</th><th>낙찰업체</th>
              <th className="num-c" style={{ textAlign: 'right' }}>낙찰가(원)</th>
              <th className="num-c" style={{ textAlign: 'right' }}>낙찰률</th>
              <th>스펙락인</th><th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(e => {
              const d = e.detail
              return (
                <tr key={e.eventId}>
                  <td className="num">{d.bidId}</td>
                  <td>{d.orderingOrg}</td>
                  <td>{d.itemCategory}</td>
                  <td className="num">{d.awardDate}</td>
                  <td style={{ fontWeight: 600 }}>{d.awardedVendor}</td>
                  <td className="num-c num">{d.awardedPrice?.toLocaleString()}</td>
                  <td className="num-c num">{d.awardRate}%</td>
                  <td>
                    {d.competitorSpecLockIn?.startsWith('예') ? (
                      <span className="tag t-lost">⚠ {d.competitorSpecLockIn}</span>
                    ) : (
                      d.competitorSpecLockIn
                    )}
                  </td>
                  <td style={{ color: 'var(--text-sub)' }}>{d.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
