import { useMemo, useState } from 'react'
import { monthsOf } from '../lib/aggregate.js'
import { isWon } from '../lib/model.js'
import EventFeed from './EventFeed.jsx'
import EventDetailDrawer from './EventDetailDrawer.jsx'
import PromoteDrawer from './PromoteDrawer.jsx'
import { TriggerDist, PromoFunnel } from './SensingPanels.jsx'
import { EventTimeline, CompetitorTable } from './BidPanel.jsx'

const TODAY = '2026-07-29' // 예시 데이터 기준일 (실서비스에서는 시스템 날짜)

const Skeleton = () => (
  <>
    <div className="kpis" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="skel" style={{ height: 118 }} />
      ))}
    </div>
    <div className="section feedgrid">
      <div className="skel" style={{ height: 420 }} />
      <div className="skel" style={{ height: 420 }} />
    </div>
  </>
)

export default function Tab2({ data, error, retry, filters, updateEvent, addOpportunity }) {
  const [promoteTarget, setPromoteTarget] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const events = useMemo(() => {
    if (!data) return []
    return data.events.filter(e => {
      const [y, m] = e.eventDate.split('-').map(Number)
      const inPeriod = y === filters.year && monthsOf(filters).includes(m)
      const buOk = filters.bu === 'ALL' || (e.estimatedBusinessUnit ?? []).includes(filters.bu)
      return inPeriod && buOk
    })
  }, [data, filters])

  if (error)
    return (
      <div className="section statebox" role="alert">
        <strong>데이터를 불러오지 못했습니다</strong>
        {error} — 백엔드(uvicorn backend.main:app --port 8000)가 실행 중인지 확인해 주세요.
        <div>
          <button className="btn btn-primary" onClick={retry}>다시 시도</button>
        </div>
      </div>
    )
  if (!data) return <Skeleton />

  const by = s => events.filter(e => e.status === s).length
  const promoted = events.filter(e => e.status === '승격')
  const wonFromSensing = promoted.filter(e => {
    const o = data.opportunities.find(o => o.opportunityId === e.promotedOpportunityId)
    return o && isWon(o)
  })
  const highUnhandled = events.filter(e => e.aiScore >= 4 && (e.status === '신규' || e.status === '검토중'))

  const bids = events.filter(e => e.detail?.type === 'bid')

  return (
    <>
      <div className="kpis" aria-label="센싱 요약">
        <div className="kpi">
          <div className="cap">수집 이벤트 (기간 내)</div>
          <div className="val num">{events.length}<span className="unit">건</span></div>
          <div className="meta">신규 {by('신규')} · 보류 {by('보류')} · 기각 {by('기각')}</div>
        </div>
        <div className="kpi">
          <div className="cap">검토중</div>
          <div className="val num">{by('검토중')}<span className="unit">건</span></div>
          <div className="meta">영업 배정 후 검토 진행</div>
        </div>
        <div className="kpi">
          <div className="cap">승격 (→ 사업기회)</div>
          <div className="val num">{promoted.length}<span className="unit">건</span></div>
          <div className="meta num">이 중 수주 도달 {wonFromSensing.length}건</div>
        </div>
        <div className="kpi">
          <div className="cap">고스코어 미처리 (★4 이상)</div>
          <div className="val num" style={highUnhandled.length ? { color: 'var(--warn)' } : undefined}>
            {highUnhandled.length}<span className="unit">건</span>
          </div>
          <div className="meta">{highUnhandled.length ? '우선 검토 필요' : '모두 처리됨'}</div>
        </div>
      </div>

      <section className="section" aria-label="이벤트 타임라인">
        <h2>
          이벤트 타임라인 (B2B·B2G)
          <span className="hint">B2G 입찰은 공고일→마감일 구간, B2B 이벤트는 발생 시점 · 기준일 {TODAY}</span>
        </h2>
        <EventTimeline events={events} today={TODAY} onSelect={setSelectedId} />
      </section>

      <section className="section" aria-label="경쟁사 낙찰 동향">
        <h2>경쟁사 낙찰 동향 <span className="hint">재입찰 전략 수립용</span></h2>
        <CompetitorTable bids={bids} />
      </section>

      <section className="section feedgrid" aria-label="센싱 이벤트">
        <div>
          <h2>
            센싱 이벤트 피드
            <span className="hint">기본 우선순위 스코어순, 정렬 변경 가능 · 승격 시 탭1 파이프라인(리드 발굴)에 추가됩니다</span>
          </h2>
          <EventFeed
            events={events}
            onPromote={setPromoteTarget}
            updateEvent={updateEvent}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </div>
        <div style={{ display: 'grid', gap: 24 }}>
          <TriggerDist events={events} />
          <PromoFunnel events={events} wonCount={wonFromSensing.length} />
        </div>
      </section>

      <EventDetailDrawer
        event={promoteTarget ? null : data.events.find(e => e.eventId === selectedId) ?? null}
        accounts={data.accounts}
        opportunities={data.opportunities}
        onClose={() => setSelectedId(null)}
        onPromote={e => setPromoteTarget(e)}
        updateEvent={updateEvent}
      />

      <PromoteDrawer
        event={promoteTarget}
        accounts={data.accounts}
        opportunities={data.opportunities}
        onClose={() => setPromoteTarget(null)}
        onSave={(opp, eventId) => {
          addOpportunity(opp)
          updateEvent(eventId, { status: '승격', promotedOpportunityId: opp.opportunityId })
          setPromoteTarget(null)
        }}
      />
    </>
  )
}
