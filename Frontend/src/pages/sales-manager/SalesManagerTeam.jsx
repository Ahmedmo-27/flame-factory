import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../../services/authService'
import memberApiService from '../../services/memberApiService'
import { ABILITY_LABELS } from './SalesRepProfile'

const ACCENT = '#0ea5e9'

function formatCurrency(amount) {
  return `${Number(amount || 0).toLocaleString()} EGP`
}

function AbilityBadge({ enabled, label }) {
  return (
    <span
      className="badge"
      style={{
        fontSize: 11,
        background: enabled ? `${ACCENT}18` : 'var(--surface2)',
        color: enabled ? ACCENT : 'var(--text-muted)',
      }}
      title={label}
    >
      {enabled ? '✓' : '✕'} {label.split(' ')[0]}
    </span>
  )
}

export default function SalesManagerTeam() {
  const navigate = useNavigate()
  const [reps, setReps] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [repData, memberData] = await Promise.all([
          authService.getSalesReps(),
          memberApiService.getAll(),
        ])
        setReps(repData)
        setMembers(memberData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const repStats = useMemo(() => {
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
    })
  }, [reps, members])

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading team…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Sales Team</h2>
          <p>{reps.length} representative{reps.length !== 1 ? 's' : ''} — manage profiles & permissions</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}

      {repStats.length === 0 ? (
        <div className="empty"><div className="empty-icon">👥</div><p>No sales representatives found.</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Representative</th>
                  <th>Members</th>
                  <th>This Month</th>
                  <th>Permissions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {repStats.map((rep) => (
                  <tr key={rep._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="avatar"
                          style={{
                            width: 32,
                            height: 32,
                            fontSize: 13,
                            borderColor: ACCENT,
                            color: ACCENT,
                            background: `${ACCENT}15`,
                          }}
                        >
                          {rep.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{rep.name}</div>
                          <div className="text-sm text-muted">{rep.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{rep.assignedCount}</td>
                    <td>{formatCurrency(rep.monthlyRevenue)}</td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {Object.entries(ABILITY_LABELS).map(([key, meta]) => (
                          <AbilityBadge
                            key={key}
                            enabled={rep.abilities?.[key] !== false}
                            label={meta.label}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: ACCENT }}
                        onClick={() => navigate(`/sales-manager/team/${rep._id}`)}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
