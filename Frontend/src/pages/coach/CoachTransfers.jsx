import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, Spinner, EmptyState, Avatar, Badge, fmtDateTime } from '../../components/ui';
import { getAllMembers } from '../../api/endpoints';

export default function CoachTransfers() {
  usePageTitle('Today\'s Transfers');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllMembers();
      const members = res.data.members ?? [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find members that were assigned/transferred to this coach today
      const todayTransfers = [];
      members.forEach(m => {
        const coachId = m.current_couch?._id || m.current_couch;
        if (String(coachId) !== String(user?._id)) return;

        // Check userlog for assign entries today
        (m.userlog || []).forEach(log => {
          if (log.type === 'assign' && new Date(log.createdAt) >= today) {
            todayTransfers.push({
              _id: log._id,
              member: m,
              text: log.text,
              time: log.createdAt,
              by: log.createdBy?.name || 'Unknown',
            });
          }
        });
      });

      todayTransfers.sort((a, b) => new Date(b.time) - new Date(a.time));
      setTransfers(todayTransfers);
    } catch {
      toast.error('Failed to load transfers');
    } finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <PageHeader title="Today's Transfers">
        <span style={{ fontSize: 12, color: 'var(--t4)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
              Members Transferred to You Today ({transfers.length})
            </span>
            <div style={{
              padding: '4px 12px', borderRadius: 16,
              background: transfers.length > 0 ? 'var(--navy)' : 'var(--border)',
              color: '#fff', fontSize: 13, fontWeight: 800,
            }}>
              {loading ? '…' : transfers.length}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
          ) : transfers.length === 0 ? (
            <EmptyState icon="🔄" message="No transfers today" sub="Members assigned to you today will appear here" />
          ) : (
            <div>
              {transfers.map((t, i) => (
                <div key={t._id ?? i}
                  onClick={() => navigate(`/members/${t.member.systemId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 18px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={t.member.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{t.member.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                      #{t.member.systemId} · {t.text}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
                      {new Date(t.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Badge status={t.member.couch_subscription_status || 'guest'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
