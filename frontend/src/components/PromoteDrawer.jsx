import { useEffect, useMemo, useState } from 'react'
import { BUS } from '../lib/model.js'

const OWNERS = ['김민준 차장', '이서연 대리', '박지훈 과장', '최유진 차장', '정현우 부장']

const nextOppId = opps => {
  const max = opps.reduce((m, o) => Math.max(m, Number(o.opportunityId.split('-')[2]) || 0), 0)
  return `OPP-2026-${String(max + 1).padStart(4, '0')}`
}

// 이벤트 내용 → 사업기회 폼 프리필 (설계서 3.2 승격 액션 정의)
const prefill = (e, accounts) => {
  const acc = accounts.find(a => a.accountId === e.matchedAccountId)
  return {
    name: `${e.targetName} ${e.triggerType.replace(/^TRG-\d+\s*/, '')} 대응`,
    accountId: e.matchedAccountId ?? '',
    accountNameFree: acc ? '' : e.targetName,
    businessUnit: e.estimatedBusinessUnit?.[0] ?? 'PRT',
    channel: acc?.channel ?? '직판',
    productFamily: e.estimatedProductFamily ?? '',
    quantity: e.potentialSize?.unit === '대' ? String(e.potentialSize.value) : '',
    amount: e.potentialSize?.unit === '원' ? String(e.potentialSize.value) : '',
    closeDate: '2026-12-31',
    owner: e.assignedOwner ?? OWNERS[0],
    painPoint: e.summary,
  }
}

export default function PromoteDrawer({ event, accounts, opportunities, onClose, onSave }) {
  const open = Boolean(event)
  const [form, setForm] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (event) {
      setForm(prefill(event, accounts))
      setErr(null)
    }
  }, [event, accounts])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const accOptions = useMemo(() => accounts.map(a => ({ id: a.accountId, name: a.accountName })), [accounts])

  const save = () => {
    if (!form.name.trim()) return setErr('사업기회명을 입력해 주세요.')
    if (!form.amount || Number(form.amount) <= 0) return setErr('예상 금액(원)을 입력해 주세요.')
    if (!form.closeDate) return setErr('예상 수주일을 입력해 주세요.')
    const acc = accounts.find(a => a.accountId === form.accountId)
    onSave(
      {
        opportunityId: nextOppId(opportunities),
        name: form.name.trim(),
        accountId: form.accountId || null,
        accountName: acc?.accountName ?? form.accountNameFree ?? event.targetName,
        businessUnit: form.businessUnit,
        channel: form.channel,
        partnerAccount: null,
        customerSegment: event.category === 'B2G' ? 'B2G공공' : 'B2B기업',
        productFamily: form.productFamily,
        productModel: '',
        quantity: form.quantity ? Number(form.quantity) : null,
        amount: Number(form.amount),
        stage: '리드 발굴',
        probability: 10,
        closeDate: form.closeDate,
        painPoint: form.painPoint,
        targetSpec: event.detail?.specConditions ?? null,
        demoTargetDate: null,
        qualTargetDate: null,
        competitor: event.detail?.awardedVendor ?? null,
        relatedOpportunity: null,
        leadSource: 'MI센싱',
        sensingEventId: event.eventId,
        owner: form.owner,
        description: `센싱 이벤트 승격 (${event.source})`,
      },
      event.eventId
    )
  }

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="사업기회 승격">
        {event && form && (
          <>
            <div className="dhead">
              <div className="oid num">{event.eventId} → 사업기회 승격</div>
              <h3>{event.targetName}</h3>
              <button className="close" onClick={onClose} aria-label="닫기">✕</button>
            </div>
            <div className="dbody">
              <div className="srcnote" style={{ marginTop: 16 }}>
                <strong>원천 이벤트</strong> · {event.triggerType} · {event.eventDate} · {event.source}
                <br />{event.summary}
              </div>

              <div className="form">
                {err && (
                  <div className="statebox" role="alert" style={{ padding: '12px 16px', borderColor: 'var(--risk)', color: 'var(--risk)' }}>
                    {err}
                  </div>
                )}
                <div>
                  <label>사업기회명 <span className="req">*</span></label>
                  <input value={form.name} onChange={e => set({ name: e.target.value })} />
                </div>
                <div className="frow2">
                  <div>
                    <label>고객사 (기존 계정)</label>
                    <select value={form.accountId} onChange={e => set({ accountId: e.target.value })}>
                      <option value="">— 신규 (계정 미매칭) —</option>
                      {accOptions.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>담당 영업</label>
                    <select value={form.owner} onChange={e => set({ owner: e.target.value })}>
                      {OWNERS.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="frow2">
                  <div>
                    <label>사업부</label>
                    <select value={form.businessUnit} onChange={e => set({ businessUnit: e.target.value })}>
                      {BUS.map(b => (
                        <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>채널</label>
                    <select value={form.channel} onChange={e => set({ channel: e.target.value })}>
                      <option value="직판">직판</option>
                      <option value="총판">총판</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>제품군 (추정)</label>
                  <input value={form.productFamily} onChange={e => set({ productFamily: e.target.value })} />
                </div>
                <div className="frow2">
                  <div>
                    <label>예상 수량</label>
                    <input type="number" min="0" value={form.quantity} onChange={e => set({ quantity: e.target.value })} />
                  </div>
                  <div>
                    <label>예상 금액(원) <span className="req">*</span></label>
                    <input type="number" min="0" step="1000000" value={form.amount} onChange={e => set({ amount: e.target.value })} />
                  </div>
                </div>
                <div className="frow2">
                  <div>
                    <label>예상 수주일 <span className="req">*</span></label>
                    <input type="date" value={form.closeDate} onChange={e => set({ closeDate: e.target.value })} />
                  </div>
                  <div>
                    <label>단계 (자동)</label>
                    <input value="리드 발굴 (10%) · 유입 경로 MI센싱" disabled />
                  </div>
                </div>
                <div>
                  <label>고객 Pain Point / 배경</label>
                  <textarea value={form.painPoint} onChange={e => set({ painPoint: e.target.value })} />
                </div>
                <div className="ffoot">
                  <button className="btn btn-ghost" onClick={onClose}>취소</button>
                  <button className="btn btn-primary" onClick={save}>승격 저장 → 파이프라인 추가</button>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
