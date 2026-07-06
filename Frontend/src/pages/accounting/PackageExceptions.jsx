import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, Table, Badge, Btn, ConfirmDialog, EmptyState, fmtDateTime, Pagination } from '../../components/ui';
import { getPackageExceptions, updatePackageExceptionStatus } from '../../api/endpoints';

const PAGE_SIZE = 10;

export default function PackageExceptions() {
  usePageTitle('Package Exceptions');
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [pendingPagination, setPendingPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [resolvedPagination, setResolvedPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [pendingPage, setPendingPage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingResolved, setLoadingResolved] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isReviewer = ['Accountant', 'Owner'].includes(user?.role);

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await getPackageExceptions({ status: 'pending', page: pendingPage, limit: PAGE_SIZE });
      setPending(res.data.requests ?? []);
      setPendingPagination(res.data.pagination ?? { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
    } catch {
      toast.error('Failed to load package exceptions.');
    } finally {
      setLoadingPending(false);
    }
  }, [pendingPage]);

  const fetchResolved = useCallback(async () => {
    setLoadingResolved(true);
    try {
      const res = await getPackageExceptions({ status: 'resolved', page: resolvedPage, limit: PAGE_SIZE });
      setResolved(res.data.requests ?? []);
      setResolvedPagination(res.data.pagination ?? { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
    } catch {
      toast.error('Failed to load exception history.');
    } finally {
      setLoadingResolved(false);
    }
  }, [resolvedPage]);

  const fetchRequests = useCallback(() => {
    fetchPending();
    fetchResolved();
  }, [fetchPending, fetchResolved]);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { fetchResolved(); }, [fetchResolved]);

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

  const headers = isReviewer
    ? ['Member', 'Package', 'Proposed By', 'Price Paid', 'Submitted', 'Status', 'Actions']
    : ['Member', 'Package', 'Proposed By', 'Price Paid', 'Submitted', 'Status'];

  return (
    <Layout>
      <PageHeader title="Package Exceptions" />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Card noPad style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Pending ({pendingPagination.total})</span>
            {pendingPagination.total > 0 && isReviewer && (
              <span style={{ fontSize: 11, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-bd)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Needs Review</span>
            )}
          </div>
          {!pending.length && !loadingPending
            ? <EmptyState message="No pending package exceptions" />
            : <>
            <Table loading={loadingPending} skeletonRows={3} headers={headers}>
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
            <Pagination
              page={pendingPagination.page}
              totalPages={pendingPagination.totalPages}
              total={pendingPagination.total}
              pageSize={pendingPagination.limit ?? PAGE_SIZE}
              onPageChange={setPendingPage}
            />
            </>
          }
        </Card>

        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>History ({resolvedPagination.total})</span>
          </div>
          {!resolved.length && !loadingResolved
            ? <EmptyState message="No resolved exceptions" />
            : <>
            <Table loading={loadingResolved} headers={['Member', 'Package', 'Proposed By', 'Reviewed By', 'Price Paid', 'Submitted', 'Status']}>
              {resolved.map(r => (
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
            <Pagination
              page={resolvedPagination.page}
              totalPages={resolvedPagination.totalPages}
              total={resolvedPagination.total}
              pageSize={resolvedPagination.limit ?? PAGE_SIZE}
              onPageChange={setResolvedPage}
            />
            </>
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
