import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePageTitle from '../hooks/usePageTitle';
import Layout from '../components/Layout';
import { PageHeader, Card, CardHeader, Btn, Spinner, Badge, Avatar, fmtDate } from '../components/ui';
import { checkInMember, getMemberProfile } from '../api/endpoints';

export default function CheckIn() {
  usePageTitle('Check In');
  const navigate = useNavigate();
  const [query,     setQuery]   = useState('');
  const [member,    setMember]  = useState(null);
  const [searching, setSearching] = useState(false);
  const [checking,  setChecking]  = useState(false);
  const [result,    setResult]    = useState(null); // { ok, msg }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setMember(null); setResult(null);
    try {
      const res = await getMemberProfile(query.trim());
      setMember(res.data.member);
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Member not found.');
    } finally { setSearching(false); }
  };

  const handleCheckIn = async () => {
    if (!member) return;
    setChecking(true); setResult(null);
    try {
      const res = await checkInMember(member.systemId);
      setResult({ ok: true, msg: res.data.message });
      toast.success(res.data.message);
      const updated = await getMemberProfile(member.systemId);
      setMember(updated.data.member);
    } catch (e) {
      const msg = e.response?.data?.message ?? 'Check-in failed.';
      setResult({ ok: false, msg });
      toast.error(msg);
    } finally { setChecking(false); }
  };

  const canCheckIn = member && member.status !== 'expired' && member.status !== 'guest';
  const sub = member?.subscriptions?.at(-1);
  const pkg = sub?.package;

  return (
    <Layout>
      <PageHeader title="Check In" />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32, maxWidth: 580 }}>

        {/* Search */}
        <Card>
          <CardHeader title="Find Member" />
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="System ID, Member ID, or phone…"
              autoFocus
              style={{
                flex: 1, padding: '8px 11px', fontSize: 13,
                border: '1px solid var(--border)', borderRadius: 6,
                outline: 'none', color: 'var(--t1)', background: '#fff',
                fontFamily: 'inherit', transition: 'border-color 0.12s, box-shadow 0.12s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
            <Btn type="submit" disabled={searching || !query.trim()}>
              {searching ? <Spinner size="sm" /> : 'Search'}
            </Btn>
          </form>
          <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 8 }}>Press Enter to search. Accepts system ID, member ID, or phone number.</p>
        </Card>

        {/* Member result */}
        {member && (
          <Card className="fade-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Avatar name={member.name} size="lg" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{member.name}</h2>
                  <Badge status={member.status} />
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--t3)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--t4)' }}>#{member.systemId}{member.memberId ? ` / M${member.memberId}` : ''}</span>
                  <span>{member.phones}</span>
                </div>
              </div>
            </div>

            {/* Package strip */}
            {pkg && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '10px 14px', marginBottom: 14,
              }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 1 }}>Package</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{pkg.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--t3)', margin: 0 }}>{pkg.activityType} · {pkg.duration}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 1 }}>Expires</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{fmtDate(sub?.endDate)}</p>
                </div>
              </div>
            )}

            {/* Result message */}
            {result && (
              <div style={{
                padding: '9px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13, fontWeight: 500,
                background: result.ok ? 'var(--green-bg)' : 'var(--red-bg)',
                color: result.ok ? 'var(--green)' : 'var(--red)',
                border: `1px solid ${result.ok ? 'var(--green-bd)' : 'var(--red-bd)'}`,
              }}>{result.msg}</div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn
                variant={canCheckIn ? 'success' : 'outline'}
                onClick={handleCheckIn}
                disabled={checking || !canCheckIn}
                style={{ flex: 1 }}
              >
                {checking ? <><Spinner size="sm" /> Processing…</> : 'Check In'}
              </Btn>
              <Btn variant="outline" onClick={() => navigate(`/members/${member.systemId}`)}>
                View Profile
              </Btn>
            </div>

            {!canCheckIn && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--red)', marginTop: 10 }}>
                Cannot check in — member is <strong>{member.status}</strong>
              </p>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
