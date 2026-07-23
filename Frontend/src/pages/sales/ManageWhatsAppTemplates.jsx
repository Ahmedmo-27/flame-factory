import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import {
  PageHeader, Card, CardHeader, Btn, Input, Select, Textarea,
  Spinner, Modal, ConfirmDialog, Table, EmptyState, fmtDate, Pagination,
} from '../../components/ui';
import {
  getWhatsAppTemplates, createWhatsAppTemplate, updateWhatsAppTemplate, deleteWhatsAppTemplate,
  getPackages,
} from '../../api/endpoints';
import { composeWhatsAppTemplateMessage } from '../../utils/whatsapp';

const PAGE_SIZE = 15;
const BUILTIN_TYPES = [
  { value: 'packages', label: 'Packages' },
  { value: 'discounts', label: 'Discounts' },
];
const ROLE_OPTIONS = ['Owner', 'Sales Manager', 'Sales', 'Receptionist', 'Accountant'];

const EMPTY_FORM = {
  name: '',
  typeMode: 'packages',
  customType: '',
  introText: '',
  bodyText: '',
  introTextAr: '',
  bodyTextAr: '',
  includeLiveData: true,
  defaultPackageIds: [],
  defaultDiscountPercent: 15,
  allowedRoles: [],
  isDefault: false,
};

function resolveType(form) {
  if (form.typeMode === 'custom') return (form.customType || '').trim().toLowerCase();
  return form.typeMode;
}

function isBuiltinType(type) {
  return type === 'packages' || type === 'discounts';
}

function typeLabel(type) {
  if (type === 'packages') return 'Packages';
  if (type === 'discounts') return 'Discounts';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
}

function previewSnippet(template, packages) {
  const pkgIds = (template.defaultPackageIds || []).map((p) => String(p._id ?? p));
  const msg = composeWhatsAppTemplateMessage(template, packages, {
    memberName: 'Ahmed',
    selectedPackageIds: pkgIds.length ? pkgIds : undefined,
    discountPercent: template.defaultDiscountPercent,
  });
  if (!msg) return '—';
  return msg.length > 80 ? `${msg.slice(0, 80)}…` : msg;
}

