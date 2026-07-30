// 도메인 상수 — docs/MI_PLATFORM_DESIGN.md 2.2·2.4, DESIGN.md 데이터 시각화 팔레트 고정값
export const BUS = [
  { code: 'PRT', name: '프린터', color: 'var(--c-prt)', hex: '#2e56c2' },
  { code: 'PJT', name: '프로젝터', color: 'var(--c-pjt)', hex: '#0e8fa5' },
  { code: 'RBT', name: '로봇', color: 'var(--c-rbt)', hex: '#7c5cd1' },
  { code: 'CMP', name: '부품·소재', color: 'var(--c-cmp)', hex: '#b26a00' },
]

export const CHANNELS = ['직판', '총판']

// 진행중 5단계 (파이프라인 표시 대상)
export const OPEN_STAGES = [
  '리드 발굴',
  '니즈 파악·상담',
  '제안·견적',
  'Demo·PoC/테스트',
  '협상·계약검토',
]

export const STAGE_WON = '계약 완료(수주)'
export const STAGE_REVENUE = '매출 인식'
export const STAGE_LOST = '실주(Lost)'

export const buName = code => BUS.find(b => b.code === code)?.name ?? code
export const buHex = code => BUS.find(b => b.code === code)?.hex ?? '#5a6478'

export const isWon = o => o.stage === STAGE_WON || o.stage === STAGE_REVENUE
export const isRevenue = o => o.stage === STAGE_REVENUE
export const isOpen = o => OPEN_STAGES.includes(o.stage)

export const fmtEok = won => {
  const eok = won / 1e8
  const s = eok >= 100 ? Math.round(eok).toLocaleString() : eok.toFixed(1)
  return s
}
export const fmtWon = won => won.toLocaleString('ko-KR')
export const fmtPct = r => (r == null ? '—' : `${Math.round(r * 100)}%`)

export const rateBand = r => (r == null ? 'none' : r >= 1 ? 'ok' : r >= 0.7 ? 'warn' : 'risk')

// 경쟁사 낙찰 판정: 낙찰업체가 확정됐고 우리(Epson)가 아닌 경우
export const isCompetitorAward = e => {
  const vendor = e?.detail?.type === 'bid' ? e.detail.awardedVendor : null
  return Boolean(vendor) && !/엡손|epson/i.test(vendor)
}
