import { Card, CardHeader, Table, EmptyState, Avatar, fmtDateTime } from '../../../components/ui';

export default function OthersTab({ profileViews = [] }) {
  return (
    <Card noPad>
      <div style={{ padding: '14px 18px 0' }}>
        <CardHeader title={`Profile Views (${profileViews.length})`} />
      </div>

      {!profileViews.length ? (
        <EmptyState message="No profile views recorded yet" />
      ) : (
        <Table headers={['#', 'User', 'Role', 'Date & Time']}>
          {profileViews.map((v, i) => (
            <tr
              key={v._id ?? i}
              className="tbl-row"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t4)', fontFamily: 'monospace', width: 48 }}>
                {i + 1}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={v.viewedBy?.name ?? '?'} size="sm" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                    {v.viewedBy?.name ?? '—'}
                  </span>
                </div>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--t3)',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  padding: '2px 7px', borderRadius: 4,
                }}>
                  {v.viewedBy?.role ?? '—'}
                </span>
              </td>
              <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)' }}>
                {fmtDateTime(v.createdAt)}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
