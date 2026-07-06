// ─── FlamFactory UI — sharp, data-dense design system ────────────────────────

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const cls = size === 'sm' ? 'spin spin-sm' : size === 'lg' ? 'spin spin-lg' : 'spin';
  return <span className={cls} aria-hidden="true" />;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ h = '13px', w = '100%' }) {
  return <div className="skel" style={{ height: h, width: w }} aria-hidden="true" />;
}
export function SkeletonRow({ cols = 6 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '11px 14px' }}>
          <Skeleton h="12px" w={i === 0 ? '60px' : '100%'} />
        </td>
      ))}
    </tr>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  active:   { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-bd)',  dot: '#16a34a' },
  expired:  { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-bd)',    dot: '#dc2626' },
  frozen:   { bg: 'var(--sky-bg)',    color: 'var(--sky)',    border: 'var(--sky-bd)',    dot: '#0284c7' },
  guest:    { bg: 'var(--slate-bg)',  color: 'var(--slate)',  border: 'var(--slate-bd)', dot: '#94a3b8' },
  pending:  { bg: 'var(--amber-bg)', color: 'var(--amber)',  border: 'var(--amber-bd)', dot: '#d97706' },
  accepted: { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-bd)',  dot: '#16a34a' },
  rejected: { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-bd)',    dot: '#dc2626' },
};
export function Badge({ status }) {
  const s = BADGE_MAP[status] ?? BADGE_MAP.guest;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.3px',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
const BV = {
  primary: { bg: 'var(--navy)',      color: '#fff',          border: 'var(--navy)',      hbg: 'var(--navy-2)' },
  blue:    { bg: 'var(--blue)',      color: '#fff',          border: 'var(--blue)',      hbg: 'var(--blue-dark)' },
  outline: { bg: 'transparent',     color: 'var(--t2)',     border: 'var(--border-md)', hbg: 'var(--bg)' },
  ghost:   { bg: 'transparent',     color: 'var(--t3)',     border: 'transparent',      hbg: '#f1f5f9' },
  danger:  { bg: 'var(--red)',       color: '#fff',          border: 'var(--red)',       hbg: '#b91c1c' },
  success: { bg: 'var(--green)',     color: '#fff',          border: 'var(--green)',     hbg: '#15803d' },
};
const BS = {
  xs: { p: '4px 10px',  fs: 11, r: 4 },
  sm: { p: '6px 12px',  fs: 12, r: 5 },
  md: { p: '8px 16px',  fs: 13, r: 6 },
  lg: { p: '10px 20px', fs: 14, r: 6 },
};
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', fullWidth = false, style: ex = {} }) {
  const v = BV[variant] ?? BV.primary;
  const s = BS[size] ?? BS.md;
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: s.p, fontSize: s.fs, fontWeight: 600, borderRadius: s.r,
        background: v.bg, color: v.color,
        border: `1px solid ${v.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s, opacity 0.12s',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : 'auto',
        ...ex,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hbg; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >{children}</button>
  );
}

// ── Field wrapper (shared for Input/Select/Textarea) ──────────────────────────
function Field({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 5 }}>
          {label}
        </label>
      )}
      {children}
      {error && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>{hint}</p>}
    </div>
  );
}

const inputBase = (error) => ({
  width: '100%', padding: '8px 11px', fontSize: 13,
  border: `1px solid ${error ? 'var(--red-bd)' : 'var(--border)'}`,
  borderRadius: 6, outline: 'none',
  color: 'var(--t1)', background: '#fff',
  transition: 'border-color 0.12s, box-shadow 0.12s',
  fontFamily: 'inherit',
});

export function Input({ label, error, hint, ...props }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        {...props}
        style={inputBase(error)}
        onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
        onBlur={e  => { e.target.style.borderColor = error ? 'var(--red-bd)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      />
    </Field>
  );
}
export function Select({ label, error, hint, children, ...props }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select
        {...props}
        style={{ ...inputBase(error), appearance: 'auto' }}
        onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
        onBlur={e  => { e.target.style.borderColor = error ? 'var(--red-bd)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      >{children}</select>
    </Field>
  );
}
export function Textarea({ label, error, hint, ...props }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea
        {...props}
        style={{ ...inputBase(error), minHeight: 88, resize: 'vertical' }}
        onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
        onBlur={e  => { e.target.style.borderColor = error ? 'var(--red-bd)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      />
    </Field>
  );
}

export function Switch({ label, hint, checked, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
      <div>
        {label && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>}
        {hint && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: checked ? 'var(--blue)' : 'var(--border-md)',
          position: 'relative', transition: 'background 0.15s', flexShrink: 0, opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </button>
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
const AL = {
  error:   { bg: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red-bd)',   accent: 'var(--red)'   },
  success: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-bd)', accent: 'var(--green)' },
  info:    { bg: 'var(--sky-bg)',   color: 'var(--sky)',   border: 'var(--sky-bd)',   accent: 'var(--sky)'   },
  warning: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-bd)', accent: 'var(--amber)' },
};
export function Alert({ type = 'error', children }) {
  const a = AL[type] ?? AL.error;
  return (
    <div role="alert" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 6, marginBottom: 14,
      background: a.bg, color: a.color,
      border: `1px solid ${a.border}`,
      borderLeft: `3px solid ${a.accent}`,
      fontSize: 13,
    }}>{children}</div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, noPad = false }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: noPad ? 0 : '16px 18px',
      ...style,
    }}>{children}</div>
  );
}
export function CardHeader({ title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.1px' }}>{title}</h3>
      {children && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const MW = { sm: 400, md: 540, lg: 720, xl: 920 };
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true"
        className="fade-up"
        style={{
          background: '#fff', borderRadius: 8,
          border: '1px solid var(--border)',
          width: '100%', maxWidth: MW[size] ?? 540,
          maxHeight: '90svh', overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.10)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 5,
            width: 26, height: 26, cursor: 'pointer', color: 'var(--t3)',
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--t1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--t3)'; }}
          >✕</button>
        </div>
        <div style={{ padding: '16px 18px' }}>{children}</div>
        {footer && (
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            background: 'var(--bg)',
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children, loading, skeletonRows = 5 }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{
                padding: '9px 14px', textAlign: 'left', background: 'var(--bg)',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: 'var(--t3)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => <SkeletonRow key={i} cols={headers.length} />)
            : children}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 0, overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '8px 16px', background: 'none', border: 'none',
          borderBottom: `2px solid ${active === t.id ? 'var(--navy)' : 'transparent'}`,
          marginBottom: -1,
          color: active === t.id ? 'var(--t1)' : 'var(--t3)',
          fontSize: 13, fontWeight: active === t.id ? 700 : 400,
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
          transition: 'color 0.12s',
        }}
          onMouseEnter={e => { if (active !== t.id) e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={e => { if (active !== t.id) e.currentTarget.style.color = 'var(--t3)'; }}
        >{t.label}</button>
      ))}
    </div>
  );
}

// ── Filter Tabs ───────────────────────────────────────────────────────────────
export function FilterTabs({ options, active, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '5px 12px', borderRadius: 5,
          background: active === o.value ? 'var(--navy)' : '#fff',
          border: `1px solid ${active === o.value ? 'var(--navy)' : 'var(--border-md)'}`,
          color: active === o.value ? '#fff' : 'var(--t2)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.12s',
        }}
          onMouseEnter={e => { if (active !== o.value) { e.currentTarget.style.borderColor = 'var(--navy-3)'; e.currentTarget.style.color = 'var(--t1)'; } }}
          onMouseLeave={e => { if (active !== o.value) { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.color = 'var(--t2)'; } }}
        >{o.label}</button>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
const SC = {
  default: { accent: 'var(--border)',    val: 'var(--t1)' },
  brand:   { accent: 'var(--navy)',      val: 'var(--navy)' },
  blue:    { accent: 'var(--blue)',      val: 'var(--blue)' },
  success: { accent: 'var(--green)',     val: 'var(--green)' },
  warning: { accent: 'var(--amber)',     val: 'var(--amber)' },
  danger:  { accent: 'var(--red)',       val: 'var(--red)' },
  info:    { accent: 'var(--sky)',       val: 'var(--sky)' },
};
export function StatCard({ label, value, color = 'default', sub, onClick }) {
  const c = SC[color] ?? SC.default;
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        borderLeft: `3px solid ${c.accent}`,
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.12s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--t4)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: c.val, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, children }) {
  return (
    <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '0' }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 52 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.2px' }}>{title}</h1>
        {children && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '—', message = 'No data', sub }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 32, opacity: 0.25, marginBottom: 10 }}>{icon}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>{message}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--t4)' }}>{sub}</p>}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size="sm" /> : confirmLabel}
        </Btn>
      </>}
    >
      <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV = { sm: [28, 10], md: [36, 12], lg: [48, 16], xl: [64, 22] };
export function Avatar({ name = '', size = 'md' }) {
  const [sz, fs] = AV[size] ?? AV.md;
  const ini = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div style={{
      width: sz, height: sz, borderRadius: '50%', flexShrink: 0,
      background: 'var(--navy)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: 700, letterSpacing: '0.5px',
    }}>{ini}</div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const start = ((page - 1) * pageSize) + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--t4)' }}>{start}–{end} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Btn variant="outline" size="xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Prev</Btn>
        <span style={{ fontSize: 12, color: 'var(--t3)', padding: '0 8px' }}>{page} / {totalPages}</span>
        <Btn variant="outline" size="xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next →</Btn>
      </div>
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…', width = 220 }) {
  return (
    <div style={{ position: 'relative', width }}>
      <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        type="search" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
          fontSize: 13, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.12s, box-shadow 0.12s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
        onBlur={e  => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
export function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr',
      padding: '10px 0', borderBottom: '1px solid var(--bg)', gap: 16, alignItems: 'start',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t4)', paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--t1)' }}>{value ?? '—'}</span>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}
