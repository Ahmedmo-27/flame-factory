import React, { useEffect, useMemo, useState } from 'react'
import memberApiService from '../../services/memberApiService'
import salesRequestService from '../../services/salesRequestService'
import { useAuth } from '../../context/AuthContext'
import { hasAbility } from '../../utils/roles'

const ACCENT = '#0ea5e9'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MemberDetails({ member, user, noteText, onNoteChange, onAddNote, onRequest, requestStatus, pendingMemberIds }) {
  const isMine = member.isAssignedToMe || member.salesRep?._id === user?.id

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div><div className="text-sm text-muted">Member ID</div><div className="text-sm">{member._id}</div></div>
        <div><div className="text-sm text-muted">Phone</div><div>{member.phones ? `📞 ${member.phones}` : '📞 Hidden'}</div></div>
        <div><div className="text-sm text-muted">Source</div><div>{member.Type || '—'}</div></div>
        <div><div className="text-sm text-muted">Sales Rep</div><div>{member.salesRep?.name || 'Unassigned'}</div></div>
        <div><div className="text-sm text-muted">Package</div><div>{member.package?.name || '—'}</div></div>
        <div><div className="text-sm text-muted">Package Value</div><div>{member.package?.price ? `${member.package.price} EGP` : '—'}</div></div>
        <div><div className="text-sm text-muted">Gender</div><div>{member.gender || '—'}</div></div>
        <div><div className="text-sm text-muted">Status</div><div>{member.status || '—'}</div></div>
        <div><div className="text-sm text-muted">Joined</div><div>{formatDate(member.createdAt)}</div></div>
      </div>

      {!isMine && onRequest && (
        <div style={{ marginBottom: 16 }}>
          {requestStatus === 'pending' ? (
            <span className="badge badge-expiring">Pending approval</span>
          ) : (() => {
            const isTakeover = Boolean(member.salesRep)
            const canRequest = isTakeover
              ? hasAbility(user, 'canRequestTakeover')
              : hasAbility(user, 'canRequestAssignment')
            if (!canRequest) {
              return <span className="badge text-muted">Request disabled</span>
            }
            return (
              <button
                className="btn btn-primary btn-sm"
                style={{ background: ACCENT }}
                disabled={pendingMemberIds?.has(member._id)}
                onClick={() => onRequest(member._id)}
              >
                {isTakeover ? 'Request Takeover' : 'Request Assignment'}
              </button>
            )
          })()}
        </div>
      )}

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

      {isMine && hasAbility(user, 'canCommentOnMembers') ? (
        <div className="flex gap-2">
          <input
            className="search-input"
            placeholder="Add a note…"
            value={noteText || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" style={{ background: ACCENT }} onClick={onAddNote}>
            Add Note
          </button>
        </div>
      ) : isMine ? (
        <div className="text-sm text-muted">Commenting on members is disabled for your account.</div>
      ) : null}
    </div>
  )
}

