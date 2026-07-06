import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import useDebounce from '../../hooks/useDebounce';
import Layout from '../../components/Layout';
import {
  PageHeader, Card, CardHeader, Table, Badge, Btn, Spinner, EmptyState,
  SearchInput, Avatar, Select, Input, Pagination,
} from '../../components/ui';
import { getAllMembers, getSalesUsers, bulkTransferSalesReps, switchSalesRep } from '../../api/endpoints';

const PAGE_SIZE = 25;

export default function Transfer() {
  usePageTitle('Transfer');

  const [members, setMembers]       = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [transferring, setTransferring] = useState(false);

  const [search, setSearch]         = useState('');
  const [repFilter, setRepFilter]   = useState('all');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [transferTo, setTransferTo] = useState('');

  const [quickId, setQuickId]       = useState('');
  const [quickTo, setQuickTo]       = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      };
      if (repFilter === 'unassigned') params.unassigned = 'true';
      else if (repFilter !== 'all') params.assignedSales = repFilter;

      const res = await getAllMembers(params);
      setMembers(res.data.members ?? []);
      setPagination(res.data.pagination ?? { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
    } catch {
      toast.error('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [page, repFilter, debouncedSearch]);

  const fetchSalesUsers = useCallback(async () => {
    try {
      const sRes = await getSalesUsers();
      setSalesUsers(sRes.data.salesUsers ?? []);
    } catch {
      toast.error('Failed to load sales users.');
    }
  }, []);

  useEffect(() => { fetchSalesUsers(); }, [fetchSalesUsers]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(1); }, [repFilter, debouncedSearch]);

  const paginated = members;

  const repName = (rep) => {
    if (!rep) return 'Unassigned';
    return typeof rep === 'object' ? rep.name : salesUsers.find((s) => s._id === rep)?.name ?? '—';
  };

  const toggleSelect = (memberId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = paginated.map((m) => m._id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkTransfer = async () => {
    if (!transferTo) {
      toast.error('Select a destination sales rep');
      return;
    }
    if (!selectedIds.size) {
      toast.error('Select at least one member');
      return;
    }
    setTransferring(true);
    try {
      const res = await bulkTransferSalesReps({
        toSalesRepId: transferTo,
        memberIds: [...selectedIds],
      });
      toast.success(`Transferred ${res.data.transferredCount} member(s)`);
      setSelectedIds(new Set());
      fetchMembers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleQuickTransfer = async (e) => {
    e.preventDefault();
    if (!quickId.trim()) {
      toast.error('Enter a member system ID');
      return;
    }
    if (!quickTo) {
      toast.error('Select a destination sales rep');
      return;
    }
    setQuickLoading(true);
    try {
      await switchSalesRep(quickId.trim(), quickTo);
      toast.success('Member transferred successfully');
      setQuickId('');
      fetchMembers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Transfer failed');
    } finally {
      setQuickLoading(false);
    }
  };

  const destLabel = salesUsers.find((s) => s._id === transferTo)?.name;

  return (
    <Layout>
      <PageHeader title="Transfer">
        <Select
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="">Transfer to…</option>
          {salesUsers.map((s) => (
            <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
          ))}
        </Select>
        <Btn
          size="sm"
          onClick={handleBulkTransfer}
          disabled={transferring || !transferTo || !selectedIds.size}
        >
          {transferring ? <Spinner size="sm" /> : `Transfer Selected (${selectedIds.size})`}
        </Btn>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Card>
          <div style={{ padding: '16px 16px 0' }}>
            <CardHeader title="Quick Transfer" />
            <p style={{ fontSize: 12, color: 'var(--t4)', margin: '-8px 0 12px' }}>Assign one member by system ID</p>
          </div>
          <form onSubmit={handleQuickTransfer} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', padding: '0 16px 16px' }}>
            <Input
              label="System ID"
              value={quickId}
              onChange={(e) => setQuickId(e.target.value)}
              placeholder="e.g. 150"
              style={{ width: 140 }}
            />
            <Select
              label="Transfer to"
              value={quickTo}
              onChange={(e) => setQuickTo(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Select sales rep…</option>
              {salesUsers.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
              ))}
            </Select>
            <Btn type="submit" size="sm" disabled={quickLoading || !quickId.trim() || !quickTo}>
              {quickLoading ? <Spinner size="sm" /> : 'Transfer'}
            </Btn>
          </form>
        </Card>

        <Card>
          <div style={{ padding: '16px 16px 0' }}>
            <CardHeader title="Bulk Transfer" />
            <p style={{ fontSize: 12, color: 'var(--t4)', margin: '-8px 0 12px' }}>
              {destLabel ? `Selected members will be assigned to ${destLabel}` : 'Select members and a destination sales rep above'}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 16px 12px', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, ID…" width={200} />
            <Select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} style={{ minWidth: 180 }}>
              <option value="all">All members</option>
              <option value="unassigned">Unassigned</option>
              {salesUsers.map((s) => (
                <option key={s._id} value={s._id}>Assigned to {s.name}</option>
              ))}
            </Select>
            {selectedIds.size > 0 && (
              <Btn variant="ghost" size="xs" onClick={() => setSelectedIds(new Set())}>Clear selection</Btn>
            )}
            {paginated.length > 0 && (
              <Btn variant="ghost" size="xs" onClick={toggleSelectPage}>
                {paginated.every((m) => selectedIds.has(m._id)) ? 'Deselect page' : 'Select page'}
              </Btn>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="lg" /></div>
          ) : !paginated.length ? (
            <EmptyState message="No members match your filters" />
          ) : (
            <>
              <Table headers={['', 'ID', 'Name', 'Current Sales Rep', 'Status', 'Phone']}>
                {paginated.map((m) => {
                  const selected = selectedIds.has(m._id);
                  return (
                    <tr
                      key={m._id}
                      className="tbl-row"
                      onClick={() => toggleSelect(m._id)}
                      style={{ cursor: 'pointer', background: selected ? 'var(--sky-bg)' : undefined }}
                    >
                      <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(m._id)}
                        />
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>
                        #{m.systemId}{m.memberId ? ` / M${m.memberId}` : ''}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={m.name} size="sm" />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>
                        {repName(m.assignedSales)}
                      </td>
                      <td style={{ padding: '10px 14px' }}><Badge status={m.status} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{m.phones ?? '—'}</td>
                    </tr>
                  );
                })}
              </Table>

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.limit ?? PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
