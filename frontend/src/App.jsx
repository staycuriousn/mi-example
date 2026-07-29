import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Tab1 from './components/Tab1.jsx'
import Tab2 from './components/Tab2.jsx'

const fetchJson = async path => {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

export default function App() {
  const [tab, setTab] = useState('tab1')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    year: 2026,
    granularity: 'year',
    quarter: 1,
    month: 1,
    bu: 'ALL',
    channel: 'ALL',
    owner: 'ALL',
  })

  const load = () => {
    setError(null)
    setData(null)
    Promise.all([
      fetchJson('/api/opportunities'),
      fetchJson('/api/sales-plan'),
      fetchJson('/api/accounts'),
      fetchJson('/api/sensing-events'),
      fetchJson('/api/search-trends'),
    ])
      .then(([opp, plan, acc, evt, trends]) => {
        const nameById = Object.fromEntries(acc.accounts.map(a => [a.accountId, a.accountName]))
        const opportunities = opp.opportunities.map(o => ({
          ...o,
          accountName: nameById[o.accountId] ?? o.accountId,
        }))
        setData({ opportunities, plan, accounts: acc.accounts, events: evt.events, trends })
      })
      .catch(e => setError(e.message))
  }
  useEffect(load, [])

  // 승격·기각·보류 등 이벤트 상태 변경 (1차: 세션 내 메모리 반영, 백엔드 저장은 2차)
  const updateEvent = (eventId, patch) =>
    setData(d => ({ ...d, events: d.events.map(e => (e.eventId === eventId ? { ...e, ...patch } : e)) }))

  // 승격 폼 저장 → 탭1 파이프라인(리드 발굴)에 즉시 추가
  const addOpportunity = opp =>
    setData(d => ({ ...d, opportunities: [...d.opportunities, opp] }))

  const owners = useMemo(
    () => (data ? [...new Set(data.opportunities.map(o => o.owner))].sort() : []),
    [data]
  )

  return (
    <div className="app">
      <Header tab={tab} setTab={setTab} filters={filters} setFilters={setFilters} owners={owners} />
      {tab === 'tab1' ? (
        <Tab1 data={data} error={error} retry={load} filters={filters} setFilters={setFilters} />
      ) : (
        <Tab2
          data={data}
          error={error}
          retry={load}
          filters={filters}
          updateEvent={updateEvent}
          addOpportunity={addOpportunity}
        />
      )}
    </div>
  )
}
