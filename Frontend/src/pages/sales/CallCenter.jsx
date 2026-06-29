import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePageTitle from '../../hooks/usePageTitle';
import useDebounce from '../../hooks/useDebounce';
import Layout from '../../components/Layout';
import { PageHeader, Card, Btn, SearchInput, EmptyState, Avatar, Badge, Spinner, fmtDateTime } from '../../components/ui';
import { getAllNotes, getSalesUsers } from '../../api/endpoints';

export default function CallCenter() {
  usePageTitle('Call Center');
  const navigate = useNavigate();

  const [notes,      setNotes]      = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [salesFilter, setSalesFilter] = useState('all'); // 'all' or user _id

  const debouncedSearch = useDebounce(search, 300);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, salesRes] = await Promise.all([
        getAllNotes(),
        getSalesUsers(),
      ]);
      setNotes(notesRes.data.notes ?? []);
      setSalesUsers(salesRes.data.salesUsers ?? []);
    } catch {
      toast.error('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by sales person
  const filtered = useMemo(() => {
    let list = notes;

    // Filter by selected sales person
    if (salesFilter !== 'all') {
      list = list.filter(n =>
        n.createdBy?._id === salesFilter ||
        String(n.createdBy?._id) === String(salesFilter)
      );
    }

    // Filter by search text (member name, note text, author name)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(n =>
        n.text?.toLowerCase().includes(q) ||
        n.member?.name?.toLowerCase().includes(q) ||
        n.createdBy?.name?.toLowerCase().includes(q) ||
        String(n.member?.systemId ?? '').includes(q)
      );
    }

    return list;
  }, [notes, salesFilter, debouncedSearch]);

  // Group stats
  const stats = useMemo(() => {
    const byPerson = {};
    notes.forEach(n => {
      const id   = String(n.createdBy?._id ?? 'unknown');
      const name = n.createdBy?.name ?? 'Unknown';
      if (!byPerson[id]) byPerson[id] = { name, count: 0 };
      byPerson[id].count++;
    });
    return byPerson;
  }, [notes]);

  return (
    <Layout>
      <PageHeader title="Call Center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search notes, members, authors…"
          width={260}
        />
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>

        {/* Summary strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 1,
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {[
            { label: 'Total Notes',    value: notes.length },
            { label: 'Filtered',       value: filtered.length },
            { label: 'Contributors',   value: Object.keys(stats).length },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--t4)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Left — Sales filter panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Filter by Author
              </div>

              {/* All option */}
              <button
                onClick={() => setSalesFilter('all')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)',
                  background: salesFilter === 'all' ? 'var(--navy)' : 'var(--card)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (salesFilter !== 'all') e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (salesFilter !== 'all') e.currentTarget.style.background = 'var(--card)'; }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: salesFilter === 'all' ? '#fff' : 'var(--t1)' }}>All</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: salesFilter === 'all' ? 'rgba(255,255,255,0.6)' : 'var(--t4)',
                  background: salesFilter === 'all' ? 'rgba(255,255,255,0.12)' : 'var(--bg)',
                  border: `1px solid ${salesFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                  padding: '1px 7px', borderRadius: 4,
                }}>{notes.length}</span>
              </button>

              {/* Per-sales rows */}
              {loading ? (
                <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Spinner size="sm" /></div>
              ) : salesUsers.map(u => {
                const count   = stats[String(u._id)]?.count ?? 0;
                const isActive = salesFilter === String(u._id);
                return (
                  <button
                    key={u._id}
                    onClick={() => setSalesFilter(String(u._id))}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)',
                      background: isActive ? 'var(--navy)' : 'var(--card)',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--card)'; }}
                  >
                    <Avatar name={u.name} size="sm" />
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#fff' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.45)' : 'var(--t4)' }}>{u.role}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--t4)',
                      background: isActive ? 'rgba(255,255,255,0.12)' : 'var(--bg)',
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                      padding: '1px 7px', borderRadius: 4, flexShrink: 0,
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — Notes feed */}
          <div>
            {loading ? (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Spinner size="lg" />
              </div>
            ) : !filtered.length ? (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <EmptyState message="No notes match your filters" sub="Try a different search term or select a different sales rep." />
              </div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
                    {filtered.length} note{filtered.length !== 1 ? 's' : ''}
                    {salesFilter !== 'all' && ` by ${salesUsers.find(u => String(u._id) === salesFilter)?.name ?? ''}`}
                    {debouncedSearch && ` matching "${debouncedSearch}"`}
                  </span>
                  {(salesFilter !== 'all' || search) && (
                    <Btn variant="ghost" size="xs" onClick={() => { setSalesFilter('all'); setSearch(''); }}>
                      Clear filters
                    </Btn>
                  )}
                </div>

                <div>
                  {filtered.map((note, i) => (
                    <NoteRow
                      key={note._id ?? i}
                      note={note}
                      onMemberClick={() => navigate(`/members/${note.member?.systemId}`)}
                      isLast={i === filtered.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function NoteRow({ note, onMemberClick, isLast }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      {/* Top row: author + time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={note.createdBy?.name ?? '?'} size="sm" />
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>
              {note.createdBy?.name ?? '—'}
            </span>
            <span style={{
              marginLeft: 7, fontSize: 10, fontWeight: 600,
              color: 'var(--t3)', background: 'var(--bg)',
              border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3,
            }}>
              {note.createdBy?.role ?? '—'}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>{fmtDateTime(note.createdAt)}</span>
      </div>

      {/* Note text */}
      <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
        {note.text}
      </p>

      {/* Member chip */}
      {note.member && (
        <button
          onClick={onMemberClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '4px 10px', borderRadius: 5,
            background: 'var(--bg)', border: '1px solid var(--border)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--navy)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', fontFamily: 'monospace' }}>
            #{note.member.systemId}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
            {note.member.name}
          </span>
          <Badge status={note.member.status} />
          <span style={{ fontSize: 10, color: 'var(--t4)' }}>View →</span>
        </button>
      )}
    </div>
  );
}
