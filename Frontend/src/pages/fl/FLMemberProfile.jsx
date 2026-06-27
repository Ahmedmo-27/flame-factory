import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { flMemberService, FL_MEMBERSHIP_TYPES } from '../../services/flMemberService'
import { FL_BRANCHES } from '../../services/flSalesService'
import { formatDate } from '../../services/storageService'
import ConfirmModal from '../../components/ConfirmModal'

const COLOR = '#a855f7'

export default function FLMemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [member,   setMember]   = useState(null)
  const [comments, setComments] = useState([])
  const [tab,      setTab]      = useState('overview')
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showFreeze, setShowFreeze] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editComment, setEditComment] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [form, setForm] = useState({})

  function load() {
    const m = flMemberService.getById(id)
    if (!m) { navigate('/fl/members'); return }
    setMember(m)
    setComments(flMemberService.getComments(id))
    setForm({ ...m })
  }

  useEffect(() => { load() }, [id])
  if (!member) return null

  const status     = flMemberService.getStatus(member)
  const branch     = FL_BRANCHES.find((b) => b.id === member.branch)
  const typeLabel  = FL_MEMBERSHIP_TYPES.find((t) => t.id === member.membershipType)?.label || member.membershipType
  const daysLeft   = member.membershipEnd
    ? Math.ceil((new Date(member.membershipEnd).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
    : null

  function setField(field, value) {
    setForm((f) => {
      const u = { ...f, [field]: value }
      if (field === 'membershipStart' || field === 'membershipType') {
        const start = field === 'membershipStart' ? value : f.membershipStart
        const type  = field === 'membershipType'  ? value : f.membershipType
        if (start) {
          const d = new Date(start)
          const typeObj = FL_MEMBERSHIP_TYPES.find((t) => t.id === type)
          const legacyMap = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 }
          const addMonths = typeObj?.months ?? legacyMap[type] ?? 1
          d.setMonth(d.getMonth() + addMonths)
          u.membershipEnd = d.toISOString().slice(0, 10)
        }
      }
      return u
    })
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    flMemberService.update(id, form)
    setShowEdit(false)
    load()
  }

  function handleFreeze() {
    if (member.frozen) flMemberService.unfreeze(id)
    else               flMemberService.freeze(id)
    load()
  }

  function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    flMemberService.addComment(id, newComment.trim())
    setNewComment('')
    load()
  }

  function handleUpdateComment(e) {
    e.preventDefault()
    if (!editCommentText.trim()) return
    flMemberService.updateComment(editComment.id, editCommentText.trim())
    setEditComment(null)
    load()
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/fl/members')}>← Back to Members</button>

      {/* Header */}
      <div className="profile-header">
        <div className="avatar avatar-lg" style={{ borderColor: COLOR, color: COLOR, background: `${COLOR}20` }}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info" style={{ flex: 1 }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <h2>{member.name}</h2>
            <span className={`badge badge-${status}`}>{status}</span>
          </div>
          <div className="meta">
            {member.phone && <span>📞 {member.phone}</span>}
            {member.age   && <span>🎂 Age {member.age}</span>}
            <span>📍 {branch?.label || '—'}</span>
            <span>📅 {typeLabel}</span>
          </div>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${member.frozen ? 'btn-success' : 'btn-frozen'}`} onClick={() => setShowFreeze(true)}>
            {member.frozen ? '▶ Unfreeze' : '❄ Freeze'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>🗑️ Delete</button>
        </div>
      </div>

      {member.frozen && (
        <div className="freeze-banner">
          ❄️ Membership frozen since {formatDate(member.freezeDate)}. End date will extend when unfrozen.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'comments'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`}
            style={tab === t ? { color: COLOR, borderBottomColor: COLOR } : {}}
            onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'comments' && ` (${comments.length})`}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          <div className="card">
            <div className="card-title">Membership Details</div>
            <InfoRow label="Branch"     value={branch?.label || '—'} />
            <InfoRow label="Type"       value={typeLabel} />
            <InfoRow label="Price"      value={member.price ? `${Number(member.price).toLocaleString()} EGP` : '—'} />
            <InfoRow label="Start Date" value={formatDate(member.membershipStart)} />
            <InfoRow label="End Date"   value={formatDate(member.membershipEnd)} />
            <InfoRow
              label="Days Left"
              value={
                member.frozen ? 'Frozen'
                : daysLeft === null ? '—'
                : daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago`
                : `${daysLeft} days`
              }
              highlight={daysLeft !== null && !member.frozen && daysLeft <= 7}
            />
            {member.totalFrozenDays > 0 && <InfoRow label="Total Frozen Days" value={`${member.totalFrozenDays} days`} />}
          </div>
          <div className="card">
            <div className="card-title">Personal Info</div>
            <InfoRow label="Full Name"    value={member.name} />
            <InfoRow label="Phone"        value={member.phone || '—'} />
            <InfoRow label="Age"          value={member.age || '—'} />
            <InfoRow label="Member Since" value={formatDate(member.createdAt)} />
            {member.notes && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Notes</div>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>{member.notes}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && (
        <div>
          <div className="card mb-4">
            <div className="card-title">Add Comment</div>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Notes, follow-ups, renewal reminders..." style={{ flex: 1, minHeight: 70 }} />
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', background: COLOR }}>Add</button>
            </form>
          </div>
          {comments.length === 0 ? (
            <div className="empty"><div className="empty-icon">💬</div><p>No comments yet.</p></div>
          ) : comments.map((c) => (
            <div key={c.id} className="comment-item">
              {editComment?.id === c.id ? (
                <form onSubmit={handleUpdateComment} style={{ display: 'flex', gap: 8 }}>
                  <textarea value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} style={{ flex: 1, minHeight: 60 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ background: COLOR }}>Save</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditComment(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="comment-meta">
                    <span>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{c.updatedAt && ' (edited)'}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditComment(c); setEditCommentText(c.text) }}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => { flMemberService.deleteComment(c.id); load() }}>🗑️</button>
                    </div>
                  </div>
                  <div className="comment-text">{c.text}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Member</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={(e) => setField('name', e.target.value)} required /></div>
                  <div className="form-group"><label>Phone</label><input value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} /></div>
                  <div className="form-group"><label>Age</label><input type="number" value={form.age || ''} onChange={(e) => setField('age', e.target.value)} min="3" max="100" /></div>
                  <div className="form-group"><label>Branch</label>
                    <select value={form.branch} onChange={(e) => setField('branch', e.target.value)}>
                      {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Membership Type</label>
                    <select value={form.membershipType} onChange={(e) => setField('membershipType', e.target.value)}>
                      {FL_MEMBERSHIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Price (EGP)</label><input type="number" value={form.price || ''} onChange={(e) => setField('price', e.target.value)} min="0" /></div>
                  <div className="form-group"><label>Start Date</label><input type="date" value={form.membershipStart || ''} onChange={(e) => setField('membershipStart', e.target.value)} /></div>
                  <div className="form-group"><label>End Date</label><input type="date" value={form.membershipEnd || ''} onChange={(e) => setField('membershipEnd', e.target.value)} /></div>
                  <div className="form-group full"><label>Notes</label><textarea value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: COLOR }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDelete && (
        <ConfirmModal title="Delete Member" message={`Delete "${member.name}"? All their data will be removed.`}
          onConfirm={() => { flMemberService.delete(id); navigate('/fl/members') }}
          onClose={() => setShowDelete(false)} />
      )}
      {showFreeze && (
        <ConfirmModal
          title={member.frozen ? 'Unfreeze Membership' : 'Freeze Membership'}
          message={member.frozen
            ? `Unfreeze ${member.name}'s membership? End date will be extended by frozen days.`
            : `Freeze ${member.name}'s membership? End date will pause until unfrozen.`}
          onConfirm={handleFreeze} onClose={() => setShowFreeze(false)} danger={false} />
      )}
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? 'var(--expiring)' : 'var(--text)' }}>{value}</span>
    </div>
  )
}
