import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import useDebounce from '../../hooks/useDebounce';
import Layout from '../../components/Layout';
import { PageHeader, Card, Table, Badge, StatCard, Spinner, EmptyState, SearchInput, Avatar } from '../../components/ui';
import { getAllMembers } from '../../api/endpoints';

export default function CoachMembers() {
  usePageTitle('Members');
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = user?.role === 'Coach Manager';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllMembers();
      setMembers(res.data.members ?? []);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter to coach's members (Coach sees only theirs, Coach Manager sees ALL)
  const coachMembers = isManager
    ? members
    : members.filter(m => {
        const coachId = m.current_couch?._id || m.current_couch;
        return String(coachId) === String(user?._id);
      });

  // Apply status filter and search
  const filtered = coachMembers.filter(m => {
    if (filter !== 'all' && m.couch_subscription_status !== filter) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!m.name?.toLowerCase().includes(q) && !m.phones?.includes(q) && !String(m.systemId).includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: coachMembers.length,
    active: coachMembers.filter(m => m.couch_subscription_status === 'active').length,
    transferred: coachMembers.filter(m => m.couch_subscription_status === 'transferred').length,
    interested: coachMembers.filter(m => m.couch_subscription_status === 'interested').length,
    expired: coachMembers.filter(m => m.couch_subscription_status === 'expired').length,
  };

  return (
    <Layout>
      <PageHeader title="Members">
        <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, ID…" width={200} />
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <div className="grid-stats-5" style={{ marginBottom: 16 }}>
          <StatCard label="Total" value={stats.total} color="brand" />
          <StatCard label="Active" value={stats.active} color="success" />
          <StatCard label="Transferred" value={stats.transferred} color="info" />
          <StatCard label="Interested" value={stats.interested} color="warning" />
          <StatCard label="Expired" value={stats.expired} color="danger" />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: `All (${stats.total})` },
            { value: 'active', label: `Active (${stats.active})` },
            { value: 'transferred', label: `Transferred (${stats.transferred})` },
            { value: 'interested', label: `Interested (${stats.interested})` },
            { value: 'expired', label: `Expired (${stats.expired})` },
          ].map(o => (
            <button key={o.value} onClick={() => setFilter(o.value)} style={{
              padding: '5px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: filter === o.value ? 'var(--navy)' : '#fff',
              border: `1px solid ${filter === o.value ? 'var(--navy)' : 'var(--border-md)'}`,
              color: filter === o.value ? '#fff' : 'var(--t2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{o.label}</button>
          ))}
        </div>

        <Card noPad>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="🏋️" message="No members match" />
          ) : (
            <Table headers={['ID', 'Name', 'Status', 'Sessions', 'Used', 'Remaining']}>
              {filtered.map(m => (
                <tr key={m._id} onClick={() => navigate(`/members/${m.systemId}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>#{m.systemId}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={m.name} size="sm" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><Badge status={m.couch_subscription_status || 'guest'} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>{m.PT_sessions || 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--t2)' }}>{m.used_PT_sessions || 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: (m.PT_sessions - m.used_PT_sessions) > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {(m.PT_sessions || 0) - (m.used_PT_sessions || 0)}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </Layout>
  );
}
