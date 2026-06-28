import React, { useState, useMemo } from 'react'
import { flLeadService, LEAD_STATUSES } from '../../services/flMemberService'
import { FL_BRANCHES } from '../../services/flSalesService'
import ConfirmModal from '../../components/ConfirmModal'

const COLOR = '#a855f7'

const EMPTY = { name: '', phone: '', age: '', branch: 'carleton', status: 'new', notes: '' }

export default function FLLeads() {
  const [leads, setLeads]         = useState(() => flLeadService.getAll())
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [branchFilter, setBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEdit]       = useState(null)
  const [deleteTarget, setDelete] = useState(null)
  const [expandedId, setExpanded] = useState(null)
  const [newNote, setNewNote]     = useState('')
  const [form, setForm]           = useState(EMPTY)

  function refresh() { setLeads(flLeadService.getAll()) }

  function openAdd() { setForm({ ...EMPTY, branch: branchFilter || 'carleton' }); setEdit(null); setShowModal(true) }
  function openEdit(l) { setForm({ ...EMPTY, ...l }); setEdit(l); setShowModal(true) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editLead) flLeadService.update(editLead.id, form)
    else          flLeadService.create(form)
    refresh()
    setShowModal(false)
  }

  function handleAddNote(leadId) {
    if (!newNote.trim()) return
    flLeadService.addNote(leadId, newNote.trim())
    setNewNote('')
    refresh()
  }

  function changeStatus(id, status) {
    flLeadService.update(id, { status })
    refresh()
  }

  const filtered = useMemo(() => leads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone && l.phone.includes(search))
    const matchStatus = !statusFilter || l.status === statusFilter
    const matchBranch = !branchFilter || l.branch === branchFilter
    return matchSearch && matchStatus && matchBranch
  }), [leads, search, statusFilter, branchFilter])

  const counts = useMemo(() => {
    const c = {}
    LEAD_STATUSES.forEach((s) => { c[s.id] = leads.filter((l) => l.status === s.id).length })
    return c
  }, [leads])

  const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Leads</h2>
          <p className="text-muted text-sm">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" style={{ background: COLOR }} onClick={openAdd}>+ Add Lead</button>
      </div>

      {/* Status summary */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {LEAD_STATUSES.map((s) => (
          <div key={s.id} className="stat-card" style={{ cursor: 'pointer', borderColor: statusFilter === s.id ? s.color : undefined }}
            onClick={() => setStatus(statusFilter === s.id ? '' : s.id)}>
            <div className="label">{s.label}</div>
            <div className="value" style={{ fontSize: 28, color: s.color }}>{counts[s.id] || 0}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={sel} value={branchFilter} onChange={(e) => setBranch(e.target.value)}>
          <option value="">All Branches</option>
          {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select style={sel} value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">🎯</div><p>No leads found.</p></div>
      ) : (
        filtered.map((lead) => {
          const branch  = FL_BRANCHES.find((b) => b.id === lead.branch)
          const status  = LEAD_STATUSES.find((s) => s.id === lead.status)
          const notes   = flLeadService.getNotes(lead.id)
          const isOpen  = expandedId === lead.id

          return (
            <div key={lead.id} className="card" style={{ marginBottom: 10, borderColor: isOpen ? COLOR : undefined }}>
              {/* Lead row */}
              <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                <div className="avatar" style={{ borderColor: status?.color, color: status?.color, background: `${status?.color}15`, flexShrink: 0 }}>
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{lead.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                    {lead.phone && <span>📞 {lead.phone}</span>}
                    {lead.age   && <span>🎂 {lead.age} yrs</span>}
                    {branch     && <span>📍 {branch.label}</span>}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Status selector */}
                <select
                  value={lead.status}
                  onChange={(e) => changeStatus(lead.id, e.target.value)}
                  style={{ ...sel, borderColor: status?.color, color: status?.color, fontWeight: 600, padding: '5px 10px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>

                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(isOpen ? null : lead.id)} title="Notes">
                    💬 {notes.length}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(lead)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDelete(lead)}>🗑️</button>
                </div>
              </div>

              {/* Notes panel */}
              {isOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  {lead.notes && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>{lead.notes}</p>
                  )}
                  {/* Add note */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(lead.id) } }}
                      placeholder="Add a note... (Enter to save)"
                      style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '8px 12px', fontSize: 13 }}
                    />
                    <button className="btn btn-primary btn-sm" style={{ background: COLOR }} onClick={() => handleAddNote(lead.id)}>Add</button>
                  </div>
                  {/* Notes list */}
                  {notes.length === 0 ? (
                    <p className="text-muted text-sm">No notes yet.</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className="comment-item">
                        <div className="comment-meta">
                          <span>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => { flLeadService.deleteNote(n.id); refresh() }}>🗑️</button>
                        </div>
                        <div className="comment-text">{n.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editLead ? 'Edit Lead' : 'Add Lead'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sara Ahmed" required /></div>
                  <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 01012345678" /></div>
                  <div className="form-group"><label>Age</label><input type="number" value={form.age} onChange={(e) => setForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 28" min="3" max="100" /></div>
                  <div className="form-group">
                    <label>Branch</label>
                    <select value={form.branch} onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))}>
                      {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                      {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group full"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Initial notes about this lead..." /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: COLOR }}>{editLead ? 'Save Changes' : 'Add Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal title="Delete Lead" message={`Delete "${deleteTarget.name}"? All their notes will be removed.`}
          onConfirm={() => { flLeadService.delete(deleteTarget.id); refresh(); setDelete(null) }}
          onClose={() => setDelete(null)} />
      )}
    </div>
  )
}
