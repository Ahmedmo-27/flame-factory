import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, CardHeader, Table, Badge, Btn, Modal, Input, Spinner, EmptyState, ConfirmDialog, fmtDateTime } from '../../components/ui';
import { getRequests, createRequest, updateRequestStatus } from '../../api/endpoints';

export default function SalesRequests() {
  usePageTitle('Requests');
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const isManager = ['Sales Manager', 'Owner'].includes(user?.role);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try { const res = await getRequests(); setRequests(Array.isArray(res.data) ? res.data : []); }
    catch { toast.error('Failed to load requests.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try { await updateRequestStatus(confirm.id, confirm.status); toast.success(`Request ${confirm.status}.`); setConfirm(null); fetchRequests(); }
    catch (e) { toast.error(e.response?.data?.message ?? 'Action failed.'); }
    finally { setActionLoading(false); }
  };

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const RowCols = isManager ? ['Member', 'Requested By', 'Submitted', 'Status', 'Actions'] : ['Member', 'Requested By', 'Submitted', 'Status'];

  return (
    <Layout>
      <PageHeader title="Requests">
        {user?.role === 'Sales' && <Btn size="sm" onClick={() => setShowNew(true)}>+ New Request</Btn>}
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        {/* Pending */}
        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Pending ({pending.length})</span>
            {pending.length > 0 && <span style={{ fontSize: 11, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-bd)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Needs Review</span>}
          </div>
          {!pending.length && !loading ? <EmptyState message="No pending requests" /> :
            <Table loading={loading} skeletonRows={3} headers={RowCols}>
              {pending.map(r => (
                <tr key={r._id} className="tbl-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{r.member?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{r.requestedBy?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(r.createdAt)}</td>
                  <td style={{ padding: '10px 14px' }}><Badge status={r.status} /></td>
                  {isManager && (
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Btn variant="success" size="xs" onClick={() => setConfirm({ id: r._id, status: 'accepted' })}>Accept</Btn>
                        <Btn variant="danger"  size="xs" onClick={() => setConfirm({ id: r._id, status: 'rejected' })}>Reject</Btn>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          }
        </Card>

        {/* History */}
        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>History ({resolved.length})</span>
          </div>
          {!resolved.length ? <EmptyState message="No resolved requests" /> :
            <Table headers={['Member', 'Requested By', 'Submitted', 'Status']}>
              {[...resolved].reverse().map(r => (
                <tr key={r._id} className="tbl-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{r.member?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{r.requestedBy?.name ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(r.createdAt)}</td>
                  <td style={{ padding: '10px 14px' }}><Badge status={r.status} /></td>
                </tr>
              ))}
            </Table>
          }
        </Card>
      </div>

      {user?.role === 'Sales' && <NewRequestModal open={showNew} onClose={() => setShowNew(false)} onSuccess={() => { setShowNew(false); fetchRequests(); }} />}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title={confirm?.status === 'accepted' ? 'Accept Request' : 'Reject Request'}
        message={`Are you sure you want to ${confirm?.status} this assignment request?`}
        confirmLabel={confirm?.status === 'accepted' ? 'Accept' : 'Reject'}
        danger={confirm?.status === 'rejected'} loading={actionLoading} />
    </Layout>
  );
}

function NewRequestModal({ open, onClose, onSuccess }) {
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading]  = useState(false);
  const handleSubmit = async () => {
    if (!memberId.trim()) { toast.error('Member ID required.'); return; }
    setLoading(true);
    try { await createRequest(memberId.trim()); toast.success('Request submitted.'); setMemberId(''); onSuccess(); }
    catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setLoading(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Request Member Assignment" size="sm"
      footer={<><Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn><Btn size="sm" onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Send'}</Btn></>}>
      <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.6 }}>Enter the System ID or Member ID of the member you want assigned to you. The request will go to your Sales Manager.</p>
      <Input label="Member System ID *" value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="e.g. 100" hint="Found on the member's profile page." />
    </Modal>
  );
}
