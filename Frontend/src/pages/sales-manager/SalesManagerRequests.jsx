import React, { useEffect, useMemo, useState } from 'react'
import salesRequestService from '../../services/salesRequestService'
import ConfirmModal from '../../components/ConfirmModal'

const ACCENT = '#0ea5e9'
const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

export default function SalesManagerRequests() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

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

  async function handleStatus(id, status) {
    setActionMsg('')
    try {
      await salesRequestService.updateStatus(id, status)
      setActionMsg(`Request ${status}.`)
      await load()
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading requests…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Assignment Requests</h2>
          <p>Approve or reject member assignment requests</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}
      {actionMsg && <div className="text-sm" style={{ marginBottom: 16, color: 'var(--text-muted)' }}>{actionMsg}</div>}

      <div className="filter-bar">
        <select style={sel} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">📋</div><p>No requests found.</p></div>
      ) : (
        filtered.map((req) => (
          <div key={req._id} className="card" style={{ marginBottom: 10 }}>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{req.member?.name || 'Unknown member'}</div>
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                  Requested by {req.requestedBy?.name || '—'} · {req.requestedBy?.email || '—'}
                </div>
                <div className="text-sm text-muted">
                  {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className={`badge badge-${req.status === 'pending' ? 'expiring' : req.status === 'accepted' ? 'active' : 'expired'}`}>
                {req.status}
              </span>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: ACCENT }}
                    onClick={() => setConfirmAction({ id: req._id, status: 'accepted', member: req.member?.name, rep: req.requestedBy?.name })}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setConfirmAction({ id: req._id, status: 'rejected', member: req.member?.name, rep: req.requestedBy?.name })}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.status === 'accepted' ? 'Approve Request' : 'Reject Request'}
          message={
            confirmAction.status === 'accepted'
              ? `Assign ${confirmAction.member} to ${confirmAction.rep}?`
              : `Reject ${confirmAction.rep}'s request for ${confirmAction.member}?`
          }
          danger={confirmAction.status === 'rejected'}
          onConfirm={() => handleStatus(confirmAction.id, confirmAction.status)}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