export default function SalesMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [idSearch, setIdSearch] = useState('')
  const [lookedUpMember, setLookedUpMember] = useState(null)
  const [idSearchError, setIdSearchError] = useState('')
  const [idSearching, setIdSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [noteTexts, setNoteTexts] = useState({})
  const [lookupNoteText, setLookupNoteText] = useState('')

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
    if (!search) return true
    return m.name.toLowerCase().includes(search.toLowerCase())
  }), [members, search])

  async function handleIdSearch(e) {
    e?.preventDefault()
    const trimmed = idSearch.trim()
    if (!trimmed) return

    setIdSearching(true)
    setIdSearchError('')
    setLookedUpMember(null)
    setActionMsg('')
    try {
      const member = await memberApiService.getById(trimmed)
      setLookedUpMember(member)
      setLookupNoteText('')
    } catch (err) {
      setIdSearchError(err.message)
    } finally {
      setIdSearching(false)
    }
  }

  async function handleRequest(memberId) {
    setActionMsg('')
    try {
      await salesRequestService.create(memberId)
      setActionMsg('Assignment request submitted.')
      await load()
      if (lookedUpMember?._id === memberId) {
        setLookedUpMember(await memberApiService.getById(memberId))
      }
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  async function handleAddNote(memberId, text) {
    if (!text?.trim()) return
    setActionMsg('')
    try {
      await memberApiService.addNote(memberId, text.trim())
      setNoteTexts((prev) => ({ ...prev, [memberId]: '' }))
      setLookupNoteText('')
      setActionMsg('Note added.')
      await load()
      if (lookedUpMember?._id === memberId) {
        setLookedUpMember(await memberApiService.getById(memberId))
      }
    } catch (err) {
      setActionMsg(err.message)
    }
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
          <h2>My Members</h2>
          <p>{filtered.length} assigned member{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}
      {actionMsg && <div className="text-sm" style={{ marginBottom: 16, color: 'var(--text-muted)' }}>{actionMsg}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Search by Member ID</div>
            <div className="text-sm text-muted">Look up any member by their ID — phone is hidden unless assigned to you</div>
          </div>
        </div>
        <form className="flex gap-2" style={{ flexWrap: 'wrap' }} onSubmit={handleIdSearch}>
          <input
            className="search-input"
            placeholder="Paste member ID…"
            value={idSearch}
            onChange={(e) => setIdSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ background: ACCENT }} disabled={idSearching || !idSearch.trim()}>
            {idSearching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {idSearchError && <div className="text-sm" style={{ marginTop: 12, color: 'var(--danger)' }}>{idSearchError}</div>}
      </div>

      {lookedUpMember && (
        <div className="card" style={{ marginBottom: 20, borderColor: ACCENT }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <div className="avatar" style={{ borderColor: ACCENT, color: ACCENT, background: `${ACCENT}15` }}>
              {lookedUpMember.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700 }}>{lookedUpMember.name}</div>
              <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                {lookedUpMember.phones ? `📞 ${lookedUpMember.phones}` : '📞 Hidden'}
                {lookedUpMember.package?.name ? ` · ${lookedUpMember.package.name}` : ''}
              </div>
            </div>
            <span className={`badge badge-${lookedUpMember.status}`}>{lookedUpMember.status}</span>
            {lookedUpMember.isAssignedToMe ? (
              <span className="badge badge-active">Assigned to you</span>
            ) : lookedUpMember.salesRep ? (
              <span className="badge">{lookedUpMember.salesRep.name}</span>
            ) : (
              <span className="badge">Unassigned</span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setLookedUpMember(null)}>Dismiss</button>
          </div>
          <MemberDetails
            member={lookedUpMember}
            user={user}
            noteText={lookupNoteText}
            onNoteChange={setLookupNoteText}
            onAddNote={() => handleAddNote(lookedUpMember._id, lookupNoteText)}
            onRequest={handleRequest}
            requestStatus={requestStatus(lookedUpMember._id)}
            pendingMemberIds={pendingMemberIds}
          />
        </div>
      )}

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search your members by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <p>No members assigned to you yet.</p>
          <p className="text-sm text-muted">Use member ID search above to look up other members.</p>
        </div>
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
                    {member.phones ? `📞 ${member.phones}` : '📞 Hidden'}
                    {member.package?.name ? ` · ${member.package.name}` : ''}
                  </div>
                </div>
                <span className={`badge badge-${member.status}`}>{member.status}</span>
                <span className="badge badge-active">Assigned to you</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(isOpen ? null : member._id)}>
                  {isOpen ? 'Hide' : 'Details'}
                </button>
              </div>

              {isOpen && (
                <MemberDetails
                  member={member}
                  user={user}
                  noteText={noteTexts[member._id]}
                  onNoteChange={(text) => setNoteTexts((prev) => ({ ...prev, [member._id]: text }))}
                  onAddNote={() => handleAddNote(member._id, noteTexts[member._id])}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
