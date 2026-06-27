import React, { useEffect, useMemo, useState } from 'react'
import packageApiService from '../../services/packageApiService'
import ConfirmModal from '../../components/ConfirmModal'

const ACCENT = '#0ea5e9'
const sel = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13 }

const PACKAGE_TYPES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'annual', label: 'Annual' },
  { id: 'sessions', label: 'Sessions' },
]

const EMPTY_FORM = {
  name: '',
  type: 'monthly',
  price: '',
  durationMonths: '1',
  sessionsLimit: '',
  freezeLimitDays: '0',
  hasCoach: false,
  isActive: true,
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString()} EGP`
}

function formatType(type) {
  return PACKAGE_TYPES.find((t) => t.id === type)?.label || type
}

export default function SalesManagerPackages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPkg, setEditPkg] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    setError('')
    try {
      setPackages(await packageApiService.getAll())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return packages
    const q = search.toLowerCase()
    return packages.filter((p) =>
      p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    )
  }, [packages, search])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreate() {
    setEditPkg(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(pkg) {
    setEditPkg(pkg)
    setForm({
      name: pkg.name,
      type: pkg.type,
      price: String(pkg.price),
      durationMonths: String(pkg.durationMonths),
      sessionsLimit: pkg.sessionsLimit != null ? String(pkg.sessionsLimit) : '',
      freezeLimitDays: String(pkg.freezeLimitDays ?? 0),
      hasCoach: Boolean(pkg.hasCoach),
      isActive: pkg.isActive !== false,
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setActionMsg('')
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        price: Number(form.price),
        durationMonths: Number(form.durationMonths),
        sessionsLimit: form.type === 'sessions' && form.sessionsLimit ? Number(form.sessionsLimit) : null,
        freezeLimitDays: Number(form.freezeLimitDays) || 0,
        hasCoach: form.hasCoach,
        isActive: form.isActive,
      }

      if (editPkg) {
        await packageApiService.update(editPkg._id, payload)
        setActionMsg('Package updated.')
      } else {
        await packageApiService.create(payload)
        setActionMsg('Package created.')
      }

      setShowModal(false)
      await load()
    } catch (err) {
      setActionMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionMsg('')
    try {
      await packageApiService.delete(deleteTarget._id)
      setActionMsg('Package deleted.')
      await load()
    } catch (err) {
      setActionMsg(err.message)
    }
  }

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading packages…</p></div></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Packages</h2>
          <p>{filtered.length} package{filtered.length !== 1 ? 's' : ''} — manage membership plans & pricing</p>
        </div>
        <button className="btn btn-primary btn-sm" style={{ background: ACCENT }} onClick={openCreate}>
          + Add Package
        </button>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}
      {actionMsg && <div className="text-sm" style={{ marginBottom: 16, color: 'var(--text-muted)' }}>{actionMsg}</div>}

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search packages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <p>No packages found.</p>
          <button className="btn btn-primary btn-sm" style={{ background: ACCENT, marginTop: 12 }} onClick={openCreate}>
            Create first package
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Sessions</th>
                  <th>Coach</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg) => (
                  <tr key={pkg._id}>
                    <td style={{ fontWeight: 600 }}>{pkg.name}</td>
                    <td>{formatType(pkg.type)}</td>
                    <td>{formatPrice(pkg.price)}</td>
                    <td>{pkg.durationMonths} mo</td>
                    <td>{pkg.sessionsLimit ?? '—'}</td>
                    <td>{pkg.hasCoach ? 'Yes' : 'No'}</td>
                    <td>
                      <span className={`badge ${pkg.isActive !== false ? 'badge-active' : ''}`} style={pkg.isActive === false ? { opacity: 0.7 } : undefined}>
                        {pkg.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(pkg)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(pkg)}>
                          Delete
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

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editPkg ? 'Edit Package' : 'Add Package'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Basic Monthly" required />
                  </div>
                  <div className="form-group">
                    <label>Type *</label>
                    <select style={sel} value={form.type} onChange={(e) => setField('type', e.target.value)}>
                      {PACKAGE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Price (EGP) *</label>
                    <input type="number" min="0" step="1" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="e.g. 1500" required />
                  </div>
                  <div className="form-group">
                    <label>Duration (months) *</label>
                    <input type="number" min="1" value={form.durationMonths} onChange={(e) => setField('durationMonths', e.target.value)} required />
                  </div>
                  {form.type === 'sessions' && (
                    <div className="form-group">
                      <label>Session limit</label>
                      <input type="number" min="1" value={form.sessionsLimit} onChange={(e) => setField('sessionsLimit', e.target.value)} placeholder="e.g. 12" />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Freeze limit (days)</label>
                    <input type="number" min="0" value={form.freezeLimitDays} onChange={(e) => setField('freezeLimitDays', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.hasCoach} onChange={(e) => setField('hasCoach', e.target.checked)} />
                      Includes coach
                    </label>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} />
                      Active (available for assignment)
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: ACCENT }} disabled={saving}>
                  {saving ? 'Saving…' : editPkg ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Package"
          message={`Delete "${deleteTarget.name}"? This cannot be undone. Packages assigned to members cannot be deleted.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
