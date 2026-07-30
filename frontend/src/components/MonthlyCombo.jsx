import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const INK = '#00339b'
const INK300 = '#8fa6e0'

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d9dee8',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,26,86,.12)',
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: '18px',
      }}
    >
      <div style={{ fontWeight: 600, color: '#1a2233', marginBottom: 4 }}>{label}월</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span style={{ color: '#5a6478' }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: 2,
                background: p.color || p.stroke,
                marginRight: 5,
              }}
            />
            {p.name}
          </span>
          <span className="num" style={{ color: '#1a2233', fontWeight: 600 }}>
            {p.value.toFixed(1)}억
          </span>
        </div>
      ))}
    </div>
  )
}

const useNarrow = () => {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 480px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)')
    const h = e => setNarrow(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return narrow
}

export default function MonthlyCombo({ rows, actualKind, setActualKind }) {
  const [view, setView] = useState('monthly') // 'monthly' | 'cum'
  const narrow = useNarrow()
  const actualLabel = actualKind === 'won' ? '계약완료' : '매출인식'
  const isCum = view === 'cum'
  const barKey = isCum ? 'cumActual' : 'actual'
  const lineKey = isCum ? 'cumPlan' : 'plan'

  return (
    <div className="panel" aria-label="월별 계획 대비 실적">
      <div className="phead">
        <div>
          <div className="ptitle">
            월별 계획 vs 실적 <span style={{ color: '#5a6478', fontWeight: 400 }}>(단위: 억원)</span>
          </div>
          <div className="legend" style={{ marginTop: 4 }}>
            <span className="li">
              <span className="swatch" style={{ background: INK }} /> 실적({actualLabel})
            </span>
            <span className="li">
              <span className="swatch line" style={{ background: INK300 }} /> 계획
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="seg" role="group" aria-label="실적 기준">
            <button className={actualKind === 'won' ? 'on' : ''} onClick={() => setActualKind('won')}>
              계약완료
            </button>
            <button className={actualKind === 'revenue' ? 'on' : ''} onClick={() => setActualKind('revenue')}>
              매출인식
            </button>
          </div>
          <div className="seg" role="group" aria-label="표시 방식">
            <button className={!isCum ? 'on' : ''} onClick={() => setView('monthly')}>
              월별
            </button>
            <button className={isCum ? 'on' : ''} onClick={() => setView('cum')}>
              누적
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#d9dee8" strokeWidth={1} />
          <XAxis
            dataKey="month"
            tickFormatter={m => `${m}월`}
            tick={{ fontSize: 11, fill: '#5a6478' }}
            axisLine={{ stroke: '#d9dee8' }}
            tickLine={false}
            interval={narrow ? 1 : 0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#5a6478' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f2f5fc' }} />
          <Bar dataKey={barKey} name={`실적(${actualLabel})`} fill={INK} radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={400} />
          <Line
            dataKey={lineKey}
            stroke="#ffffff"
            strokeWidth={5}
            dot={false}
            activeDot={false}
            type="monotone"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
          <Line
            dataKey={lineKey}
            name="계획"
            stroke={INK300}
            strokeWidth={2.5}
            dot={{ r: 3, fill: INK300, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            type="monotone"
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
