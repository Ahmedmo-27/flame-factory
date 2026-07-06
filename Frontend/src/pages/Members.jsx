import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';
import useDebounce from '../hooks/useDebounce';
import Layout from '../components/Layout';
import { PageHeader, Card, CardHeader, StatCard, Table, Badge, FilterTabs, Modal, Input, Select, Btn, Spinner, EmptyState, SearchInput, Avatar, fmtDate, Pagination } from '../components/ui';
import { getAllMembers, createMember, getPackages, getSalesUsers } from '../api/endpoints';

const PAGE_SIZE = 20;

export default function Members() {
  usePageTitle('Members');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers]   = useState([]);
  const [packages, setPackages] = useState([]);
  const [sales, setSales]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [stats, setStats]       = useState({ total: 0, active: 0, frozen: 0, expired: 0, guest: 0 });
  const [showAdd, setShowAdd]   = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const canAdd = ['Receptionist', 'Owner', 'Sales Manager'].includes(user?.role);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllMembers({
        page,
        limit: PAGE_SIZE,
        status: filter,
        search: debouncedSearch || undefined,
      });
      setMembers(res.data.members ?? []);
      setPagination(res.data.pagination ?? { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
      if (res.data.stats) setStats(res.data.stats);
    } catch { toast.error('Failed to load members.'); }
    finally { setLoading(false); }
  }, [page, filter, debouncedSearch]);

  const fetchMeta = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        getPackages({ limit: 100 }),
        getSalesUsers(),
      ]);
      setPackages(pRes.data.packages ?? []);
      setSales(sRes.data.salesUsers ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);

  const paginated = members;

  return (
    <Layout>
      <PageHeader title="Members">
        <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, ID…" width={210} />
        {canAdd && <Btn size="sm" onClick={() => setShowAdd(true)}>+ Add Person</Btn>}
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <StatCard label="Total"   value={loading ? '—' : stats.total}   color="brand" />
          <StatCard label="Active"  value={loading ? '—' : stats.active}  color="success" />
          <StatCard label="Frozen"  value={loading ? '—' : stats.frozen}  color="info" />
          <StatCard label="Expired" value={loading ? '—' : stats.expired} color="danger" />
          <StatCard label="Guests"  value={loading ? '—' : stats.guest} />
        </div>

        {/* Toolbar row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <FilterTabs active={filter} onChange={setFilter} options={[
            { value: 'all',     label: `All (${stats.total})` },
            { value: 'active',  label: `Active (${stats.active})` },
            { value: 'frozen',  label: `Frozen (${stats.frozen})` },
            { value: 'expired', label: `Expired (${stats.expired})` },
            { value: 'guest',   label: `Guests (${stats.guest})` },
          ]} />
        </div>

        {/* Table card */}
        <Card noPad>
          <Table loading={loading} skeletonRows={8}
            headers={['ID', 'Name', 'Phone', 'Status', 'Package', 'Expires', 'Sales Rep', '']}>
            {!paginated.length && !loading
              ? <tr><td colSpan={8}><EmptyState message="No members match your search" /></td></tr>
              : paginated.map(m => {
                  const sub = m.subscriptions?.at(-1);
                  const pkg = sub?.package;
                  const expiring = sub?.endDate && (new Date(sub.endDate) - new Date()) / 86400000 <= 7 && (new Date(sub.endDate) - new Date()) >= 0;
                  return (
                    <tr key={m._id} className="tbl-row" onClick={() => navigate(`/members/${m.systemId}`)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>
                        #{m.systemId}{m.memberId ? ` / M${m.memberId}` : ''}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={m.name} size="sm" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{m.phones ?? '—'}</td>
                      <td style={{ padding: '10px 14px' }}><Badge status={m.status} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {pkg ? <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{pkg.name}<br /><span style={{ color: 'var(--t4)', fontSize: 11 }}>{pkg.activityType} · {pkg.duration}</span></span> : <span style={{ color: 'var(--t4)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: expiring ? 'var(--amber)' : 'var(--t3)', fontWeight: expiring ? 600 : 400 }}>
                        {fmtDate(sub?.endDate)}{expiring && <span style={{ display: 'block', fontSize: 10, color: 'var(--amber)' }}>Expiring soon</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>
                        {m.assignedSales?.name ?? <span style={{ color: 'var(--t4)' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <Btn variant="outline" size="xs" onClick={() => navigate(`/members/${m.systemId}`)}>View</Btn>
                      </td>
                    </tr>
                  );
                })}
          </Table>
          {!loading && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.limit ?? PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </Card>
      </div>

      {canAdd && <AddPersonModal open={showAdd} onClose={() => setShowAdd(false)} packages={packages} sales={sales} onSuccess={() => { setShowAdd(false); fetchMembers(); }} />}
    </Layout>
  );
}

function AddPersonModal({ open, onClose, packages, sales, onSuccess }) {
  const init = { name: '', phones: '', nationalId: '', gender: '', birthdate: '', source: '', packageId: '', assignedSales: '' };
  const [form, setForm] = useState(init);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name   = 'Name is required';
    if (!form.phones.trim()) e.phones = 'Phone is required';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createMember({ name: form.name.trim(), phones: form.phones.trim(), nationalId: form.nationalId || null, gender: form.gender || null, birthdate: form.birthdate || null, source: form.source || null, packageId: form.packageId || null, assignedSales: form.assignedSales || null });
      toast.success(form.packageId ? 'Member created!' : 'Guest added!');
      setForm(init); setErrors({}); onSuccess();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Person"
      footer={<><Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn><Btn size="sm" onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Add'}</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
        <Input label="Phone *" value={form.phones} onChange={e => set('phones', e.target.value)} error={errors.phones} />
        <Input label="National ID" value={form.nationalId} onChange={e => set('nationalId', e.target.value)} />
        <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
          <option value="">— Select —</option><option value="male">Male</option><option value="female">Female</option>
        </Select>
        <Input label="Birthdate" type="date" value={form.birthdate} onChange={e => set('birthdate', e.target.value)} />
        <Select label="Source" value={form.source} onChange={e => set('source', e.target.value)}>
          <option value="">— Select —</option>
          {['Social media','Walk in','Word of mouth','referral','sales call','data entry','others'].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <Select label="Package (leave empty for guest)" value={form.packageId} onChange={e => set('packageId', e.target.value)}>
        <option value="">— Guest —</option>
        {packages.map(p => <option key={p._id} value={p._id}>{p.name} – {p.duration} ({p.activityType}) — EGP {p.price}</option>)}
      </Select>
      <Select label="Assign Sales Rep" value={form.assignedSales} onChange={e => set('assignedSales', e.target.value)}>
        <option value="">— None —</option>
        {sales.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
      </Select>
    </Modal>
  );
}
