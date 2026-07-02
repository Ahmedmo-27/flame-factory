import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, Table, Badge, Btn, Modal, Input, Spinner, EmptyState, ConfirmDialog, fmtDateTime } from '../../components/ui';
import { getRequests, createRequest, updateRequestStatus, getSalesTeam } from '../../api/endpoints';

export default function SalesRequests() {
  usePageTitle('Requests');
  const { user } = useAuth();
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showNew,       setShowNew]       = useState(false);
  const [confirm,       setConfirm]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [repFilter,     setRepFilter]     = useState('all');
  const [salesReps,     setSalesReps]     = useState([]);
  const isManager = ['Sales Manager', 'Owner'].includes(user?.role);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRequests();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load requests.'); }
    finally { setLoading(false); }
  }, []);

  // Load all sales reps for the filter (manager only)
  useEffect(() => {
    if (!isManager) return;
    getSalesTeam()
      .then(res => {
        const reps = (res.data.team ?? []).filter(u => u.role === 'Sales');
        setSalesReps(reps);
      })
      .catch(() => {});
  }, [isManager]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await updateRequestStatus(confirm.id, confirm.status);
      toast.success(`Request ${confirm.status}.`);
      setConfirm(null);
      fetchRequests();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Action failed.'); }
    finally { setActionLoading(false); }
  };

  // Apply rep filter
  const filtered = isManager && repFilter !== 'all'
    ? requests.filter(r => r.requestedBy?._id === repFilter)
    : requests;

  const pending  = filtered.filter(r => r.status === 'pending');
  const resolved = filtered.filter(r => r.status !== 'pending');

  const RowCols = isManager
    ? ['Member', 'Requested By', 'Submitted', 'Status', 'Actions']
    : ['Member', 'Requested By', 'Submitted', 'Status'];

  return (
    <Layout>
      <PageHeader title="Requests">
        {user?.role === 'Sales' && <Btn size="sm" onClick={() => setShowNew(true)}>+ New Request</Btn>}
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>

        {/* ── Sales rep filter (manager only) ──────────────────── */}
        {isManager && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Filter by rep:
            </span>
            {/* All button */}
            <button
              onClick={() => setRepFilter('all')}
              style={{
                padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                background: repFilter === 'all' ? 'var(--navy)' : '#fff',
                border: `1px solid ${repFilter === 'all' ? 'var(--navy)' : 'var(--border-md)'}`,
                color: repFilter === 'all' ? '#fff' : 'var(--t2)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
              }}
            >
              All ({requests.length})
            </button>
            {/* One button per sales rep */}
            {salesReps.map(rep => {
              const count = requests.filter(r => r.requestedBy?._id === rep._id).length;
              const active = repFilter === rep._id;
              return (
                <button key={rep._id} onClick={() => setRepFilter(rep._id)} style={{
                  padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                  background: active ? 'var(--navy)' : '#fff',
                  border: `1px solid ${active ? 'var(--navy)' : 'var(--border-md)'}`,
                  color: active ? '#fff' : 'var(--t2)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}>
                  {rep.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* ── Pending ──────────────────────────────────────────── */}
        <Card noPad style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Pending ({pending.length})</span>
            {pending.length > 0 && (
              <span style={{ fontSize: 11, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-bd)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                Needs Review
              </span>
            )}
          </div>
          {!pending.length && !loading
            ? <EmptyState message="No pending requests" />
            : <Table loading={loading} skeletonRows={3} headers={RowCols}>
                {pending.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
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

        {/* ── History ──────────────────────────────────────────── */}
        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>History ({resolved.length})</span>
          </div>
          {!resolved.length
            ? <EmptyState message="No resolved requests" />
            : <Table headers={['Member', 'Requested By', 'Submitted', 'Status']}>
                {[...resolved].reverse().map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
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

      {user?.role === 'Sales' && (
        <NewRequestModal
          open={showNew}
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); fetchRequests(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title={confirm?.status === 'accepted' ? 'Accept Request' : 'Reject Request'}
        message={`Are you sure you want to ${confirm?.status} this assignment request?`}
        confirmLabel={confirm?.status === 'accepted' ? 'Accept' : 'Reject'}
        danger={confirm?.status === 'rejected'} loading={actionLoading}
      />
    </Layout>
  );
}

function NewRequestModal({ open, onClose, onSuccess }) {
  const [memberId, setMemberId] = useState('');
  const [loading,  setLoading]  = useState(false);
  const handleSubmit = async () => {
    if (!memberId.trim()) { toast.error('Member ID required.'); return; }
    setLoading(true);
    try {
      await createRequest(memberId.trim());
      toast.success('Request submitted.');
      setMemberId('');
      onSuccess();
    } catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setLoading(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Request Member Assignment" size="sm"
      footer={<>
        <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn size="sm" onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Send'}</Btn>
      </>}
    >
      <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.6 }}>
        Enter the System ID or Member ID of the member you want assigned to you. The request will go to your Sales Manager.
      </p>
      <Input
        label="Member System ID *"
        value={memberId}
        onChange={e => setMemberId(e.target.value)}
        placeholder="e.g. 100"
        hint="Found on the member's profile page."
      />
    </Modal>
  );
}