function TemplateForm({ form, onChange, errors, packages }) {
  const set = (key, value) => onChange({ ...form, [key]: value });
  const builtin = form.typeMode !== 'custom';

  const togglePackage = (id) => {
    const sid = String(id);
    const next = form.defaultPackageIds.includes(sid)
      ? form.defaultPackageIds.filter((x) => x !== sid)
      : [...form.defaultPackageIds, sid];
    set('defaultPackageIds', next);
  };

  const toggleRole = (role) => {
    const next = form.allowedRoles.includes(role)
      ? form.allowedRoles.filter((r) => r !== role)
      : [...form.allowedRoles, role];
    set('allowedRoles', next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input
        label="Template name"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        error={errors.name}
        placeholder="e.g. Summer packages offer"
      />
      <Select
        label="Type"
        value={form.typeMode}
        onChange={(e) => set('typeMode', e.target.value)}
        error={errors.type}
      >
        {BUILTIN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
        <option value="custom">Custom type…</option>
      </Select>
      {form.typeMode === 'custom' && (
        <Input
          label="Custom type name"
          value={form.customType}
          onChange={(e) => set('customType', e.target.value)}
          error={errors.customType}
          placeholder="e.g. welcome, follow-up"
        />
      )}

      {builtin && (
        <>
          <Textarea
            label="Intro text (EN) — use {{name}} / {{firstName}}"
            value={form.introText}
            onChange={(e) => set('introText', e.target.value)}
            rows={2}
            placeholder="Hi {{firstName}}! …"
          />
          <Textarea
            label={form.typeMode === 'discounts' ? 'Discount pitch / body (EN)' : 'Outro / notes (EN)'}
            value={form.bodyText}
            onChange={(e) => set('bodyText', e.target.value)}
            rows={3}
          />
          <Textarea
            label="Intro text (AR)"
            value={form.introTextAr}
            onChange={(e) => set('introTextAr', e.target.value)}
            rows={2}
            placeholder="Optional Arabic intro…"
          />
          <Textarea
            label={form.typeMode === 'discounts' ? 'Discount pitch (AR)' : 'Outro (AR)'}
            value={form.bodyTextAr}
            onChange={(e) => set('bodyTextAr', e.target.value)}
            rows={2}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.includeLiveData}
              onChange={(e) => set('includeLiveData', e.target.checked)}
            />
            Include live {form.typeMode === 'packages' ? 'package list' : 'discounted package lines'} when sending
          </label>

          {form.includeLiveData && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>
                Default packages (optional — sender can change)
              </div>
              <div style={{
                maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 10px',
              }}>
                {(packages || []).map((p) => {
                  const id = String(p._id);
                  return (
                    <label key={id} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '3px 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.defaultPackageIds.includes(id)}
                        onChange={() => togglePackage(id)}
                      />
                      {p.name} — EGP {p.price}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {form.typeMode === 'discounts' && form.includeLiveData && (
            <Input
              label="Default discount %"
              type="number"
              min={0}
              max={100}
              value={form.defaultDiscountPercent}
              onChange={(e) => set('defaultDiscountPercent', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              hint="Applied to chosen packages when composing the message"
              error={errors.defaultDiscountPercent}
            />
          )}
        </>
      )}

      {!builtin && (
        <>
          <Textarea
            label="Message body (EN) — {{name}} / {{firstName}}"
            value={form.bodyText}
            onChange={(e) => set('bodyText', e.target.value)}
            rows={5}
            error={errors.bodyText}
          />
          <Textarea
            label="Message body (AR)"
            value={form.bodyTextAr}
            onChange={(e) => set('bodyTextAr', e.target.value)}
            rows={4}
          />
        </>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 6 }}>
          Visible to roles (empty = everyone who can send)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ROLE_OPTIONS.map((role) => (
            <label key={role} style={{ display: 'flex', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--t2)' }}>
              <input
                type="checkbox"
                checked={form.allowedRoles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set('isDefault', e.target.checked)}
        />
        Default template for this type (opens first when sending)
      </label>
    </div>
  );
}

function validateForm(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Name is required';
  const type = resolveType(form);
  if (!type) errs[form.typeMode === 'custom' ? 'customType' : 'type'] = 'Type is required';
  if (form.typeMode === 'custom' && !form.bodyText.trim() && !form.bodyTextAr.trim()) {
    errs.bodyText = 'Message body is required for custom templates';
  }
  if (form.typeMode === 'discounts' && form.includeLiveData && !(Number(form.defaultDiscountPercent) > 0)) {
    errs.defaultDiscountPercent = 'Set a default discount percentage';
  }
  return errs;
}

function formToPayload(form) {
  const type = resolveType(form);
  return {
    name: form.name.trim(),
    type,
    introText: form.introText.trim() || null,
    bodyText: form.bodyText.trim() || null,
    introTextAr: form.introTextAr.trim() || null,
    bodyTextAr: form.bodyTextAr.trim() || null,
    includeLiveData: isBuiltinType(type) ? form.includeLiveData : false,
    defaultPackageIds: isBuiltinType(type) ? form.defaultPackageIds : [],
    defaultDiscountPercent: type === 'discounts' ? Number(form.defaultDiscountPercent) || 0 : 0,
    allowedRoles: form.allowedRoles,
    isDefault: form.isDefault,
  };
}

function templateToForm(t) {
  const builtin = isBuiltinType(t.type);
  return {
    name: t.name ?? '',
    typeMode: builtin ? t.type : 'custom',
    customType: builtin ? '' : (t.type ?? ''),
    introText: t.introText ?? '',
    bodyText: t.bodyText ?? '',
    introTextAr: t.introTextAr ?? '',
    bodyTextAr: t.bodyTextAr ?? '',
    includeLiveData: t.includeLiveData !== false,
    defaultPackageIds: (t.defaultPackageIds || []).map((p) => String(p._id ?? p)),
    defaultDiscountPercent: Number(t.defaultDiscountPercent) || 0,
    allowedRoles: t.allowedRoles || [],
    isDefault: Boolean(t.isDefault),
  };
}

export default function ManageWhatsAppTemplates() {
  usePageTitle('WhatsApp Templates');

  const [templates, setTemplates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        getWhatsAppTemplates({ page, limit: PAGE_SIZE, all: 'true' }),
        getPackages({ limit: 100 }),
      ]);
      setTemplates(tRes.data.templates ?? []);
      setPagination(tRes.data.pagination ?? { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
      setPackages(pRes.data.packages ?? []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const errs = validateForm(createForm);
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }
    setCreating(true);
    try {
      await createWhatsAppTemplate(formToPayload(createForm));
      toast.success('Template created');
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setCreateErrors({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (t) => {
    setEditTarget(t);
    setEditForm(templateToForm(t));
    setEditErrors({});
  };

  const handleEdit = async () => {
    const errs = validateForm(editForm);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setEditing(true);
    try {
      await updateWhatsAppTemplate(editTarget._id, formToPayload(editForm));
      toast.success('Template updated');
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update template');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteWhatsAppTemplate(deleteTarget._id);
      toast.success('Template deactivated');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="WhatsApp Templates">
        <Btn
          variant="blue"
          size="sm"
          onClick={() => { setCreateForm(EMPTY_FORM); setCreateErrors({}); setShowCreate(true); }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Template
        </Btn>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Card noPad>
          <CardHeader title={`Templates (${pagination.total})`} />
          <Table
            headers={['Name', 'Type', 'Default', 'Roles', 'Preview', 'Created', '']}
            loading={loading}
            skeletonRows={4}
          >
            {!loading && templates.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon="💬" message="No templates yet" sub="Create a packages or discounts template above" />
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr
                key={t._id}
                style={{ borderBottom: '1px solid var(--border)', opacity: t.isActive ? 1 : 0.55 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>
                  {t.name}
                  {!t.isActive && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--t4)', fontWeight: 500 }}>Inactive</span>
                  )}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--t2)', textTransform: 'capitalize' }}>
                  {typeLabel(t.type)}
                  {t.type === 'discounts' && t.defaultDiscountPercent > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>{t.defaultDiscountPercent}% default</div>
                  )}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>
                  {t.isDefault
                    ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>★ Yes</span>
                    : <span style={{ color: 'var(--t4)' }}>—</span>}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--t3)' }}>
                  {(t.allowedRoles || []).length ? t.allowedRoles.join(', ') : 'All'}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--t3)', whiteSpace: 'pre-wrap', maxWidth: 240 }}>
                  {previewSnippet(t, packages)}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--t4)', fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Btn variant="outline" size="xs" onClick={() => openEdit(t)}>Edit</Btn>
                    {t.isActive && (
                      <Btn variant="danger" size="xs" onClick={() => setDeleteTarget(t)}>Delete</Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.limit ?? PAGE_SIZE}
            onPageChange={setPage}
          />
        </Card>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New WhatsApp Template"
        size="md"
        footer={<>
          <Btn variant="ghost" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Btn>
          <Btn variant="blue" size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Spinner size="sm" /> : 'Create Template'}
          </Btn>
        </>}
      >
        <TemplateForm form={createForm} onChange={setCreateForm} errors={createErrors} packages={packages} />
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Edit — ${editTarget?.name ?? ''}`}
        size="md"
        footer={<>
          <Btn variant="ghost" size="sm" onClick={() => setEditTarget(null)} disabled={editing}>Cancel</Btn>
          <Btn variant="blue" size="sm" onClick={handleEdit} disabled={editing}>
            {editing ? <Spinner size="sm" /> : 'Save Changes'}
          </Btn>
        </>}
      >
        <TemplateForm form={editForm} onChange={setEditForm} errors={editErrors} packages={packages} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate Template"
        message={`Deactivate "${deleteTarget?.name}"? It will no longer appear when sending template messages.`}
        confirmLabel="Deactivate"
        danger
        loading={deleting}
      />
    </Layout>
  );
}
