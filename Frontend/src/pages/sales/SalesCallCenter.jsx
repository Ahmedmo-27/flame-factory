import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Card, EmptyState, Avatar, Badge, Spinner, fmtDateTime } from '../../components/ui';
import { getAllMembers } from '../../api/endpoints';

export default function SalesCallCenter() {
  usePageTitle('Call Center');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllMembers({ all: 'true' });
      const members = res.data.members ?? [];

      // Extract all notes written by the current user
      const myNotes = [];
      members.forEach(m => {
        (m.notes || []).forEach(note => {
          const noteCreatorId = note.createdBy?._id || note.createdBy;
          if (String(noteCreatorId) === String(user?._id)) {
            myNotes.push({
              _id: note._id,
              text: note.text,
              createdAt: note.createdAt,
              memberName: m.name,
              memberSystemId: m.systemId,
              memberStatus: m.status,
            });
          }
        });
      });

      myNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotes(myNotes);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <PageHeader title="Call Center">
        <span style={{ fontSize: 12, color: 'var(--t4)' }}>
          {notes.length} note{notes.length !== 1 ? 's' : ''} total
        </span>
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Card noPad>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
              My Notes ({notes.length})
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
          ) : notes.length === 0 ? (
            <EmptyState icon="💬" message="No notes written yet" sub="Notes you add to member profiles will appear here" />
          ) : (
            <div>
              {notes.map((note, i) => (
                <div key={note._id ?? i}
                  onClick={() => navigate(`/members/${note.memberSystemId}?tab=callcenter`)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: i === notes.length - 1 ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Member info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Avatar name={note.memberName} size="sm" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{note.memberName}</span>
                    <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>#{note.memberSystemId}</span>
                    <Badge status={note.memberStatus} />
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(note.createdAt)}</span>
                  </div>

                  {/* Note text */}
                  <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
