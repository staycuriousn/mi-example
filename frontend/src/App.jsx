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
    ])
      .then(([opp, plan, acc]) => {
        const nameById = Object.fromEntries(acc.accounts.map(a => [a.accountId, a.accountName]))
        const opportunities = opp.opportunities.map(o => ({
          ...o,
          accountName: nameById[o.accountId] ?? o.accountId,
        }))
        setData({ opportunities, plan, accounts: acc.accounts })
      })
      .catch(e => setError(e.message))
  }
  useEffect(load, [])

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
        <Tab2 />
      )}
    </div>
  )
}
