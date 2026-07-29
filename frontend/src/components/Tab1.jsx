import { useMemo, useState } from 'react'
import { kpiSummary, pipelineByStage, heatmap, monthlySeries, periodLabel } from '../lib/aggregate.js'
import { BUS, CHANNELS } from '../lib/model.js'
import KpiCards from './KpiCards.jsx'
import PipelineBar from './PipelineBar.jsx'
import MonthlyCombo from './MonthlyCombo.jsx'
import Heatmap from './Heatmap.jsx'
import OppTable from './OppTable.jsx'
import DetailPanel from './DetailPanel.jsx'

const Skeleton = () => (
  <>
    <div className="kpis" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="skel" style={{ height: 118 }} />
      ))}
    </div>
    <div className="section">
      <div className="skel" style={{ height: 78 }} />
    </div>
    <div className="section charts">
      <div className="skel" style={{ height: 320 }} />
      <div className="skel" style={{ height: 320 }} />
    </div>
    <div className="section">
      <div className="skel" style={{ height: 360 }} />
    </div>
  </>
)

export default function Tab1({ data, error, retry, filters, setFilters }) {
  const [stageFilter, setStageFilter] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [actualKind, setActualKind] = useState('won') // 'won' | 'revenue'

  const agg = useMemo(() => {
    if (!data) return null
    return {
      kpi: kpiSummary(data.opportunities, data.plan, filters),
      stages: pipelineByStage(data.opportunities, filters),
      monthly: monthlySeries(data.opportunities, data.plan, filters, actualKind),
      hm: heatmap(data.opportunities, data.plan, filters, BUS, CHANNELS),
    }
  }, [data, filters, actualKind])

  if (error)
    return (
      <div className="section statebox" role="alert">
        <strong>데이터를 불러오지 못했습니다</strong>
        {error} — 백엔드(uvicorn backend.main:app --port 8000)가 실행 중인지 확인해 주세요.
        <div>
          <button className="btn btn-primary" onClick={retry}>다시 시도</button>
        </div>
      </div>
    )

  if (!data || !agg) return <Skeleton />

  const selected = selectedId ? data.opportunities.find(o => o.opportunityId === selectedId) : null

  return (
    <>
      <KpiCards kpi={agg.kpi} label={periodLabel(filters)} />

      <section className="section" aria-label="단계별 진행중 사업기회">
        <h2>
          단계별 진행중 사업기회
          <span className="hint">단계를 클릭하면 아래 표가 해당 단계로 필터됩니다</span>
        </h2>
        <PipelineBar stages={agg.stages} active={stageFilter} onPick={s => setStageFilter(v => (v === s ? null : s))} />
      </section>

      <section className="section charts" aria-label="차트">
        <MonthlyCombo rows={agg.monthly} actualKind={actualKind} setActualKind={setActualKind} />
        <Heatmap grid={agg.hm} />
      </section>

      <section className="section" aria-label="사업기회별 현황">
        <h2>사업기회별 현황</h2>
        <OppTable
          opps={data.opportunities}
          filters={filters}
          stageFilter={stageFilter}
          clearStage={() => setStageFilter(null)}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>

      <DetailPanel
        opp={selected}
        accounts={data.accounts}
        allOpps={data.opportunities}
        onClose={() => setSelectedId(null)}
        onJump={setSelectedId}
      />
    </>
  )
}
