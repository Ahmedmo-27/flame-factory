import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePageTitle from '../hooks/usePageTitle';
import Layout from '../components/Layout';
import { PageHeader, Card, CardHeader, Input, Select, Btn, Spinner } from '../components/ui';
import { createMember, getSalesUsers, getCoachTeam } from '../api/endpoints';

export default function AddMember() {
  usePageTitle('Add Member');
  const navigate = useNavigate();

  const init = { name: '', phones: '', gender: '', source: '', assignedSales: '', coachId: '' };
  const [form, setForm]       = useState(init);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [sales, setSales]     = useState([]);
  const [coaches, setCoaches] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchMeta = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([getSalesUsers(), getCoachTeam()]);
      setSales(sRes.data.salesUsers ?? []);
      setCoaches(cRes.data.coaches ?? cRes.data.team ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.phones.trim()) e.phones = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phones: form.phones.trim(),
        gender: form.gender || null,
        source: form.source || null,
        assignedSales: form.assignedSales || null,
        coachId: form.coachId || null,
      };
      const res = await createMember(payload);
      toast.success('Member added successfully!');
      const newId = res.data?.member?.systemId;
      if (newId) navigate(`/members/${newId}`);
      else { setForm(init); setErrors({}); }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to add member.'); }
    finally { setLoading(false); }
  };

  return (
    <Layout>
      <PageHeader title="Add New Member" />

      <div className="page-wrap" style={{ paddingTop: 20, paddingBottom: 32, maxWidth: 600 }}>
        <Card>
          <CardHeader title="Member Information" sub="Fill in the details below to register a new member" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="Full Name *" placeholder="e.g. Ahmad Ali" value={form.name}
              onChange={e => set('name', e.target.value)} error={errors.name} />
            <Input label="Phone Number *" placeholder="e.g. 0599123456" value={form.phones}
              onChange={e => set('phones', e.target.value)} error={errors.phones} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
            <Select label="Source" value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">— Select —</option>
              {['Social media', 'Walk in', 'Word of mouth', 'Referral', 'Sales call', 'Data entry', 'Others'].map(s =>
                <option key={s} value={s.toLowerCase()}>{s}</option>
              )}
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Select label="Assign Sales Rep" value={form.assignedSales} onChange={e => set('assignedSales', e.target.value)}>
              <option value="">— None —</option>
              {sales.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </Select>
            <Select label="Assign Coach" value={form.coachId} onChange={e => set('coachId', e.target.value)}>
              <option value="">— None —</option>
              {coaches.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" size="sm" onClick={() => setForm(init)}>Reset</Btn>
            <Btn size="sm" onClick={handleSubmit} disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Add Member'}
            </Btn>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
