import React, { useEffect, useState } from 'react'
import authService from '../../services/authService'

const ACCENT = '#0ea5e9'

const ABILITY_LABELS = {
  canCommentOnMembers: {
    label: 'Comment on members',
    description: 'Allow writing notes and comments on member profiles',
  },
  canRequestAssignment: {
    label: 'Request new members',
    description: 'Allow requesting to acquire unassigned members',
  },
  canRequestTakeover: {
    label: 'Request replacement',
    description: 'Allow requesting to replace another sales representative',
  },
}

function AbilityToggle({ id, label, description, enabled, onChange, disabled }) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        style={{
          width: 48,
          height: 26,
          borderRadius: 999,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: enabled ? ACCENT : 'var(--border)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 25 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}

export default function SalesRepProfile({ repId, readOnly = false, onBack }) {
  const [profile, setProfile] = useState(null)
  const [abilities, setAbilities] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await authService.getUser(repId)
        setProfile(data)
        setAbilities(data.abilities || {})
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [repId])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const data = await authService.updateAbilities(repId, abilities)
      setProfile(data.user)
      setAbilities(data.user.abilities)
      setMessage('Permissions saved successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleToggle(key, value) {
    setAbilities((prev) => ({ ...prev, [key]: value }))
    setMessage('')
  }

  if (loading) {
    return <div className="page"><div className="empty"><p>Loading profile…</p></div></div>
  }

  if (error && !profile) {
    return (
      <div className="page">
        {onBack && (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>
            ← Back to team
          </button>
        )}
        <div className="auth-error"><span>⚠</span> {error}</div>
      </div>
    )
  }

  return (
    <div className="page">
      {onBack && (
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={onBack}>
          ← Back to team
        </button>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div
            className="avatar"
            style={{
              width: 56,
              height: 56,
              fontSize: 22,
              borderColor: ACCENT,
              color: ACCENT,
              background: `${ACCENT}15`,
            }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>
        </div>
        <span className="badge badge-active">{profile.role}</span>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}
      {message && <div className="text-sm" style={{ marginBottom: 16, color: ACCENT }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Profile Details</div>
          </div>
          <div className="form-grid">
            <div>
              <div className="text-sm text-muted">Email</div>
              <div>{profile.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Monthly Target</div>
              <div>{profile.monthlyTarget ? `${profile.monthlyTarget.toLocaleString()} EGP` : 'Not set'}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Joined</div>
              <div>
                {profile.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="card-title">Permissions</div>
              <div className="text-sm text-muted">
                {readOnly
                  ? 'Your current permissions as set by your sales manager'
                  : 'Control what this representative can do in the sales portal'}
              </div>
            </div>
            {!readOnly && (
              <button
                className="btn btn-primary btn-sm"
                style={{ background: ACCENT }}
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>

          {Object.entries(ABILITY_LABELS).map(([key, meta]) => (
            <AbilityToggle
              key={key}
              id={key}
              label={meta.label}
              description={meta.description}
              enabled={abilities?.[key] !== false}
              disabled={readOnly || saving}
              onChange={(value) => handleToggle(key, value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export { ABILITY_LABELS, AbilityToggle }
