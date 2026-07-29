import { useEffect, useRef, useState } from 'react'

const Popover = ({ title, children, onClose }) => {
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div className="popover" ref={ref} role="status">
      <strong>{title}</strong>
      {children}
    </div>
  )
}

export default function Header({ tab, setTab, filters, setFilters, owners, reload }) {
  const [pop, setPop] = useState(null) // 'upload-result' | null
  const [uploadResult, setUploadResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const set = patch => setFilters(f => ({ ...f, ...patch }))

  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 재선택 허용
    if (!file) return
    setUploading(true)
    setPop(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-excel', { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.detail ?? `HTTP ${res.status}`)
      setUploadResult({ ok: true, ...body })
      reload()
    } catch (err) {
      setUploadResult({ ok: false, message: err.message })
    } finally {
      setUploading(false)
      setPop('upload-result')
    }
  }

  const exportUrl =
    `/api/export-salesforce?bu=${encodeURIComponent(filters.bu)}` +
    `&channel=${encodeURIComponent(filters.channel)}&owner=${encodeURIComponent(filters.owner)}`

  return (
    <header>
      <div className="masthead">
        <h1>EPSON Korea MI Platform</h1>
        <span className="sub">Salesforce 연계 실적 모니터링 · 사전 센싱 — 예시 데이터</span>
      </div>

      <nav className="tabbar" aria-label="주요 탭">
        <button className={tab === 'tab1' ? 'active' : ''} onClick={() => setTab('tab1')}>
          판매 계획 대비 실적
        </button>
        <button className={tab === 'tab2' ? 'active' : ''} onClick={() => setTab('tab2')}>
          사업기회 요약
        </button>
      </nav>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="f-year">연도</label>
          <select id="f-year" value={filters.year} onChange={e => set({ year: Number(e.target.value) })}>
            <option value={2026}>2026</option>
          </select>
        </div>

        <div className="seg" role="group" aria-label="기간 단위">
          {[
            ['year', '연간'],
            ['quarter', '분기'],
            ['month', '월'],
          ].map(([g, label]) => (
            <button key={g} className={filters.granularity === g ? 'on' : ''} onClick={() => set({ granularity: g })}>
              {label}
            </button>
          ))}
        </div>

        {filters.granularity === 'quarter' && (
          <select aria-label="분기 선택" value={filters.quarter} onChange={e => set({ quarter: Number(e.target.value) })}>
            {[1, 2, 3, 4].map(q => (
              <option key={q} value={q}>{q}분기</option>
            ))}
          </select>
        )}
        {filters.granularity === 'month' && (
          <select aria-label="월 선택" value={filters.month} onChange={e => set({ month: Number(e.target.value) })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        )}

        <div className="field">
          <label htmlFor="f-bu">사업부</label>
          <select id="f-bu" value={filters.bu} onChange={e => set({ bu: e.target.value })}>
            <option value="ALL">전체</option>
            <option value="PRT">프린터</option>
            <option value="PJT">프로젝터</option>
            <option value="RBT">로봇</option>
            <option value="CMP">부품·소재</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-ch">채널</label>
          <select id="f-ch" value={filters.channel} onChange={e => set({ channel: e.target.value })}>
            <option value="ALL">전체</option>
            <option value="직판">직판</option>
            <option value="총판">총판</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-owner">담당</label>
          <select id="f-owner" value={filters.owner} onChange={e => set({ owner: e.target.value })}>
            <option value="ALL">전체</option>
            {owners.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="actions">
          <div className="popwrap">
            <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} style={{ display: 'none' }} aria-hidden="true" />
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '업로드 중…' : '⬆ 엑셀 업로드'}
            </button>
            {pop === 'upload-result' && uploadResult && (
              <Popover title={uploadResult.ok ? '업로드 완료' : '업로드 실패'} onClose={() => setPop(null)}>
                {uploadResult.ok ? (
                  <>
                    사업기회 신규 {uploadResult.opportunities.inserted}건 · 갱신 {uploadResult.opportunities.updated}건
                    {uploadResult.plan.updated > 0 && <> · 판매계획 {uploadResult.plan.updated}행</>}
                    {uploadResult.errors.length > 0 && (
                      <>
                        <br />
                        <span style={{ color: 'var(--risk)', fontWeight: 600 }}>오류 {uploadResult.errors.length}건 (미반영):</span>
                        {uploadResult.errors.slice(0, 5).map((er, i) => (
                          <div key={i}>· [{er.sheet} {er.row}행] {er.message}</div>
                        ))}
                        {uploadResult.errors.length > 5 && <div>… 외 {uploadResult.errors.length - 5}건</div>}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {uploadResult.message}
                    <br />양식: excel/sales_pipeline_template.xlsx
                  </>
                )}
              </Popover>
            )}
          </div>
          <a className="btn btn-primary" href={exportUrl} download style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ⬇ Salesforce용 Export
          </a>
        </div>
      </div>
    </header>
  )
}
