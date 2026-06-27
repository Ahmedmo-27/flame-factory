import React, { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { useSystem } from '../context/SystemContext'

export default function Sales() {
  const { store, groups, isFight } = useStore()
  const { SYSTEMS, activeSystem } = useSystem()
  const system = SYSTEMS[activeSystem]

  const [payments, setPayments] = useState(() => store.paymentService.getAll())

  function refresh() { setPayments(store.paymentService.getAll()) }

  const monthlySummary = store.paymentService.getMonthlySummary(groups)
  const totalRevenue   = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const currentMonth   = new Date().toISOString().slice(0, 7)
  const thisMonthTotal = payments
    .filter((p) => p.date.startsWith(currentMonth))
    .reduce((s, p) => s + Number(p.amount), 0)

  const lastMonthDate  = new Date()
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonthKey   = lastMonthDate.toISOString().slice(0, 7)
  const lastMonthTotal = payments
    .filter((p) => p.date.startsWith(lastMonthKey))
    .reduce((s, p) => s + Number(p.amount), 0)

  const growth = lastMonthTotal > 0
    ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)
    : null

  function groupLabel(groupId) {
    return groups.find((g) => g.id === groupId)?.label || groupId || '—'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Monthly Sales</h2>
          <p>Revenue breakdown by month{isFight ? ' and branch' : ' and session'}</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="stats-grid mb-5">
        <div className="stat-card">
          <div className="label">All-time Revenue</div>
          <div className="value" style={{ color: system.color, fontSize: 24 }}>
            {totalRevenue.toLocaleString()}
          </div>
          <div className="sub">EGP</div>
        </div>
        <div className="stat-card">
          <div className="label">This Month</div>
          <div className="value" style={{ color: system.color, fontSize: 24 }}>
            {thisMonthTotal.toLocaleString()}
          </div>
          <div className="sub">
            EGP
            {growth !== null && (
              <span style={{ color: Number(growth) >= 0 ? 'var(--active)' : 'var(--expired)', marginLeft: 6 }}>
                {Number(growth) >= 0 ? '▲' : '▼'} {Math.abs(growth)}%
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Last Month</div>
          <div className="value" style={{ fontSize: 24 }}>{lastMonthTotal.toLocaleString()}</div>
          <div className="sub">EGP</div>
        </div>
        <div className="stat-card">
          <div className="label">Transactions</div>
          <div className="value" style={{ fontSize: 24 }}>{payments.length}</div>
          <div className="sub">All time</div>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="section-title">Monthly Breakdown</div>

      {monthlySummary.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💰</div>
          <p>No sales recorded yet. Add members to start tracking revenue.</p>
        </div>
      ) : (
        monthlySummary.map((m) => (
          <div key={m.month} className="month-card">
            <div className="month-header">
              <div>
                <div className="month-name">{m.label}</div>
                <div className="text-muted text-sm">{m.count} payment{m.count !== 1 ? 's' : ''}</div>
              </div>
              <div className="month-total">{m.total.toLocaleString()} EGP</div>
            </div>
            {groups.map((g) => {
              const val = m.byGroup[g.id] || 0
              if (!val) return null
              return (
                <div key={g.id} className="session-row">
                  <span className="s-label">{g.label}</span>
                  <span className="s-val">{val.toLocaleString()} EGP</span>
                </div>
              )
            })}
            {m.byGroup['unknown'] > 0 && (
              <div className="session-row">
                <span className="s-label">Other</span>
                <span className="s-val">{m.byGroup['unknown'].toLocaleString()} EGP</span>
              </div>
            )}
          </div>
        ))
      )}

      {/* All transactions */}
      {payments.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 24 }}>All Transactions</div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>{isFight ? 'Branch' : 'Session'}</th>
                    {isFight && <th>Program</th>}
                    <th>Note</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-muted">
                        {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="font-semibold">{p.memberName}</td>
                      <td className="text-muted">{groupLabel(p.groupId)}</td>
                      {isFight && (
                        <td className="text-muted" style={{ textTransform: 'capitalize' }}>{p.program || '—'}</td>
                      )}
                      <td className="text-muted">{p.note || '—'}</td>
                      <td style={{ fontWeight: 700, color: system.color }}>
                        {Number(p.amount).toLocaleString()} EGP
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => { store.paymentService.delete(p.id); refresh() }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
