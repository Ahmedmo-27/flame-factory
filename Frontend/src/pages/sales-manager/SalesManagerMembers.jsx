import React, { useEffect, useMemo, useState } from 'react'
import memberApiService from '../../services/memberApiService'
import authService from '../../services/authService'

const ACCENT = '#0ea5e9'
const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

export default function SalesManagerMembers() {
  const [members, setMembers] = useState([])
  const [reps, setReps] = useState([])
  const [search, setSearch] = useState('')
  const [repFilter, setRepFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [reassignId, setReassignId] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [memberData, repData] = await Promise.all([
        memberApiService.getAll(),
        authService.getSalesReps(),
      ])
      setMembers(memberData)
      setReps(repData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => members.filter((m) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      m.name.toLowerCase().includes(q) ||
      (m.phones && m.phones.includes(search)) ||
      m._id.toLowerCase().includes(q)
    const matchRep = !repFilter || (repFilter === 'unassigned' ? !m.salesRep : m.salesRep?._id === repFilter)
    return matchSearch && matchRep
  }), [members, search, repFilter])

  async function handleReassign(memberId) {
    if (!reassignId) return
    setActionMsg('')
    try {
      await memberApiService.switchSalesRep(memberId, reassignId)
      setReassignId('')
      setActionMsg('Sales rep updated.')
      await load()
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  async function handleAddNote(memberId) {
    if (!noteText.trim()) return
    setActionMsg('')
    try {
      await memberApiService.addNote(memberId, noteText.trim())
      setNoteText('')
      setActionMsg('Note added.')
      await load()
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading members…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>All Members</h2>
          <p>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}
      {actionMsg && <div className="text-sm" style={{ marginBottom: 16, color: 'var(--text-muted)' }}>{actionMsg}</div>}

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by name, phone, or member ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={sel} value={repFilter} onChange={(e) => setRepFilter(e.target.value)}>
          <option value="">All Sales Reps</option>
          <option value="unassigned">Unassigned</option>
          {reps.map((rep) => (
            <option key={rep._id} value={rep._id}>{rep.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">👥</div><p>No members found.</p></div>
      ) : (
        filtered.map((member) => {
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
                    <span title={member._id}>ID: {member._id.slice(-8)}</span>
                    {' · '}
                    {member.phones ? `📞 ${member.phones}` : '—'}
                    {member.package?.name ? ` · ${member.package.name}` : ''}
                  </div>
                </div>
                <span className={`badge badge-${member.status}`}>{member.status}</span>
                <span className="badge">{member.salesRep?.name || 'Unassigned'}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(isOpen ? null : member._id)}>
                  {isOpen ? 'Hide' : 'Manage'}
                </button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="form-grid" style={{ marginBottom: 16 }}>
                    <div><div className="text-sm text-muted">Member ID</div><div className="text-sm">{member._id}</div></div>
                    <div><div className="text-sm text-muted">Phone</div><div>{member.phones || '—'}</div></div>
                    <div><div className="text-sm text-muted">National ID</div><div>{member.nationalId || '—'}</div></div>
                    <div><div className="text-sm text-muted">Gender</div><div>{member.gender || '—'}</div></div>
                    <div><div className="text-sm text-muted">Birth Date</div><div>{member.bitthdate ? new Date(member.bitthdate).toLocaleDateString('en-GB') : '—'}</div></div>
                    <div><div className="text-sm text-muted">Source</div><div>{member.Type || '—'}</div></div>
                    <div><div className="text-sm text-muted">Sales Rep</div><div>{member.salesRep?.name || 'Unassigned'}</div></div>
                    <div><div className="text-sm text-muted">Package</div><div>{member.package?.name || '—'}</div></div>
                    <div><div className="text-sm text-muted">Value</div><div>{member.package?.price ? `${member.package.price} EGP` : '—'}</div></div>
                    <div><div className="text-sm text-muted">Status</div><div>{member.status || '—'}</div></div>
                    <div><div className="text-sm text-muted">Joined</div><div>{member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-GB') : '—'}</div></div>
                  </div>

                  <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                    <select
                      style={{ ...sel, flex: 1, minWidth: 180 }}
                      value={reassignId}
                      onChange={(e) => setReassignId(e.target.value)}
                    >
                      <option value="">Select sales rep…</option>
                      {reps.map((rep) => (
                        <option key={rep._id} value={rep._id}>{rep.name}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: ACCENT }}
                      disabled={!reassignId}
                      onClick={() => handleReassign(member._id)}
                    >
                      Reassign Rep
                    </button>
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
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
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
