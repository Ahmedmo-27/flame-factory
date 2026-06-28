import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { flSalesService, FL_BRANCHES } from '../../services/flSalesService'
import { flMemberService, flLeadService, LEAD_STATUSES } from '../../services/flMemberService'

export default function FLDashboard() {
  const navigate = useNavigate()
  const [sales]   = useState(() => flSalesService.getAll())
  const [members] = useState(() => flMemberService.getAll())
  const [leads]   = useState(() => flLeadService.getAll())

  const color = '#a855f7'

  const todaySummary   = flSalesService.getTodaySummary()
  const currentMonth   = new Date().toISOString().slice(0, 7)
  const monthlySummary = flSalesService.getMonthlySummary()
  const thisMonth      = monthlySummary.find((m) => m.month === currentMonth)

  const lastMonthDate  = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonthKey   = lastMonthDate.toISOString().slice(0, 7)
  const lastMonth      = monthlySummary.find((m) => m.month === lastMonthKey)

  const totalRevenue = sales.reduce((s, p) => s + Number(p.amount), 0)
  const todayTotal   = Object.values(todaySummary).reduce((s, v) => s + v, 0)

  const growth = lastMonth?.total > 0
    ? (((thisMonth?.total || 0) - lastMonth.total) / lastMonth.total * 100).toFixed(1)
    : null

  // Member stats
  const memberStats = useMemo(() => {
    const counts = { active: 0, expiring: 0, expired: 0, frozen: 0 }
    members.forEach((m) => { const s = flMemberService.getStatus(m); counts[s] = (counts[s] || 0) + 1 })
    return counts
  }, [members])

  // Expiring soon list
  const expiringSoon = members
    .filter((m) => flMemberService.getStatus(m) === 'expiring')
    .sort((a, b) => (a.membershipEnd < b.membershipEnd ? -1 : 1))
    .slice(0, 5)

  // New leads
  const newLeads = leads.filter((l) => l.status === 'new').slice(0, 5)

  const recentSales = sales.slice(0, 5)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>FightLocation overview</p>
        </div>
        <div className="text-muted text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Top stats */}
      <div className="stats-grid mb-5">
        <div className="stat-card">
          <div className="label">All-time Revenue</div>
          <div className="value" style={{ fontSize: 24, color }}>{totalRevenue.toLocaleString()}</div>
          <div className="sub">EGP</div>
        </div>
        <div className="stat-card">
          <div className="label">This Month</div>
          <div className="value" style={{ fontSize: 24, color }}>{(thisMonth?.total || 0).toLocaleString()}</div>
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
          <div className="label">Today</div>
          <div className="value" style={{ fontSize: 24, color }}>{todayTotal.toLocaleString()}</div>
          <div className="sub">EGP — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
        </div>
        <div className="stat-card active">
          <div className="label">Active Members</div>
          <div className="value">{memberStats.active}</div>
          <div className="sub">Valid membership</div>
        </div>
        <div className="stat-card expiring">
          <div className="label">Expiring Soon</div>
          <div className="value">{memberStats.expiring}</div>
          <div className="sub">Within 7 days</div>
        </div>
        <div className="stat-card expired">
          <div className="label">Expired</div>
          <div className="value">{memberStats.expired}</div>
          <div className="sub">Need renewal</div>
        </div>
      </div>

      <div className="two-col mb-4">
        {/* Expiring soon */}
        <div className="card">
          <div className="card-header mb-3">
            <div className="card-title" style={{ marginBottom: 0 }}>Expiring Soon</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/fl/members?status=expiring')}>View All</button>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="text-muted text-sm">No memberships expiring in the next 7 days.</p>
          ) : expiringSoon.map((m) => {
            const diff = Math.ceil((new Date(m.membershipEnd).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
            return (
              <div key={m.id} className="info-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/fl/members/${m.id}`)}>
                <div>
                  <div className="info-value">{m.name}</div>
                  <div className="text-muted text-sm">{FL_BRANCHES.find(b => b.id === m.branch)?.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-expiring">Expiring</span>
                  <div className="text-muted text-sm" style={{ marginTop: 3 }}>
                    {diff === 0 ? 'Today' : `${diff} days`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* New leads */}
        <div className="card">
          <div className="card-header mb-3">
            <div className="card-title" style={{ marginBottom: 0 }}>New Leads</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/fl/leads')}>View All</button>
          </div>
          {newLeads.length === 0 ? (
            <p className="text-muted text-sm">No new leads.</p>
          ) : newLeads.map((l) => (
            <div key={l.id} className="info-row">
              <div>
                <div className="info-value">{l.name}</div>
                <div className="text-muted text-sm">
                  {FL_BRANCHES.find(b => b.id === l.branch)?.label}
                  {l.phone && ` · ${l.phone}`}
                </div>
              </div>
              <div className="text-muted text-sm">
                {new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col mb-4">
        {/* Today per branch */}
        <div className="card">
          <div className="card-title mb-3">Today by Branch</div>
          {FL_BRANCHES.map((b) => (
            <div key={b.id} className="info-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/fl/sales?branch=${b.id}`)}>
              <span className="info-label">{b.icon} {b.label}</span>
              <span className="info-value" style={{ color }}>{(todaySummary[b.id] || 0).toLocaleString()} EGP</span>
            </div>
          ))}
        </div>

        {/* This month per branch */}
        <div className="card">
          <div className="card-title mb-3">{new Date().toLocaleString('default', { month: 'long' })} by Branch</div>
          {FL_BRANCHES.map((b) => (
            <div key={b.id} className="info-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/fl/sales?branch=${b.id}`)}>
              <span className="info-label">{b.icon} {b.label}</span>
              <span className="info-value" style={{ color }}>{(thisMonth?.byBranch[b.id] || 0).toLocaleString()} EGP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="card-header mb-3">
          <div className="card-title" style={{ marginBottom: 0 }}>Recent Transactions</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/fl/sales')}>View All</button>
        </div>
        {recentSales.length === 0 ? (
          <div className="empty"><div className="empty-icon">💰</div><p>No sales yet. Record your first sale!</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Client</th><th>Branch</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
              <tbody>
                {recentSales.map((s) => {
                  const branch = FL_BRANCHES.find((b) => b.id === s.branchId)
                  return (
                    <tr key={s.id}>
                      <td className="text-muted">{new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ fontWeight: 600 }}>{s.clientName || '—'}</td>
                      <td className="text-muted">{branch?.label || '—'}</td>
                      <td className="text-muted" style={{ textTransform: 'capitalize' }}>{s.category || '—'}</td>
                      <td className="text-muted">{s.description || '—'}</td>
                      <td style={{ fontWeight: 700, color }}>{Number(s.amount).toLocaleString()} EGP</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
