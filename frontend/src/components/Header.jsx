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

export default function Header({ tab, setTab, filters, setFilters, owners }) {
  const [pop, setPop] = useState(null) // 'upload' | 'export' | null
  const set = patch => setFilters(f => ({ ...f, ...patch }))

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
          <button className="btn btn-ghost" onClick={() => setPop(p => (p === 'upload' ? null : 'upload'))}>
            ⬆ 엑셀 업로드
          </button>
          {pop === 'upload' && (
            <Popover title="2차 구현 예정" onClose={() => setPop(null)}>
              실무 관리 엑셀(excel/sales_pipeline_template.xlsx)을 업로드하면 검증 후 모니터링 현황에 자동
              반영됩니다.
            </Popover>
          )}
        </div>
        <div className="popwrap">
          <button className="btn btn-primary" onClick={() => setPop(p => (p === 'export' ? null : 'export'))}>
            ⬇ Salesforce용 Export
          </button>
          {pop === 'export' && (
            <Popover title="2차 구현 예정" onClose={() => setPop(null)}>
              현재 필터 기준 사업기회를 Salesforce Data Loader import 포맷(엑셀)으로 내려받습니다. 매핑
              규칙은 excel/salesforce_import_sample.xlsx 참조.
            </Popover>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
