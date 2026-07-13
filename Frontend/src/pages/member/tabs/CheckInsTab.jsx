import { useState } from 'react';
import { Card, CardHeader, Table, EmptyState, Avatar, fmtDateTime } from '../../../components/ui';

export default function CheckInsTab({ checkIns = [], ptSessions = [], stats, member }) {
  const [tab, setTab] = useState('gym'); // 'gym' | 'pt'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'gym', label: `Gym Check-Ins (${checkIns.length})` },
          { id: 'pt', label: `Private Sessions (${ptSessions.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? 'var(--navy)' : 'transparent'}`,
            marginBottom: -1,
            color: tab === t.id ? 'var(--t1)' : 'var(--t3)',
            fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            transition: 'color 0.12s',
          }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--t2)'; }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--t3)'; }}
          >{t.label}</button>
        ))}
      </div>

      {/* Gym Check-Ins */}
      {tab === 'gym' && (
        <>
          {/* Summary strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 1, background: 'var(--border)',
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
          }}>
            {[
              { label: 'Total Check-Ins', value: stats?.totalCheckIns ?? checkIns.length },
              { label: 'This Month', value: countThisMonth(checkIns) },
              { label: 'Last Check-In', value: checkIns[0] ? fmtDateTime(checkIns[0].createdAt) : '—', wide: true },
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

          <LogTable entries={checkIns} emptyMessage="No gym check-ins recorded yet" title="Gym Check-In Log" />
        </>
      )}

      {/* Private Sessions */}
      {tab === 'pt' && (
        <>
          {/* Summary strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 1, background: 'var(--border)',
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
          }}>
            {[
              { label: 'Total Sessions', value: member?.PT_sessions ?? 0 },
              { label: 'Used', value: member?.used_PT_sessions ?? 0 },
              { label: 'Remaining', value: (member?.PT_sessions ?? 0) - (member?.used_PT_sessions ?? 0) },
              { label: 'Last Session', value: ptSessions[0] ? fmtDateTime(ptSessions[0].createdAt) : '—', wide: true },
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

          <LogTable entries={ptSessions} emptyMessage="No private sessions recorded yet" title="Private Session Log" />
        </>
      )}
    </div>
  );
}

function LogTable({ entries, emptyMessage, title }) {
  return (
    <Card noPad>
      <div style={{ padding: '14px 18px 0' }}>
        <CardHeader title={`${title} (${entries.length})`} />
      </div>

      {!entries.length ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <Table headers={['#', 'Checked In By', 'Role', 'Date & Time', 'Note']}>
          {entries.map((c, i) => (
            <tr
              key={c._id ?? i}
              className="tbl-row"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t4)', fontFamily: 'monospace', width: 48 }}>
                {entries.length - i}
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
  );
}

function countThisMonth(entries) {
  const now = new Date();
  return entries.filter(c => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}
