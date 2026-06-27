import React, { useEffect, useMemo, useState } from 'react'
import salesRequestService from '../../services/salesRequestService'

const ACCENT = '#0ea5e9'
const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

const STATUS_META = {
  pending: { label: 'Pending', color: '#f59e0b', badge: 'expiring' },
  accepted: { label: 'Accepted', color: '#22c55e', badge: 'active' },
  rejected: { label: 'Rejected', color: '#ef4444', badge: 'expired' },
}

export default function SalesRequests() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRequests(await salesRequestService.getAll())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(
    () => requests.filter((r) => !filter || r.status === filter),
    [requests, filter]
  )

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, rejected: 0 }
    requests.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [requests])

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading requests…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>My Requests</h2>
          <p>Track member assignment requests</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {Object.entries(STATUS_META).map(([id, meta]) => (
          <div
            key={id}
            className="stat-card"
            style={{ cursor: 'pointer', borderColor: filter === id ? meta.color : undefined }}
            onClick={() => setFilter(filter === id ? '' : id)}
          >
            <div className="label">{meta.label}</div>
            <div className="value" style={{ color: meta.color }}>{counts[id] || 0}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <select style={sel} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([id, meta]) => (
            <option key={id} value={id}>{meta.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">📋</div><p>No requests found.</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const meta = STATUS_META[req.status] || STATUS_META.pending
                  return (
                    <tr key={req._id}>
                      <td>{req.member?.name || '—'}</td>
                      <td><span className={`badge badge-${meta.badge}`}>{meta.label}</span></td>
                      <td className="text-muted text-sm">
                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="text-muted text-sm">
                        {new Date(req.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
