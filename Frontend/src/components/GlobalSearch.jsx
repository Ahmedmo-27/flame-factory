import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAllMembers } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';
import AddMemberModal from './AddMemberModal';

const STATUS_DOT = {
  active:  '#16a34a',
  frozen:  '#0284c7',
  expired: '#dc2626',
  guest:   '#94a3b8',
};

export default function GlobalSearch() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const phoneRef  = useRef(null);
  const idRef     = useRef(null);
  const wrapRef   = useRef(null);
  const cacheRef  = useRef(null); // cached members list

  const [phoneQuery, setPhoneQuery] = useState('');
  const [idQuery, setIdQuery]       = useState('');
  const [results,  setResults]      = useState([]);
  const [open,     setOpen]         = useState(false);
  const [cursor,   setCursor]       = useState(-1);
  const [showAdd,  setShowAdd]      = useState(false);
  const [activeField, setActiveField] = useState('phone'); // 'phone' or 'id'

  const canAdd = ['Receptionist', 'Owner', 'Sales', 'Sales Manager'].includes(user?.role);

  // Fetch members once and cache
  const loadCache = useCallback(async () => {
    if (cacheRef.current) return cacheRef.current;
    try {
      const res = await searchAllMembers();
      cacheRef.current = res.data.members ?? [];
      return cacheRef.current;
    } catch {
      return [];
    }
  }, []);

  // Preload cache on mount
  useEffect(() => { loadCache(); }, [loadCache]);

  // Invalidate cache every 60s so new members show up
  useEffect(() => {
    const interval = setInterval(() => { cacheRef.current = null; }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter locally — instant
  const doSearch = useCallback((q, field) => {
    if (!q) { setResults([]); setOpen(false); setCursor(-1); return; }
    const all = cacheRef.current ?? [];
    let matched;
    if (field === 'id') {
      matched = all.filter(m =>
        String(m.systemId) === q ||
        String(m.memberId) === q
      ).slice(0, 8);
    } else {
      matched = all.filter(m =>
        m.phones?.includes(q)
      ).slice(0, 8);
    }
    setResults(matched);
    setOpen(matched.length > 0 || canAdd);
    setCursor(-1);
  }, [canAdd]);

  // React to input changes
  useEffect(() => {
    const q = (activeField === 'phone' ? phoneQuery : idQuery).trim();
    if (!q) { setResults([]); setOpen(false); setCursor(-1); return; }
    // If cache not loaded yet, load then search
    if (!cacheRef.current) {
      loadCache().then(() => doSearch(q, activeField));
    } else {
      doSearch(q, activeField);
    }
  }, [phoneQuery, idQuery, activeField, doSearch, loadCache]);

  // Close on outside click
  useEffect(() => {
    const h = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        phoneRef.current?.focus();
        phoneRef.current?.select();
      }
      if (e.key === 'Escape') { setOpen(false); phoneRef.current?.blur(); idRef.current?.blur(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && results[cursor]) { go(results[cursor]); }
      else if (results.length > 0) { go(results[0]); }
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
  };

  const go = useCallback(member => {
    navigate(`/members/${member.systemId}`);
    setPhoneQuery(''); setIdQuery(''); setOpen(false); setCursor(-1);
    phoneRef.current?.blur(); idRef.current?.blur();
  }, [navigate]);

  const openAddModal = () => {
    setOpen(false);
    setShowAdd(true);
    phoneRef.current?.blur();
    idRef.current?.blur();
  };

  const highlight = (text, q) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(37,99,235,0.18)', color: 'var(--navy)', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const displayQuery = activeField === 'phone' ? phoneQuery.trim() : idQuery.trim();

  const inputStyle = {
    width: '100%', paddingLeft: 28, paddingRight: 8,
    paddingTop: 6, paddingBottom: 6,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 6, fontSize: 13,
    color: '#fff',
    outline: 'none', fontFamily: 'inherit',
    transition: 'background 0.15s, border-color 0.15s',
  };

  return (
    <div ref={wrapRef} className="global-search-wrap" style={{ position: 'relative', display: 'flex', gap: 6, flex: '0 1 380px' }}>
      {/* Phone Search */}
      <div style={{ position: 'relative', flex: 1 }}>
        <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <input
          ref={phoneRef}
          type="text"
          value={phoneQuery}
          onChange={e => { setPhoneQuery(e.target.value); setActiveField('phone'); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { setActiveField('phone'); if (results.length > 0 && phoneQuery.trim()) setOpen(true); }}
          placeholder="Phone…"
          autoComplete="off"
          style={inputStyle}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.background = 'rgba(255,255,255,0.08)'; }}
        />
      </div>

      {/* ID Search */}
      <div style={{ position: 'relative', flex: 1 }}>
        <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 4h16v16H4z"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 14h6"/>
        </svg>
        <input
          ref={idRef}
          type="text"
          value={idQuery}
          onChange={e => { setIdQuery(e.target.value); setActiveField('id'); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { setActiveField('id'); if (results.length > 0 && idQuery.trim()) setOpen(true); }}
          placeholder="ID…"
          autoComplete="off"
          style={inputStyle}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.background = 'rgba(255,255,255,0.08)'; }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="global-search-dropdown dropdown-panel" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 360, background: '#fff',
          border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 32px rgba(15,23,42,0.16)',
          zIndex: 200, overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            <div>
              <div style={{ padding: '20px 16px', textAlign: 'center', borderBottom: canAdd ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>
                  No member found for "{displayQuery}"
                </p>
                <p style={{ fontSize: 12, color: 'var(--t4)' }}>
                  No results matching this {activeField === 'phone' ? 'phone number' : 'ID'}.
                </p>
              </div>
              {canAdd && (
                <button
                  onMouseDown={openAddModal}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', border: 'none', background: '#fff',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--navy)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700,
                  }}>+</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                      Add new person
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                      Create a guest profile or assign a package
                    </div>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <>
              {results.map((m, i) => {
                const sub = m.subscriptions?.at(-1);
                const pkg = sub?.package;
                const isActive = i === cursor;
                const q = displayQuery.toLowerCase();
                return (
                  <div
                    key={m._id}
                    onMouseDown={() => go(m)}
                    onMouseEnter={() => setCursor(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px',
                      background: isActive ? 'var(--bg)' : '#fff',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <Avatar name={m.name} size="sm" photo={m.photo} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{m.name}</span>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[m.status] ?? '#94a3b8', flexShrink: 0 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--t4)' }}>
                        <span style={{ fontFamily: 'monospace' }}>#{highlight(String(m.systemId), q)}{m.memberId ? ` / M${highlight(String(m.memberId), q)}` : ''}</span>
                        {m.phones && <span>{highlight(m.phones, q)}</span>}
                        {pkg && <span style={{ color: 'var(--t3)' }}>{pkg.name}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--t4)', flexShrink: 0 }}>→</span>
                  </div>
                );
              })}

              {canAdd && (
                <button
                  onMouseDown={openAddModal}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', border: 'none',
                    background: '#fff', borderTop: '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--bg)', border: '1px dashed var(--border-md)', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>+</div>
                  <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>Add new person…</span>
                </button>
              )}

              <div style={{ padding: '7px 12px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--t4)' }}>
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>Esc close</span>
                <span style={{ marginLeft: 'auto' }}>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Person Modal */}
      {showAdd && (
        <AddMemberModal
          open={showAdd}
          onClose={() => { setShowAdd(false); setPhoneQuery(''); setIdQuery(''); }}
          onSuccess={(systemId) => { setShowAdd(false); setPhoneQuery(''); setIdQuery(''); if (systemId) navigate(`/members/${systemId}`); }}
          initialPhone={activeField === 'phone' ? phoneQuery.trim() : ''}
        />
      )}
    </div>
  );
}
