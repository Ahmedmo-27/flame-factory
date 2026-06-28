import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { flMemberService, FL_MEMBERSHIP_TYPES } from '../../services/flMemberService'
import { FL_BRANCHES } from '../../services/flSalesService'
import ConfirmModal from '../../components/ConfirmModal'
const COLOR = '#a855f7'

const STATUS_FILTERS = [
  { value: '',         label: 'All Status'    },
  { value: 'active',   label: 'Active'        },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'expired',  label: 'Expired'       },
  { value: 'frozen',   label: 'Frozen'        },
]

const EMPTY = {
  name: '', phone: '', age: '', branch: 'carleton',
  membershipType: 'monthly', membershipStart: '', membershipEnd: '', price: '', notes: '',
}

export default function FLMembers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [members, setMembers]     = useState(() => flMemberService.getAll())
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEdit]     = useState(null)
  const [deleteTarget, setDelete] = useState(null)
  const [form, setForm]           = useState(EMPTY)

  const branchFilter = searchParams.get('branch') || ''

  function refresh() { setMembers(flMemberService.getAll()) }

  function openAdd() {
    setForm({ ...EMPTY, membershipStart: new Date().toISOString().slice(0, 10), branch: branchFilter || 'carleton' })
    setEdit(null)
    setShowModal(true)
  }

  function openEdit(m) {
    setForm({ ...EMPTY, ...m })
    setEdit(m)
    setShowModal(true)
  }

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

  function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editMember) flMemberService.update(editMember.id, form)
    else            flMemberService.create(form)
    refresh()
    setShowModal(false)
  }

  const filtered = useMemo(() => members.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.phone && m.phone.includes(search))
    const matchBranch = !branchFilter || m.branch === branchFilter
    const matchStatus = !statusFilter || flMemberService.getStatus(m) === statusFilter
    return matchSearch && matchBranch && matchStatus
  }), [members, search, branchFilter, statusFilter])

  const branchLabel = FL_BRANCHES.find((b) => b.id === branchFilter)?.label || 'All Members'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Members{branchLabel !== 'All Members' ? ` — ${branchLabel}` : ''}</h2>
          <p className="text-muted text-sm">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/fl/sales')} style={{ borderColor: COLOR, color: COLOR }}>
          + Record Sale
        </button>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select-control" value={branchFilter} onChange={(e) => { if (e.target.value) setSearchParams({ branch: e.target.value }); else setSearchParams({}) }}>
          <option value="">All Branches</option>
          {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select className="select-control" value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">👥</div><p>No members found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Member</th><th>Phone</th><th>Age</th><th>Branch</th><th>Type</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const status = flMemberService.getStatus(m)
                  const branch = FL_BRANCHES.find((b) => b.id === m.branch)
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => navigate(`/fl/members/${m.id}`)}>
                          <div className="avatar" style={{ borderColor: COLOR, color: COLOR, background: `${COLOR}15` }}>{m.name.charAt(0).toUpperCase()}</div>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                        </div>
                      </td>
                      <td className="text-muted">{m.phone || '—'}</td>
                      <td className="text-muted">{m.age || '—'}</td>
                      <td className="text-muted">{branch?.label || '—'}</td>
                      <td className="text-muted">{FL_MEMBERSHIP_TYPES.find(t => t.id === m.membershipType)?.label || m.membershipType || '—'}</td>
                      <td className="text-muted">{m.membershipStart ? new Date(m.membershipStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="text-muted">{m.membershipEnd   ? new Date(m.membershipEnd).toLocaleDateString('en-GB',   { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td><span className={`badge badge-${status}`}>{status}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(`/fl/members/${m.id}`)}>→</button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(m)}>✎</button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelete(m)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editMember ? 'Edit Member' : 'Add Member'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Ahmed Hassan" required /></div>
                  <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="e.g. 01012345678" /></div>
                  <div className="form-group"><label>Age</label><input type="number" value={form.age} onChange={(e) => setField('age', e.target.value)} placeholder="e.g. 25" min="3" max="100" /></div>
                  <div className="form-group">
                    <label>Branch</label>
                    <select value={form.branch} onChange={(e) => setField('branch', e.target.value)}>
                      {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Membership Type</label>
                    <select value={form.membershipType} onChange={(e) => setField('membershipType', e.target.value)}>
                      {FL_MEMBERSHIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Price (EGP)</label><input type="number" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="e.g. 500" min="0" /></div>
                  <div className="form-group"><label>Start Date</label><input type="date" value={form.membershipStart} onChange={(e) => setField('membershipStart', e.target.value)} /></div>
                  <div className="form-group"><label>End Date</label><input type="date" value={form.membershipEnd} onChange={(e) => setField('membershipEnd', e.target.value)} /></div>
                  <div className="form-group full"><label>Notes</label><textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Any notes..." /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: COLOR }}>{editMember ? 'Save Changes' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Member"
          message={`Delete "${deleteTarget.name}"? This will also remove their comments.`}
          onConfirm={() => { flMemberService.delete(deleteTarget.id); refresh(); setDelete(null) }}
          onClose={() => setDelete(null)}
        />
      )}
    </div>
  )
}
