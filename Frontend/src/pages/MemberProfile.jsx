import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useSystem } from '../context/SystemContext'
import { formatDate, today } from '../services/storageService'
import MemberModal from '../components/MemberModal'
import ConfirmModal from '../components/ConfirmModal'

export default function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { store, groups, isFight, config, systemId } = useStore()
  const { SYSTEMS, activeSystem } = useSystem()
  const system = SYSTEMS[activeSystem]

  const [member,     setMember]     = useState(null)
  const [attendance, setAttendance] = useState([])
  const [comments,   setComments]   = useState([])
  const [tab,        setTab]        = useState('overview')
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showFreeze, setShowFreeze] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editComment,     setEditComment]     = useState(null)
  const [editCommentText, setEditCommentText] = useState('')

  function load() {
    const m = store.memberService.getById(id)
    if (!m) { navigate('/members'); return }
    setMember(m)
    setAttendance(store.attendanceService.getByMember(id))
    setComments(store.commentService.getByMember(id))
  }

  useEffect(() => { load() }, [id])

  if (!member) return null

  const status        = store.memberService.getStatus(member)
  const isSessionMode = member.membershipMode === 'sessions'

  function groupLabel() {
    if (isFight) return groups.find((g) => g.id === member.branch)?.label || member.branch || '—'
    return groups.find((g) => g.id === member.session)?.label || member.session || '—'
  }

  const typeLabel = isSessionMode
    ? `${member.sessionsTotal} Sessions Package`
    : (config.membershipTypes.find((t) => t.id === member.membershipType)?.label || member.membershipType)

  const todayStr    = today()
  const todayRecord = attendance.find((a) => a.date === todayStr)

  const daysLeft = member.membershipEnd
    ? Math.ceil((new Date(member.membershipEnd).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
    : null

  function handleCheckIn()  { store.attendanceService.checkIn(id, todayStr);  load() }
  function handleCheckOut() { store.attendanceService.checkOut(id, todayStr); load() }

  function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    store.commentService.create(id, newComment.trim())
    setNewComment('')
    load()
  }

  function handleUpdateComment(e) {
    e.preventDefault()
    if (!editCommentText.trim()) return
    store.commentService.update(editComment.id, editCommentText.trim())
    setEditComment(null)
    setEditCommentText('')
    load()
  }

  function handleDeleteComment(cid) { store.commentService.delete(cid); load() }
  function handleSaveEdit(data) { store.memberService.update(id, data); setShowEdit(false); load() }
  function handleDelete()       { store.memberService.delete(id); navigate('/members') }

  function handleFreeze() {
    if (member.frozen) store.memberService.unfreeze(id)
    else               store.memberService.freeze(id)
    load()
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/members')}>← Back to Members</button>

      {/* Header */}
      <div className="profile-header">
        <div
          className="avatar avatar-lg"
          style={{ borderColor: system.color, color: system.color, background: `${system.color}14` }}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info" style={{ flex: 1 }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
            <h2>{member.name}</h2>
            <span className={`badge badge-${status}`}>{status}</span>
          </div>
          <div className="meta">
            {member.phone && <span>{member.phone}</span>}
            {member.age   && <span>Age {member.age}</span>}
            <span>{groupLabel()}</span>
            {isFight && member.program && (
              <span style={{ textTransform: 'capitalize' }}>{member.program}</span>
            )}
            {isSessionMode
              ? <span>{member.sessionsRemaining ?? 0} / {member.sessionsTotal} sessions left</span>
              : <span>{typeLabel}</span>
            }
          </div>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${member.frozen ? 'btn-success' : 'btn-frozen'}`}
            onClick={() => setShowFreeze(true)}
          >
            {member.frozen ? 'Unfreeze' : 'Freeze'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      {member.frozen && (
        <div className="freeze-banner">
          Membership frozen since {formatDate(member.freezeDate)}. End date will extend when unfrozen.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'attendance', 'comments'].map((t) => (
          <button
            key={t}
            className={`tab${tab === t ? ' active' : ''}`}
            style={tab === t ? { color: system.color, borderBottomColor: system.color } : {}}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'attendance' && ` (${attendance.length})`}
            {t === 'comments'   && ` (${comments.length})`}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          <div className="card">
            <div className="card-title mb-3">Membership</div>
            <div className="info-row">
              <span className="info-label">{isFight ? 'Branch' : 'Session'}</span>
              <span className="info-value">{groupLabel()}</span>
            </div>
            {isFight && (
              <div className="info-row">
                <span className="info-label">Program</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>
                  {member.program || '—'}
                </span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Type</span>
              <span className="info-value">{typeLabel}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Price</span>
              <span className="info-value">
                {member.price ? `${Number(member.price).toLocaleString()} EGP` : '—'}
              </span>
            </div>

            {isSessionMode ? (
              <>
                <div style={{ padding: '10px 0 4px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sessions Remaining</span>
                    <span style={{
                      fontSize: 18, fontWeight: 700,
                      color: member.sessionsRemaining <= 2 ? 'var(--expiring)' : 'var(--active)',
                    }}>
                      {member.sessionsRemaining ?? 0}
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                        {' '}/ {member.sessionsTotal}
                      </span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(0, ((member.sessionsRemaining ?? 0) / (member.sessionsTotal || 1)) * 100)}%`,
                        background: member.sessionsRemaining <= 2 ? 'var(--expiring)' : 'var(--active)',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {member.sessionsTotal - (member.sessionsRemaining ?? 0)} used
                    {member.price && member.sessionsTotal && (
                      <span style={{ marginLeft: 8 }}>
                        · {(Number(member.price) / Number(member.sessionsTotal)).toFixed(0)} EGP/session
                      </span>
                    )}
                  </div>
                </div>
                <div className="info-row">
                  <span className="info-label">Start Date</span>
                  <span className="info-value">{formatDate(member.membershipStart)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="info-row">
                  <span className="info-label">Start Date</span>
                  <span className="info-value">{formatDate(member.membershipStart)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">End Date</span>
                  <span className="info-value">{formatDate(member.membershipEnd)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Days Left</span>
                  <span className="info-value" style={{ color: daysLeft !== null && !member.frozen && daysLeft <= 7 ? 'var(--expiring)' : undefined }}>
                    {member.frozen ? 'Frozen'
                      : daysLeft === null ? '—'
                      : daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago`
                      : `${daysLeft} days`}
                  </span>
                </div>
                {member.totalFrozenDays > 0 && (
                  <div className="info-row">
                    <span className="info-label">Total Frozen</span>
                    <span className="info-value">{member.totalFrozenDays} days</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="card-title mb-3">Personal Info</div>
            <div className="info-row">
              <span className="info-label">Full Name</span>
              <span className="info-value">{member.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone</span>
              <span className="info-value">{member.phone || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Age</span>
              <span className="info-value">{member.age || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Member Since</span>
              <span className="info-value">{formatDate(member.createdAt)}</span>
            </div>
            {member.notes && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Notes</div>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>{member.notes}</p>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-title mb-3">Today's Attendance</div>
            {todayRecord ? (
              <div>
                <p style={{ color: 'var(--active)', fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
                  Checked In
                </p>
                <div className="info-row">
                  <span className="info-label">Check-in</span>
                  <span className="info-value">{new Date(todayRecord.checkedInAt).toLocaleTimeString()}</span>
                </div>
                {todayRecord.checkedOutAt && (
                  <div className="info-row">
                    <span className="info-label">Check-out</span>
                    <span className="info-value">{new Date(todayRecord.checkedOutAt).toLocaleTimeString()}</span>
                  </div>
                )}
                {!todayRecord.checkedOutAt && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={handleCheckOut}>
                    Check Out
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-muted text-sm" style={{ marginBottom: 12 }}>Not checked in today.</p>
                <button className="btn btn-primary btn-sm" onClick={handleCheckIn}>
                  Check In Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance tab */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="card-header mb-3">
            <div className="card-title" style={{ marginBottom: 0 }}>Attendance History</div>
            {!todayRecord ? (
              <button className="btn btn-primary btn-sm" onClick={handleCheckIn}>Check In Today</button>
            ) : !todayRecord.checkedOutAt ? (
              <button className="btn btn-ghost btn-sm" onClick={handleCheckOut}>Check Out</button>
            ) : (
              <span className="badge badge-active">Done for today</span>
            )}
          </div>
          {attendance.length === 0 ? (
            <div className="empty"><div className="empty-icon">📅</div><p>No attendance records yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th></th></tr>
                </thead>
                <tbody>
                  {attendance.map((a) => {
                    const duration = a.checkedInAt && a.checkedOutAt
                      ? Math.round((new Date(a.checkedOutAt) - new Date(a.checkedInAt)) / 60000)
                      : null
                    return (
                      <tr key={a.id}>
                        <td className="font-semibold">
                          {new Date(a.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>{a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString() : '—'}</td>
                        <td>{a.checkedOutAt ? new Date(a.checkedOutAt).toLocaleTimeString() : <span className="text-muted">—</span>}</td>
                        <td>{duration !== null ? `${duration} min` : <span className="text-muted">—</span>}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => { store.attendanceService.delete(a.id); load() }}
                          >✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Comments tab */}
      {tab === 'comments' && (
        <div>
          <div className="card mb-4">
            <div className="card-title mb-3">Add Note</div>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 10 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a note about this member..."
                style={{ flex: 1, minHeight: 72 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end' }}
              >
                Add
              </button>
            </form>
          </div>

          {comments.length === 0 ? (
            <div className="empty"><div className="empty-icon">💬</div><p>No notes yet.</p></div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment-item">
                {editComment?.id === c.id ? (
                  <form onSubmit={handleUpdateComment} style={{ display: 'flex', gap: 8 }}>
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      style={{ flex: 1, minHeight: 60 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button type="submit" className="btn btn-primary btn-sm">Save</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditComment(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="comment-meta">
                      <span>
                        {new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' '}{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {c.updatedAt && ' (edited)'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => { setEditComment(c); setEditCommentText(c.text) }}
                        >✎</button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDeleteComment(c.id)}
                        >✕</button>
                      </div>
                    </div>
                    <div className="comment-text">{c.text}</div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showEdit   && <MemberModal member={member} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} systemId={systemId} />}
      {showDelete && (
        <ConfirmModal
          title="Delete Member"
          message={`Delete "${member.name}"? All their data will be permanently removed.`}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
      {showFreeze && (
        <ConfirmModal
          title={member.frozen ? 'Unfreeze Membership' : 'Freeze Membership'}
          message={member.frozen
            ? `Unfreeze ${member.name}'s membership? End date will be extended by frozen days.`
            : `Freeze ${member.name}'s membership? End date will pause until unfrozen.`}
          onConfirm={handleFreeze}
          onClose={() => setShowFreeze(false)}
          danger={false}
        />
      )}
    </div>
  )
}
