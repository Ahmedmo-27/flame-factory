import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Btn, Modal, Select, Textarea, Spinner } from './ui';
import { getWhatsAppTemplates, getPackages } from '../api/endpoints';
import { composeWhatsAppTemplateMessage, toWhatsAppUrl } from '../utils/whatsapp';

function typeLabel(type) {
  if (type === 'packages') return 'Packages';
  if (type === 'discounts') return 'Discounts';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Custom';
}

export default function WhatsAppTemplateSendModal({ open, onClose, phone, memberName }) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setTypeFilter('');
    setTemplateId('');
    setMessage('');

    Promise.all([
      getWhatsAppTemplates({ limit: 100 }),
      getPackages({ limit: 100 }),
    ])
      .then(([tRes, pRes]) => {
        if (cancelled) return;
        const list = tRes.data.templates ?? [];
        setTemplates(list);
        setPackages(pRes.data.packages ?? []);
        if (list.length === 1) {
          setTemplateId(list[0]._id);
          setTypeFilter(list[0].type);
          setMessage(composeWhatsAppTemplateMessage(list[0], pRes.data.packages ?? []));
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open]);

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

  const handleTypeChange = (value) => {
    setTypeFilter(value);
    setTemplateId('');
    setMessage('');
  };

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    const t = templates.find((x) => x._id === id);
    setMessage(t ? composeWhatsAppTemplateMessage(t, packages) : '');
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    const url = toWhatsAppUrl(phone, message);
    if (!url) {
      toast.error('Invalid phone number');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a template message"
      size="md"
      footer={<>
        <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
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
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">— Select template —</option>
            {filteredTemplates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({typeLabel(t.type)})
              </option>
            ))}
          </Select>
          {selectedTemplate && (
            <Textarea
              label="Message (editable)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
