import { Btn } from '../components/ui';

/** Build a wa.me link from a stored phone (local EG numbers or international). */
export function toWhatsAppUrl(phone) {
  if (!phone || phone === 'hidden') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  // 00-prefix international
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Already Egypt country code
  if (digits.startsWith('20') && digits.length >= 12) return `https://wa.me/${digits}`;
  // Local format e.g. 01012345678 → drop leading 0, add +20
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `https://wa.me/20${digits}`;
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
