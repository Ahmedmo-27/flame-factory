import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import useDebounce from '../../hooks/useDebounce';
import Layout from '../../components/Layout';
import { PageHeader, Card, StatCard, Table, Badge, FilterTabs, Modal, Input, Select, Btn, Spinner, EmptyState, SearchInput, Avatar, fmtDate, Pagination } from '../../components/ui';
import { getAllMembers, createMember, getPackages, getSalesUsers } from '../../api/endpoints';

const PAGE_SIZE = 20;

export default function SalesMembers() {
  usePageTitle('Members');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members,  setMembers]  = useState([]);
  const [packages, setPackages] = useState([]);
  const [sales,    setSales]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [stats, setStats] = useState({ total: 0, active: 0, frozen: 0, expired: 0, guest: 0 });
  const [showAdd,  setShowAdd]  = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllMembers({ all: 'true' });
      const allMembers = res.data.members ?? [];
      setMembers(allMembers);
      // Calculate stats client-side
      setStats({
        total:   allMembers.length,
        active:  allMembers.filter(m => m.status === 'active').length,
        frozen:  allMembers.filter(m => m.status === 'frozen').length,
        expired: allMembers.filter(m => m.status === 'expired').length,
        guest:   allMembers.filter(m => m.status === 'guest').length,
      });
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  }, []);

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

  // Client-side filtering
  const filtered = members.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!m.name?.toLowerCase().includes(q) && !m.phones?.includes(q) && !String(m.systemId).includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <PageHeader title="Members">
        <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, ID…" width={200} />
        <Btn size="sm" onClick={() => setShowAdd(true)}>+ Add Guest</Btn>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <StatCard label="Total"   value={loading ? '—' : stats.total}   color="brand" />
          <StatCard label="Active"  value={loading ? '—' : stats.active}  color="success" />
          <StatCard label="Frozen"  value={loading ? '—' : stats.frozen}  color="info" />
          <StatCard label="Expired" value={loading ? '—' : stats.expired} color="danger" />
          <StatCard label="Guests"  value={loading ? '—' : stats.guest} />
        </div>

        <FilterTabs active={filter} onChange={setFilter} options={[
          { value: 'all',     label: `All (${stats.total})` },
          { value: 'active',  label: `Active (${stats.active})` },
          { value: 'frozen',  label: `Frozen (${stats.frozen})` },
          { value: 'expired', label: `Expired (${stats.expired})` },
          { value: 'guest',   label: `Guests (${stats.guest})` },
        ]} />

        <Card noPad>
          <Table loading={loading} skeletonRows={8} headers={['ID', 'Name', 'Phone', 'Status', 'Package', 'Expires', '']}>
            {!paginated.length && !loading
              ? <tr><td colSpan={7}><EmptyState message="No members found" /></td></tr>
              : paginated.map(m => {
                  const sub = m.subscriptions?.at(-1);
                  const pkg = sub?.package;
                  return (
                    <tr key={m._id} className="tbl-row" onClick={() => navigate(`/members/${m.systemId}`)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>#{m.systemId}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={m.name} size="sm" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{m.phones}</td>
                      <td style={{ padding: '10px 14px' }}><Badge status={m.status} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{pkg ? `${pkg.name} · ${pkg.duration}` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{fmtDate(sub?.endDate)}</td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <Btn variant="outline" size="xs" onClick={() => navigate(`/members/${m.systemId}`)}>View</Btn>
                      </td>
                    </tr>
                  );
                })}
          </Table>
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </Card>
      </div>

      <AddGuestModal open={showAdd} onClose={() => setShowAdd(false)} packages={packages} sales={sales}
        currentUser={user} onSuccess={() => { setShowAdd(false); fetchMembers(); }} />
    </Layout>
  );
}

function AddGuestModal({ open, onClose, packages, sales, currentUser, onSuccess }) {
  const init = { name: '', phones: '', gender: '', source: '', assignedSales: '' };
  const [form, setForm] = useState(init);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => { const e = {}; if (!form.name.trim()) e.name = 'Required'; if (!form.phones.trim()) e.phones = 'Required'; setErrors(e); return !Object.keys(e).length; };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createMember({ name: form.name.trim(), phones: form.phones.trim(), gender: form.gender || null, source: form.source || null, assignedSales: form.assignedSales || currentUser?._id || null });
      toast.success('Guest added!');
      setForm(init); setErrors({}); onSuccess();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Guest / Member"
      footer={<><Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn><Btn size="sm" onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Add'}</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
        <Input label="Phone *" value={form.phones} onChange={e => set('phones', e.target.value)} error={errors.phones} />
        <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
          <option value="">— Select —</option><option value="male">Male</option><option value="female">Female</option>
        </Select>
        <Select label="Source" value={form.source} onChange={e => set('source', e.target.value)}>
          <option value="">— Select —</option>
          {['Social media','Walk in','Word of mouth','referral','sales call','data entry','others'].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <Select label="Assign Sales Rep" value={form.assignedSales} onChange={e => set('assignedSales', e.target.value)}>
        <option value="">— None —</option>
        {sales.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
      </Select>
    </Modal>
  );
}
