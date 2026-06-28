import React, { useEffect, useMemo, useState } from 'react'
import authService from '../../services/authService'

const ACCENT = '#0ea5e9'
const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

function formatCurrency(amount, currency = 'EGP') {
  return `${Number(amount || 0).toLocaleString()} ${currency}`
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function SalesManagerTarget() {
  const [revenue, setRevenue] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await authService.getSalesManagerRevenue(selectedMonth || undefined)
        setRevenue(data)
        if (!selectedMonth) {
          setSelectedMonth(data.selectedMonth)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedMonth])

  const monthOptions = useMemo(
    () => [...(revenue?.monthlyBreakdown || [])].reverse(),
    [revenue]
  )

  const teamTarget = useMemo(
    () => (revenue?.repBreakdown || []).reduce((sum, r) => sum + (r.rep.monthlyTarget || 0), 0),
    [revenue]
  )

  if (loading && !revenue) {
    return <div className="page"><div className="empty"><p>Loading targets…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Target</h2>
          <p>Monthly revenue & representative performance</p>
        </div>
        <select
          style={sel}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          disabled={loading}
        >
          {monthOptions.map((row) => (
            <option key={row.month} value={row.month}>{formatMonth(row.month)}</option>
          ))}
        </select>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 20 }}><span>⚠</span> {error}</div>}

      <div className="stats-grid">
        <div className="stat-card active">
          <div className="label">{formatMonth(revenue?.selectedMonth || selectedMonth)}</div>
          <div className="value" style={{ color: ACCENT }}>
            {formatCurrency(revenue?.selectedMonthRevenue, revenue?.currency)}
          </div>
          <div className="sub">Total team revenue</div>
        </div>
        <div className="stat-card">
          <div className="label">Sales This Month</div>
          <div className="value">
            {(revenue?.repBreakdown || []).reduce((sum, r) => sum + r.salesCount, 0)}
          </div>
          <div className="sub">New members sold</div>
        </div>
        <div className="stat-card">
          <div className="label">Combined Target</div>
          <div className="value">{teamTarget ? formatCurrency(teamTarget, revenue?.currency) : '—'}</div>
          <div className="sub">Sum of rep monthly targets</div>
        </div>
        <div className="stat-card">
          <div className="label">Target Progress</div>
          <div className="value">
            {teamTarget
              ? `${Math.round(((revenue?.selectedMonthRevenue || 0) / teamTarget) * 100)}%`
              : '—'}
          </div>
          <div className="sub">Team vs combined target</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue by Month</div>
            <span className="text-muted text-sm">Last 12 months</span>
          </div>
          {!revenue?.monthlyBreakdown?.length ? (
            <div className="empty"><p>No revenue recorded yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {[...revenue.monthlyBreakdown].reverse().map((row) => (
                    <tr
                      key={row.month}
                      style={row.month === revenue.selectedMonth ? { background: `${ACCENT}08` } : undefined}
                    >
                      <td style={{ fontWeight: row.month === revenue.selectedMonth ? 700 : 400 }}>
                        {formatMonth(row.month)}
                      </td>
                      <td>{row.salesCount}</td>
                      <td style={{ fontWeight: row.month === revenue.selectedMonth ? 700 : 400, color: row.month === revenue.selectedMonth ? ACCENT : undefined }}>
                        {formatCurrency(row.revenue, revenue.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue by Representative</div>
            <span className="text-muted text-sm">{formatMonth(revenue?.selectedMonth || selectedMonth)}</span>
          </div>
          {!revenue?.repBreakdown?.length ? (
            <div className="empty"><p>No sales representatives found.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Representative</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>Target</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.repBreakdown.map((entry) => (
                    <tr key={entry.rep._id}>
                      <td style={{ fontWeight: 600 }}>{entry.rep.name}</td>
                      <td>{entry.salesCount}</td>
                      <td style={{ color: entry.revenue > 0 ? ACCENT : undefined, fontWeight: entry.revenue > 0 ? 600 : 400 }}>
                        {formatCurrency(entry.revenue, revenue.currency)}
                      </td>
                      <td className="text-muted">
                        {entry.rep.monthlyTarget ? formatCurrency(entry.rep.monthlyTarget, revenue.currency) : '—'}
                      </td>
                      <td>
                        {entry.targetProgress != null ? (
                          <span className={`badge ${entry.targetProgress >= 100 ? 'badge-active' : ''}`}>
                            {entry.targetProgress}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
