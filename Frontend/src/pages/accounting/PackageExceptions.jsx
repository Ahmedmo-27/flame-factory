import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, Table, Badge, Btn, ConfirmDialog, EmptyState, fmtDateTime } from '../../components/ui';
import { getPackageExceptions, updatePackageExceptionStatus } from '../../api/endpoints';

export default function PackageExceptions() {
  usePageTitle('Package Exceptions');
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isReviewer = ['Accountant', 'Owner'].includes(user?.role);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPackageExceptions();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load package exceptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await updatePackageExceptionStatus(confirm.id, confirm.status);
      toast.success(`Exception ${confirm.status}.`);
      setConfirm(null);
      fetchRequests();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const headers = isReviewer
    ? ['Member', 'Package', 'Proposed By', 'Price Paid', 'Submitted', 'Status', 'Actions']
    : ['Member', 'Package', 'Proposed By', 'Price Paid', 'Submitted', 'Status'];

  return (
    <Layout>
      <PageHeader title="Package Exceptions" />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Pending ({pending.length})</span>
            {pending.length > 0 && isReviewer && (
              <span style={{ fontSize: 11, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-bd)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Needs Review</span>
            )}
          </div>
          {!pending.length && !loading ? <EmptyState message="No pending package exceptions" /> :
            <Table loading={loading} skeletonRows={3} headers={headers}>
              {pending.map(r => (
                <tr key={r._id} className="tbl-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <Link to={`/members/${r.member?.systemId ?? r.member?._id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none' }}>
                      {r.member?.name ?? '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>
                    {r.name}
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>Based on: {r.basePackage?.name ?? '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{r.proposedBy?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>EGP {r.pricePaid}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(r.createdAt)}</td>
                  <td style={{ padding: '10px 14px' }}><Badge status={r.status} /></td>
                  {isReviewer && (
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="success" size="xs" onClick={() => setConfirm({ id: r._id, status: 'accepted' })}>Approve</Btn>
                        <Btn variant="danger" size="xs" onClick={() => setConfirm({ id: r._id, status: 'rejected' })}>Reject</Btn>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          }
        </Card>

        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>History ({resolved.length})</span>
          </div>
          {!resolved.length ? <EmptyState message="No resolved exceptions" /> :
            <Table headers={['Member', 'Package', 'Proposed By', 'Reviewed By', 'Price Paid', 'Submitted', 'Status']}>
              {[...resolved].reverse().map(r => (
                <tr key={r._id} className="tbl-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{r.member?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{r.proposedBy?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{r.reviewedBy?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>EGP {r.pricePaid}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(r.createdAt)}</td>
                  <td style={{ padding: '10px 14px' }}><Badge status={r.status} /></td>
                </tr>
              ))}
            </Table>
          }
        </Card>
      </div>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title={confirm?.status === 'accepted' ? 'Approve Package Exception' : 'Reject Package Exception'}
        message={`Are you sure you want to ${confirm?.status} this package exception?`}
        confirmLabel={confirm?.status === 'accepted' ? 'Approve' : 'Reject'}
        danger={confirm?.status === 'rejected'} loading={actionLoading} />
    </Layout>
  );
}
