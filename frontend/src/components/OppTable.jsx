import { useMemo, useState } from 'react'
import { filterOpps } from '../lib/aggregate.js'
import { buName, buHex, fmtEok, STAGE_WON, STAGE_REVENUE, STAGE_LOST } from '../lib/model.js'

const StageTag = ({ stage }) => {
  const cls =
    stage === STAGE_WON ? 't-won' : stage === STAGE_REVENUE ? 't-rev' : stage === STAGE_LOST ? 't-lost' : ''
  return <span className={`tag ${cls}`}>{stage}</span>
}

const COLS = [
  { key: 'opportunityId', label: 'ID' },
  { key: 'name', label: '사업기회명' },
  { key: 'accountName', label: '고객사' },
  { key: 'businessUnit', label: '사업부' },
  { key: 'channel', label: '채널' },
  { key: 'productModel', label: '대표 모델' },
  { key: 'amount', label: '금액(억)', num: true },
  { key: 'stage', label: '단계' },
  { key: 'probability', label: '확도', num: true },
  { key: 'closeDate', label: '수주 예정' },
  { key: 'owner', label: '담당' },
]

export default function OppTable({ opps, filters, stageFilter, clearStage, selectedId, onSelect }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ key: 'amount', dir: 'desc' })

  const rows = useMemo(() => {
    let list = filterOpps(opps, filters)
    if (stageFilter) list = list.filter(o => o.stage === stageFilter)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter(o =>
        [o.name, o.accountName, o.productModel, o.owner, o.opportunityId]
          .filter(Boolean)
          .some(v => v.toLowerCase().includes(t))
      )
    }
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[key] ?? ''
      const bv = b[key] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
      return String(av).localeCompare(String(bv), 'ko') * mul
    })
  }, [opps, filters, stageFilter, q, sort])

  const toggleSort = key =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  return (
    <>
      <div className="tablebar">
        <input
          type="search"
          placeholder="사업기회명·고객사·모델·담당 검색"
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="사업기회 검색"
        />
        {stageFilter && (
          <button className="chip" onClick={clearStage} aria-label={`${stageFilter} 필터 해제`}>
            단계: {stageFilter} <span className="x">✕</span>
          </button>
        )}
        <span className="count num">{rows.length}건</span>
      </div>

      {rows.length === 0 ? (
        <div className="statebox">
          <strong>조건에 맞는 사업기회가 없습니다</strong>
          필터나 검색어를 조정해 보세요.
        </div>
      ) : (
        <div className="tablewrap">
          <table className="opps">
            <thead>
              <tr>
                {COLS.map(c => (
                  <th
                    key={c.key}
                    className={c.num ? 'num-h' : ''}
                    onClick={() => toggleSort(c.key)}
                    aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {c.label}
                    {sort.key === c.key && <span className="arrow">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(o => (
                <tr
                  key={o.opportunityId}
                  className={selectedId === o.opportunityId ? 'sel' : ''}
                  onClick={() => onSelect(o.opportunityId)}
                >
                  <td className="num">{o.opportunityId}</td>
                  <td className="name" title={o.name}>{o.name}</td>
                  <td>{o.accountName}</td>
                  <td>
                    <span className="bu-dot" style={{ background: buHex(o.businessUnit), display: 'inline-block', width: 8, height: 8, borderRadius: 2, marginRight: 6 }} />
                    {buName(o.businessUnit)}
                  </td>
                  <td>{o.channel}</td>
                  <td>{o.productModel}</td>
                  <td className="num-c num">{fmtEok(o.amount)}</td>
                  <td><StageTag stage={o.stage} /></td>
                  <td className="num-c num">{o.probability}%</td>
                  <td className="num">{o.closeDate}</td>
                  <td>{o.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
