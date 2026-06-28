import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { flSalesService, FL_BRANCHES, FL_CATEGORIES } from '../../services/flSalesService'
import { FL_MEMBERSHIP_TYPES } from '../../services/flMemberService'
import { today } from '../../services/storageService'
import ConfirmModal from '../../components/ConfirmModal'

const COLOR = '#a855f7'

function emptyForm(branchId = 'carleton') {
  return {
    date: today(),
    clientName: '',
    clientPhone: '',
    clientAge: '',
    branchId,
    category: 'membership',
    membershipType: '1month',
    description: '',
    amount: '',
  }
}

export default function FLSales() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sales, setSales]               = useState(() => flSalesService.getAll())
  const [showForm, setShowForm]         = useState(false)
  const [editSale, setEditSale]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm]                 = useState(() => emptyForm())

  const branchFilter   = searchParams.get('branch')   || ''
  const categoryFilter = searchParams.get('category') || ''
  const monthFilter    = searchParams.get('month')    || ''

  function refresh() { setSales(flSalesService.getAll()) }

  function openAdd() {
    setForm(emptyForm(branchFilter || 'carleton'))
    setEditSale(null)
    setShowForm(true)
  }

  function openEdit(sale) {
    setForm({ ...emptyForm(), ...sale })
    setEditSale(sale)
    setShowForm(true)
  }

  function set(field, value) {
    setForm((f) => {
      const u = { ...f, [field]: value }
      // Reset membershipType when switching away from membership category
      if (field === 'category' && value !== 'membership') {
        u.membershipType = ''
      }
      if (field === 'category' && value === 'membership') {
        u.membershipType = u.membershipType || '1month'
      }
      return u
    })
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.amount || !form.branchId) return
    if (editSale) {
      flSalesService.update(editSale.id, form)
    } else {
      flSalesService.create(form)
    }
    refresh()
    setShowForm(false)
    setEditSale(null)
  }

  const filtered = useMemo(() => sales.filter((s) => {
    const matchBranch   = !branchFilter   || s.branchId === branchFilter
    const matchCategory = !categoryFilter || s.category === categoryFilter
    const matchMonth    = !monthFilter    || s.date.startsWith(monthFilter)
    return matchBranch && matchCategory && matchMonth
  }), [sales, branchFilter, categoryFilter, monthFilter])

  const filteredTotal = filtered.reduce((sum, s) => sum + Number(s.amount), 0)
  const monthlySummary = flSalesService.getMonthlySummary()
  const months = [...new Set(sales.map((s) => s.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a))

  const sel = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '9px 12px', fontSize: 13,
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Sales</h2>
          <p className="text-muted text-sm">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · {filteredTotal.toLocaleString()} EGP
          </p>
        </div>
        <button className="btn btn-primary" style={{ background: COLOR }} onClick={openAdd}>
          + Record Sale
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select style={sel} value={branchFilter} onChange={(e) => {
          const p = {}
          if (e.target.value) p.branch = e.target.value
          if (categoryFilter) p.category = categoryFilter
          if (monthFilter) p.month = monthFilter
          setSearchParams(p)
        }}>
          <option value="">All Branches</option>
          {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select style={sel} value={categoryFilter} onChange={(e) => {
          const p = {}
          if (branchFilter) p.branch = branchFilter
          if (e.target.value) p.category = e.target.value
          if (monthFilter) p.month = monthFilter
          setSearchParams(p)
        }}>
          <option value="">All Categories</option>
          {FL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select style={sel} value={monthFilter} onChange={(e) => {
          const p = {}
          if (branchFilter) p.branch = branchFilter
          if (categoryFilter) p.category = categoryFilter
          if (e.target.value) p.month = e.target.value
          setSearchParams(p)
        }}>
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
        {(branchFilter || categoryFilter || monthFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>✕ Clear</button>
        )}
      </div>

      {/* Monthly breakdown */}
      {!branchFilter && !categoryFilter && !monthFilter && monthlySummary.length > 0 && (
        <>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Monthly Breakdown</h3>
          {monthlySummary.map((m) => (
            <div key={m.month} className="month-card">
              <div className="month-header">
                <div>
                  <div className="month-name">{m.label}</div>
                  <div className="text-muted text-sm">{m.count} transaction{m.count !== 1 ? 's' : ''}</div>
                </div>
                <div className="month-total" style={{ color: COLOR }}>{m.total.toLocaleString()} EGP</div>
              </div>
              {FL_BRANCHES.map((b) => {
                const val = m.byBranch[b.id] || 0
                if (!val) return null
                return (
                  <div key={b.id} className="session-row">
                    <span className="s-label">{b.icon} {b.label}</span>
                    <span className="s-val">{val.toLocaleString()} EGP</span>
                  </div>
                )
              })}
            </div>
          ))}
          <h3 style={{ fontWeight: 700, margin: '28px 0 16px' }}>All Transactions</h3>
        </>
      )}

      {/* Transactions table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">💰</div><p>No sales found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Client</th><th>Phone</th><th>Branch</th>
                  <th>Category</th><th>Package</th><th>Amount</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const branch   = FL_BRANCHES.find((b) => b.id === s.branchId)
                  const category = FL_CATEGORIES.find((c) => c.id === s.category)
                  const pkg      = FL_MEMBERSHIP_TYPES.find((t) => t.id === s.membershipType)
                  return (
                    <tr key={s.id}>
                      <td className="text-muted">
                        {new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span
                          style={{ fontWeight: 600, cursor: s.memberId ? 'pointer' : 'default', color: s.memberId ? COLOR : 'inherit' }}
                          onClick={() => s.memberId && navigate(`/fl/members/${s.memberId}`)}
                        >
                          {s.clientName || '—'}
                        </span>
                      </td>
                      <td className="text-muted">{s.clientPhone || '—'}</td>
                      <td className="text-muted">{branch?.label || '—'}</td>
                      <td className="text-muted">{category?.label || s.category || '—'}</td>
                      <td className="text-muted">{pkg?.label || '—'}</td>
                      <td style={{ fontWeight: 700, color: COLOR }}>{Number(s.amount).toLocaleString()} EGP</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13 }}>Total</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 15, color: COLOR }}>
                    {filteredTotal.toLocaleString()} EGP
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editSale ? 'Edit Sale' : 'Record New Sale'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">

                  {/* Date & Branch */}
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Branch *</label>
                    <select value={form.branchId} onChange={(e) => set('branchId', e.target.value)} required>
                      <option value="">— Select Branch —</option>
                      {FL_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.label}</option>)}
                    </select>
                  </div>

                  {/* Client info */}
                  <div className="form-group">
                    <label>Client Name</label>
                    <input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="e.g. Ahmed Hassan" />
                  </div>
                  <div className="form-group">
                    <label>Client Phone</label>
                    <input value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} placeholder="e.g. 01012345678" />
                  </div>
                  <div className="form-group">
                    <label>Client Age</label>
                    <input type="number" value={form.clientAge} onChange={(e) => set('clientAge', e.target.value)} placeholder="e.g. 25" min="3" max="100" />
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                      {FL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Membership type — only for membership category */}
                  {form.category === 'membership' && (
                    <div className="form-group">
                      <label>Membership Package</label>
                      <select value={form.membershipType} onChange={(e) => set('membershipType', e.target.value)}>
                        {FL_MEMBERSHIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Description */}
                  <div className="form-group full">
                    <label>Description</label>
                    <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Monthly membership, PT session..." />
                  </div>

                  {/* Amount */}
                  <div className="form-group">
                    <label>Amount (EGP) *</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => set('amount', e.target.value)}
                      placeholder="e.g. 500"
                      min="0"
                      required
                      style={{ fontSize: 16, fontWeight: 700 }}
                    />
                  </div>

                  {/* Info banner when membership */}
                  {form.category === 'membership' && form.clientName && form.membershipType && (
                    <div className="form-group full">
                      <div style={{
                        background: 'rgba(168,85,247,0.08)',
                        border: '1px solid rgba(168,85,247,0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        fontSize: 13,
                        color: COLOR,
                      }}>
                        👤 <strong>{form.clientName}</strong> will be added/updated as a member at{' '}
                        <strong>{FL_BRANCHES.find(b => b.id === form.branchId)?.label}</strong> with a{' '}
                        <strong>{FL_MEMBERSHIP_TYPES.find(t => t.id === form.membershipType)?.label}</strong> package.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: COLOR }}>
                  {editSale ? 'Save Changes' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Sale"
          message={`Delete this ${Number(deleteTarget.amount).toLocaleString()} EGP transaction from ${FL_BRANCHES.find(b => b.id === deleteTarget.branchId)?.label}? The member record will not be deleted.`}
          onConfirm={() => { flSalesService.delete(deleteTarget.id); refresh() }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
