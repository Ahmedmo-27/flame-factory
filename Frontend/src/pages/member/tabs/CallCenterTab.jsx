import { useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, Btn, Textarea, Spinner, EmptyState, fmtDateTime } from '../../../components/ui';
import { addNote } from '../../../api/endpoints';

export default function CallCenterTab({ member, user, onRefresh }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const canAdd = ['Sales', 'Sales Manager', 'Receptionist', 'Owner'].includes(user?.role);
  const notes  = [...(member.notes ?? [])].reverse();

  const handleAdd = async () => {
    if (!text.trim()) { toast.error('Note cannot be empty.'); return; }
    setLoading(true);
    try { await addNote(member.systemId, text.trim()); toast.success('Note added.'); setText(''); onRefresh(); }
    catch (e) { toast.error(e.response?.data?.message ?? 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canAdd && (
        <Card>
          <CardHeader title="Add Note" />
          <Textarea placeholder="Write your note here… (Ctrl+Enter to save)" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd(); }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--t4)' }}>Notes are permanent — no editing or deletion</span>
            <Btn size="sm" onClick={handleAdd} disabled={loading || !text.trim()}>{loading ? <Spinner size="sm" /> : 'Add Note'}</Btn>
          </div>
        </Card>
      )}

      <Card noPad>
        <div style={{ padding: '14px 18px 0' }}>
          <CardHeader title={`Notes (${member.notes?.length ?? 0})`} />
        </div>
        {!notes.length ? <EmptyState message="No notes yet" /> :
          <div>
            {notes.map(n => (
              <div key={n._id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--navy)', display: 'inline-block' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{n.createdBy?.name ?? 'Unknown'}</span>
                    <span style={{ fontSize: 11, color: 'var(--t4)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border)' }}>{n.createdBy?.role}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(n.createdAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{n.text}</p>
              </div>
            ))}
          </div>
        }
      </Card>
    </div>
  );
}
