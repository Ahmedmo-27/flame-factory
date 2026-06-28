import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useSystem } from '../context/SystemContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { store, groups, isFight } = useStore()
  const { SYSTEMS, activeSystem } = useSystem()
  const system = SYSTEMS[activeSystem]

  const members  = store.memberService.getAll()
  const payments = store.paymentService.getAll()

  const stats = useMemo(() => {
    const counts = { active: 0, expiring: 0, expired: 0, frozen: 0 }
    members.forEach((m) => {
      const s = store.memberService.getStatus(m)
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [members])

  const groupStats = useMemo(() =>
    groups.map((g) => ({
      ...g,
      count: members.filter((m) =>
        isFight ? m.branch === g.id : m.session === g.id
      ).length,
    })),
    [members, groups]
  )

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthRevenue = payments
    .filter((p) => p.date.startsWith(currentMonth))
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const expiringSoon = members
    .filter((m) => store.memberService.getStatus(m) === 'expiring')
    .sort((a, b) => (a.membershipEnd < b.membershipEnd ? -1 : 1))

  const recentMembers = [...members]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  function groupLabel(m) {
    if (isFight) {
      return groups.find((g) => g.id === m.branch)?.label || m.branch || '—'
    }
    return groups.find((g) => g.id === m.session)?.label || m.session || '—'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview &amp; key metrics</p>
        </div>
        <div className="text-muted text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Members</div>
          <div className="value" style={{ color: system.color }}>{members.length}</div>
          <div className="sub">{isFight ? 'All branches' : 'All sessions'}</div>
        </div>
        <div className="stat-card active">
          <div className="label">Active</div>
          <div className="value">{stats.active}</div>
          <div className="sub">Valid membership</div>
        </div>
        <div className="stat-card expiring">
          <div className="label">Expiring Soon</div>
          <div className="value">{stats.expiring}</div>
          <div className="sub">Within 7 days</div>
        </div>
        <div className="stat-card expired">
          <div className="label">Expired</div>
          <div className="value">{stats.expired}</div>
          <div className="sub">Need renewal</div>
        </div>
        <div className="stat-card frozen">
          <div className="label">Frozen</div>
          <div className="value">{stats.frozen}</div>
          <div className="sub">Paused</div>
        </div>
        <div className="stat-card">
          <div className="label">This Month</div>
          <div className="value" style={{ color: system.color, fontSize: 22 }}>
            {monthRevenue.toLocaleString()}
          </div>
          <div className="sub">
            EGP — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Two-column section */}
      <div className="two-col mb-4">
        {/* Group breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">By {isFight ? 'Branch' : 'Session'}</div>
          </div>
          {groupStats.map((g) => (
            <div
              key={g.id}
              className="info-row"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/members?${isFight ? 'branch' : 'session'}=${g.id}`)}
            >
              <span className="info-label">{g.label}</span>
              <span className="info-value" style={{ color: system.color }}>{g.count}</span>
            </div>
          ))}
          {isFight && (
            <div
              className="info-row"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/members?program=hustle')}
            >
              <span className="info-label">Flame Factory Program</span>
              <span className="info-value" style={{ color: system.color }}>
                {members.filter((m) => m.program === 'hustle').length}
              </span>
            </div>
          )}
        </div>

        {/* Expiring soon */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Expiring Soon</div>
            {expiringSoon.length > 0 && (
              <span className="badge badge-expiring">{expiringSoon.length}</span>
            )}
          </div>
          {expiringSoon.length === 0 ? (
            <p className="text-muted text-sm" style={{ marginTop: 8 }}>
              No memberships expiring in the next 7 days.
            </p>
          ) : (
            expiringSoon.map((m) => (
              <div
                key={m.id}
                className="info-row"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/members/${m.id}`)}
              >
                <div>
                  <div className="info-value">{m.name}</div>
                  <div className="text-muted text-sm">{groupLabel(m)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-expiring">Expiring</span>
                  <div className="text-muted text-sm" style={{ marginTop: 3 }}>
                    {new Date(m.membershipEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent members */}
      <div className="card">
        <div className="card-header mb-3">
          <div className="card-title" style={{ marginBottom: 0 }}>Recent Members</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/members')}>View All</button>
        </div>
        {recentMembers.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <p>No members yet. Add your first member!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>{isFight ? 'Branch' : 'Session'}</th>
                  {isFight && <th>Program</th>}
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((m) => {
                  const status = store.memberService.getStatus(m)
                  return (
                    <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/members/${m.id}`)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar" style={{ borderColor: system.color, color: system.color, background: `${system.color}14` }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{m.name}</span>
                        </div>
                      </td>
                      <td className="text-muted">{groupLabel(m)}</td>
                      {isFight && (
                        <td className="text-muted" style={{ textTransform: 'capitalize' }}>
                          {m.program || '—'}
                        </td>
                      )}
                      <td className="text-muted">{m.phone || '—'}</td>
                      <td><span className={`badge badge-${status}`}>{status}</span></td>
                      <td className="text-muted">
                        {m.membershipEnd
                          ? new Date(m.membershipEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
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
