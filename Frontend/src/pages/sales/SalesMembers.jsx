import React, { useEffect, useMemo, useState } from 'react'
import memberApiService from '../../services/memberApiService'
import salesRequestService from '../../services/salesRequestService'
import { useAuth } from '../../context/AuthContext'

const ACCENT = '#0ea5e9'
const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

export default function SalesMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [noteTexts, setNoteTexts] = useState({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [memberData, requestData] = await Promise.all([
        memberApiService.getAll(),
        salesRequestService.getAll(),
      ])
      setMembers(memberData)
      setRequests(requestData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pendingMemberIds = useMemo(
    () => new Set(requests.filter((r) => r.status === 'pending').map((r) => r.member?._id || r.member)),
    [requests]
  )

  const filtered = useMemo(() => members.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
    const isMine = m.salesRep?._id === user?.id
    const isUnassigned = !m.salesRep
    const isAssignedElsewhere = member.salesRep && !isMine
    if (filter === 'others') return matchSearch && isAssignedElsewhere
    if (filter === 'mine') return matchSearch && isMine
    if (filter === 'unassigned') return matchSearch && isUnassigned
    return matchSearch
  }), [members, search, filter, user?.id])

  async function handleRequest(memberId) {
    setActionMsg('')
    try {
      await salesRequestService.create(memberId)
      setActionMsg('Assignment request submitted.')
      await load()
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  async function handleAddNote(memberId) {
    const text = (noteTexts[memberId] || '').trim()
    if (!text) return
    setActionMsg('')
    try {
      await memberApiService.addNote(memberId, text)
      setNoteTexts((prev) => ({ ...prev, [memberId]: '' }))
      setActionMsg('Note added.')
      await load()
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  function renderRequestAction(member, isMine, status) {
    if (isMine) {
      return <span className="badge badge-active">Assigned to you</span>
    }
    if (status === 'pending') {
      return <span className="badge badge-expiring">Pending approval</span>
    }
    return (
      <button
        className="btn btn-primary btn-sm"
        style={{ background: ACCENT }}
        disabled={pendingMemberIds.has(member._id)}
        onClick={() => handleRequest(member._id)}
      >
        {member.salesRep ? 'Request Takeover' : 'Request Assignment'}
      </button>
    )
  }

  function requestStatus(memberId) {
    const req = requests.find((r) => (r.member?._id || r.member) === memberId && r.status !== 'rejected')
    return req?.status || null
  }

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading members…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Members</h2>
          <p>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}
      {actionMsg && <div className="text-sm" style={{ marginBottom: 16, color: 'var(--text-muted)' }}>{actionMsg}</div>}

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={sel} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Members</option>
          <option value="mine">My Assignments</option>
          <option value="others">Assigned to Others</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">👥</div><p>No members found.</p></div>
      ) : (
        filtered.map((member) => {
          const isMine = member.salesRep?._id === user?.id
          const status = requestStatus(member._id)
          const isOpen = expandedId === member._id

          return (
            <div key={member._id} className="card" style={{ marginBottom: 10, borderColor: isOpen ? ACCENT : undefined }}>
              <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                <div className="avatar" style={{ borderColor: ACCENT, color: ACCENT, background: `${ACCENT}15` }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{member.name}</div>
                  <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                    {member.phones ? `📞 ${member.phones}` : '📞 Hidden'}
                    {member.package?.name ? ` · ${member.package.name}` : ''}
                  </div>
                </div>
                <span className={`badge badge-${member.status}`}>{member.status}</span>
                {member.salesRep && !isMine && (
                  <span className="badge">{member.salesRep.name}</span>
                )}
                {renderRequestAction(member, isMine, status)}
                <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(isOpen ? null : member._id)}>
                  {isOpen ? 'Hide' : 'Details'}
                </button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="form-grid" style={{ marginBottom: 16 }}>
                    <div><div className="text-sm text-muted">Source</div><div>{member.Type || '—'}</div></div>
                    <div><div className="text-sm text-muted">Sales Rep</div><div>{member.salesRep?.name || 'Unassigned'}</div></div>
                    <div><div className="text-sm text-muted">Package</div><div>{member.package?.name || '—'}</div></div>
                    <div><div className="text-sm text-muted">Package Value</div><div>{member.package?.price ? `${member.package.price} EGP` : '—'}</div></div>
                  </div>

                  {member.notes?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="text-sm font-semibold mb-2">Notes</div>
                      {member.notes.map((note, i) => (
                        <div key={i} className="text-sm" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                          {note.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      className="search-input"
                      placeholder="Add a note…"
                      value={noteTexts[member._id] || ''}
                      onChange={(e) => setNoteTexts((prev) => ({ ...prev, [member._id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary btn-sm" style={{ background: ACCENT }} onClick={() => handleAddNote(member._id)}>
                      Add Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
