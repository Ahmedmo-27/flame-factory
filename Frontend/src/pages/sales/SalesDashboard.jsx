import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import authService from '../../services/authService'
import memberApiService from '../../services/memberApiService'
import salesRequestService from '../../services/salesRequestService'

const ACCENT = '#0ea5e9'

function formatCurrency(amount, currency = 'EGP') {
  return `${Number(amount || 0).toLocaleString()} ${currency}`
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function SalesDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [revenue, setRevenue] = useState(null)
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [revenueData, memberData, requestData] = await Promise.all([
          authService.getSalesRevenue(),
          memberApiService.getAll(),
          salesRequestService.getAll(),
        ])
        setRevenue(revenueData)
        setMembers(memberData)
        setRequests(requestData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const assignedMembers = useMemo(
    () => members.filter((m) => m.salesRep?._id === user?.id),
    [members, user?.id]
  )

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests]
  )

  const monthChange = useMemo(() => {
    if (!revenue?.lastMonthRevenue) return null
    const diff = revenue.currentMonthRevenue - revenue.lastMonthRevenue
    const pct = Math.round((diff / revenue.lastMonthRevenue) * 100)
    return { diff, pct }
  }, [revenue])

  if (loading) {
    return (
      <div className="page">
        <div className="empty"><p>Loading dashboard…</p></div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Sales Dashboard</h2>
          <p>Welcome back, {user?.name}</p>
        </div>
        <div className="text-muted text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 20 }}>
          <span>⚠</span> {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card active">
          <div className="label">This Month</div>
          <div className="value" style={{ color: ACCENT }}>
            {formatCurrency(revenue?.currentMonthRevenue, revenue?.currency)}
          </div>
          <div className="sub">
            {revenue?.currentMonth ? formatMonth(revenue.currentMonth) : 'Current month'}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Last Month</div>
          <div className="value">{formatCurrency(revenue?.lastMonthRevenue, revenue?.currency)}</div>
          <div className="sub">
            {monthChange
              ? `${monthChange.diff >= 0 ? '+' : ''}${formatCurrency(monthChange.diff, revenue?.currency)} vs last month`
              : 'Previous period'}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">My Members</div>
          <div className="value">{assignedMembers.length}</div>
          <div className="sub">Assigned to you</div>
        </div>
        <div className="stat-card expiring">
          <div className="label">Pending Requests</div>
          <div className="value">{pendingRequests.length}</div>
          <div className="sub">Awaiting approval</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Monthly Revenue</div>
          <span className="text-muted text-sm">Last 6 months</span>
        </div>
        {revenue?.monthlyBreakdown?.length === 0 ? (
          <div className="empty"><p>No sales recorded yet.</p></div>
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
                {[...(revenue?.monthlyBreakdown || [])].reverse().map((row) => (
                  <tr key={row.month}>
                    <td>{formatMonth(row.month)}</td>
                    <td>{row.salesCount}</td>
                    <td style={{ fontWeight: row.month === revenue?.currentMonth ? 700 : 400, color: row.month === revenue?.currentMonth ? ACCENT : undefined }}>
                      {formatCurrency(row.revenue, revenue?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Assignments</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sales/members')}>View all</button>
          </div>
          {assignedMembers.length === 0 ? (
            <div className="empty"><p>No members assigned yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Package</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedMembers.slice(0, 5).map((m) => (
                    <tr key={m._id}>
                      <td>{m.name}</td>
                      <td>{m.package?.name || '—'}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Find a Member</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sales/members')}>Search by ID</button>
          </div>
          <div className="empty" style={{ padding: '24px 16px' }}>
            <p>Look up any member using their ID on the Members page.</p>
            <p className="text-sm text-muted">Phone numbers are only visible for members assigned to you.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
