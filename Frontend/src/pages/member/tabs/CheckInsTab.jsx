import { Card, CardHeader, Table, EmptyState, Avatar, fmtDateTime } from '../../../components/ui';

export default function CheckInsTab({ checkIns = [], stats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 1,
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {[
          { label: 'Total Check-Ins', value: stats?.totalCheckIns ?? checkIns.length },
          { label: 'This Month',      value: countThisMonth(checkIns) },
          { label: 'Last Check-In',   value: checkIns[0] ? fmtDateTime(checkIns[0].createdAt) : '—', wide: true },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--t4)', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: s.wide ? 13 : 22, fontWeight: s.wide ? 600 : 800, color: 'var(--t1)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* History table */}
      <Card noPad>
        <div style={{ padding: '14px 18px 0' }}>
          <CardHeader title={`Check-In Log (${checkIns.length})`} />
        </div>

        {!checkIns.length ? (
          <EmptyState message="No check-ins recorded yet" />
        ) : (
          <Table headers={['#', 'Checked In By', 'Role', 'Date & Time', 'Note']}>
            {checkIns.map((c, i) => (
              <tr
                key={c._id ?? i}
                className="tbl-row"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t4)', fontFamily: 'monospace', width: 48 }}>
                  {checkIns.length - i}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={c.createdBy?.name ?? '?'} size="sm" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                      {c.createdBy?.name ?? '—'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {c.createdBy?.role ? (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--t3)',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      {c.createdBy.role}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
                  {fmtDateTime(c.createdAt)}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t3)' }}>
                  {c.text && c.text !== 'Member checked in' ? c.text : '—'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

function countThisMonth(checkIns) {
  const now = new Date();
  return checkIns.filter(c => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}
