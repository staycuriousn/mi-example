import { useEffect } from 'react'
import { buName, fmtWon, fmtEok } from '../lib/model.js'

export default function DetailPanel({ opp, accounts, allOpps, onClose, onJump }) {
  const open = Boolean(opp)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const account = opp ? accounts.find(a => a.accountId === opp.accountId) : null
  const related = opp?.relatedOpportunity
    ? allOpps.find(o => o.opportunityId === opp.relatedOpportunity)
    : null

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        className={`drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={opp ? `${opp.name} 상세` : '사업기회 상세'}
      >
        {opp && (
          <>
            <div className="dhead">
              <div className="oid num">{opp.opportunityId}</div>
              <h3>{opp.name}</h3>
              <button className="close" onClick={onClose} aria-label="닫기">✕</button>
            </div>
            <div className="dbody">
              <div className="dgroup">
                <h4>기본 정보</h4>
                <dl className="dl">
                  <dt>고객사</dt><dd>{opp.accountName}</dd>
                  <dt>사업부 / 채널</dt>
                  <dd>
                    {buName(opp.businessUnit)} / {opp.channel}
                    {opp.partnerAccount ? ` (${opp.partnerAccount})` : ''}
                  </dd>
                  <dt>제품군</dt><dd>{opp.productFamily}</dd>
                  <dt>대표 모델</dt><dd>{opp.productModel}</dd>
                  <dt>예상 수량</dt><dd className="num">{opp.quantity?.toLocaleString()}대/유닛</dd>
                  <dt>예상 금액</dt><dd className="num">{fmtEok(opp.amount)}억 ({fmtWon(opp.amount)}원)</dd>
                  <dt>단계 / 확도</dt><dd className="num">{opp.stage} · {opp.probability}%</dd>
                  <dt>수주 예정일</dt><dd className="num">{opp.closeDate}</dd>
                  <dt>담당 영업</dt><dd>{opp.owner}</dd>
                  <dt>유입 경로</dt>
                  <dd>
                    {opp.leadSource}
                    {opp.sensingEventId && (
                      <span style={{ color: 'var(--text-sub)' }}> · 원천 이벤트 {opp.sensingEventId}</span>
                    )}
                  </dd>
                </dl>
              </div>

              {opp.painPoint && (
                <div className="dgroup">
                  <h4>고객 Pain Point</h4>
                  <p className="prose">{opp.painPoint}</p>
                </div>
              )}

              {opp.targetSpec && (
                <div className="dgroup">
                  <h4>요구 조건 (Target Spec)</h4>
                  <p className="prose">{opp.targetSpec}</p>
                </div>
              )}

              {(opp.demoTargetDate || opp.qualTargetDate || opp.competitor) && (
                <div className="dgroup">
                  <h4>검증 일정 · 경쟁</h4>
                  <dl className="dl">
                    {opp.demoTargetDate && (<><dt>Demo·PoC 목표</dt><dd className="num">{opp.demoTargetDate}</dd></>)}
                    {opp.qualTargetDate && (<><dt>QUAL 목표</dt><dd className="num">{opp.qualTargetDate}</dd></>)}
                    {opp.competitor && (<><dt>경쟁사</dt><dd>{opp.competitor}</dd></>)}
                  </dl>
                </div>
              )}

              {related && (
                <div className="dgroup">
                  <h4>관련 사업기회</h4>
                  <button className="linklike" onClick={() => onJump(related.opportunityId)}>
                    {related.opportunityId} · {related.name}
                  </button>
                </div>
              )}

              {account?.installedBase?.length > 0 && (
                <div className="dgroup">
                  <h4>고객사 설치베이스</h4>
                  {account.installedBase.map(ib => {
                    const expired = ib.maintenanceExpiry < '2026-07-29'
                    return (
                      <div className="ibase" key={ib.model}>
                        <span className="m">{ib.model}</span> · {ib.productFamily} ·{' '}
                        <span className="num">{ib.quantity}대</span>
                        <br />
                        도입 <span className="num">{ib.installDate}</span> · 유지보수 만기{' '}
                        <span className={`num ${expired ? 'expired' : ''}`}>
                          {ib.maintenanceExpiry}{expired ? ' (만기 경과)' : ''}
                        </span>{' '}
                        · 교체주기 <span className="num">{ib.replacementCycleYears}년</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {opp.description && (
                <div className="dgroup">
                  <h4>비고</h4>
                  <p className="prose">{opp.description}</p>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
