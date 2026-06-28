import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystem } from '../context/SystemContext'

export default function SystemSwitcher() {
  const { switchSystem } = useSystem()
  const navigate = useNavigate()

  function handleSwitch(id) {
    switchSystem(id)
    navigate(id === 'fightlocation' ? '/fl' : '/', { replace: true })
  }

  return (
    <div className="switcher-page">
      <div className="switcher-hero">
        <h1>Welcome back</h1>
        <p>Select a system to continue</p>
      </div>

      <div className="switcher-grid">
        <SystemCard
          icon="🔥"
          name="Flame Factory"
          tagline="Fitness Academy"
          description="CrossFit Adults · CrossFit Kids · Calisthenics"
          color="#f97316"
          onClick={() => handleSwitch('fitacademy')}
        />
        <SystemCard
          icon="🥊"
          name="FightLocation"
          tagline="Fight & Fitness Centers"
          description="Carleton · My Fair · Central Park"
          color="#a855f7"
          onClick={() => handleSwitch('fightlocation')}
        />
      </div>
    </div>
  )
}

function SystemCard({ icon, name, tagline, description, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="system-card"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div className="system-card-icon">{icon}</div>
      <div className="system-card-name" style={{ color }}>{name}</div>
      <div className="system-card-tagline">{tagline}</div>
      <div className="system-card-desc">{description}</div>
      <div className="system-card-cta" style={{ color }}>Open →</div>
    </button>
  )
}
