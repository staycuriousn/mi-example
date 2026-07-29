import { BUS, buHex, fmtEok, fmtPct, rateBand } from '../lib/model.js'

export default function Heatmap({ grid }) {
  return (
    <div className="panel" aria-label="사업부×채널 달성률">
      <div className="phead">
        <div className="ptitle">
          사업부 × 채널 달성률 <span style={{ color: '#5a6478', fontWeight: 400 }}>(계약완료 기준)</span>
        </div>
      </div>
      <table className="hm">
        <thead>
          <tr>
            <th className="rowh" scope="col">사업부</th>
            <th scope="col">직판</th>
            <th scope="col">총판</th>
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={BUS[i].code}>
              <th className="rowh" scope="row">
                <span className="bu-dot" style={{ background: buHex(BUS[i].code) }} />
                {BUS[i].name}
              </th>
              {row.map(cell => (
                <td key={cell.channel} className={`c-${rateBand(cell.rate)} num`}>
                  <span className="pct">{cell.rate == null ? '계획 없음' : fmtPct(cell.rate)}</span>
                  <span className="amt num">
                    {fmtEok(cell.won)} / {fmtEok(cell.plan)}억
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legend" style={{ marginTop: 12 }}>
        <span className="li"><span className="swatch" style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok)' }} /> 100% 이상</span>
        <span className="li"><span className="swatch" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn)' }} /> 70~99%</span>
        <span className="li"><span className="swatch" style={{ background: 'var(--risk-bg)', border: '1px solid var(--risk)' }} /> 70% 미만</span>
      </div>
    </div>
  )
}
