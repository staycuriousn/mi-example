import { useEffect, useState } from 'react'

// 대응 적합성 판단 — 승격 전 유사사례(임베딩)·내부 리소스 근거 제시
const REC_CLS = { '승격 권장': 't-promoted', '조건부 승격': 't-review', '보류 권장': 't-rejected' }
const OUT_CLS = { 수주: 't-won', 실주: 't-lost', 진행중: 't-new' }

export function useFitAssessment(eventId) {
  const [fit, setFit] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setFit(null)
      return
    }
    let alive = true
    setLoading(true)
    fetch(`/api/fit-assessment/${eventId}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => alive && setFit(d))
      .catch(() => alive && setFit(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [eventId])

  return { fit, loading }
}

export const FitBadge = ({ fit }) => (
  <span className={`tag ${REC_CLS[fit.recommendation] ?? ''}`}>
    {fit.recommendation} · {fit.fitScore}점
  </span>
)

export default function FitPanel({ fit, loading }) {
  if (loading)
    return (
      <div className="dgroup">
        <h4>대응 적합성 (AI 판단)</h4>
        <div className="skel" style={{ height: 120 }} />
      </div>
    )
  if (!fit) return null

  return (
    <div className="dgroup">
      <h4>대응 적합성 (AI 판단)</h4>
      <div className="fithead">
        <FitBadge fit={fit} />
        <span className="fitmethod">유사도 방식: {fit.methodLabel}</span>
      </div>

      <div className="fitaxes">
        {fit.axes.map(a => (
          <div key={a.key} className="fitaxis">
            <div className="fitaxistop">
              <span>{a.label}</span>
              <span className="num">{a.score}</span>
            </div>
            <div className="fitbar" role="img" aria-label={`${a.label} ${a.score}점`}>
              <div className="fitfill" style={{ width: `${a.score}%` }} />
            </div>
            {a.reasons.map(r => (
              <div key={r} className="fitreason">{r}</div>
            ))}
          </div>
        ))}
      </div>

      {fit.similarCases.length > 0 && (
        <>
          <div className="fitsub">과거 유사 사업기회</div>
          {fit.similarCases.map(c => (
            <div key={c.opportunityId} className="fitcase">
              <div className="fitcasetop">
                <span className="oid num">{c.opportunityId}</span>
                <span className={`tag ${OUT_CLS[c.outcome] ?? ''}`}>{c.outcome}</span>
                <span className="num" style={{ marginLeft: 'auto' }}>
                  유사도 {Math.round(c.similarity * 100)}% · {(c.amount / 1e8).toFixed(1)}억
                </span>
              </div>
              <div className="fitcasename">{c.name}</div>
              {c.matchedOn.length > 0 && (
                <div className="fitreason">근거: {c.matchedOn.join(' · ')} · 담당 {c.owner}</div>
              )}
            </div>
          ))}
        </>
      )}

      <div className="fitsub">추천</div>
      <dl className="dl">
        <dt>추천 담당</dt>
        <dd>
          {fit.recommendedOwner.name}
          <span style={{ color: 'var(--text-sub)' }}> — {fit.recommendedOwner.reason}</span>
        </dd>
        {fit.recommendedPartner && (
          <>
            <dt>추천 파트너</dt>
            <dd>
              {fit.recommendedPartner.name}
              <span style={{ color: 'var(--text-sub)' }}> — {fit.recommendedPartner.reason}</span>
            </dd>
          </>
        )}
      </dl>

      {fit.cautions.length > 0 && (
        <ul className="fitcautions">
          {fit.cautions.map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
