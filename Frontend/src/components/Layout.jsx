import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

const NAV = {
  Receptionist:  [{ to: '/members', label: 'Members' }, { to: '/checkin', label: 'Check In' }],
  Sales:         [{ to: '/sales/dashboard', label: 'Dashboard' }, { to: '/sales/members', label: 'Members' }, { to: '/sales/requests', label: 'Requests' }, { to: '/checkin', label: 'Check In' }],
  'Sales Manager': [{ to: '/sales/dashboard', label: 'Dashboard' }, { to: '/members', label: 'All Members' }, { to: '/sales/requests', label: 'Requests' }, { to: '/sales/team', label: 'Team' }, { to: '/sales/staff', label: 'Staff' }, { to: '/sales/callcenter', label: 'Call Center' }, { to: '/checkin', label: 'Check In' }],
  Owner:         [{ to: '/sales/dashboard', label: 'Dashboard' }, { to: '/members', label: 'Members' }, { to: '/sales/requests', label: 'Requests' }, { to: '/sales/team', label: 'Team' }, { to: '/sales/staff', label: 'Staff' }, { to: '/sales/callcenter', label: 'Call Center' }, { to: '/checkin', label: 'Check In' }],
};

function ini(name = '') { return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'; }

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mob, setMob]         = useState(false);
  const [drop, setDrop]       = useState(false);
  const dropRef               = useRef(null);
  const items                 = NAV[user?.role] ?? NAV.Receptionist;
  const showNotifications     = ['Sales', 'Sales Manager'].includes(user?.role);

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mob ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mob]);

  const logout = () => { signOut(); navigate('/'); };

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── NAV BAR ──────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--navy)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', height: 52, gap: 0 }}>

          {/* Logo */}
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0, marginRight: 36 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>FlamFactory</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>GYM</span>
          </div>

          {/* Desktop links */}
          <nav id="desk-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {items.map(item => (
              <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <span style={{
                    display: 'inline-block', padding: '5px 12px', borderRadius: 5,
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.50)',
                    background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.12s',
                    borderBottom: `2px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                  }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; e.currentTarget.style.background = 'transparent'; } }}
                  >{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Global search — centered between nav and profile */}
          <div id="desk-nav" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <GlobalSearch />
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

            {showNotifications && <NotificationBell />}

            {/* Profile */}
            <div ref={dropRef} style={{ position: 'relative' }}>
              <button onClick={() => setDrop(p => !p)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6, padding: '5px 10px 5px 6px', cursor: 'pointer', transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => { if (!drop) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              >
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {ini(user?.name)}
                </div>
                <div id="prof-text" style={{ textAlign: 'left', lineHeight: 1.25 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{user?.role}</div>
                </div>
                <svg id="prof-arrow" width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'rgba(255,255,255,0.35)', transition: 'transform 0.15s', transform: drop ? 'rotate(180deg)' : 'none' }}>
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {drop && (
                <div className="fade-up" style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 7, width: 196, padding: 4,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                  zIndex: 100,
                }}>
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--bg)', marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{user?.role}</p>
                  </div>
                  <button onClick={logout} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 5, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--red)', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile burger */}
            <button id="mob-btn" onClick={() => setMob(true)} style={{ display: 'none', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, width: 34, height: 34, cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }} aria-label="Menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ────────────────────────────────────────── */}
      {mob && <div onClick={() => setMob(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }} />}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 100,
        background: 'var(--navy)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transform: mob ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.24s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(15,23,42,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>FlamFactory</span>
          </div>
          <button onClick={() => setMob(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 5, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {/* Mobile search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <GlobalSearch />
        </div>
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setMob(false)} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  padding: '10px 12px', borderRadius: 6, margin: '2px 0',
                  background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.50)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                }}>{item.label}</div>
              )}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ini(user?.name)}</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{user?.role}</p>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '9px 12px', borderRadius: 6, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>{children}</main>

      <style>{`
        @media (max-width: 767px) {
          #desk-nav   { display: none !important; }
          #mob-btn    { display: flex !important; }
          #prof-text  { display: none !important; }
          #prof-arrow { display: none !important; }
        }
      `}</style>
    </div>
  );
}
