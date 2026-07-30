import { useMemo, useState } from 'react'
import { isCompetitorAward } from '../lib/model.js'

const STATUS_CLS = { 신규: 't-new', 검토중: 't-review', 승격: 't-promoted', 기각: 't-rejected', 보류: 't-hold' }

const Score = ({ v }) => (
  <span className="score" aria-label={`우선순위 스코어 ${v}점 (5점 만점)`}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`sdot ${i <= v ? 'f' : ''}`} />
    ))}
    {v}점
  </span>
)

const fmtSize = ps => {
  if (!ps) return null
  if (ps.unit === '원') return `${(ps.value / 1e8).toFixed(1)}억`
  return `${ps.value.toLocaleString()}${ps.unit}`
}

export default function EventFeed({ events, onPromote, updateEvent, onSelect, selectedId }) {
  const [cat, setCat] = useState('ALL') // B2B/B2G
  const [status, setStatus] = useState('ALL')
  const [minScore, setMinScore] = useState(0)
  const [source, setSource] = useState('ALL')
  const [sortBy, setSortBy] = useState('score') // 'score' | 'newest' | 'oldest'

  // Salesforce 출처를 외부 데이터 출처보다 먼저 보여준다
  const sources = useMemo(() => {
    const all = [...new Set(events.map(e => e.source))]
    const sf = all.filter(s => s.startsWith('Salesforce')).sort()
    const ext = all.filter(s => !s.startsWith('Salesforce')).sort()
    return [...sf, ...ext]
  }, [events])

  const SORTS = {
    score: (a, b) => b.aiScore - a.aiScore || b.eventDate.localeCompare(a.eventDate),
    newest: (a, b) => b.eventDate.localeCompare(a.eventDate) || b.aiScore - a.aiScore,
    oldest: (a, b) => a.eventDate.localeCompare(b.eventDate) || b.aiScore - a.aiScore,
  }

  const rows = useMemo(
    () =>
      events
        .filter(
          e =>
            (cat === 'ALL' || e.category === cat) &&
            (status === 'ALL' || e.status === status) &&
            (source === 'ALL' || e.source === source) &&
            e.aiScore >= minScore
        )
        .sort(SORTS[sortBy]),
    [events, cat, status, minScore, source, sortBy]
  )

  return (
    <>
      <div className="feedbar">
        <div className="seg" role="group" aria-label="구분">
          {['ALL', 'B2B', 'B2G'].map(c => (
            <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
              {c === 'ALL' ? '전체' : c}
            </button>
          ))}
        </div>
        <select aria-label="상태 필터" value={status} onChange={e => setStatus(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
          <option value="ALL">상태 전체</option>
          {['신규', '검토중', '승격', '보류', '기각'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select aria-label="최소 스코어" value={minScore} onChange={e => setMinScore(Number(e.target.value))}
          style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
          <option value={0}>스코어 전체</option>
          <option value={3}>★3 이상</option>
          <option value={4}>★4 이상</option>
        </select>
        <select aria-label="수집 출처" value={source} onChange={e => setSource(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13, maxWidth: 180 }}>
          <option value="ALL">출처 전체</option>
          {sources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select aria-label="정렬 기준" value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>
          <option value="score">우선순위 스코어순</option>
          <option value="newest">최신 이벤트순</option>
          <option value="oldest">오래된 이벤트순</option>
        </select>
        <span className="count num">{rows.length}건</span>
      </div>

      {rows.length === 0 ? (
        <div className="statebox">
          <strong>조건에 맞는 이벤트가 없습니다</strong>
          필터를 조정해 보세요.
        </div>
      ) : (
        rows.map(e => {
          const actionable = e.status === '신규' || e.status === '검토중' || e.status === '보류'
          return (
            <article
              key={e.eventId}
              className={`evcard clickable ${selectedId === e.eventId ? 'sel' : ''}`}
              onClick={() => onSelect(e.eventId)}
              role="button"
              tabIndex={0}
              onKeyDown={ev => { if (ev.key === 'Enter') onSelect(e.eventId) }}
            >
              <div className="evtop">
                <span className="evorg">{e.targetName}</span>
                <span className="evtrig">{e.triggerType}</span>
                <span className={`tag ${STATUS_CLS[e.status] ?? ''}`}>{e.status}</span>
                {isCompetitorAward(e) && <span className="tag t-lost">경쟁사 낙찰</span>}
                <span className="evdate num">{e.eventDate}</span>
              </div>
              <p className="evsum">{e.summary}</p>
              <div className="evmeta">
                <Score v={e.aiScore} />
                <span>{e.category} · {e.source} · 신뢰도 {e.reliability}</span>
                {e.potentialSize && <span className="num">잠재 {fmtSize(e.potentialSize)}</span>}
                {e.matchedAccountId && <span>기존 계정 {e.matchedAccountId}</span>}
                {e.assignedOwner && <span>담당 {e.assignedOwner}</span>}
                {e.promotedOpportunityId && <span style={{ color: 'var(--ok)', fontWeight: 600 }}>→ {e.promotedOpportunityId}</span>}
              </div>
              {actionable && (
                <div className="evact" onClick={ev => ev.stopPropagation()}>
                  <button className="btn btn-primary" onClick={() => onPromote(e)}>승격</button>
                  {e.status !== '보류' && (
                    <button className="btn btn-quiet" onClick={() => updateEvent(e.eventId, { status: '보류' })}>보류</button>
                  )}
                  {e.status === '신규' && (
                    <button className="btn btn-quiet" onClick={() => updateEvent(e.eventId, { status: '검토중' })}>검토 시작</button>
                  )}
                  <button className="btn btn-quiet" onClick={() => updateEvent(e.eventId, { status: '기각' })}>기각</button>
                </div>
              )}
            </article>
          )
        })
      )}
    </>
  )
}
