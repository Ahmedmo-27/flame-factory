import { useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, Btn, Modal, Select, Spinner, InfoRow, Badge, fmtDate } from '../../../components/ui';
import { assignSales, getSalesUsers } from '../../../api/endpoints';

export default function PersonalTab({ member, user, onRefresh }) {
  const [showAssign, setShowAssign] = useState(false);
  const [salesUsers, setSalesUsers] = useState([]);
  const [selected, setSelected]     = useState(member.assignedSales?._id ?? '');
  const [loading, setLoading]       = useState(false);

  const canAssign    = ['Receptionist', 'Owner', 'Sales Manager'].includes(user?.role);

  const openAssign = async () => {
    try { const res = await getSalesUsers(); setSalesUsers(res.data.salesUsers ?? []); setSelected(member.assignedSales?._id ?? ''); }
    catch { toast.error('Failed to load sales users.'); }
    setShowAssign(true);
  };

  const handleAssign = async () => {
    if (!selected) { toast.error('Select a salesperson.'); return; }
    setLoading(true);
    try { await assignSales(member.systemId, selected); toast.success('Sales rep assigned.'); setShowAssign(false); onRefresh(); }
    catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Card>
        <CardHeader title="Personal Information">
          {canAssign && <Btn variant="outline" size="sm" onClick={openAssign}>Assign Sales Rep</Btn>}
        </CardHeader>
        <InfoRow label="Full Name"         value={member.name} />
        <InfoRow label="Phone"             value={member.phones} />
        <InfoRow label="Gender"            value={member.gender} />
        <InfoRow label="Birthdate"         value={fmtDate(member.birthdate)} />
        <InfoRow label="Source"            value={member.source} />
        <InfoRow label="System ID"         value={`#${member.systemId}`} />
        <InfoRow label="Member ID"         value={member.memberId ? `M${member.memberId}` : '—'} />
        <InfoRow label="Status"            value={<Badge status={member.status} />} />
        <InfoRow label="Added By"          value={member.createdBy?.name} />
        <InfoRow label="Added On"          value={fmtDate(member.createdAt)} />
        <InfoRow label="Assigned Sales Rep" value={member.assignedSales ? `${member.assignedSales.name} (${member.assignedSales.role})` : 'Unassigned'} />
      </Card>

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Sales Rep" size="sm"
        footer={<><Btn variant="ghost" size="sm" onClick={() => setShowAssign(false)}>Cancel</Btn><Btn size="sm" onClick={handleAssign} disabled={loading}>{loading ? <Spinner size="sm" /> : 'Assign'}</Btn></>}>
        <Select label="Salesperson" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Select —</option>
          {salesUsers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
        </Select>
      </Modal>
    </>
  );
}
