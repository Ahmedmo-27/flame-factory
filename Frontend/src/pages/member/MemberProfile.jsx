import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import Layout from '../../components/Layout';
import { PageHeader, Tabs, Badge, Btn, Spinner, Avatar, Skeleton } from '../../components/ui';
import { getMemberProfile, checkInMember } from '../../api/endpoints';
import PersonalTab    from './tabs/PersonalTab';
import PackagesTab    from './tabs/PackagesTab';
import CallCenterTab  from './tabs/CallCenterTab';
import FreezeTab      from './tabs/FreezeTab';
import InvitationsTab from './tabs/InvitationsTab';
import CheckInsTab    from './tabs/CheckInsTab';
import OthersTab      from './tabs/OthersTab';

const TABS = [
  { id: 'personal',    label: 'Personal Info' },
  { id: 'packages',    label: 'Packages' },
  { id: 'callcenter',  label: 'Call Center' },
  { id: 'freeze',      label: 'Freeze' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'checkins',    label: 'Check-In History' },
  { id: 'others',      label: 'Others' },
];

export default function MemberProfile() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setTab]     = useState(() => searchParams.get('tab') || 'personal');
  const [checkingIn, setChecking] = useState(false);

  usePageTitle(data?.member?.name ?? 'Profile');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.some(t => t.id === tab)) setTab(tab);
  }, [searchParams]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMemberProfile(id);
      if (!res.data?.member) {
        toast.error('Member not found.');
        navigate(-1);
        return;
      }
      setData(res.data);
    } catch (e) {
      const msg = e.response?.data?.message;
      toast.error(msg === 'Access denied' ? 'You do not have permission to view this profile.' : (msg ?? 'Member not found.'));
      navigate(-1);
    }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleCheckIn = async () => {
    setChecking(true);
    try { const res = await checkInMember(id); toast.success(res.data.message); fetchProfile(); }
    catch (e) { toast.error(e.response?.data?.message ?? 'Check-in failed.'); }
    finally { setChecking(false); }
  };

  const member = data?.member;
  const stats  = data?.stats;

  return (
    <Layout>
      <PageHeader title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </button>
          <span style={{ color: 'var(--border-md)' }}>/</span>
          <span>{loading ? 'Loading…' : (member?.name ?? 'Profile')}</span>
        </div>
      }>
        {member && ['Receptionist', 'Owner', 'Sales Manager'].includes(user?.role) && (
          <Btn variant={member.status === 'active' || member.status === 'frozen' ? 'success' : 'outline'} size="sm"
            onClick={handleCheckIn} disabled={checkingIn || member.status === 'expired' || member.status === 'guest'}>
            {checkingIn ? <Spinner size="sm" /> : 'Check In'}
          </Btn>
        )}
      </PageHeader>

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32 }}>
        {loading ? <ProfileSkeleton /> : !member ? null : (
          <>
            <ProfileHeader member={member} stats={stats} />
            <Tabs tabs={TABS} active={activeTab} onChange={setTab} />
            <div className="fade-up">
              {activeTab === 'personal'    && <PersonalTab    member={member} user={user} onRefresh={fetchProfile} />}
              {activeTab === 'packages'    && <PackagesTab    member={member} user={user} onRefresh={fetchProfile} />}
              {activeTab === 'callcenter'  && <CallCenterTab  member={member} user={user} onRefresh={fetchProfile} />}
              {activeTab === 'freeze'      && <FreezeTab      member={member} user={user} onRefresh={fetchProfile} />}
              {activeTab === 'invitations' && <InvitationsTab member={member} user={user} onRefresh={fetchProfile} />}
              {activeTab === 'checkins'    && <CheckInsTab    checkIns={data?.checkIns ?? []} stats={data?.stats} />}
              {activeTab === 'others'      && <OthersTab      profileViews={data?.profileViews ?? []} />}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function ProfileHeader({ member, stats }) {
  const sub = member.subscriptions?.at(-1);
  const pkg = sub?.package;

  const statItems = [
    { label: 'Check-ins',     value: stats?.totalCheckIns ?? 0 },
    { label: 'Subscriptions', value: stats?.totalSubscriptions ?? 0 },
    { label: 'Freeze used',   value: `${stats?.freezeDaysUsed ?? 0} / ${pkg?.freezeLimitDays ?? 0}d` },
    { label: 'Invitations',   value: `${stats?.invitationsUsed ?? 0} / ${pkg?.invitationLimit ?? 0}` },
  ];

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
      <Avatar name={member.name} size="lg" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{member.name}</h2>
          <Badge status={member.status} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
          <span>{member.phones}</span>
          {member.nationalId && <span>{member.nationalId}</span>}
          {member.gender     && <span style={{ textTransform: 'capitalize' }}>{member.gender}</span>}
          {member.assignedSales && <span>Sales: {member.assignedSales.name}</span>}
          <span style={{ fontFamily: 'monospace', color: 'var(--t4)' }}>#{member.systemId}{member.memberId ? ` / M${member.memberId}` : ''}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statItems.map(s => (
            <div key={s.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 14 }}>
        <Skeleton h="48px" w="48px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <Skeleton h="14px" w="160px" /><Skeleton h="11px" w="240px" /><Skeleton h="11px" w="180px" />
        </div>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, height: 200 }} />
    </div>
  );
}
