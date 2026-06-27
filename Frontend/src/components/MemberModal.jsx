import React, { useState, useEffect } from 'react'
import { FITACADEMY_CONFIG, FIGHTLOCATION_CONFIG } from '../services/storageService'

const EMPTY = {
  name: '',
  phone: '',
  age: '',
  session: 'crossfit_adults',
  branch: 'carleton',
  program: 'hustle',
  membershipMode: 'time',
  membershipType: 'monthly',
  membershipStart: '',
  membershipEnd: '',
  sessionPackage: '12',
  sessionsTotal: 12,
  pricePerSession: '',
  price: '',
  notes: '',
}

export default function MemberModal({ member, onSave, onClose, systemId }) {
  const [form, setForm] = useState(EMPTY)

  const isFight  = systemId === 'fightlocation'
  const isHustle = !isFight
  const config   = isFight ? FIGHTLOCATION_CONFIG : FITACADEMY_CONFIG

  useEffect(() => {
    if (member) {
      setForm({
        ...EMPTY,
        ...member,
        membershipMode: member.membershipMode || 'time',
        sessionPackage: member.sessionsTotal ? String(member.sessionsTotal) : '12',
        pricePerSession: member.sessionsTotal && member.price
          ? (Number(member.price) / Number(member.sessionsTotal)).toFixed(0)
          : '',
      })
    } else {
      const todayStr = new Date().toISOString().slice(0, 10)
      setForm({ ...EMPTY, membershipStart: todayStr })
    }
  }, [member])

  function set(field, value) {
    setForm((f) => {
      const updated = { ...f, [field]: value }

      if (field === 'membershipStart' || field === 'membershipType') {
        const start = field === 'membershipStart' ? value : f.membershipStart
        const type  = field === 'membershipType'  ? value : f.membershipType
        if (start && f.membershipMode === 'time') {
          const d = new Date(start)
          const typeObj = config.membershipTypes.find((t) => t.id === type)
          const legacyMap = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 }
          const addMonths = typeObj?.months ?? legacyMap[type] ?? 1
          d.setMonth(d.getMonth() + addMonths)
          updated.membershipEnd = d.toISOString().slice(0, 10)
        }
      }

      if (field === 'sessionPackage') {
        const pkg = config.sessionPackages?.find((p) => p.id === value)
        if (pkg && pkg.count) {
          updated.sessionsTotal = pkg.count
          if (f.pricePerSession) {
            updated.price = (Number(f.pricePerSession) * pkg.count).toString()
          }
        }
      }

      if (field === 'pricePerSession') {
        const total = updated.sessionsTotal || f.sessionsTotal
        if (total && value) {
          updated.price = (Number(value) * Number(total)).toString()
        }
      }

      if (field === 'price' && f.membershipMode === 'sessions') {
        const total = updated.sessionsTotal || f.sessionsTotal
        if (total && value) {
          updated.pricePerSession = (Number(value) / Number(total)).toFixed(0)
        }
      }

      if (field === 'sessionsTotal' && f.pricePerSession) {
        updated.price = (Number(f.pricePerSession) * Number(value)).toString()
      }

      return updated
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  const isSessionMode = form.membershipMode === 'sessions'

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{member ? 'Edit Member' : 'Add New Member'}</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">

              {/* Personal */}
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Ahmed Hassan"
                  required
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
                <label>Age</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                  placeholder="e.g. 25"
                  min="3" max="100"
                />
              </div>

              {/* FitAcademy: session */}
              {!isFight && (
                <div className="form-group">
                  <label>Session</label>
                  <select value={form.session} onChange={(e) => set('session', e.target.value)}>
                    {config.sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              )}

              {/* FightLocation: branch + program */}
              {isFight && (
                <>
                  <div className="form-group">
                    <label>Branch</label>
                    <select value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                      {config.branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Program</label>
                    <select value={form.program} onChange={(e) => set('program', e.target.value)}>
                      {config.programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Membership mode — Flame Factory only */}
              {isHustle && (
                <div className="form-group full">
                  <label>Membership Mode</label>
                  <div className="mode-toggle">
                    {[
                      { id: 'time',     label: 'Time-Based' },
                      { id: 'sessions', label: 'Session Package' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`mode-btn${form.membershipMode === m.id ? ' active' : ''}`}
                        onClick={() => set('membershipMode', m.id)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time-based fields */}
              {!isSessionMode && (
                <>
                  <div className="form-group">
                    <label>Membership Type</label>
                    <select value={form.membershipType} onChange={(e) => set('membershipType', e.target.value)}>
                      {config.membershipTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Price (EGP)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                      placeholder="e.g. 500"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.membershipStart} onChange={(e) => set('membershipStart', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={form.membershipEnd} onChange={(e) => set('membershipEnd', e.target.value)} />
                  </div>
                </>
              )}

              {/* Session package fields */}
              {isSessionMode && (
                <>
                  <div className="form-group">
                    <label>Package</label>
                    <select value={form.sessionPackage} onChange={(e) => set('sessionPackage', e.target.value)}>
                      {config.sessionPackages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Number of Sessions</label>
                    <input
                      type="number"
                      value={form.sessionsTotal}
                      onChange={(e) => set('sessionsTotal', e.target.value)}
                      placeholder="e.g. 12"
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Price per Session (EGP)</label>
                    <input
                      type="number"
                      value={form.pricePerSession}
                      onChange={(e) => set('pricePerSession', e.target.value)}
                      placeholder="e.g. 50"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Price (EGP)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                      placeholder="Auto-calculated"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.membershipStart} onChange={(e) => set('membershipStart', e.target.value)} />
                  </div>
                  {form.sessionsTotal && form.price && (
                    <div className="form-group full">
                      <div className="session-summary">
                        <span>{form.sessionsTotal} sessions</span>
                        <span style={{ fontWeight: 700 }}>{Number(form.price).toLocaleString()} EGP total</span>
                        {form.pricePerSession && (
                          <span>{Number(form.pricePerSession).toLocaleString()} EGP / session</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-group full">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {member ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
