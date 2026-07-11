import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, StatCard, Table, Btn, EmptyState, Avatar, fmtDateTime } from '../../components/ui';
import { getAllMembers } from '../../api/endpoints';

export default function SalesDashboard() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, active: 0, frozen: 0, expired: 0, guest: 0 });
  const [todayMembers, setTodayMembers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingToday, setLoadingToday] = useState(false);
  const [showToday, setToday] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await getAllMembers({ page: 1, limit: 1 });
      setStats(res.data.stats ?? { total: 0, active: 0, frozen: 0, expired: 0, guest: 0 });
    } catch {
      toast.error('Failed to load data.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await getAllMembers({ subscribedToday: 'true', limit: 100, page: 1 });
      setTodayMembers(res.data.members ?? []);
    } catch {
      toast.error('Failed to load today\'s subscriptions.');
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchToday(); }, [fetchToday]);

  const todayRevenue = useMemo(
    () => todayMembers.reduce((sum, m) => sum + (m.subscriptions?.at(-1)?.pricePaid ?? 0), 0),
    [todayMembers]
  );

  return (
    <Layout>
      <PageHeader title="Dashboard">
        <span style={{ fontSize: 12, color: 'var(--t4)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <StatCard label="Today's Revenue" value={loadingToday ? '—' : `EGP ${todayRevenue.toLocaleString()}`} color="brand"
            sub={`${todayMembers.length} subscription${todayMembers.length !== 1 ? 's' : ''} today`} onClick={() => setToday(t => !t)} />
          <StatCard label="Active"  value={loadingStats ? '—' : stats.active}  color="success" />
          <StatCard label="Frozen"  value={loadingStats ? '—' : stats.frozen}  color="info" />
          <StatCard label="Expired" value={loadingStats ? '—' : stats.expired} color="danger" />
          <StatCard label="Guests"  value={loadingStats ? '—' : stats.guest} />
        </div>

        {showToday && (
          <Card noPad className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Today's Subscriptions ({todayMembers.length})</span>
              <Btn variant="ghost" size="xs" onClick={() => setToday(false)}>Close</Btn>
            </div>
            {!todayMembers.length && !loadingToday ? <EmptyState message="No subscriptions today" /> :
              <Table loading={loadingToday} headers={['Member', 'Phone', 'Package', 'Price', 'Time']}>
                {todayMembers.map(m => {
                  const sub = m.subscriptions?.at(-1);
                  return (
                    <tr key={m._id} className="tbl-row" onClick={() => navigate(`/members/${m.systemId}`)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={m.name} size="sm" />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{m.phones}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{sub?.package?.name ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>EGP {sub?.pricePaid ?? 0}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(sub?.createdAt)}</td>
                    </tr>
                  );
                })}
              </Table>
            }
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Members',  sub: `${stats.total} total`,     to: '/sales/members' },
            { label: 'Requests', sub: 'Assignment requests',       to: '/sales/requests' },
            { label: 'Subscriptions', sub: 'My sales by date',     to: '/sales/subscriptions' },
          ].map(c => (
            <button key={c.to} onClick={() => navigate(c.to)} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '16px 18px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.12s, box-shadow 0.12s',
              fontFamily: 'inherit',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{c.label}</p>
              <p style={{ fontSize: 12, color: 'var(--t4)' }}>{c.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
