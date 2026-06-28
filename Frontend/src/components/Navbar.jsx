import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSystem } from '../context/SystemContext'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../hooks/useStore'
import { useGlobalSearch } from '../hooks/useGlobalSearch'

/* ── nav configs ── */
const FLAME_FACTORY_NAV = [
  { path: '/',          label: 'Dashboard'  },
  { path: '/sales',     label: 'Sales'      },
  { path: '/members',   label: 'Members'    },
  { path: '/guests',    label: 'Guests'     },
  { path: '/attendance',label: 'Activity'   },
  { divider: true },
  { path: '/members?session=crossfit_adults', label: 'CrossFit Adults' },
  { path: '/members?session=crossfit_kids',   label: 'CrossFit Kids'   },
  { path: '/members?session=calisthenics',    label: 'Calisthenics'    },
]

const FIGHTLOCATION_NAV = [
  { path: '/fl',         label: 'Dashboard' },
  { path: '/fl/sales',   label: 'Sales'     },
  { path: '/fl/members', label: 'Members'   },
  { path: '/fl/leads',   label: 'Leads'     },
  { divider: true },
  { path: '/fl/members?branch=carleton',    label: 'Carleton'     },
  { path: '/fl/members?branch=my_fair',     label: 'My Fair'      },
  { path: '/fl/members?branch=central_park',label: 'Central Park' },
]

export default function Navbar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { activeSystem, exitSystem, SYSTEMS } = useSystem()
  const { store, isFight, groups } = useStore()

  const system = SYSTEMS[activeSystem]
  const nav    = activeSystem === 'fightlocation' ? FIGHTLOCATION_NAV : FLAME_FACTORY_NAV

  const search = useGlobalSearch({ store, isFight, groups })
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function isActive(path) {
    const [p, q] = path.split('?')
    if (q) return location.pathname === p && location.search === '?' + q
    if (p === '/' || p === '/fl') return location.pathname === p && !location.search
    return location.pathname === p && !location.search
  }

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <span className="navbar-brand-icon">{system?.icon}</span>
        <div className="navbar-brand-text">
          <span className="navbar-brand-name" style={{ color: system?.color }}>{system?.name}</span>
          <span className="navbar-brand-sub">{system?.tagline}</span>
        </div>
      </div>

      <div className="navbar-divider" />

      {/* Nav links */}
      <div className="navbar-nav">
        {nav.map((item, i) => {
          if (item.divider) return <div key={i} className="navbar-divider" />
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              className={`nav-item${active ? ' active' : ''}`}
              style={active ? { color: system?.color, background: `${system?.color}12` } : {}}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Global search */}
      <div className="navbar-search">
        <span className="navbar-search-icon">⌕</span>
        <input
          ref={search.inputRef}
          className="navbar-search-input"
          placeholder="Search members…"
          value={search.query}
          onChange={(e) => { search.setQuery(e.target.value); search.setOpen(true) }}
          onFocus={() => { if (search.query) search.setOpen(true) }}
          onKeyDown={search.handleKeyDown}
          autoComplete="off"
        />

        {search.open && search.query.trim() && (
          <div className="navbar-search-dropdown" ref={search.dropRef}>
            {search.results.length === 0 ? (
              <div className="search-no-results">No members found for "{search.query}"</div>
            ) : (
              <>
                {search.results.map((r, i) => (
                  <div
                    key={r.id}
                    className={`search-result-item${i === search.idx ? ' highlighted' : ''}`}
                    onClick={() => search.go(r.path)}
                    onMouseEnter={() => search.setIdx(i)}
                  >
                    <div
                      className="avatar"
                      style={{
                        width: 30, height: 30, fontSize: 12,
                        color: system?.color,
                        background: `${system?.color}14`,
                        borderColor: `${system?.color}40`,
                      }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="search-result-name">{r.name}</div>
                      <div className="search-result-meta">
                        {r.label}{r.phone ? ` · ${r.phone}` : ''}
                        {' · '}<span className={`badge badge-${r.status}`} style={{ fontSize: 10, padding: '1px 6px' }}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="search-footer">↑↓ navigate · Enter to open · Esc to close</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="navbar-right">
        {user && (
          <div className="navbar-user">
            <div className="navbar-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="navbar-user-name">{user.name}</span>
          </div>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { exitSystem(); navigate('/') }}
          title="Switch System"
        >
          ⇄ Switch
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
