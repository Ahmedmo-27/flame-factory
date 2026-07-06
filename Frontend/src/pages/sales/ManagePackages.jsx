import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import {
  PageHeader, Card, CardHeader, Input, Select, Textarea, Btn,
  Spinner, Modal, ConfirmDialog, Table, EmptyState, fmtDate,
} from '../../components/ui';
import { getPackages, createPackage, updatePackage, deletePackage } from '../../api/endpoints';

const ACTIVITY_TYPES = ['gym', 'crossfit', 'box', 'mma', 'kickboxing', 'calisthenics'];
const DURATIONS      = ['1 month', '3 months', '6 months', '1 year'];

const EMPTY_FORM = {
  name: '',
  activityType: 'gym',
  duration: '1 month',
  price: '',
  freezeLimitDays: '0',
  invitationLimit: '0',
  renewalDiscountPercent: '0',
  description: '',
};

function validate(form) {
  const e = {};
  if (!form.name.trim())                      e.name  = 'Name is required';
  if (!form.price || Number(form.price) <= 0) e.price = 'Price must be greater than 0';
  if (Number(form.freezeLimitDays) < 0)       e.freezeLimitDays = 'Cannot be negative';
  if (Number(form.invitationLimit) < 0)       e.invitationLimit = 'Cannot be negative';
  const d = Number(form.renewalDiscountPercent);
  if (d < 0 || d > 100)                       e.renewalDiscountPercent = 'Must be 0–100';
  return e;
}

