import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, CardHeader, Table, Badge, Btn, Spinner, EmptyState, Avatar, fmtDate, Skeleton } from '../../components/ui';
import { getSalesProfile } from '../../api/endpoints';

export default function SalesPersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  usePageTitle(data?.user?.name ?? 'Sales Profile');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getSalesProfile(id); setData(res.data); }
    catch { toast.error('Failed to load profile.'); navigate(-1); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const user    = data?.user;
  const stats   = data?.stats;
  const members = data?.members ?? [];

  const filtered = filter === 'all' ? members : members.filter(m => m.status === filter);

  const pct = user?.monthlyTarget > 0
    ? Math.min(100, Math.round(((stats?.monthlyRevenue ?? 0) / user.monthlyTarget) * 100))
    : null;

  return (
    <Layout>
      <PageHeader title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/sales/team')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12 }}>
            ← Team
          </button>
          <span style={{ color: 'var(--border-md)' }}>/</span>
          <span>{loading ? 'Loading…' : (user?.name ?? 'Profile')}</span>
        </div>
      } />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        {loading ? <ProfileSkeleton /> : (
          <>
            {/* Profile header */}
            <Card>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <Avatar name={user?.name} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{user?.name}</h2>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4 }}>{user?.role}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>
                    {user?.email && <span>{user.email}</span>}
                    <span>Joined {fmtDate(user?.createdAt)}</span>
                  </div>

                  {/* Ability flags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: 'Can Comment',          active: user?.abilities?.canCommentOnMembers },
                      { label: 'Can Request Assignment', active: user?.abilities?.canRequestAssignment },
                      { label: 'Can Request Takeover',   active: user?.abilities?.canRequestTakeover },
                    ].map(a => (
                      <span key={a.label} style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: a.active ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: a.active ? 'var(--green)' : 'var(--red)',
                        border: `1px solid ${a.active ? 'var(--green-bd)' : 'var(--red-bd)'}`,
                      }}>{a.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: pct !== null ? 16 : 0 }}>
                {[
                  { l: 'Total',   v: stats?.total,          c: 'var(--navy)' },
                  { l: 'Active',  v: stats?.active,         c: 'var(--green)' },
                  { l: 'Frozen',  v: stats?.frozen,         c: 'var(--sky)' },
                  { l: 'Expired', v: stats?.expired,        c: 'var(--red)' },
                  { l: 'Guests',  v: stats?.guests,         c: 'var(--t3)' },
                ].map(s => (
                  <div key={s.l} style={{ background: 'var(--card)', padding: '10px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v ?? 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Monthly target */}
              {pct !== null && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Target</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--t2)' }}>
                      EGP {(stats?.monthlyRevenue ?? 0).toLocaleString()} / {user.monthlyTarget.toLocaleString()} — {pct}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 3,
                      background: pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--blue)' : 'var(--amber)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </>
              )}
            </Card>

            {/* Members table */}
            <Card noPad>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  Assigned Members ({filtered.length}{filter !== 'all' ? ` of ${members.length}` : ''})
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['all','active','frozen','expired','guest'].map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: filter === s ? 'var(--navy)' : '#fff',
                      border: `1px solid ${filter === s ? 'var(--navy)' : 'var(--border-md)'}`,
                      color: filter === s ? '#fff' : 'var(--t3)',
                      cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              {!filtered.length ? (
                <EmptyState message="No members match this filter" />
              ) : (
                <Table headers={['ID', 'Name', 'Phone', 'Status', 'Package', 'Expires']}>
                  {filtered.map(m => {
                    const sub = m.subscriptions?.at(-1);
                    const pkg = sub?.package;
                    return (
                      <tr key={m._id} className="tbl-row" onClick={() => navigate(`/members/${m.systemId}`)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>#{m.systemId}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={m.name} size="sm" />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{m.phones}</td>
                        <td style={{ padding: '10px 14px' }}><Badge status={m.status} /></td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>
                          {pkg ? `${pkg.name} · ${pkg.duration}` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{fmtDate(sub?.endDate)}</td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}

function ProfileSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', display: 'flex', gap: 14 }}>
        <Skeleton h="48px" w="48px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <Skeleton h="14px" w="160px" /><Skeleton h="11px" w="220px" /><Skeleton h="11px" w="180px" />
        </div>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, height: 220 }} />
    </div>
  );
}
