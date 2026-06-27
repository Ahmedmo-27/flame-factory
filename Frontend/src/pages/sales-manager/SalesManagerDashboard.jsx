import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../../services/authService'
import memberApiService from '../../services/memberApiService'
import salesRequestService from '../../services/salesRequestService'

const ACCENT = '#0ea5e9'

function formatCurrency(amount) {
  return `${Number(amount || 0).toLocaleString()} EGP`
}

export default function SalesManagerDashboard() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [memberData, requestData, repData] = await Promise.all([
          memberApiService.getAll(),
          salesRequestService.getAll(),
          authService.getSalesReps(),
        ])
        setMembers(memberData)
        setRequests(requestData)
        setReps(repData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests]
  )

  const unassignedCount = useMemo(
    () => members.filter((m) => !m.salesRep).length,
    [members]
  )

  const repPerformance = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return reps.map((rep) => {
      const assigned = members.filter((m) => m.salesRep?._id === rep._id)
      const monthlyRevenue = assigned.reduce((sum, m) => {
        const d = new Date(m.createdAt)
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          return sum + (m.package?.price || 0)
        }
        return sum
      }, 0)
      return { ...rep, assignedCount: assigned.length, monthlyRevenue }
    }).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
  }, [reps, members])

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading dashboard…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Sales Manager Dashboard</h2>
          <p>Team performance & pending approvals</p>
        </div>
        <div className="text-muted text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 20 }}><span>⚠</span> {error}</div>}

      <div className="stats-grid">
        <div className="stat-card expiring">
          <div className="label">Pending Requests</div>
          <div className="value">{pendingRequests.length}</div>
          <div className="sub">Need your review</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Members</div>
          <div className="value" style={{ color: ACCENT }}>{members.length}</div>
          <div className="sub">Across all reps</div>
        </div>
        <div className="stat-card">
          <div className="label">Unassigned</div>
          <div className="value">{unassignedCount}</div>
          <div className="sub">No sales rep yet</div>
        </div>
        <div className="stat-card active">
          <div className="label">Sales Team</div>
          <div className="value">{reps.length}</div>
          <div className="sub">Active reps</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Approvals</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sales-manager/requests')}>Review all</button>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="empty"><p>No pending requests.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Requested By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.slice(0, 5).map((req) => (
                    <tr key={req._id}>
                      <td>{req.member?.name || '—'}</td>
                      <td>{req.requestedBy?.name || '—'}</td>
                      <td className="text-muted text-sm">
                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
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
            <div className="card-title">Team Revenue This Month</div>
          </div>
          {repPerformance.length === 0 ? (
            <div className="empty"><p>No sales reps found.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>Members</th>
                    <th>This Month</th>
                  </tr>
                </thead>
                <tbody>
                  {repPerformance.map((rep) => (
                    <tr key={rep._id}>
                      <td>{rep.name}</td>
                      <td>{rep.assignedCount}</td>
                      <td>{formatCurrency(rep.monthlyRevenue)}</td>
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
