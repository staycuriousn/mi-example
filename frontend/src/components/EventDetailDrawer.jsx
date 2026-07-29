import { useEffect } from 'react'
import { buName } from '../lib/model.js'

const STATUS_CLS = { 신규: 't-new', 검토중: 't-review', 승격: 't-promoted', 기각: 't-rejected', 보류: 't-hold' }

const fmtWon = v => (v == null ? '—' : `${(v / 1e8).toFixed(1)}억 (${v.toLocaleString()}원)`)

// 소스 유형별 상세속성 라벨 정의 (설계서 2.7 상세속성 스키마)
const DETAIL_SECTIONS = {
  bid: {
    title: 'B2G 입찰 상세 (나라장터·자체공고)',
    rows: d => [
      ['공고ID', d.bidId],
      ['발주기관', d.orderingOrg],
      ['품목', d.itemCategory],
      ['공고일', d.noticeDate],
      ['입찰마감일', d.bidDeadline],
      ['낙찰일', d.awardDate ?? '— (진행중)'],
      ['낙찰업체', d.awardedVendor ?? '—'],
      ['낙찰가', d.awardedPrice != null ? fmtWon(d.awardedPrice) : '—'],
      ['낙찰률', d.awardRate != null ? `${d.awardRate}%` : '—'],
      ['계약방식', d.contractMethod],
      ['규격서 주요조건', d.specConditions],
      ['경쟁사 스펙락인', d.competitorSpecLockIn],
      ['비고', d.note],
    ],
  },
  dart: {
    title: 'DART 공시 상세',
    rows: d => [
      ['공시유형', d.disclosureType],
      ['투자금액', fmtWon(d.investmentAmount)],
      ['공시 원문번호', d.reportNo],
    ],
  },
  job: {
    title: '채용공고 상세',
    rows: d => [
      ['채용 직무', d.jobRole],
      ['인원 규모', `${d.headcount}명`],
      ['신규 거점 여부', d.newSiteFlag ? '예 — 신규 매장/센터 개소 신호' : '아니오'],
    ],
  },
  budget: {
    title: '예산 편성 상세 (지방재정365)',
    rows: d => [
      ['회계연도', d.fiscalYear],
      ['예산 과목', d.budgetItem],
      ['편성액', fmtWon(d.budgetAmount)],
      ['집행 시기(추정)', d.expectedExecution],
    ],
  },
  installbase: {
    title: 'Salesforce 설치베이스 상세',
    rows: d => [
      ['대상 모델', d.model],
      ['설치 수량', `${d.quantity}대`],
      ['유지보수 만기일', d.maintenanceExpiry],
      ['만기 경과', `${d.monthsOverdue}개월`],
    ],
  },
}