// ── Activity badge ────────────────────────────────────────────────────────────
const ACTIVITY_COLOR = {
  gym:          { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  crossfit:     { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  box:          { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  mma:          { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
  kickboxing:   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  calisthenics: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
};
function ActivityBadge({ type }) {
  const c = ACTIVITY_COLOR[type] ?? { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'capitalize',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{type}</span>
  );
}

// ── Package form ──────────────────────────────────────────────────────────────
function PackageForm({ form, onChange, errors }) {
  const set = (k, v) => onChange({ ...form, [k]: v });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Input
        label="Package Name *" value={form.name} error={errors.name}
        onChange={e => set('name', e.target.value)} placeholder="e.g. Gold Membership"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Select label="Activity Type" value={form.activityType} onChange={e => set('activityType', e.target.value)}>
          {ACTIVITY_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select label="Duration *" value={form.duration} onChange={e => set('duration', e.target.value)}>
          {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>
      <Input
        label="Price (EGP) *" type="number" min="0" value={form.price} error={errors.price}
        onChange={e => set('price', e.target.value)} placeholder="0"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Input
          label="Freeze Limit (days)" type="number" min="0"
          value={form.freezeLimitDays} error={errors.freezeLimitDays}
          onChange={e => set('freezeLimitDays', e.target.value)}
          hint="Max freeze days"
        />
        <Input
          label="Invitation Slots" type="number" min="0"
          value={form.invitationLimit} error={errors.invitationLimit}
          onChange={e => set('invitationLimit', e.target.value)}
        />
        <Input
          label="Renewal Discount %" type="number" min="0" max="100"
          value={form.renewalDiscountPercent} error={errors.renewalDiscountPercent}
          onChange={e => set('renewalDiscountPercent', e.target.value)}
        />
      </div>
      <Textarea
        label="Description" value={form.description}
        onChange={e => set('description', e.target.value)}
        placeholder="Optional notes…" rows={3}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ManagePackages() {
  usePageTitle('Packages');

  const [packages, setPackages] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState(EMPTY_FORM);
  const [createErrors,  setCreateErrors]  = useState({});
  const [creating,      setCreating]      = useState(false);

  const [editTarget,  setEditTarget]  = useState(null);
  const [editForm,    setEditForm]    = useState(EMPTY_FORM);
  const [editErrors,  setEditErrors]  = useState({});
  const [editing,     setEditing]     = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPackages();
      setPackages(res.data.packages ?? []);
    } catch { toast.error('Failed to load packages'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const errs = validate(createForm);
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }
    setCreating(true);
    try {
      await createPackage({
        name:                   createForm.name.trim(),
        activityType:           createForm.activityType,
        duration:               createForm.duration,
        price:                  Number(createForm.price),
        freezeLimitDays:        Number(createForm.freezeLimitDays),
        invitationLimit:        Number(createForm.invitationLimit),
        renewalDiscountPercent: Number(createForm.renewalDiscountPercent),
        description:            createForm.description.trim() || null,
      });
      toast.success('Package created');
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setCreateErrors({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create package');
    } finally { setCreating(false); }
  };

  // ── Edit ────────────────────────────────────────────────────────────────
  const openEdit = pkg => {
    setEditTarget(pkg);
    setEditForm({
      name:                   pkg.name,
      activityType:           pkg.activityType,
      duration:               pkg.duration,
      price:                  String(pkg.price),
      freezeLimitDays:        String(pkg.freezeLimitDays ?? 0),
      invitationLimit:        String(pkg.invitationLimit ?? 0),
      renewalDiscountPercent: String(pkg.renewalDiscountPercent ?? 0),
      description:            pkg.description ?? '',
    });
    setEditErrors({});
  };

  const handleEdit = async () => {
    const errs = validate(editForm);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setEditing(true);
    try {
      await updatePackage(editTarget._id, {
        name:                   editForm.name.trim(),
        activityType:           editForm.activityType,
        duration:               editForm.duration,
        price:                  Number(editForm.price),
        freezeLimitDays:        Number(editForm.freezeLimitDays),
        invitationLimit:        Number(editForm.invitationLimit),
        renewalDiscountPercent: Number(editForm.renewalDiscountPercent),
        description:            editForm.description.trim() || null,
      });
      toast.success('Package updated');
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update package');
    } finally { setEditing(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePackage(deleteTarget._id);
      toast.success('Package deactivated');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete package');
    } finally { setDeleting(false); }
  };

  return (
    <Layout>
      <PageHeader title="Packages">
        <Btn variant="blue" size="sm" onClick={() => { setCreateForm(EMPTY_FORM); setCreateErrors({}); setShowCreate(true); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Package
        </Btn>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Card noPad>
          <CardHeader title={`Active Packages (${packages.length})`} />
          <Table
            headers={['Name', 'Activity', 'Duration', 'Price', 'Freeze', 'Invites', 'Discount', 'Created', '']}
            loading={loading} skeletonRows={4}
          >
            {!loading && packages.length === 0 && (
              <tr><td colSpan={9}><EmptyState icon="📦" message="No packages yet" sub="Create your first package above" /></td></tr>
            )}
            {packages.map(pkg => (
              <tr key={pkg._id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>
                  {pkg.name}
                  {pkg.description && (
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, fontWeight: 400 }}>
                      {pkg.description.length > 60 ? pkg.description.slice(0, 60) + '…' : pkg.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '11px 14px' }}><ActivityBadge type={pkg.activityType} /></td>
                <td style={{ padding: '11px 14px', color: 'var(--t2)', fontSize: 13 }}>{pkg.duration}</td>
                <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--t1)', fontSize: 13 }}>
                  {pkg.price.toLocaleString()} EGP
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--t2)', fontSize: 13 }}>
                  {pkg.freezeLimitDays > 0 ? `${pkg.freezeLimitDays}d` : <span style={{ color: 'var(--t4)' }}>—</span>}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--t2)', fontSize: 13 }}>
                  {pkg.invitationLimit > 0 ? pkg.invitationLimit : <span style={{ color: 'var(--t4)' }}>—</span>}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>
                  {pkg.renewalDiscountPercent > 0
                    ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{pkg.renewalDiscountPercent}%</span>
                    : <span style={{ color: 'var(--t4)' }}>—</span>}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--t4)', fontSize: 12 }}>{fmtDate(pkg.createdAt)}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Btn variant="outline" size="xs" onClick={() => openEdit(pkg)}>Edit</Btn>
                    <Btn variant="danger"  size="xs" onClick={() => setDeleteTarget(pkg)}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Package" size="md"
        footer={<>
          <Btn variant="ghost" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Btn>
          <Btn variant="blue"  size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Spinner size="sm" /> : 'Create Package'}
          </Btn>
        </>}
      >
        <PackageForm form={createForm} onChange={setCreateForm} errors={createErrors} />
      </Modal>

      {/* Edit */}
      <Modal open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name ?? ''}`} size="md"
        footer={<>
          <Btn variant="ghost" size="sm" onClick={() => setEditTarget(null)} disabled={editing}>Cancel</Btn>
          <Btn variant="blue"  size="sm" onClick={handleEdit} disabled={editing}>
            {editing ? <Spinner size="sm" /> : 'Save Changes'}
          </Btn>
        </>}
      >
        <PackageForm form={editForm} onChange={setEditForm} errors={editErrors} />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Deactivate Package"
        message={`Deactivate "${deleteTarget?.name}"? It will no longer appear when assigning packages to members.`}
        confirmLabel="Deactivate" danger loading={deleting}
      />
    </Layout>
  );
}
