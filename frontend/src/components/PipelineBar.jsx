import { fmtEok } from '../lib/model.js'

export default function PipelineBar({ stages, active, onPick }) {
  return (
    <div className="pipeline" role="group" aria-label="영업 단계별 현황">
      {stages.map(s => (
        <button
          key={s.stage}
          className={`stagecell ${active === s.stage ? 'on' : ''}`}
          onClick={() => onPick(s.stage)}
          aria-pressed={active === s.stage}
        >
          <div className="sname">{s.stage}</div>
          <div className="sval num">
            {fmtEok(s.amount)}억<span className="scnt num">{s.count}건</span>
          </div>
        </button>
      ))}
    </div>
  )
}
