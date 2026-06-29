import { Card, CardHeader, Badge, Table, EmptyState, fmtDate } from '../../../components/ui';

export default function PackagesTab({ member }) {
  const subs    = member.subscriptions ?? [];
  const lastSub = subs.at(-1);
  const pkg     = lastSub?.package;

  const details = pkg ? [
    { label: 'Package',          value: pkg.name },
    { label: 'Activity',         value: pkg.activityType },
    { label: 'Duration',         value: pkg.duration },
    { label: 'Start',            value: fmtDate(lastSub.startDate) },
    { label: 'Expiry',           value: fmtDate(lastSub.endDate) },
    { label: 'Price Paid',       value: `EGP ${lastSub.pricePaid}` },
    { label: 'Discount',         value: lastSub.discountPercent ? `${lastSub.discountPercent}%` : 'None' },
    { label: 'Freeze Limit',     value: `${pkg.freezeLimitDays ?? 0} days` },
    { label: 'Invitation Slots', value: `${pkg.invitationLimit ?? 0}` },
    { label: 'Renewal Discount', value: pkg.renewalDiscountPercent ? `${pkg.renewalDiscountPercent}%` : 'None' },
    { label: 'Type',             value: lastSub.isRenewal ? 'Renewal' : 'New subscription' },
    { label: 'Sold By',          value: lastSub.createdBy?.name },
    { label: 'Status',           value: <Badge status={member.status} /> },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader title="Active Package" />
        {!pkg || member.status === 'guest'
          ? <EmptyState message="No active package" sub="Assign a package to this member to see details here." />
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
          <Table headers={['Sub #', 'Package', 'Activity', 'Duration', 'Start', 'End', 'Price', 'Discount', 'Renewal']}>
            {[...subs].reverse().map((s, i) => (
              <tr key={s._id ?? i} className="tbl-row" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>{s.subscriptionId ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{s.package?.name ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.package?.activityType ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{s.package?.duration ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(s.startDate)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(s.endDate)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>EGP {s.pricePaid}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.discountPercent ? `${s.discountPercent}%` : '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>{s.isRenewal ? 'Yes' : '—'}</td>
              </tr>
            ))}
          </Table>
        }
      </Card>
    </div>
  );
}
