import { Link } from 'react-router-dom';
import { Avatar } from '../ui';

export default function SalesManagerSection({ salesManager, directAssignment = false }) {
  if (directAssignment || !salesManager) {
    return (
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Sales Manager
        </p>
        <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>
          Direct assignment — no sales manager request
        </p>
      </div>
    );
  }

  const profileId = salesManager._id;

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '14px 16px', marginBottom: 16,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
        Sales Manager
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={salesManager.name} size="md" />
        <div style={{ flex: 1 }}>
          {profileId ? (
            <Link
              to={`/sales/team/${profileId}`}
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none' }}
            >
              {salesManager.name ?? '—'}
            </Link>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{salesManager.name ?? '—'}</div>
          )}
          {salesManager.email && (
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{salesManager.email}</div>
          )}
          {salesManager.role && (
            <span style={{
              display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.4px',
              background: 'var(--blue-bg, rgba(59,130,246,0.1))', color: 'var(--blue)',
              border: '1px solid var(--blue-bd, rgba(59,130,246,0.25))',
              padding: '2px 7px', borderRadius: 4,
            }}>
              {salesManager.role}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
