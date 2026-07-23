import { Btn } from '../components/ui';

/** Build a wa.me link from a stored phone (local EG numbers or international). */
export function toWhatsAppUrl(phone, text) {
  if (!phone || phone === 'hidden') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  // 00-prefix international
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Already Egypt country code
  let url;
  if (digits.startsWith('20') && digits.length >= 12) {
    url = `https://wa.me/${digits}`;
  } else {
    // Local format e.g. 01012345678 → drop leading 0, add +20
    if (digits.startsWith('0')) digits = digits.slice(1);
    url = `https://wa.me/20${digits}`;
  }
  if (text != null && String(text).trim()) {
    return `${url}?text=${encodeURIComponent(String(text).trim())}`;
  }
  return url;
}

function formatPackageLine(pkg) {
  return `• ${pkg.name} — ${pkg.duration} — EGP ${pkg.price}`;
}

function formatDiscountLine(pkg) {
  return `• ${pkg.name} — ${pkg.renewalDiscountPercent}% renewal discount`;
}

/** Compose the editable draft message for a template + live package catalog. */
export function composeWhatsAppTemplateMessage(template, packages = []) {
  if (!template) return '';
  const type = String(template.type || '').toLowerCase();
  const intro = (template.introText || '').trim();
  const body = (template.bodyText || '').trim();
  const includeLive = template.includeLiveData !== false;
  const catalog = Array.isArray(packages) ? packages : [];

  if (type === 'packages') {
    const parts = [];
    if (intro) parts.push(intro);
    if (includeLive) {
      const lines = catalog.map(formatPackageLine);
      if (lines.length) parts.push(lines.join('\n'));
    }
    if (body) parts.push(body);
    return parts.join('\n\n');
  }

  if (type === 'discounts') {
    const parts = [];
    if (body) parts.push(body);
    if (includeLive) {
      const lines = catalog
        .filter((p) => Number(p.renewalDiscountPercent) > 0)
        .map(formatDiscountLine);
      if (lines.length) {
        parts.push(`Renewal offers:\n${lines.join('\n')}`);
      }
    }
    if (intro) parts.unshift(intro);
    return parts.join('\n\n');
  }

  // Custom free-text types
  return body || intro || '';
}

export function WhatsAppBtn({ phone, size = 'xs', fullWidth = false }) {
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
