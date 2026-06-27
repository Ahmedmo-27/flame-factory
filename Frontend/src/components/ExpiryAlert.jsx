import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'

export default function ExpiryAlert() {
  const { store } = useStore()
  const navigate  = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const alerts = useMemo(() => {
    const members = store.memberService.getAll()
    const list = []

    members.forEach((m) => {
      if (m.frozen) return

      if (m.membershipMode === 'sessions'){
        const rem = m.sessionsRemaining ?? 0
        if (rem <= 2 && rem > 0) {
          list.push({ id: m.id, name: m.name, detail: `${rem} session${rem !== 1 ? 's' : ''} left`, urgent: rem <= 1 })
        } else if (rem === 0) {
          list.push({ id: m.id, name: m.name, detail: 'No sessions left', urgent: true })
        }
        return
      }

      if (!m.membershipEnd) return
      const todayMs = new Date().setHours(0, 0, 0, 0)
      const endMs   = new Date(m.membershipEnd).setHours(0, 0, 0, 0)
      const diff    = Math.ceil((endMs - todayMs) / 86400000)

      if (diff <= 7 && diff >= 0) {
        list.push({
          id: m.id, name: m.name,
          detail: diff === 0 ? 'Expires today' : `${diff}d left`,
          urgent: diff <= 2,
        })
      } else if (diff < 0) {
        list.push({ id: m.id, name: m.name, detail: `Expired ${Math.abs(diff)}d ago`, urgent: true })
      }
    })

    return list.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.name.localeCompare(b.name))
  }, [store])

  if (alerts.length === 0 || dismissed) return null

  const urgentCount = alerts.filter((a) => a.urgent).length
  const severity    = urgentCount > 0 ? 'urgent' : 'warning'

  return (
    <div className={`expiry-alert ${severity}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="expiry-alert-title">
          {alerts.length} member{alerts.length !== 1 ? 's' : ''} need attention
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {alerts.map((a) => (
            <button
              key={a.id}
              className={`expiry-chip ${a.urgent ? 'urgent' : 'warning'}`}
              onClick={() => navigate(`/members/${a.id}`)}
            >
              <span>{a.name}</span>
              <span style={{ opacity: 0.7, fontWeight: 400 }}>· {a.detail}</span>
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '2px 4px',
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
