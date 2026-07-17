import { useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, Btn, Modal, Select, Spinner, InfoRow, Badge, fmtDate } from '../../../components/ui';
import { assignSales, getSalesUsers } from '../../../api/endpoints';

/** Build a wa.me link from a stored phone (local EG numbers or international). */
function toWhatsAppUrl(phone) {
  if (!phone || phone === 'hidden') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  // 00-prefix international
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Already Egypt country code
  if (digits.startsWith('20') && digits.length >= 12) return `https://wa.me/${digits}`;
  // Local format e.g. 01012345678 / 0599123456 → drop leading 0, add +20
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `https://wa.me/20${digits}`;
}

function WhatsAppBtn({ phone, size = 'xs', fullWidth = false }) {
  const url = toWhatsAppUrl(phone);
  if (!url) return null;
  return (
    <Btn
      variant="success"
      size={size}
      fullWidth={fullWidth}
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
    >
      Chat on WhatsApp
    </Btn>
  );
}

export default function PersonalTab({ member, user, onRefresh }) {
  const [showAssign, setShowAssign] = useState(false);
  const [showPhone, setShowPhone]   = useState(false);
  const [salesUsers, setSalesUsers] = useState([]);
  const [selected, setSelected]     = useState(member.assignedSales?._id ?? '');
  const [loading, setLoading]       = useState(false);

  const canAssign = user?.role === 'Sales Manager' || user?.role === 'Owner' ||
    (user?.role === 'Receptionist' && !member.assignedSales);

  // Phone visibility: Sales Manager always, Sales only if assigned to this member, Receptionist/Owner always
  const isSalesManager = user?.role === 'Sales Manager';
  const isAssignedSales = user?.role === 'Sales' && member.assignedSales?._id === user?._id;
  const isReceptionist = user?.role === 'Receptionist';
  const isNonSalesRole = ['Owner', 'Accountant'].includes(user?.role);
  // If user has canViewPhones === false, they cannot see phone numbers (hide button)
  const phonePrivacyRestricted = user?.canViewPhones === false;
  const canSeePhone = !phonePrivacyRestricted && (isSalesManager || isAssignedSales || isReceptionist);
  // Owner/Accountant see phone directly, no button needed — unless restricted
  const showPhoneDirectly = !phonePrivacyRestricted && isNonSalesRole;
  const hasUsablePhone = Boolean(member.phones && member.phones !== 'hidden' && toWhatsAppUrl(member.phones));

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

  const phoneValue = (() => {
    if (showPhoneDirectly) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace' }}>{member.phones}</span>
          {hasUsablePhone && <WhatsAppBtn phone={member.phones} />}
        </div>
      );
    }
    if (canSeePhone) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="outline" size="xs" onClick={() => setShowPhone(true)}>Show Number</Btn>
          {hasUsablePhone && <WhatsAppBtn phone={member.phones} />}
        </div>
      );
    }
    return <span style={{ color: 'var(--t4)' }}>Hidden</span>;
  })();

  return (
    <>
      <Card>
        <CardHeader title="Personal Information">
          {canAssign && <Btn variant="outline" size="sm" onClick={openAssign}>Assign Sales Rep</Btn>}
        </CardHeader>
        <InfoRow label="Full Name"         value={member.name} />
        <InfoRow label="Phone"             value={phoneValue} />
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

      {/* Phone number popup */}
      <Modal open={showPhone} onClose={() => setShowPhone(false)} title="Phone Number" size="sm">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            {member.name}
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '1px', fontFamily: 'monospace', marginBottom: hasUsablePhone ? 16 : 0 }}>
            {member.phones}
          </p>
          {hasUsablePhone && <WhatsAppBtn phone={member.phones} size="sm" />}
        </div>
      </Modal>
    </>
  );
}
