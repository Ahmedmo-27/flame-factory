import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useSystem } from '../context/SystemContext'
import { formatDate } from '../services/storageService'
import MemberModal from '../components/MemberModal'
import ConfirmModal from '../components/ConfirmModal'

const INTEREST_OPTIONS = [
  { id: '',              label: 'Not specified'    },
  { id: 'crossfit',      label: 'CrossFit'         },
  { id: 'calisthenics',  label: 'Calisthenics'     },
  { id: 'boxing',        label: 'Boxing'           },
  { id: 'mma',           label: 'MMA'              },
  { id: 'personal',      label: 'Personal Training'},
  { id: 'other',         label: 'Other'            },
]

const EMPTY_FORM = {
  name: '', phone: '', interest: '', notes: '',
}

function GuestModal({ guest, onSave, onClose }) {
  const [form, setForm] = useState(guest
    ? { name: guest.name, phone: guest.phone || '', interest: guest.interest || '', notes: guest.notes || '' }
    : { ...EMPTY_FORM }
  )
  const [error, setError] = useState('')

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); setError('') }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{guest ? 'Edit Guest' : 'Add Guest'}</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="auth-error" style={{ marginBottom: 14 }}><span>⚠</span> {error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Ahmed Hassan"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="e.g. 01012345678"
                />
              </div>
              <div className="form-group">
                <label>Interested In</label>
                <select value={form.interest} onChange={(e) => set('interest', e.target.value)}>
                  {INTEREST_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Any additional notes about this guest..."
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {guest ? 'Save Changes' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Guests() {
  const navigate = useNavigate()
  const { store, systemId } = useStore()
  const { SYSTEMS, activeSystem } = useSystem()
  const system = SYSTEMS[activeSystem]

  const [guests,       setGuests]       = useState(() => store.guestService.getAll())
  const [search,       setSearch]       = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editGuest,    setEditGuest]    = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  // Convert-to-member flow
  const [convertGuest, setConvertGuest] = useState(null)

  function refresh() { setGuests(store.guestService.getAll()) }

  const filtered = useMemo(() => {
    if (!search.trim()) return guests
    const q = search.toLowerCase()
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.phone && g.phone.includes(q)) ||
        (g.interest && g.interest.toLowerCase().includes(q))
    )
  }, [guests, search])

  const pending   = filtered.filter((g) => !g.convertedToMember)
  const converted = filtered.filter((g) => g.convertedToMember)

  function handleSaveGuest(data) {
    if (editGuest) {
      store.guestService.update(editGuest.id, data)
    } else {
      store.guestService.create(data)
    }
    refresh()
    setShowModal(false)
    setEditGuest(null)
  }

  function handleDelete(id) {
    store.guestService.delete(id)
    refresh()
  }

  // Called after MemberModal saves — mark guest as converted
  function handleConvertSave(memberData) {
    store.memberService.create(memberData)
    store.guestService.markConverted(convertGuest.id)
    refresh()
    setConvertGuest(null)
    navigate('/members')
  }

  function interestLabel(id) {
    return INTEREST_OPTIONS.find((o) => o.id === id)?.label || '—'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Guests</h2>
          <p>{pending.length} pending · {converted.length} converted</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditGuest(null); setShowModal(true) }}
        >
          + Add Guest
        </button>
      </div>

      {/* Search */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by name, phone or interest..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Pending guests */}
      {pending.length === 0 && converted.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🚶</div>
          <p>No guests yet. Add a walk-in visitor to get started.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <div className="card-title">Pending</div>
                <span className="badge badge-expiring">{pending.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Interest</th>
                      <th>Notes</th>
                      <th>Added</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="avatar"
                              style={{
                                color: system.color,
                                background: `${system.color}14`,
                                borderColor: `${system.color}40`,
                              }}
                            >
                              {g.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold">{g.name}</span>
                          </div>
                        </td>
                        <td className="text-muted">{g.phone || '—'}</td>
                        <td>
                          {g.interest ? (
                            <span className="badge badge-frozen">{interestLabel(g.interest)}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.notes || '—'}
                        </td>
                        <td className="text-muted">{formatDate(g.createdAt)}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => setConvertGuest(g)}
                              title="Convert to Member"
                            >
                              + Member
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => { setEditGuest(g); setShowModal(true) }}
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              className="btn btn-danger btn-sm btn-icon"
                              onClick={() => setDeleteTarget(g)}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Converted guests */}
          {converted.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Converted to Members</div>
                <span className="badge badge-active">{converted.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Interest</th>
                      <th>Added</th>
                      <th>Converted</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {converted.map((g) => (
                      <tr key={g.id} style={{ opacity: 0.65 }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="avatar"
                              style={{
                                color: 'var(--active)',
                                background: 'var(--active-bg)',
                                borderColor: 'var(--active-border)',
                              }}
                            >
                              {g.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold">{g.name}</span>
                          </div>
                        </td>
                        <td className="text-muted">{g.phone || '—'}</td>
                        <td className="text-muted">{interestLabel(g.interest)}</td>
                        <td className="text-muted">{formatDate(g.createdAt)}</td>
                        <td className="text-muted">{formatDate(g.convertedAt)}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => setDeleteTarget(g)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <GuestModal
          guest={editGuest}
          onSave={handleSaveGuest}
          onClose={() => { setShowModal(false); setEditGuest(null) }}
        />
      )}

      {/* Convert to member — reuse MemberModal, pre-fill name & phone */}
      {convertGuest && (
        <MemberModal
          member={{
            name:  convertGuest.name,
            phone: convertGuest.phone || '',
          }}
          onSave={handleConvertSave}
          onClose={() => setConvertGuest(null)}
          systemId={systemId}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Guest"
          message={`Remove "${deleteTarget.name}" from guests?`}
          onConfirm={() => { handleDelete(deleteTarget.id); setDeleteTarget(null) }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
