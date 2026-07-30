import { useEffect, useState } from 'react'
import { buName } from '../lib/model.js'

export const SOURCE_LABELS = { PATENT: '특허', NEWS: '뉴스', RND: 'R&D과제', COMPETITOR: '경쟁사 발표' }

const STATUS_CLS = { 신규: 't-new', 추적중: 't-review', 보고완료: 't-promoted' }
const EVT_STATUS_CLS = { 신규: 't-new', 검토중: 't-review', 승격: 't-promoted', 기각: 't-rejected', 보류: 't-hold' }
const OUT_CLS = { 수주: 't-won', 실주: 't-lost', 진행중: 't-new' }

// 시그널 소스 유형별 상세속성 라벨 (detail.type 판별자 — sensing_events와 동일 패턴)
const SIGNAL_DETAILS = {
  patent: d => [
    ['출원번호', d.applicationNo],
    ['IPC 분류', d.ipcCode],
    ['출원인', d.applicant],
  ],
  news: d => [
    ['매체', d.outlet],
    ['기사 분류', d.articleCategory],
  ],
  rnd_program: d => [
    ['과제번호', d.projectNo],
    ['주관기관', d.leadOrg],
    ['과제 예산', d.budgetKrw != null ? `${(d.budgetKrw / 1e8).toFixed(1)}억원` : '—'],
  ],
  competitor_release: d => [
    ['발표 유형', d.releaseType],
    ['제품 라인', d.productLine],
  ],
}

export default function TrendDetailDrawer({ trend, signals, onClose }) {
  const open = Boolean(trend)
  const [related, setRelated] = useState(null)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  useEffect(() => {
    if (!trend) {
      setRelated(null)
      return
    }
    let alive = true
    setRelated(null)
    fetch(`/api/tech-trends/${trend.trendId}/related`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => alive && setRelated(d))
      .catch(() => alive && setRelated(null))
    return () => { alive = false }
  }, [trend])

  const sigs = trend
    ? signals
        .filter(s => trend.signalIds.includes(s.signalId))
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    : []
  const noPipeline = related && related.opportunities.length === 0 && related.events.length === 0

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true"
        aria-label={trend ? `${trend.title} 트렌드 상세` : '기술 트렌드 상세'}>
        {trend && (
          <>
            <div className="dhead">
              <div className="oid num">{trend.trendId} · {trend.techCategory}</div>
              <h3>{trend.title}</h3>
              <button className="close" onClick={onClose} aria-label="닫기">✕</button>
            </div>
            <div className="dbody">
              <div className="dgroup">
                <h4>트렌드 개요</h4>
                <dl className="dl">
                  <dt>관련 사업부</dt><dd>{trend.businessUnit.map(buName).join(', ')}</dd>
                  <dt>상태</dt>
                  <dd><span className={`tag ${STATUS_CLS[trend.status] ?? ''}`}>{trend.status}</span></dd>
                  <dt>모멘텀</dt><dd>{trend.momentum} (시그널 발생 빈도 추이)</dd>
                  <dt>관련도</dt><dd className="num">{trend.relevanceScore}점 / 5점</dd>
                  <dt>관찰 기간</dt><dd className="num">{trend.firstSeenDate} ~ {trend.lastSeenDate}</dd>
                  <dt>태그</dt><dd>{trend.tags.join(' · ')}</dd>
                </dl>
              </div>

              <div className="dgroup">
                <h4>트렌드 판단</h4>
                <p className="prose">{trend.summary}</p>
              </div>

              <div className="dgroup">
                <h4>근거 시그널 {sigs.length}건 (시간순)</h4>
                {sigs.map(s => (
                  <div className="sigcard" key={s.signalId}>
                    <div className="sigtop">
                      <span className="sigtype">{SOURCE_LABELS[s.sourceType] ?? s.sourceType}</span>
                      <span className="sigtitle">{s.title}</span>
                      <span className="num sigdate">{s.eventDate}</span>
                    </div>
                    <p className="sigsum">{s.summary}</p>
                    <dl className="dl sigdl">
                      {(SIGNAL_DETAILS[s.detail?.type]?.(s.detail) ?? []).map(([k, v]) => (
                        <div key={k} style={{ display: 'contents' }}>
                          <dt>{k}</dt><dd>{v ?? '—'}</dd>
                        </div>
                      ))}
                      <dt>출처</dt>
                      <dd>
                        {s.source}
                        {s.sourceUrl && (
                          <>
                            {' · '}
                            <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="linklike">원문</a>
                          </>
                        )}
                      </dd>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="dgroup">
                <h4>관련 파이프라인 <span className="hint">태그·사업부 기반 유사도 매칭 (예시)</span></h4>
                {!related ? (
                  <div className="skel" style={{ height: 64 }} />
                ) : noPipeline ? (
                  trend.momentum === '증가' ? (
                    <ul className="fitcautions">
                      <li>시장 모멘텀은 증가 중이지만 연결된 사업기회·센싱 이벤트가 없습니다 — 대응 기회 발굴 필요</li>
                    </ul>
                  ) : (
                    <p className="prose" style={{ color: 'var(--text-sub)' }}>
                      아직 연결된 사업기회·센싱 이벤트가 없습니다.
                    </p>
                  )
                ) : (
                  <>
                    {related.opportunities.length > 0 && (
                      <>
                        <div className="fitsub" style={{ marginTop: 0 }}>
                          사업기회 {related.opportunities.length}건 · 합계 {(related.pipelineAmount / 1e8).toFixed(1)}억 — 탭1에서 확인
                        </div>
                        {related.opportunities.map(o => (
                          <div key={o.opportunityId} className="fitcase">
                            <div className="fitcasetop">
                              <span className="oid num">{o.opportunityId}</span>
                              <span className={`tag ${OUT_CLS[o.outcome] ?? ''}`}>{o.outcome}</span>
                              <span className="num" style={{ marginLeft: 'auto' }}>
                                {o.stage} · {(o.amount / 1e8).toFixed(1)}억
                              </span>
                            </div>
                            <div className="fitcasename">{o.name}</div>
                            <div className="fitreason">담당 {o.owner} · 유사도 {Math.round(o.similarity * 100)}%</div>
                          </div>
                        ))}
                      </>
                    )}
                    {related.events.length > 0 && (
                      <>
                        <div className="fitsub">센싱 이벤트 {related.events.length}건 — 탭2에서 확인</div>
                        {related.events.map(e => (
                          <div key={e.eventId} className="fitcase">
                            <div className="fitcasetop">
                              <span className="oid num">{e.eventId}</span>
                              <span className={`tag ${EVT_STATUS_CLS[e.status] ?? ''}`}>{e.status}</span>
                              {e.promotedOpportunityId && (
                                <span className="num" style={{ marginLeft: 'auto', color: 'var(--ok)', fontWeight: 600 }}>
                                  → {e.promotedOpportunityId}
                                </span>
                              )}
                            </div>
                            <div className="fitcasename">{e.targetName}</div>
                            <div className="fitreason">{e.summary}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
