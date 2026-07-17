import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import usePageTitle from '../hooks/usePageTitle';
import Layout from '../components/Layout';
import { PageHeader, Card, Spinner, EmptyState, Avatar } from '../components/ui';
import { getReceptionists } from '../api/endpoints';
import { WhatsAppBtn } from '../utils/whatsapp';

const ROLE_ORDER = ['Receptionist', 'Sales', 'Sales Manager', 'Coach', 'Coach Manager'];
const ROLE_ICONS = {
  'Receptionist': '🖥️',
  'Sales': '💼',
  'Sales Manager': '👔',
  'Coach': '🏋️',
  'Coach Manager': '🏅',
};

export default function ReceptionContacts() {
  usePageTitle('Staff Contacts');

  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReceptionists();
      setStaff(res.data.receptionists ?? []);
    } catch {
      toast.error('Failed to load contacts');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by role
  const grouped = ROLE_ORDER.reduce((acc, role) => {
    const members = staff.filter(s => s.role === role);
    if (members.length > 0) acc.push({ role, members });
    return acc;
  }, []);

  return (
    <Layout>
      <PageHeader title="Staff Contacts" />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32, maxWidth: 600 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
        ) : staff.length === 0 ? (
          <EmptyState icon="📞" message="No staff found" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grouped.map(({ role, members }) => (
              <Card key={role} noPad>
                <div style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{ROLE_ICONS[role]}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                    {role} ({members.length})
                  </span>
                </div>

                <div>
                  {members.map(r => (
                    <div key={r._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 18px', borderBottom: '1px solid var(--border)',
                    }}>
                      <Avatar name={r.name} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{r.name}</div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <a href={r.mobile_number ? `tel:${r.mobile_number}` : undefined} style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--blue)',
                          textDecoration: 'none', fontFamily: 'monospace',
                        }}>
                          {r.mobile_number || '—'}
                        </a>
                        {r.mobile_number && <WhatsAppBtn phone={r.mobile_number} />}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
