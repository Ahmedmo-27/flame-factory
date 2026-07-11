import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, Spinner, EmptyState, Avatar, Badge } from '../../components/ui';
import { getSalesTeam } from '../../api/endpoints';

export default function SalesTeam() {
  usePageTitle('Team');
  const navigate = useNavigate();
  const [team,    setTeam]    = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesTeam();
      setTeam(res.data.team ?? []);
    } catch { toast.error('Failed to load team.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  return (
    <Layout>
      <PageHeader title="Team" />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Total Members',  value: loading ? '—' : team.reduce((s, u) => s + u.stats.total, 0) },
            { label: 'Sales Reps',     value: loading ? '—' : team.filter(u => u.role === 'Sales').length },
            { label: 'Sales Managers', value: loading ? '—' : team.filter(u => u.role === 'Sales Manager').length },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--t4)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Team grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
        ) : !team.length ? (
          <EmptyState message="No sales team members found" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {team.map(member => (
              <TeamCard key={member._id} member={member} onClick={() => navigate(`/sales/team/${member._id}`)} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TeamCard({ member, onClick }) {
  const { stats } = member;
  const pct = member.monthlyTarget > 0
    ? Math.min(100, Math.round((stats.monthlyRevenue / member.monthlyTarget) * 100))
    : null;

  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '16px 18px',
      cursor: 'pointer', transition: 'border-color 0.12s, box-shadow 0.12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(15,23,42,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Avatar name={member.name} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 3 }}>{member.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 4 }}>
              {member.role}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>→</span>
      </div>

      {/* Stats grid */}
      <div className="grid-stats-4" style={{ background: 'var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: pct !== null ? 12 : 0 }}>
        {[
          { l: 'Active',  v: stats.active,  c: 'var(--green)' },
          { l: 'Frozen',  v: stats.frozen,  c: 'var(--sky)' },
          { l: 'Expired', v: stats.expired, c: 'var(--red)' },
          { l: 'Guests',  v: stats.guests,  c: 'var(--t3)' },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--card)', padding: '8px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Monthly target progress */}
      {pct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>MONTHLY TARGET</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--t2)' }}>
              EGP {stats.monthlyRevenue.toLocaleString()} / {member.monthlyTarget.toLocaleString()} ({pct}%)
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--blue)' : 'var(--amber)',
              borderRadius: 3, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
