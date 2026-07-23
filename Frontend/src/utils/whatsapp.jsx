import { Btn } from '../components/ui';

/** Build a wa.me link from a stored phone (local EG numbers or international). */
export function toWhatsAppUrl(phone, text) {
  if (!phone || phone === 'hidden') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  let url;
  if (digits.startsWith('20') && digits.length >= 12) {
    url = `https://wa.me/${digits}`;
  } else {
    if (digits.startsWith('0')) digits = digits.slice(1);
    url = `https://wa.me/20${digits}`;
  }
  if (text != null && String(text).trim()) {
    return `${url}?text=${encodeURIComponent(String(text).trim())}`;
  }
  return url;
}

function firstNameFrom(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts[0] || '';
}

/** Replace {{name}} and {{firstName}} placeholders. */
export function applyWhatsAppPlaceholders(text, memberName) {
  if (!text) return '';
  const name = String(memberName || '').trim();
  const first = firstNameFrom(name);
  return String(text)
    .replace(/\{\{\s*name\s*\}\}/gi, name || 'there')
    .replace(/\{\{\s*firstName\s*\}\}/gi, first || name || 'there');
}

function formatPackageLine(pkg) {
  return `• ${pkg.name} — ${pkg.duration} — EGP ${Number(pkg.price).toLocaleString()}`;
}

function discountedPrice(price, percent) {
  const p = Number(price) || 0;
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  return Math.round(p * (1 - pct / 100));
}

function formatDiscountAppliedLine(pkg, percent) {
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  const original = Number(pkg.price) || 0;
  const next = discountedPrice(original, pct);
  return `• ${pkg.name} — was EGP ${original.toLocaleString()}, now EGP ${next.toLocaleString()} (${pct}% off)`;
}

function packageId(pkg) {
  return String(pkg._id ?? pkg.id ?? '');
}

function filterSelectedPackages(packages, selectedPackageIds) {
  const catalog = Array.isArray(packages) ? packages : [];
  if (!selectedPackageIds || selectedPackageIds.length === 0) return catalog;
  const set = new Set(selectedPackageIds.map(String));
  return catalog.filter((p) => set.has(packageId(p)));
}

/**
 * Compose the editable draft message for a template.
 * @param {object} template
 * @param {array} packages - full catalog
 * @param {object} [options]
 * @param {string} [options.memberName]
 * @param {string[]} [options.selectedPackageIds]
 * @param {number} [options.discountPercent] - for discounts type
 * @param {'en'|'ar'} [options.language]
 */
export function composeWhatsAppTemplateMessage(template, packages = [], options = {}) {
  if (!template) return '';
  const type = String(template.type || '').toLowerCase();
  const lang = options.language === 'ar' ? 'ar' : 'en';
  const introRaw = lang === 'ar'
    ? ((template.introTextAr || '').trim() || (template.introText || '').trim())
    : ((template.introText || '').trim());
  const bodyRaw = lang === 'ar'
    ? ((template.bodyTextAr || '').trim() || (template.bodyText || '').trim())
    : ((template.bodyText || '').trim());
  const intro = applyWhatsAppPlaceholders(introRaw, options.memberName);
  const body = applyWhatsAppPlaceholders(bodyRaw, options.memberName);
  const includeLive = template.includeLiveData !== false;
  const selected = filterSelectedPackages(packages, options.selectedPackageIds);

  if (type === 'packages') {
    const parts = [];
    if (intro) parts.push(intro);
    if (includeLive) {
      const lines = selected.map(formatPackageLine);
      if (lines.length) parts.push(lines.join('\n'));
    }
    if (body) parts.push(body);
    return parts.join('\n\n');
  }

  if (type === 'discounts') {
    const parts = [];
    if (intro) parts.push(intro);
    if (body) parts.push(body);
    if (includeLive) {
      const percent = options.discountPercent != null
        ? Number(options.discountPercent)
        : Number(template.defaultDiscountPercent) || 0;
      if (selected.length && percent > 0) {
        const lines = selected.map((p) => formatDiscountAppliedLine(p, percent));
        parts.push(`Special offer:\n${lines.join('\n')}`);
      } else if (selected.length) {
        // Fallback: show package renewal discounts if no % chosen
        const lines = selected
          .filter((p) => Number(p.renewalDiscountPercent) > 0)
          .map((p) => `• ${p.name} — ${p.renewalDiscountPercent}% renewal discount`);
        if (lines.length) parts.push(`Renewal offers:\n${lines.join('\n')}`);
      }
    }
    return parts.join('\n\n');
  }

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
