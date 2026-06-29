import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, Table, Badge, Btn, Spinner, EmptyState, Avatar, fmtDate, Skeleton, Modal, Select } from '../../components/ui';
import { getSalesProfile, getSalesUsers, updateSalesRepTarget, bulkTransferSalesReps } from '../../api/endpoints';

export default function SalesPersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'Sales Manager';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const [salesUsers, setSalesUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [transferTo, setTransferTo] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);

  usePageTitle(data?.user?.name ?? 'Sales Profile');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesProfile(id);
      setData(res.data);
      setTargetInput(String(res.data?.user?.monthlyTarget ?? 0));
    } catch { toast.error('Failed to load profile.'); navigate(-1); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!isManager) return;
    getSalesUsers()
      .then((res) => setSalesUsers(res.data.salesUsers ?? []))
      .catch(() => {});
  }, [isManager]);

  const user    = data?.user;
  const stats   = data?.stats;
  const members = data?.members ?? [];
  const isSalesRep = user?.role === 'Sales';

  const filtered = filter === 'all' ? members : members.filter(m => m.status === filter);

  const pct = user?.monthlyTarget > 0
    ? Math.min(100, Math.round(((stats?.monthlyRevenue ?? 0) / user.monthlyTarget) * 100))
    : null;

  const handleSaveTarget = async () => {
    const target = Number(targetInput);
    if (isNaN(target) || target < 0) {
      toast.error('Target must be a number >= 0');
      return;
    }
    setSavingTarget(true);
    try {
      await updateSalesRepTarget(id, target);
      toast.success('Target updated');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update target');
    } finally {
      setSavingTarget(false);
    }
  };

  const toggleSelect = (memberId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m._id)));
    }
  };

  const handleTransfer = async (transferAll = false) => {
    if (!transferTo) {
      toast.error('Select a destination sales rep');
      return;
    }
    if (!transferAll && !selectedIds.size) {
      toast.error('Select at least one member');
      return;
    }
    setTransferring(true);
    try {
      const payload = {
        fromSalesRepId: id,
        toSalesRepId: transferTo,
      };
      if (!transferAll) {
        payload.memberIds = [...selectedIds];
      }
      const res = await bulkTransferSalesReps(payload);
      toast.success(`Transferred ${res.data.transferredCount} member(s)`);
      setSelectedIds(new Set());
      setTransferTo('');
      setShowTransfer(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const transferOptions = salesUsers.filter((s) => s._id !== id);

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
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
              <div style={{ marginBottom: pct !== null ? 0 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Target</span>
                  {pct !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--t2)' }}>
                      EGP {(stats?.monthlyRevenue ?? 0).toLocaleString()} / {user.monthlyTarget.toLocaleString()} — {pct}%
                    </span>
                  )}
                </div>

                {isManager && isSalesRep ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: pct !== null ? 10 : 0 }}>
                    <input
                      type="number"
                      min="0"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: 13,
                        border: '1px solid var(--border)', borderRadius: 5,
                        fontFamily: 'inherit',
                      }}
                      placeholder="Monthly target (EGP)"
                    />
                    <Btn size="sm" onClick={handleSaveTarget} disabled={savingTarget}>
                      {savingTarget ? <Spinner size="sm" /> : 'Save'}
                    </Btn>
                  </div>
                ) : user?.monthlyTarget > 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
                    Target: EGP {user.monthlyTarget.toLocaleString()}
                  </div>
                ) : null}

                {pct !== null && (
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 3,
                      background: pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--blue)' : 'var(--amber)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                )}
              </div>
            </Card>

            {/* Members table */}
            <Card noPad>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  Assigned Members ({filtered.length}{filter !== 'all' ? ` of ${members.length}` : ''})
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {isManager && members.length > 0 && (
                    <Btn size="sm" variant="ghost" onClick={() => setShowTransfer(true)}>
                      Transfer Members
                    </Btn>
                  )}
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
              </div>

              {!filtered.length ? (
                <EmptyState message="No members match this filter" />
              ) : (
                <Table headers={[
                  ...(isManager ? [''] : []),
                  'ID', 'Name', 'Phone', 'Status', 'Package', 'Expires',
                ]}>
                  {filtered.map(m => {
                    const sub = m.subscriptions?.at(-1);
                    const pkg = sub?.package;
                    const selected = selectedIds.has(m._id);
                    return (
                      <tr key={m._id} className="tbl-row" onClick={() => navigate(`/members/${m.systemId}`)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                        {isManager && (
                          <td style={{ padding: '10px 14px', width: 36 }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(m._id)}
                            />
                          </td>
                        )}
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

      <Modal
        open={showTransfer}
        onClose={() => !transferring && setShowTransfer(false)}
        title="Transfer Members"
        footer={
          <>
            <Btn variant="ghost" size="sm" onClick={() => setShowTransfer(false)} disabled={transferring}>Cancel</Btn>
            <Btn size="sm" variant="ghost" onClick={() => handleTransfer(true)} disabled={transferring || !transferTo}>
              Transfer All ({members.length})
            </Btn>
            <Btn size="sm" onClick={() => handleTransfer(false)} disabled={transferring || !transferTo || !selectedIds.size}>
              {transferring ? <Spinner size="sm" /> : `Transfer Selected (${selectedIds.size})`}
            </Btn>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14 }}>
          Transfer members from <strong>{user?.name}</strong> to another sales representative.
        </p>
        <Select label="Transfer to" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
          <option value="">— Select sales rep —</option>
          {transferOptions.map((s) => (
            <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
          ))}
        </Select>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="select-all" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
          <label htmlFor="select-all" style={{ fontSize: 12, color: 'var(--t3)', cursor: 'pointer' }}>
            Select all visible ({filtered.length})
          </label>
        </div>
      </Modal>
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
