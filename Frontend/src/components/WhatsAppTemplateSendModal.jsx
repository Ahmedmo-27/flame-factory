import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Btn, Modal, Select, Textarea, Input, Spinner } from './ui';
import { getWhatsAppTemplates, getPackages, logWhatsAppTemplateSend } from '../api/endpoints';
import { composeWhatsAppTemplateMessage, toWhatsAppUrl } from '../utils/whatsapp';

function typeLabel(type) {
  if (type === 'packages') return 'Packages';
  if (type === 'discounts') return 'Discounts';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Custom';
}

function defaultPackageIdsFrom(template) {
  const raw = template?.defaultPackageIds ?? [];
  return raw.map((p) => String(p._id ?? p)).filter(Boolean);
}

export default function WhatsAppTemplateSendModal({ open, onClose, phone, memberName, memberId }) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [language, setLanguage] = useState('en');
  const [message, setMessage] = useState('');
  const [messageDirty, setMessageDirty] = useState(false);

  const buildMessage = useCallback((template, pkgs, pkgIds, percent, lang, name) => {
    if (!template) return '';
    return composeWhatsAppTemplateMessage(template, pkgs, {
      memberName: name,
      selectedPackageIds: pkgIds,
      discountPercent: percent,
      language: lang,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setTypeFilter('');
    setTemplateId('');
    setSelectedPackageIds([]);
    setDiscountPercent(0);
    setLanguage('en');
    setMessage('');
    setMessageDirty(false);

    Promise.all([
      getWhatsAppTemplates({ limit: 100 }),
      getPackages({ limit: 100 }),
    ])
      .then(([tRes, pRes]) => {
        if (cancelled) return;
        const list = tRes.data.templates ?? [];
        const pkgs = pRes.data.packages ?? [];
        setTemplates(list);
        setPackages(pkgs);

        const pick = list.find((t) => t.isDefault) || (list.length === 1 ? list[0] : null);
        if (pick) {
          const pkgIds = defaultPackageIdsFrom(pick);
          const percent = Number(pick.defaultDiscountPercent) || 0;
          setTemplateId(pick._id);
          setTypeFilter(pick.type);
          setSelectedPackageIds(pkgIds.length ? pkgIds : pkgs.map((p) => p._id));
          setDiscountPercent(percent);
          setMessage(buildMessage(
            pick,
            pkgs,
            pkgIds.length ? pkgIds : pkgs.map((p) => p._id),
            percent,
            'en',
            memberName
          ));
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, memberName, buildMessage]);

  const types = useMemo(() => {
    const set = new Set(templates.map((t) => t.type));
    return Array.from(set).sort((a, b) => {
      const order = { packages: 0, discounts: 1 };
      return (order[a] ?? 99) - (order[b] ?? 99) || a.localeCompare(b);
    });
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!typeFilter) return templates;
    return templates.filter((t) => t.type === typeFilter);
  }, [templates, typeFilter]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === templateId) ?? null,
    [templates, templateId]
  );

  const hasArabic = Boolean(
    selectedTemplate &&
    ((selectedTemplate.introTextAr || '').trim() || (selectedTemplate.bodyTextAr || '').trim())
  );

  const recomposed = useMemo(() => {
    if (!selectedTemplate) return '';
    return buildMessage(
      selectedTemplate,
      packages,
      selectedPackageIds,
      discountPercent,
      language,
      memberName
    );
  }, [selectedTemplate, packages, selectedPackageIds, discountPercent, language, memberName, buildMessage]);

  // Keep message in sync when compose inputs change, unless user edited freely
  useEffect(() => {
    if (!selectedTemplate || messageDirty) return;
    setMessage(recomposed);
  }, [recomposed, selectedTemplate, messageDirty]);

  const applyTemplateSelection = (id) => {
    const t = templates.find((x) => x._id === id);
    setTemplateId(id);
    setMessageDirty(false);
    if (!t) {
      setMessage('');
      return;
    }
    const pkgIds = defaultPackageIdsFrom(t);
    const nextIds = pkgIds.length ? pkgIds : packages.map((p) => p._id);
    const percent = Number(t.defaultDiscountPercent) || 0;
    setSelectedPackageIds(nextIds);
    setDiscountPercent(percent);
    setMessage(buildMessage(t, packages, nextIds, percent, language, memberName));
  };

  const handleTypeChange = (value) => {
    setTypeFilter(value);
    setTemplateId('');
    setMessage('');
    setMessageDirty(false);
    setSelectedPackageIds([]);
    setDiscountPercent(0);
  };

  const togglePackage = (id) => {
    const sid = String(id);
    setMessageDirty(false);
    setSelectedPackageIds((prev) => (
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    ));
  };

  const selectAllPackages = () => {
    setMessageDirty(false);
    setSelectedPackageIds(packages.map((p) => String(p._id)));
  };

  const clearPackages = () => {
    setMessageDirty(false);
    setSelectedPackageIds([]);
  };

  const handleReset = () => {
    setMessageDirty(false);
    setMessage(recomposed);
  };

  const handleCopy = async () => {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    if (selectedTemplate?.type === 'discounts' && selectedTemplate.includeLiveData !== false) {
      if (!selectedPackageIds.length) {
        toast.error('Select at least one package for the discount');
        return;
      }
      if (!(Number(discountPercent) > 0)) {
        toast.error('Enter a discount percentage');
        return;
      }
    }
    const url = toWhatsAppUrl(phone, message);
    if (!url) {
      toast.error('Invalid phone number');
      return;
    }
    try {
      await logWhatsAppTemplateSend({
        memberId: memberId || null,
        memberName: memberName || null,
        templateId: templateId || null,
      });
    } catch {
      // non-blocking
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const showPackagePicker = selectedTemplate &&
    (selectedTemplate.type === 'packages' || selectedTemplate.type === 'discounts') &&
    selectedTemplate.includeLiveData !== false;

  const showDiscountPercent = selectedTemplate?.type === 'discounts' &&
    selectedTemplate.includeLiveData !== false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a template message"
      size="md"
      footer={<>
        <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn variant="outline" size="sm" onClick={handleCopy} disabled={!message.trim()}>
          Copy message
        </Btn>
        <Btn
          variant="success"
          size="sm"
          onClick={handleSend}
          disabled={loading || !message.trim()}
        >
          Send via WhatsApp
        </Btn>
      </>}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner />
        </div>
      ) : templates.length === 0 ? (
        <p style={{ color: 'var(--t3)', fontSize: 13, margin: 0 }}>
          No active WhatsApp templates yet. Ask an Owner, Sales Manager, or Accountant to create one.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {memberName && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--t4)' }}>
              To: <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{memberName}</span>
              <span style={{ marginLeft: 8, color: 'var(--t4)' }}>
                (placeholders: {'{{name}}'}, {'{{firstName}}'})
              </span>
            </p>
          )}
          <Select
            label="Template type"
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </Select>
          <Select
            label="Template"
            value={templateId}
            onChange={(e) => applyTemplateSelection(e.target.value)}
          >
            <option value="">— Select template —</option>
            {filteredTemplates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}{t.isDefault ? ' ★' : ''} ({typeLabel(t.type)})
              </option>
            ))}
          </Select>

          {hasArabic && (
            <Select
              label="Language"
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setMessageDirty(false); }}
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </Select>
          )}

          {showPackagePicker && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
                  {selectedTemplate.type === 'discounts' ? 'Packages to discount' : 'Packages to include'}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={selectAllPackages} style={linkBtnStyle}>All</button>
                  <button type="button" onClick={clearPackages} style={linkBtnStyle}>None</button>
                </div>
              </div>
              <div style={{
                maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 10px', background: 'var(--bg)',
              }}>
                {packages.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--t4)' }}>No packages in catalog</p>
                ) : packages.map((p) => {
                  const id = String(p._id);
                  return (
                    <label key={id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, color: 'var(--t2)', padding: '4px 0', cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedPackageIds.includes(id)}
                        onChange={() => togglePackage(id)}
                      />
                      <span>{p.name} — {p.duration} — EGP {Number(p.price).toLocaleString()}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {showDiscountPercent && (
            <Input
              label="Discount percentage"
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => {
                setMessageDirty(false);
                setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)));
              }}
              hint="Applied to the selected package(s) in the message"
            />
          )}

          {selectedTemplate && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
                  Message (editable)
                </label>
                <Btn variant="ghost" size="xs" onClick={handleReset} disabled={!messageDirty && message === recomposed}>
                  Reset to template
                </Btn>
              </div>
              <Textarea
                value={message}
                onChange={(e) => { setMessageDirty(true); setMessage(e.target.value); }}
                rows={8}
              />
              <div style={{
                border: '1px solid var(--border)', borderRadius: 8, padding: 12,
                background: '#f0fdf4',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  WhatsApp preview
                </div>
                <pre style={{
                  margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                  fontSize: 13, color: 'var(--t1)', lineHeight: 1.45,
                }}>
                  {message || '—'}
                </pre>
                <div style={{ marginTop: 8, fontSize: 11, color: message.length > 1500 ? '#b45309' : 'var(--t4)' }}>
                  {message.length.toLocaleString()} characters
                  {message.length > 1500 ? ' — long messages may truncate on some devices' : ''}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--blue, #2563eb)',
  cursor: 'pointer',
};
