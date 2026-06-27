import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSalesManagerRole } from '../utils/roles'

const ACCENT = '#0ea5e9'

const SALES_NAV = [
  { path: '/sales/dashboard', label: 'Dashboard' },
  { path: '/sales/members', label: 'Members' },
  { path: '/sales/requests', label: 'My Requests' },
  { path: '/sales/profile', label: 'My Profile' },
]

const MANAGER_NAV = [
  { path: '/sales-manager/dashboard', label: 'Dashboard' },
  { path: '/sales-manager/team', label: 'Team' },
  { path: '/sales-manager/packages', label: 'Packages' },
  { path: '/sales-manager/requests', label: 'Requests' },
  { path: '/sales-manager/members', label: 'Members' },
]

export default function SalesNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const isManager = isSalesManagerRole(user?.role)
  const nav = isManager ? MANAGER_NAV : SALES_NAV
  const title = isManager ? 'Sales Manager' : 'Sales Portal'
  const subtitle = isManager ? 'Team oversight & approvals' : 'Revenue & member assignments'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function isActive(path) {
    return location.pathname === path
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-brand-icon">{isManager ? '📊' : '🎯'}</span>
        <div className="navbar-brand-text">
          <span className="navbar-brand-name" style={{ color: ACCENT }}>{title}</span>
          <span className="navbar-brand-sub">{subtitle}</span>
        </div>
      </div>

      <div className="navbar-divider" />

      <div className="navbar-nav">
        {nav.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              className={`nav-item${active ? ' active' : ''}`}
              style={active ? { color: ACCENT, background: `${ACCENT}12` } : {}}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="navbar-right" style={{ marginLeft: 'auto' }}>
        {user && (
          <div className="navbar-user">
            <div className="navbar-user-avatar" style={{ background: `${ACCENT}18`, color: ACCENT }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="navbar-user-name">{user.name}</div>
              <div className="text-muted text-sm">{user.role}</div>
            </div>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Sign out">
          Sign out
        </button>
      </div>
    </nav>
  )
}
