import { useMemo, useState } from 'react'
import { buName } from '../lib/model.js'
import TrendDetailDrawer, { SOURCE_LABELS } from './TrendDetailDrawer.jsx'

const MOMENTUM_GLYPH = { 증가: '▲ 증가', 유지: '— 유지', 감소: '▼ 감소' }
const STATUS_CLS = { 신규: 't-new', 추적중: 't-review', 보고완료: 't-promoted' }

const Score = ({ v }) => (
  <span className="score" aria-label={`관련도 ${v}점 (5점 만점)`}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`sdot ${i <= v ? 'f' : ''}`} />
    ))}
    {v}점
  </span>
)

// 1~12월 스트립 위에 시그널 발생 월을 점으로 표시
const MiniTimeline = ({ signals }) => {
  const months = new Set(signals.map(s => Number(s.eventDate.slice(5, 7))))
  return (
    <span className="minitl" aria-label={`시그널 발생 월: ${[...months].sort((a, b) => a - b).join(', ')}월`}>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
        <span key={m} className={`mdot ${months.has(m) ? 'f' : ''}`} />
      ))}
    </span>
  )
}

const Skeleton = () => (
  <>
    <div className="kpis" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="skel" style={{ height: 118 }} />
      ))}
    </div>
    <div className="section">
      <div className="skel" style={{ height: 420 }} />
    </div>
  </>
)

export default function Tab3({ data, error, retry, filters }) {
  const [status, setStatus] = useState('ALL')
  const [momentum, setMomentum] = useState('ALL')
  const [sortBy, setSortBy] = useState('relevance') // 'relevance' | 'latest'
  const [selectedId, setSelectedId] = useState(null)

  const trends = useMemo(() => {
    if (!data) return []
    return data.trends
      .filter(
        t =>
          (filters.bu === 'ALL' || t.businessUnit.includes(filters.bu)) &&
          (status === 'ALL' || t.status === status) &&
          (momentum === 'ALL' || t.momentum === momentum)
      )
      .sort(
        sortBy === 'relevance'
          ? (a, b) => b.relevanceScore - a.relevanceScore || b.lastSeenDate.localeCompare(a.lastSeenDate)
          : (a, b) => b.lastSeenDate.localeCompare(a.lastSeenDate)
      )
  }, [data, filters.bu, status, momentum, sortBy])

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

  const all = data.trends.filter(t => filters.bu === 'ALL' || t.businessUnit.includes(filters.bu))
  const signalsOf = t => data.signals.filter(s => t.signalIds.includes(s.signalId))
  const unassigned = data.signals.filter(
    s => s.trendId === null && (filters.bu === 'ALL' || s.businessUnit.includes(filters.bu))
  )

  return (
    <>
      <div className="kpis" aria-label="기술 트렌드 요약">
        <div className="kpi">
          <div className="cap">추적중 트렌드</div>
          <div className="val num">{all.filter(t => t.status === '추적중').length}<span className="unit">건</span></div>
          <div className="meta">시그널이 누적되며 관찰 중</div>
        </div>
        <div className="kpi">
          <div className="cap">신규 포착</div>
          <div className="val num">{all.filter(t => t.status === '신규').length}<span className="unit">건</span></div>
          <div className="meta">이번 주기에 처음 클러스터링</div>
        </div>
        <div className="kpi">
          <div className="cap">모멘텀 증가</div>
          <div className="val num">{all.filter(t => t.momentum === '증가').length}<span className="unit">건</span></div>
          <div className="meta">시그널 발생 빈도 상승 추세</div>
        </div>
        <div className="kpi">
          <div className="cap">미배정 시그널</div>
          <div className="val num" style={unassigned.length ? { color: 'var(--warn)' } : undefined}>
            {unassigned.length}<span className="unit">건</span>
          </div>
          <div className="meta">{unassigned.length ? '신규 트렌드 후보 — 다음 주기 재확인' : '모두 클러스터링됨'}</div>
        </div>
      </div>

      <section className="section" aria-label="기술 트렌드 목록">
        <h2>
          기술 트렌드
          <span className="hint">특허·연구과제·산업뉴스·경쟁사 발표 시그널을 클러스터링 · 행 클릭 시 상세</span>
        </h2>

        <div className="feedbar">
          <select aria-label="상태 필터" value={status} onChange={e => setStatus(e.target.value)}
            style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
            <option value="ALL">상태 전체</option>
            {['신규', '추적중', '보고완료'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select aria-label="모멘텀 필터" value={momentum} onChange={e => setMomentum(e.target.value)}
            style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
            <option value="ALL">모멘텀 전체</option>
            {['증가', '유지', '감소'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select aria-label="정렬 기준" value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
            <option value="relevance">관련도순</option>
            <option value="latest">최근 시그널순</option>
          </select>
          <span className="count num">{trends.length}건</span>
        </div>

        {trends.length === 0 ? (
          <div className="statebox">
            <strong>조건에 맞는 트렌드가 없습니다</strong>
            필터를 조정해 보세요.
          </div>
        ) : (
          trends.map(t => {
            const sigs = signalsOf(t)
            const srcSet = [...new Set(sigs.map(s => s.sourceType))]
            return (
              <article
                key={t.trendId}
                className={`evcard clickable ${selectedId === t.trendId ? 'sel' : ''}`}
                onClick={() => setSelectedId(t.trendId)}
                role="button"
                tabIndex={0}
                onKeyDown={ev => { if (ev.key === 'Enter') setSelectedId(t.trendId) }}
              >
                <div className="evtop">
                  <span className="evorg">{t.title}</span>
                  <span className="evtrig">{t.businessUnit.map(buName).join(' · ')}</span>
                  <span className={`tag ${STATUS_CLS[t.status] ?? ''}`}>{t.status}</span>
                  <span className="evdate num">{MOMENTUM_GLYPH[t.momentum] ?? t.momentum}</span>
                </div>
                <p className="evsum">{t.summary}</p>
                <div className="evmeta">
                  <Score v={t.relevanceScore} />
                  <span>시그널 {t.signalIds.length}건 ({srcSet.map(s => SOURCE_LABELS[s] ?? s).join('·')})</span>
                  <span className="num">{t.firstSeenDate} ~ {t.lastSeenDate}</span>
                  <MiniTimeline signals={sigs} />
                </div>
              </article>
            )
          })
        )}
      </section>

      {unassigned.length > 0 && (
        <section className="section" aria-label="미배정 시그널">
          <h2>
            클러스터 미배정 시그널
            <span className="hint">유사 시그널이 더 나타나면 신규 트렌드로 승격 검토</span>
          </h2>
          {unassigned.map(s => (
            <article key={s.signalId} className="evcard">
              <div className="evtop">
                <span className="evorg">{s.title}</span>
                <span className="evtrig">{SOURCE_LABELS[s.sourceType] ?? s.sourceType}</span>
                <span className="evdate num">{s.eventDate}</span>
              </div>
              <p className="evsum">{s.summary}</p>
              <div className="evmeta">
                <span>{s.businessUnit.map(buName).join(' · ')} · {s.source} · 신뢰도 {s.reliability}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <TrendDetailDrawer
        trend={data.trends.find(t => t.trendId === selectedId) ?? null}
        signals={data.signals}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
