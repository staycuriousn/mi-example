import { OPEN_STAGES, isOpen, isWon, isRevenue } from './model.js'

// filters: { year, granularity: 'year'|'quarter'|'month', quarter, month, bu, channel, owner }
export const monthsOf = f => {
  if (f.granularity === 'month') return [f.month]
  if (f.granularity === 'quarter') {
    const q = f.quarter
    return [q * 3 - 2, q * 3 - 1, q * 3]
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}

const inPeriod = (dateStr, f) => {
  if (!dateStr) return false
  const [y, m] = dateStr.split('-').map(Number)
  return y === f.year && monthsOf(f).includes(m)
}

const matchDim = (o, f) =>
  (f.bu === 'ALL' || o.businessUnit === f.bu) &&
  (f.channel === 'ALL' || o.channel === f.channel) &&
  (f.owner === 'ALL' || o.owner === f.owner)

const matchPlanDim = (p, f) =>
  (f.bu === 'ALL' || p.businessUnit === f.bu) && (f.channel === 'ALL' || p.channel === f.channel)

// 판매 계획 합계 (담당자 필터는 계획에 미적용 — 계획은 조직 단위)
export const planTotal = (plan, f) =>
  plan.monthlyPlan
    .filter(p => p.year === f.year && monthsOf(f).includes(p.month) && matchPlanDim(p, f))
    .reduce((s, p) => s + p.targetAmount, 0)

// 사업기회 분류별 합계
export const filterOpps = (opps, f) => opps.filter(o => matchDim(o, f))

export const kpiSummary = (opps, plan, f) => {
  const dim = filterOpps(opps, f)
  const open = dim.filter(o => isOpen(o) && inPeriod(o.closeDate, f))
  const won = dim.filter(o => isWon(o) && inPeriod(o.closeDate, f))
  const revenue = dim.filter(o => isRevenue(o) && inPeriod(o.closeDate, f))
  const planAmt = planTotal(plan, f)
  const sum = a => a.reduce((s, o) => s + o.amount, 0)
  return {
    plan: planAmt,
    open: { amount: sum(open), count: open.length },
    won: { amount: sum(won), count: won.length, rate: planAmt ? sum(won) / planAmt : null },
    revenue: { amount: sum(revenue), count: revenue.length, rate: planAmt ? sum(revenue) / planAmt : null },
  }
}

// 단계별 파이프라인 (진행중 5단계, 기간 필터는 closeDate 기준)
export const pipelineByStage = (opps, f) => {
  const dim = filterOpps(opps, f).filter(o => isOpen(o) && inPeriod(o.closeDate, f))
  return OPEN_STAGES.map(stage => {
    const list = dim.filter(o => o.stage === stage)
    return { stage, count: list.length, amount: list.reduce((s, o) => s + o.amount, 0) }
  })
}

// 월별 계획 vs 실적 (actualKind: 'won'|'revenue', view: 'monthly'|'cum')
export const monthlySeries = (opps, plan, f, actualKind) => {
  const dim = filterOpps(opps, f)
  const pick = actualKind === 'revenue' ? isRevenue : isWon
  const rows = []
  let cp = 0
  let ca = 0
  for (let m = 1; m <= 12; m++) {
    const p = plan.monthlyPlan
      .filter(r => r.year === f.year && r.month === m && matchPlanDim(r, f))
      .reduce((s, r) => s + r.targetAmount, 0)
    const a = dim
      .filter(o => pick(o) && o.closeDate?.startsWith(`${f.year}-${String(m).padStart(2, '0')}`))
      .reduce((s, o) => s + o.amount, 0)
    cp += p
    ca += a
    rows.push({ month: m, plan: p / 1e8, actual: a / 1e8, cumPlan: cp / 1e8, cumActual: ca / 1e8 })
  }
  return rows
}

// 사업부×채널 달성률 히트맵 (달성률 = 계약완료 / 계획, 기간 필터 적용)
export const heatmap = (opps, plan, f, bus, channels) =>
  bus.map(bu =>
    channels.map(ch => {
      const sub = { ...f, bu: bu.code, channel: ch, owner: 'ALL' }
      const p = planTotal(plan, sub)
      const w = filterOpps(opps, sub)
        .filter(o => isWon(o) && inPeriod(o.closeDate, sub))
        .reduce((s, o) => s + o.amount, 0)
      return { bu: bu.code, channel: ch, plan: p, won: w, rate: p ? w / p : null }
    })
  )

export const periodLabel = f => {
  if (f.granularity === 'month') return `${f.year}년 ${f.month}월`
  if (f.granularity === 'quarter') return `${f.year}년 ${f.quarter}분기`
  return `${f.year}년 연간`
}
