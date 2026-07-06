import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMembers, getPackages, getSalesUsers, createMember } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import { Input, Select, Btn, Spinner } from './ui';

const STATUS_DOT = {
  active:  '#16a34a',
  frozen:  '#0284c7',
  expired: '#dc2626',
  guest:   '#94a3b8',
};

export default function GlobalSearch() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [cursor,   setCursor]   = useState(-1);
  const [showAdd,  setShowAdd]  = useState(false);

  const canAdd = ['Receptionist', 'Owner', 'Sales', 'Sales Manager'].includes(user?.role);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) { setResults([]); setOpen(false); setCursor(-1); return; }

    let cancelled = false;
    getAllMembers({ search: q, limit: 8, page: 1 })
      .then(res => {
        if (cancelled) return;
        const matched = res.data.members ?? [];
        setResults(matched);
        setOpen(true);
        setCursor(-1);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

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
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleKeyDown = e => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
    if (e.key === 'Enter' && cursor >= 0) { go(results[cursor]); }
  };

  const go = useCallback(member => {
    navigate(`/members/${member.systemId}`);
    setQuery(''); setOpen(false); setCursor(-1);
    inputRef.current?.blur();
  }, [navigate]);

  const openAddModal = () => {
    setOpen(false);
    setShowAdd(true);
    inputRef.current?.blur();
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

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: '0 1 280px' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none', flexShrink: 0 }}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search members…"
          autoComplete="off"
          style={{
            width: '100%', paddingLeft: 28, paddingRight: 52,
            paddingTop: 6, paddingBottom: 6,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 6, fontSize: 13,
            color: '#fff',
            outline: 'none', fontFamily: 'inherit',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.background = 'rgba(255,255,255,0.08)'; }}
        />
        {/* Kbd hint */}
        <kbd style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'rgba(255,255,255,0.28)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 3, padding: '1px 5px', pointerEvents: 'none',
          fontFamily: 'inherit', letterSpacing: '0.2px',
        }}>⌘K</kbd>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 360, background: '#fff',
          border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 32px rgba(15,23,42,0.16)',
          zIndex: 200, overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            /* ── No results ── */
            <div>
              <div style={{ padding: '20px 16px', textAlign: 'center', borderBottom: canAdd ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>
                  No member found for "{query.trim()}"
                </p>
                <p style={{ fontSize: 12, color: 'var(--t4)' }}>
                  No results matching this name, phone, or ID.
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
                      Add "{query.trim()}" as new person
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                      Create a guest profile or assign a package
                    </div>
                  </div>
                </button>
              )}
            </div>
          ) : (
            /* ── Results ── */
            <>
              {results.map((m, i) => {
                const sub = m.subscriptions?.at(-1);
                const pkg = sub?.package;
                const isActive = i === cursor;
                const q = query.trim().toLowerCase();
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
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {m.name?.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{highlight(m.name, q)}</span>
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

              {/* Add option at bottom of results too */}
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

              {/* Footer */}
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
        <AddPersonModal
          initialName={query.trim()}
          onClose={() => { setShowAdd(false); setQuery(''); }}
          onSuccess={(systemId) => { setShowAdd(false); setQuery(''); navigate(`/members/${systemId}`); }}
        />
      )}
    </div>
  );
}

// ── Add Person Modal (inline, no import needed) ───────────────────────────────
function AddPersonModal({ initialName, onClose, onSuccess }) {
  const [packages,  setPackages]  = useState([]);
  const [sales,     setSales]     = useState([]);
  const [form, setForm] = useState({
    name: initialName || '', phones: '', nationalId: '',
    gender: '', birthdate: '', source: '', packageId: '', assignedSales: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([getPackages({ limit: 100 }), getSalesUsers()])
      .then(([pRes, sRes]) => {
        setPackages(pRes.data.packages ?? []);
        setSales(sRes.data.salesUsers ?? []);
      }).catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name   = 'Name is required';
    if (!form.phones.trim()) e.phones = 'Phone is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await createMember({
        name: form.name.trim(), phones: form.phones.trim(),
        nationalId:    form.nationalId    || null,
        gender:        form.gender        || null,
        birthdate:     form.birthdate     || null,
        source:        form.source        || null,
        packageId:     form.packageId     || null,
        assignedSales: form.assignedSales || null,
      });
      onSuccess(res.data.member.systemId);
    } catch (e) {
      setErrors({ form: e.response?.data?.message || 'Failed to add person.' });
    } finally {
      setLoading(false);
    }
  };

  const SOURCES = ['Social media', 'Walk in', 'Word of mouth', 'referral', 'sales call', 'data entry', 'others'];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 8, border: '1px solid var(--border)',
        width: '100%', maxWidth: 540, maxHeight: '90svh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(15,23,42,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Add New Person</h2>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, width: 26, height: 26, cursor: 'pointer', color: 'var(--t3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px' }}>
          {errors.form && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-bd)', borderLeft: '3px solid var(--red)', padding: '9px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              {errors.form}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="Full name" />
            <Input label="Phone *" value={form.phones} onChange={e => set('phones', e.target.value)} error={errors.phones} placeholder="Phone number" />
            <Input label="National ID" value={form.nationalId} onChange={e => set('nationalId', e.target.value)} placeholder="Optional" />
            <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
            <Input label="Birthdate" type="date" value={form.birthdate} onChange={e => set('birthdate', e.target.value)} />
            <Select label="Source" value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">— Select —</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          <Select
            label="Package (leave empty for guest)"
            value={form.packageId}
            onChange={e => set('packageId', e.target.value)}
          >
            <option value="">— Guest (no package) —</option>
            {packages.map(p => (
              <option key={p._id} value={p._id}>{p.name} – {p.duration} ({p.activityType}) — EGP {p.price}</option>
            ))}
          </Select>

          <Select label="Assign Sales Rep" value={form.assignedSales} onChange={e => set('assignedSales', e.target.value)}>
            <option value="">— None —</option>
            {sales.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
          </Select>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn size="sm" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Add Person'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
