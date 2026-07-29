import { useEffect, useState } from 'react'
import { buName, fmtEok } from '../lib/model.js'

// 업로드 미리보기(반영 전 확인) + 반영 히스토리(롤백) 드로어
// mode: 'preview' (preview 객체 존재 시) | 'history'
export default function UploadDrawer({ open, mode, preview, onClose, onApplied, onRolledBack }) {
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [error, setError] = useState(null)

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
    }
  }, [open, mode])

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/upload-apply/${preview.batchId}`, { method: 'POST' })
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
  const nothing = ins.length + upd.length + plans.length === 0

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true"
        aria-label={mode === 'preview' ? '업로드 미리보기' : '업로드 반영 히스토리'}>
        <div className="dhead">
          <div className="oid">{mode === 'preview' ? `파일: ${preview?.filename ?? ''}` : '엑셀 업로드'}</div>
          <h3>{mode === 'preview' ? '업로드 미리보기 — 반영 전 확인' : '반영 히스토리'}</h3>
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
                  각 건의 해석 내용을 확인한 뒤 반영해 주세요.
                </p>
              )}

              {ins.length > 0 && (
                <div className="dgroup">
                  <h4>신규 등록 {ins.length}건</h4>
                  {ins.map(r => (
                    <div className="uprow" key={r.opportunityId} style={{ display: 'block' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span className="tag">신규</span>
                        <span className="upname">{r.name}</span>
                        <span className="upmeta num">
                          {buName(r.businessUnit)} · {r.channel} · {fmtEok(r.amount)}억 · {r.stage}
                        </span>
                      </div>
                      {r.mapNotes?.length > 0 && (
                        <div className="upmeta" style={{ marginTop: 2, color: 'var(--ink-500)' }}>
                          ↳ 해석: {r.mapNotes.join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {upd.length > 0 && (
                <div className="dgroup">
                  <h4>기존 갱신 {upd.length}건</h4>
                  {upd.map(u => (
                    <div className="uprow" key={u.after.opportunityId}>
                      <span className="tag t-review">갱신</span>
                      <span className="upname">{u.after.opportunityId} · {u.after.name}</span>
                      <span className="upmeta num">
                        {u.before.stage !== u.after.stage && <>단계 {u.before.stage} → <b>{u.after.stage}</b> · </>}
                        {u.before.amount !== u.after.amount && <>금액 {fmtEok(u.before.amount)}억 → <b>{fmtEok(u.after.amount)}억</b></>}
                        {u.before.stage === u.after.stage && u.before.amount === u.after.amount && '상세 필드 변경'}
                      </span>
                    </div>
                  ))}
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
                  기존 데이터와 동일하거나 전 행이 오류입니다.
                </div>
              )}

              <div className="dgroup" style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={apply} disabled={busy || nothing}>
                  {busy ? '반영 중…' : `반영하기 (${ins.length + upd.length + plans.length}건)`}
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
