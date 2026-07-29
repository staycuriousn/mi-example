import { useEffect, useState } from 'react'
import { BUS, buName, fmtEok, OPEN_STAGES, STAGE_WON, STAGE_REVENUE, STAGE_LOST } from '../lib/model.js'

const ALL_STAGES = [...OPEN_STAGES, STAGE_WON, STAGE_REVENUE, STAGE_LOST]

// 미리보기 행 인라인 편집기 — 승격 폼처럼 자동 해석 결과를 사용자가 직접 바로잡는다
function RowEditor({ rec, patch, onChange }) {
  const v = key => patch[key] ?? rec[key] ?? ''
  const set = (key, val) => onChange({ ...patch, [key]: val })
  return (
    <div className="editgrid">
      <label>
        사업부
        <select value={v('businessUnit')} onChange={e => set('businessUnit', e.target.value)}>
          {BUS.map(b => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </label>
      <label>
        채널
        <select value={v('channel')} onChange={e => set('channel', e.target.value)}>
          <option value="직판">직판</option>
          <option value="총판">총판</option>
        </select>
      </label>
      <label>
        단계
        <select value={v('stage')} onChange={e => set('stage', e.target.value)}>
          {ALL_STAGES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        금액(억)
        <input
          type="number"
          step="0.1"
          min="0"
          value={(Number(v('amount')) / 1e8).toString()}
          onChange={e => set('amount', Math.round(Number(e.target.value) * 1e8))}
        />
      </label>
      <label>
        수주예정일
        <input type="date" value={v('closeDate') ?? ''} onChange={e => set('closeDate', e.target.value)} />
      </label>
      <label>
        담당
        <input type="text" value={v('owner') ?? ''} onChange={e => set('owner', e.target.value)} />
      </label>
      {v('channel') === '총판' && (
        <label>
          파트너사
          <input type="text" value={v('partnerAccount') ?? ''} onChange={e => set('partnerAccount', e.target.value)} />
        </label>
      )}
    </div>
  )
}

// 업로드 미리보기(반영 전 확인·수정) + 반영 히스토리(롤백) 드로어
export default function UploadDrawer({ open, mode, preview, onClose, onApplied, onRolledBack }) {
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [error, setError] = useState(null)
  const [patches, setPatches] = useState({}) // opportunityId → 수정 patch
  const [editingId, setEditingId] = useState(null)
  const [dropIds, setDropIds] = useState([])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  useEffect(() => {
    if (open && mode === 'history') {
      setHistory(null)
      fetch('/api/upload-history')
        .then(r => r.json())
        .then(setHistory)
        .catch(e => setError(e.message))
    }
    if (open) {
      setError(null)
      setConfirmId(null)
      setPatches({})
      setEditingId(null)
      setDropIds([])
    }
  }, [open, mode, preview?.batchId])

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      const edits = {
        inserts: ins.filter(r => patches[r.opportunityId]).map(r => ({ opportunityId: r.opportunityId, ...patches[r.opportunityId] })),
        updates: upd.filter(u => patches[u.after.opportunityId]).map(u => ({ opportunityId: u.after.opportunityId, ...patches[u.after.opportunityId] })),
        dropIds,
      }
      const res = await fetch(`/api/upload-apply/${preview.batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail ?? `HTTP ${res.status}`)
      onApplied(body)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const rollback = async batchId => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/upload-history/${batchId}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail ?? `HTTP ${res.status}`)
      setHistory(h => h.filter(e => e.batchId !== batchId))
      setConfirmId(null)
      onRolledBack()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const ins = preview?.opportunities?.inserts ?? []
  const upd = preview?.opportunities?.updates ?? []
  const plans = preview?.plan?.changes ?? []
  const errs = preview?.errors ?? []
  const activeCount = ins.length + upd.length - dropIds.length + plans.length
  const nothing = activeCount <= 0

  const merged = rec => ({ ...rec, ...(patches[rec.opportunityId] ?? {}) })

  const renderOppRow = (rec, kind, mapNotes) => {
    const id = rec.opportunityId
    const m = merged(rec)
    const isDropped = dropIds.includes(id)
    const isEdited = Boolean(patches[id])
    return (
      <div className="uprow" key={id} style={{ display: 'block', opacity: isDropped ? 0.45 : 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span className={`tag ${kind === 'update' ? 't-review' : ''}`}>{kind === 'update' ? '갱신' : '신규'}</span>
          <span className="upname">{kind === 'update' ? `${id} · ` : ''}{m.name}</span>
          <span className="upmeta num">
            {buName(m.businessUnit)} · {m.channel}{m.partnerAccount ? `(${m.partnerAccount})` : ''} · {fmtEok(m.amount)}억 · {m.stage} · {m.closeDate}
          </span>
          {isEdited && <span className="tag t-won">수정됨</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {!isDropped && (
              <button className="linklike" onClick={() => setEditingId(e => (e === id ? null : id))}>
                {editingId === id ? '접기' : '수정'}
              </button>
            )}
            <button className="linklike" style={{ color: isDropped ? 'var(--ink)' : 'var(--risk)' }}
              onClick={() => setDropIds(d => (isDropped ? d.filter(x => x !== id) : [...d, id]))}>
              {isDropped ? '되살리기' : '제외'}
            </button>
          </span>
        </div>
        {mapNotes?.length > 0 && !isDropped && (
          <div className="upmeta" style={{ marginTop: 2, color: 'var(--ink-500)' }}>
            ↳ 해석: {mapNotes.join(' · ')}
          </div>
        )}
        {editingId === id && !isDropped && (
          <RowEditor rec={rec} patch={patches[id] ?? {}} onChange={p => setPatches(ps => ({ ...ps, [id]: p }))} />
        )}
      </div>
    )
  }

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true"
        aria-label={mode === 'preview' ? '업로드 미리보기' : '업로드 반영 히스토리'}>
        <div className="dhead">
          <div className="oid">{mode === 'preview' ? `파일: ${preview?.filename ?? ''}` : '엑셀 업로드'}</div>
          <h3>{mode === 'preview' ? '업로드 미리보기 — 확인·수정 후 반영' : '반영 히스토리'}</h3>
          <button className="close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="dbody">
          {error && (
            <div className="statebox" role="alert" style={{ marginTop: 16 }}>
              <strong>처리 실패</strong>{error}
            </div>
          )}

          {mode === 'preview' && preview && (
            <>
              {preview.fieldMode && (
                <p className="upmeta" style={{ marginTop: 16 }}>
                  표준 양식이 아닌 <b>영업관리 엑셀</b>로 인식하여 컬럼·단위·단계 용어를 자동 해석했습니다.
                  해석이 틀린 건은 [수정]으로 바로잡거나 [제외]한 뒤 반영해 주세요.
                </p>
              )}

              {ins.length > 0 && (
                <div className="dgroup">
                  <h4>신규 등록 {ins.length - dropIds.filter(d => ins.some(r => r.opportunityId === d)).length}건</h4>
                  {ins.map(r => renderOppRow(r, 'insert', r.mapNotes))}
                </div>
              )}

              {upd.length > 0 && (
                <div className="dgroup">
                  <h4>기존 갱신 {upd.length - dropIds.filter(d => upd.some(u => u.after.opportunityId === d)).length}건</h4>
                  {upd.map(u => renderOppRow(u.after, 'update', u.mapNotes ?? [
                    ...(u.before.stage !== u.after.stage ? [`단계 ${u.before.stage} → ${u.after.stage}`] : []),
                    ...(u.before.amount !== u.after.amount ? [`금액 ${fmtEok(u.before.amount)}억 → ${fmtEok(u.after.amount)}억`] : []),
                  ]))}
                </div>
              )}

              {plans.length > 0 && (
                <div className="dgroup">
                  <h4>판매계획 변경 {plans.length}행</h4>
                  {plans.map(c => (
                    <div className="uprow" key={`${c.businessUnit}-${c.channel}-${c.month}`}>
                      <span className="tag">계획</span>
                      <span className="upname num">{c.year}년 {c.month}월 · {buName(c.businessUnit)} · {c.channel}</span>
                      <span className="upmeta num">
                        {c.before == null ? '신규' : `${fmtEok(c.before)}억`} → <b>{fmtEok(c.after)}억</b>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {errs.length > 0 && (
                <div className="dgroup">
                  <h4 style={{ color: 'var(--risk)' }}>오류 {errs.length}건 — 반영 시 제외됨</h4>
                  {errs.map((er, i) => (
                    <div className="uprow" key={i}>
                      <span className="tag t-lost">오류</span>
                      <span className="upmeta">[{er.sheet} {er.row}행] {er.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {nothing && (
                <div className="statebox" style={{ marginTop: 16 }}>
                  <strong>반영할 변경 내용이 없습니다</strong>
                  기존 데이터와 동일하거나 전 행이 오류·제외 상태입니다.
                </div>
              )}

              <div className="dgroup" style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={apply} disabled={busy || nothing}>
                  {busy ? '반영 중…' : `반영하기 (${activeCount}건)`}
                </button>
                <button className="btn btn-ghost" onClick={onClose} disabled={busy}>취소</button>
              </div>
            </>
          )}

          {mode === 'history' && (
            <>
              {history == null && !error && <div className="skel" style={{ height: 80, marginTop: 16 }} />}
              {history?.length === 0 && (
                <div className="statebox" style={{ marginTop: 16 }}>
                  <strong>반영된 업로드가 없습니다</strong>
                  엑셀을 업로드하고 [반영하기]를 누르면 여기에 기록됩니다.
                </div>
              )}
              {history?.map(e => (
                <div className="dgroup histrow" key={e.batchId}>
                  <div>
                    <div className="upname">{e.filename}</div>
                    <div className="upmeta num">
                      {e.appliedAt} · 신규 {e.counts.inserted} · 갱신 {e.counts.updated} · 계획 {e.counts.plan}행
                    </div>
                  </div>
                  {confirmId === e.batchId ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" style={{ background: 'var(--risk)', borderColor: 'var(--risk)' }}
                        onClick={() => rollback(e.batchId)} disabled={busy}>
                        {busy ? '제거 중…' : '정말 제거'}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setConfirmId(null)} disabled={busy}>취소</button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost" onClick={() => setConfirmId(e.batchId)}>반영 제거</button>
                  )}
                </div>
              ))}
              {history?.length > 0 && (
                <p className="upmeta" style={{ marginTop: 16, color: 'var(--text-sub)' }}>
                  반영 제거 시: 신규 건은 삭제, 갱신 건은 업로드 이전 값으로, 판매계획은 이전 금액으로 되돌아갑니다.
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
