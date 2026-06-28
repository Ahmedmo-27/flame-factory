import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSystem } from '../context/SystemContext'
import Navbar from '../components/Navbar'
import ExpiryAlert from '../components/ExpiryAlert'

// Flame Factory pages
import Dashboard     from '../pages/Dashboard'
import Members       from '../pages/Members'
import MemberProfile from '../pages/MemberProfile'
import Attendance    from '../pages/Attendance'
import Sales         from '../pages/Sales'
import Guests        from '../pages/Guests'

// FightLocation pages
import FLDashboard     from '../pages/fl/FLDashboard'
import FLSales         from '../pages/fl/FLSales'
import FLMembers       from '../pages/fl/FLMembers'
import FLMemberProfile from '../pages/fl/FLMemberProfile'
import FLLeads         from '../pages/fl/FLLeads'
import FLExpiryAlert   from '../components/FLExpiryAlert'

import SystemSwitcher from '../pages/SystemSwitcher'

export default function AppRoutes() {
  const { activeSystem, SYSTEMS } = useSystem()

  // Sync --accent CSS variable with active system color
  useEffect(() => {
    if (!activeSystem) return
    const color = SYSTEMS[activeSystem]?.color
    if (color) {
      document.documentElement.style.setProperty('--accent', color)
      document.documentElement.style.setProperty('--accent-dark',   shadeColor(color, -20))
      document.documentElement.style.setProperty('--accent-muted',  hexToRgba(color, 0.08))
      document.documentElement.style.setProperty('--accent-border', hexToRgba(color, 0.25))
    }
  }, [activeSystem])

  if (!activeSystem) return <SystemSwitcher />

  const isFight = activeSystem === 'fightlocation'

  return (
    <div className="layout">
      <Navbar />

      <div className="main">
        {isFight ? (
          <>
            <FLExpiryAlert />
            <Routes>
              <Route path="/fl"             element={<FLDashboard />} />
              <Route path="/fl/sales"       element={<FLSales />} />
              <Route path="/fl/members"     element={<FLMembers />} />
              <Route path="/fl/members/:id" element={<FLMemberProfile />} />
              <Route path="/fl/leads"       element={<FLLeads />} />
              <Route path="*"               element={<Navigate to="/fl" replace />} />
            </Routes>
          </>
        ) : (
          <>
            <ExpiryAlert />
            <Routes>
              <Route path="/"            element={<Dashboard />} />
              <Route path="/members"     element={<Members />} />
              <Route path="/members/:id" element={<MemberProfile />} />
              <Route path="/attendance"  element={<Attendance />} />
              <Route path="/sales"       element={<Sales />} />
              <Route path="/guests"      element={<Guests />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  )
}

/* ── helpers ── */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, Math.max(0, (num >> 16) + amt))
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`
}
