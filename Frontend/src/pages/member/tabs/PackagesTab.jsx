import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, Badge, Table, EmptyState, fmtDate, fmtDateTime, Btn, Modal, Input, Select, Spinner, ConfirmDialog, Switch, Alert } from '../../../components/ui';
import { getPackages, getMemberPendingException, createPackageException, updatePackageExceptionStatus, assignPackage, createPackage } from '../../../api/endpoints';
import CatalogPackageForm, { EMPTY_PACKAGE_FORM, validatePackageForm, packageFormToPayload } from '../../../components/PackageForm';

const ACTIVITY_TYPES = ['gym', 'crossfit', 'box', 'mma', 'kickboxing', 'calisthenics'];
const DURATIONS = ['1 month', '3 months', '6 months', '1 year'];

const EMPTY_FORM = {
  basePackageId: '', name: '', activityType: 'gym', duration: '1 month',
  price: '', freezeLimitDays: '0', invitationLimit: '0', renewalDiscountPercent: '0',
  description: '', pricePaid: '', discountPercent: '0', startDate: '', reason: '',
};

export default function PackagesTab({ member, user, onRefresh }) {
  const [pending, setPending] = useState(null);
  const [loadingPending, setLoadingPending] = useState(true);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isSalesManager = user?.role === 'Sales Manager';
  const isAccountant = ['Accountant', 'Owner'].includes(user?.role);
  const canAddPackage = isSalesManager || isAccountant;
  const memberKey = member.systemId ?? member._id;

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await getMemberPendingException(memberKey);
      setPending(res.data?.request ?? null);
    } catch {
      setPending(null);
    } finally {
      setLoadingPending(false);
    }
  }, [memberKey]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleReview = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await updatePackageExceptionStatus(confirm.id, confirm.status, confirm.reviewNote);
      toast.success(`Package ${confirm.status === 'accepted' ? 'confirmed' : 'declined'}.`);
      setConfirm(null);
      fetchPending();
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const subs    = member.subscriptions ?? [];
  const lastSub = subs.at(-1);
  const pkg     = lastSub?.package;

  const details = pkg ? [
    { label: 'Package',          value: pkg.name },
    { label: 'Activity',         value: pkg.activityType },
    { label: 'Duration',         value: pkg.duration },
    { label: 'Created At',       value: fmtDateTime(lastSub.createdAt) },
    { label: 'Start',            value: fmtDate(lastSub.startDate) },
    { label: 'Expiry',           value: fmtDate(lastSub.endDate) },
    { label: 'Price Paid',       value: `EGP ${lastSub.pricePaid}` },
    { label: 'Discount',         value: lastSub.discountPercent ? `${lastSub.discountPercent}%` : 'None' },
    { label: 'Freeze Limit',     value: `${pkg.freezeLimitDays ?? 0} days` },
    { label: 'Invitation Slots', value: `${pkg.invitationLimit ?? 0}` },
    { label: 'Renewal Discount', value: pkg.renewalDiscountPercent ? `${pkg.renewalDiscountPercent}%` : 'None' },
    { label: 'Exception',        value: pkg.hasException ? 'Yes' : 'No' },
    { label: 'Type',             value: lastSub.isRenewal ? 'Renewal' : 'New subscription' },
    { label: 'Sold By',          value: lastSub.createdBy?.name },
    { label: 'Status',           value: <Badge status={member.status} /> },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!loadingPending && pending && (
        <Card style={{ borderColor: 'var(--amber-bd)' }}>
          <CardHeader title="Pending Package Assignment">
            <Badge status="pending" />
          </CardHeader>
          <Alert type="warning">
            {pending.notificationMessage ||
              `${pending.proposedBy?.name} added package ${pending.name} with exception to member ${member.name}`}
          </Alert>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
            This package has <strong>hasException</strong> enabled and is waiting for accountant approval before it is added to this member&apos;s profile.
          </div>
          <PackageFormFields form={requestToForm(pending)} readOnly makeException />
          {pending.reason && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--t2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
              <span style={{ fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.4px' }}>Reason: </span>
              {pending.reason}
            </div>
          )}
          {isAccountant && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn variant="success" size="sm" onClick={() => setConfirm({ id: pending._id, status: 'accepted' })}>Confirm</Btn>
              <Btn variant="danger" size="sm" onClick={() => setConfirm({ id: pending._id, status: 'rejected' })}>Decline</Btn>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Active Package">
          {canAddPackage && !loadingPending && (
            <Btn size="xs" onClick={() => setShowAddPackage(true)}>{isSalesManager ? '+ Request Package' : '+ Add Package'}</Btn>
          )}
        </CardHeader>
        {!pkg || member.status === 'guest'
          ? <EmptyState message="No active package" sub={isSalesManager && !pending ? 'Submit a package request — the accountant must approve before it is assigned.' : isAccountant && !pending ? 'Click Add Package to assign a package to this member.' : 'No package assigned yet.'} />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {details.map(d => (
                <div key={d.label} style={{ background: 'var(--card)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--t4)', marginBottom: 4 }}>{d.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{d.value ?? '—'}</div>
                </div>
              ))}
            </div>
        }
      </Card>

      <Card noPad>
        <div style={{ padding: '14px 18px 0' }}>
          <CardHeader title={`Subscription History (${subs.length})`} />
        </div>
        {!subs.length ? <EmptyState message="No subscriptions on record" /> :
          <Table headers={['Sub #', 'Package', 'Activity', 'Duration', 'Created At', 'Start', 'End', 'Price', 'Discount', 'Exception', 'Renewal']}>
            {[...subs].reverse().map((s, i) => (
              <tr key={s._id ?? i} className="tbl-row" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>{s.subscriptionId ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{s.package?.name ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.package?.activityType ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{s.package?.duration ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{fmtDateTime(s.createdAt)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(s.startDate)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(s.endDate)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>EGP {s.pricePaid}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.discountPercent ? `${s.discountPercent}%` : '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.package?.hasException ? 'Yes' : '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.isRenewal ? 'Yes' : '—'}</td>
              </tr>
            ))}
          </Table>
        }
      </Card>

      {showAddPackage && (
        <AddPackageModal
          open={showAddPackage}
          onClose={() => setShowAddPackage(false)}
          member={member}
          pending={pending}
          isSalesManager={isSalesManager}
          isAccountant={isAccountant}
          onSuccess={() => { setShowAddPackage(false); fetchPending(); onRefresh?.(); }}
          onReview={(id, status) => setConfirm({ id, status: status === 'declined' ? 'rejected' : status })}
        />
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleReview}
        title={confirm?.status === 'accepted' ? 'Confirm Package' : 'Decline Package'}
        message={confirm?.status === 'accepted'
          ? 'Confirm this package assignment? It will be added to the member\'s profile.'
          : 'Decline this package assignment? The sales manager will be notified.'}
        confirmLabel={confirm?.status === 'accepted' ? 'Confirm' : 'Decline'}
        danger={confirm?.status === 'rejected'} loading={actionLoading} />
    </div>
  );
}

function requestToForm(request) {
  return {
    basePackageId: request.basePackage?._id ?? '',
    name: request.name ?? '',
    activityType: request.activityType ?? 'gym',
    duration: request.duration ?? '1 month',
    price: String(request.price ?? ''),
    freezeLimitDays: String(request.freezeLimitDays ?? 0),
    invitationLimit: String(request.invitationLimit ?? 0),
    renewalDiscountPercent: String(request.renewalDiscountPercent ?? 0),
    description: request.description ?? '',
    pricePaid: String(request.pricePaid ?? ''),
    discountPercent: String(request.discountPercent ?? 0),
    startDate: request.startDate ? new Date(request.startDate).toISOString().slice(0, 10) : '',
    reason: request.reason ?? '',
  };
}

function packageToPlaceholders(pkg) {
  if (!pkg) return null;
  return {
    name: pkg.name,
    activityType: pkg.activityType,
    duration: pkg.duration,
    price: String(pkg.price),
    freezeLimitDays: String(pkg.freezeLimitDays ?? 0),
    invitationLimit: String(pkg.invitationLimit ?? 0),
    renewalDiscountPercent: String(pkg.renewalDiscountPercent ?? 0),
    pricePaid: String(pkg.price),
    discountPercent: '0',
  };
}

const CATALOG_FIELD_KEYS = new Set([
  'name', 'activityType', 'duration', 'price',
  'freezeLimitDays', 'invitationLimit', 'renewalDiscountPercent',
]);

function PackageFormFields({ form, set, readOnly, makeException, catalogPlaceholders }) {
  const catalogMode = !!catalogPlaceholders;

  const fieldDisabled = (key) => {
    if (readOnly) return true;
    if (catalogMode && CATALOG_FIELD_KEYS.has(key)) return true;
    if (!catalogMode && !makeException) return true;
    return false;
  };

  const fieldValue = (key) => (catalogMode && CATALOG_FIELD_KEYS.has(key) ? '' : form[key]);
  const fieldPlaceholder = (key, fallback) => catalogPlaceholders?.[key] ?? fallback;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Package Name" value={fieldValue('name')} onChange={e => set?.('name', e.target.value)} placeholder={fieldPlaceholder('name')} disabled={fieldDisabled('name')} readOnly={readOnly} />
      <Select label="Activity" value={fieldValue('activityType')} onChange={e => set?.('activityType', e.target.value)} placeholder={fieldPlaceholder('activityType')} disabled={fieldDisabled('activityType')} readOnly={readOnly}>
        {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </Select>
      <Select label="Duration" value={fieldValue('duration')} onChange={e => set?.('duration', e.target.value)} placeholder={fieldPlaceholder('duration')} disabled={fieldDisabled('duration')} readOnly={readOnly}>
        {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
      </Select>
      <Input label="Price (EGP)" type="number" value={fieldValue('price')} onChange={e => set?.('price', e.target.value)} placeholder={fieldPlaceholder('price')} disabled={fieldDisabled('price')} readOnly={readOnly} />
      <Input label="Price Paid (EGP)" type="number" value={form.pricePaid} onChange={e => set?.('pricePaid', e.target.value)} placeholder={fieldPlaceholder('pricePaid')} disabled={fieldDisabled('pricePaid')} readOnly={readOnly} />
      <Input label="Discount %" type="number" min="0" max="100" value={form.discountPercent} onChange={e => set?.('discountPercent', e.target.value)} placeholder={fieldPlaceholder('discountPercent', '0')} disabled={fieldDisabled('discountPercent')} readOnly={readOnly} />
      <Input label="Freeze Limit (days)" type="number" value={fieldValue('freezeLimitDays')} onChange={e => set?.('freezeLimitDays', e.target.value)} placeholder={fieldPlaceholder('freezeLimitDays')} disabled={fieldDisabled('freezeLimitDays')} readOnly={readOnly} />
      <Input label="Invitation Slots" type="number" value={fieldValue('invitationLimit')} onChange={e => set?.('invitationLimit', e.target.value)} placeholder={fieldPlaceholder('invitationLimit')} disabled={fieldDisabled('invitationLimit')} readOnly={readOnly} />
      <Input label="Renewal Discount %" type="number" min="0" max="100" value={fieldValue('renewalDiscountPercent')} onChange={e => set?.('renewalDiscountPercent', e.target.value)} placeholder={fieldPlaceholder('renewalDiscountPercent')} disabled={fieldDisabled('renewalDiscountPercent')} readOnly={readOnly} />
      <Input label="Start Date" type="date" value={form.startDate} onChange={e => set?.('startDate', e.target.value)} hint={catalogMode ? 'Defaults to today if left empty' : undefined} disabled={fieldDisabled('startDate')} readOnly={readOnly} />
      {!readOnly && !catalogMode && (
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Reason" value={form.reason} onChange={e => set?.('reason', e.target.value)} placeholder="Why is this exception needed?" disabled={fieldDisabled('reason')} />
        </div>
      )}
    </div>
  );
}

function AddPackageModal({ open, onClose, member, pending, isSalesManager, isAccountant, onSuccess, onReview }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [makeException, setMakeException] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [catalogPlaceholders, setCatalogPlaceholders] = useState(null);
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_PACKAGE_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [creatingPackage, setCreatingPackage] = useState(false);

  const loadPackages = useCallback(() => {
    return getPackages({ limit: 100 })
      .then(res => setPackages(res.data?.packages ?? []))
      .catch(() => toast.error('Failed to load packages.'));
  }, []);

  useEffect(() => {
    if (!open) return;
    setMakeException(false);
    setForm({ ...EMPTY_FORM });
    setCatalogPlaceholders(null);
    setShowCreatePackage(false);
    setCreateForm(EMPTY_PACKAGE_FORM);
    setCreateErrors({});
    loadPackages();
  }, [open, loadPackages]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePackageChange = (id) => {
    const pkg = packages.find(p => p._id === id);
    if (!pkg) { set('basePackageId', id); return; }
    setForm(f => ({
      ...f,
      basePackageId: id,
      name: pkg.name,
      activityType: pkg.activityType,
      duration: pkg.duration,
      price: String(pkg.price),
      freezeLimitDays: String(pkg.freezeLimitDays ?? 0),
      invitationLimit: String(pkg.invitationLimit ?? 0),
      renewalDiscountPercent: String(pkg.renewalDiscountPercent ?? 0),
      description: pkg.description ?? '',
      pricePaid: String(pkg.price),
    }));
  };

  const handleAccountantPackageChange = (id) => {
    const pkg = packages.find(p => p._id === id);
    if (!pkg) {
      setCatalogPlaceholders(null);
      setForm({ ...EMPTY_FORM, basePackageId: id });
      return;
    }
    setCatalogPlaceholders(packageToPlaceholders(pkg));
    setForm({ ...EMPTY_FORM, basePackageId: id });
  };

  const handleCreateCatalogPackage = async () => {
    const errs = validatePackageForm(createForm);
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    setCreatingPackage(true);
    try {
      const res = await createPackage(packageFormToPayload(createForm));
      const pkg = res.data?.package;
      toast.success('Package added to catalog.');
      setShowCreatePackage(false);
      setCreateForm(EMPTY_PACKAGE_FORM);
      setCreateErrors({});
      await loadPackages();
      if (pkg?._id) {
        setForm(f => ({
          ...f,
          basePackageId: pkg._id,
          name: pkg.name,
          activityType: pkg.activityType,
          duration: pkg.duration,
          price: String(pkg.price),
          freezeLimitDays: String(pkg.freezeLimitDays ?? 0),
          invitationLimit: String(pkg.invitationLimit ?? 0),
          renewalDiscountPercent: String(pkg.renewalDiscountPercent ?? 0),
          description: pkg.description ?? '',
          pricePaid: String(pkg.price),
        }));
      }
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to create package.');
    } finally {
      setCreatingPackage(false);
    }
  };

  const handleSalesManagerSubmit = async () => {
    if (!form.basePackageId) { toast.error('Select a package.'); return; }

    setLoading(true);
    try {
      await createPackageException({
        memberId: member.systemId ?? member._id,
        basePackageId: form.basePackageId,
        hasException: makeException,
        name: form.name,
        activityType: form.activityType,
        duration: form.duration,
        price: Number(form.price),
        freezeLimitDays: Number(form.freezeLimitDays) || 0,
        invitationLimit: Number(form.invitationLimit) || 0,
        renewalDiscountPercent: Number(form.renewalDiscountPercent) || 0,
        description: form.description || null,
        pricePaid: Number(form.pricePaid),
        discountPercent: Number(form.discountPercent) || 0,
        startDate: form.startDate || undefined,
        reason: form.reason || null,
      });
      toast.success('Package request sent to accountant for approval.');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountantSubmit = async () => {
    if (!form.basePackageId) { toast.error('Select a package.'); return; }

    setLoading(true);
    try {
      await assignPackage(member.systemId ?? member._id, {
        packageId: form.basePackageId,
        pricePaid: Number(form.pricePaid),
        discountPercent: Number(form.discountPercent) || 0,
        startDate: form.startDate || undefined,
      });
      toast.success('Package assigned.');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed.');
    } finally {
      setLoading(false);
    }
  };

  // Accountant: review pending request or assign directly
  if (isAccountant) {
    if (pending) {
      return (
        <Modal open={open} onClose={onClose} title="Add Package — Review Request" size="lg"
          footer={<Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>}>
          <Alert type="warning">
            {pending.notificationMessage ||
              `${pending.proposedBy?.name} added package ${pending.name} with exception to member ${member.name}`}
          </Alert>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
            Proposed by <strong>{pending.proposedBy?.name}</strong> · Based on <strong>{pending.basePackage?.name}</strong>
          </div>
          <PackageFormFields form={requestToForm(pending)} readOnly makeException />
          {pending.reason && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--t2)' }}>
              <strong>Reason:</strong> {pending.reason}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Btn variant="success" size="sm" onClick={() => { onClose(); onReview(pending._id, 'accepted'); }}>Confirm</Btn>
            <Btn variant="danger" size="sm" onClick={() => { onClose(); onReview(pending._id, 'declined'); }}>Decline</Btn>
          </div>
        </Modal>
      );
    }

    return (
      <Modal open={open} onClose={onClose} title="Add Package" size="lg"
        footer={
          <>
            <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
            <Btn size="sm" onClick={handleAccountantSubmit} disabled={loading || !form.basePackageId}>
              {loading ? <Spinner size="sm" /> : 'Assign Package'}
            </Btn>
          </>
        }>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>
          Assign a package to <strong>{member.name}</strong> immediately.
        </p>
        <Select label="Package *" value={form.basePackageId} onChange={e => handleAccountantPackageChange(e.target.value)}>
          <option value="">Select package…</option>
          {packages.map(p => <option key={p._id} value={p._id}>{p.name} — EGP {p.price} ({p.duration})</option>)}
        </Select>
        {form.basePackageId && catalogPlaceholders && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 10 }}>
              Grey text shows the catalog package defaults. Fill in price paid, discount, and start date to assign.
            </p>
            <PackageFormFields form={form} set={set} catalogPlaceholders={catalogPlaceholders} />
          </div>
        )}
      </Modal>
    );
  }

  // Sales Manager: request only — never assigns directly
  return (
    <>
    <Modal open={open} onClose={onClose} title="Request Package" size="lg"
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn size="sm" onClick={handleSalesManagerSubmit} disabled={loading || !form.basePackageId || pending}>
            {loading ? <Spinner size="sm" /> : 'Submit for Approval'}
          </Btn>
        </>
      }>
      {pending && (
        <Alert type="warning">This member already has a pending package request awaiting accountant approval.</Alert>
      )}
      <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>
        Request a package for <strong>{member.name}</strong>. The accountant must approve before it is assigned. Turn on <strong>Make Exception</strong> to customize terms.
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: form.basePackageId ? 0 : 16 }}>
        <div style={{ flex: 1 }}>
          <Select label="Package *" value={form.basePackageId} onChange={e => handlePackageChange(e.target.value)} disabled={!!pending}>
            <option value="">Select package…</option>
            {packages.map(p => <option key={p._id} value={p._id}>{p.name} — EGP {p.price} ({p.duration})</option>)}
          </Select>
        </div>
        {!pending && (
          <Btn variant="outline" size="sm" onClick={() => setShowCreatePackage(true)} style={{ marginBottom: 1 }}>
            + New Package
          </Btn>
        )}
      </div>

      {form.basePackageId && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <Switch
              label="Make Exception"
              hint={makeException ? 'Fields are editable. Custom terms will be flagged as an exception.' : 'Standard package terms — still requires accountant approval.'}
              checked={makeException}
              onChange={setMakeException}
              disabled={!!pending}
            />
          </div>
          <PackageFormFields form={form} set={set} readOnly={false} makeException={makeException} />
        </div>
      )}
    </Modal>
    <CreateCatalogPackageModal
      open={showCreatePackage}
      onClose={() => setShowCreatePackage(false)}
      form={createForm}
      onChange={setCreateForm}
      errors={createErrors}
      onSubmit={handleCreateCatalogPackage}
      loading={creatingPackage}
    />
    </>
  );
}

function CreateCatalogPackageModal({ open, onClose, form, onChange, errors, onSubmit, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="New Package" size="md"
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn size="sm" onClick={onSubmit} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Save to Catalog'}
          </Btn>
        </>
      }>
      <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14 }}>
        Create a new package in the catalog. It will be available for all members after saving.
      </p>
      <CatalogPackageForm form={form} onChange={onChange} errors={errors} />
    </Modal>
  );
}