export default function EventDetailDrawer({ event, accounts, opportunities, onClose, onPromote, updateEvent }) {
  const open = Boolean(event)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const account = event?.matchedAccountId ? accounts.find(a => a.accountId === event.matchedAccountId) : null
  const promotedOpp = event?.promotedOpportunityId
    ? opportunities.find(o => o.opportunityId === event.promotedOpportunityId)
    : null
  const section = event?.detail?.type ? DETAIL_SECTIONS[event.detail.type] : null
  const actionable = event && ['신규', '검토중', '보류'].includes(event.status)

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true"
        aria-label={event ? `${event.targetName} 이벤트 상세` : '센싱 이벤트 상세'}>
        {event && (
          <>
            <div className="dhead">
              <div className="oid num">{event.eventId} · {event.category}</div>
              <h3>{event.targetName}</h3>
              <button className="close" onClick={onClose} aria-label="닫기">✕</button>
            </div>
            <div className="dbody">
              <div className="dgroup">
                <h4>이벤트 개요</h4>
                <dl className="dl">
                  <dt>트리거유형</dt><dd>{event.triggerType}</dd>
                  <dt>이벤트일자</dt><dd className="num">{event.eventDate}</dd>
                  <dt>상태</dt>
                  <dd><span className={`tag ${STATUS_CLS[event.status] ?? ''}`}>{event.status}</span></dd>
                  <dt>AI 스코어</dt><dd className="num">{event.aiScore}점 / 5점</dd>
                  <dt>신뢰도</dt><dd>{event.reliability} (소스 구조화 정도 + 내용 명확성)</dd>
                  <dt>관련 사업부</dt>
                  <dd>{(event.estimatedBusinessUnit ?? []).map(buName).join(', ') || '—'} <span style={{ color: 'var(--text-sub)' }}>(AI 추정)</span></dd>
                  <dt>관련 제품군</dt><dd>{event.estimatedProductFamily ?? '—'}</dd>
                  <dt>잠재 규모</dt>
                  <dd className="num">
                    {event.potentialSize
                      ? event.potentialSize.unit === '원'
                        ? fmtWon(event.potentialSize.value)
                        : `${event.potentialSize.value.toLocaleString()}${event.potentialSize.unit}`
                      : '—'}
                  </dd>
                  <dt>검토 담당</dt><dd>{event.assignedOwner ?? '미배정'}</dd>
                </dl>
              </div>

              <div className="dgroup">
                <h4>출처</h4>
                <dl className="dl">
                  <dt>수집 소스</dt><dd>{event.source}</dd>
                  <dt>원문 링크</dt>
                  <dd>
                    {event.sourceUrl ? (
                      <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="linklike">
                        {event.sourceUrl}
                      </a>
                    ) : (
                      'Salesforce 내부 데이터 (외부 원문 없음)'
                    )}
                  </dd>
                </dl>
              </div>

              <div className="dgroup">
                <h4>수집 내용</h4>
                <p className="prose">{event.summary}</p>
              </div>

              {section && (
                <div className="dgroup">
                  <h4>{section.title}</h4>
                  <dl className="dl">
                    {section.rows(event.detail).map(([k, v]) => (
                      <div key={k} style={{ display: 'contents' }}>
                        <dt>{k}</dt><dd>{v ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {account && (
                <div className="dgroup">
                  <h4>매칭 계정 · 설치베이스</h4>
                  <dl className="dl">
                    <dt>계정</dt><dd>{account.accountName} ({account.accountId})</dd>
                    <dt>업종 / 규모</dt><dd>{account.industry} / {account.companySize}</dd>
                    <dt>채널 / 담당</dt><dd>{account.channel} / {account.owner}</dd>
                  </dl>
                  {account.installedBase?.map(ib => (
                    <div className="ibase" key={ib.model}>
                      <span className="m">{ib.model}</span> · {ib.productFamily} · <span className="num">{ib.quantity}대</span>
                      <br />
                      도입 <span className="num">{ib.installDate}</span> · 유지보수 만기{' '}
                      <span className={`num ${ib.maintenanceExpiry < '2026-07-29' ? 'expired' : ''}`}>
                        {ib.maintenanceExpiry}{ib.maintenanceExpiry < '2026-07-29' ? ' (만기 경과)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {promotedOpp && (
                <div className="dgroup">
                  <h4>승격 이력</h4>
                  <p className="prose">
                    이 이벤트는 사업기회 <b>{promotedOpp.opportunityId}</b>로 승격되었습니다.
                    <br />
                    <span style={{ color: 'var(--text-sub)' }}>
                      {promotedOpp.name} · {promotedOpp.stage} · 담당 {promotedOpp.owner} — 탭1 「사업기회별 현황」에서 확인
                    </span>
                  </p>
                </div>
              )}

              {actionable && (
                <div className="dgroup">
                  <h4>처리</h4>
                  <div className="evact" style={{ marginTop: 0 }}>
                    <button className="btn btn-primary" onClick={() => onPromote(event)}>승격</button>
                    {event.status !== '보류' && (
                      <button className="btn btn-quiet" onClick={() => updateEvent(event.eventId, { status: '보류' })}>보류</button>
                    )}
                    {event.status === '신규' && (
                      <button className="btn btn-quiet" onClick={() => updateEvent(event.eventId, { status: '검토중' })}>검토 시작</button>
                    )}
                    <button className="btn btn-quiet" onClick={() => updateEvent(event.eventId, { status: '기각' })}>기각</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
