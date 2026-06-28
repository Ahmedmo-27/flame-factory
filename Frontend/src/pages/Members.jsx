import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useSystem } from '../context/SystemContext'
import MemberModal from '../components/MemberModal'
import ConfirmModal from '../components/ConfirmModal'

const STATUS_FILTERS = [
  { value: '',         label: 'All Status' },
  { value: 'active',   label: 'Active'     },
  { value: 'expiring', label: 'Expiring'   },
  { value: 'expired',  label: 'Expired'    },
  { value: 'frozen',   label: 'Frozen'     },
]

export default function Members() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { store, groups, isFight, config, systemId } = useStore()
  const { SYSTEMS, activeSystem } = useSystem()
  const system = SYSTEMS[activeSystem]

  const [members,     setMembers]     = useState(() => store.memberService.getAll())
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatus]     = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const [editMember,  setEditMember]  = useState(null)
  const [deleteTarget, setDelete]     = useState(null)

  const branchFilter  = searchParams.get('branch')  || ''
  const sessionFilter = searchParams.get('session') || ''
  const programFilter = searchParams.get('program') || ''

  function refresh() { setMembers(store.memberService.getAll()) }

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.phone && m.phone.includes(search))
      const matchGroup = isFight
        ? (!branchFilter  || m.branch  === branchFilter)
        : (!sessionFilter || m.session === sessionFilter)
      const matchProgram = !programFilter || m.program === programFilter
      const matchStatus  = !statusFilter  || store.memberService.getStatus(m) === statusFilter
      return matchSearch && matchGroup && matchProgram && matchStatus
    })
  }, [members, search, branchFilter, sessionFilter, programFilter, statusFilter])

  function handleSave(data) {
    if (editMember) {
      store.memberService.update(editMember.id, data)
    } else {
      store.memberService.create(data)
    }
    refresh()
    setShowModal(false)
    setEditMember(null)
  }

  function handleDelete(id) {
    store.memberService.delete(id)
    refresh()
  }

  function groupLabel(m) {
    if (isFight) return groups.find((g) => g.id === m.branch)?.label || m.branch || '—'
    return groups.find((g) => g.id === m.session)?.label || m.session || '—'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Members</h2>
          <p>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditMember(null); setShowModal(true) }}
        >
          + Add Member
        </button>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="select-control"
          value={isFight ? branchFilter : sessionFilter}
          onChange={(e) => {
            const val = e.target.value
            const key = isFight ? 'branch' : 'session'
            const params = {}
            if (val) params[key] = val
            if (programFilter) params.program = programFilter
            setSearchParams(params)
          }}
        >
          <option value="">{isFight ? 'All Branches' : 'All Sessions'}</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>

        {isFight && (
          <select
            className="select-control"
            value={programFilter}
            onChange={(e) => {
              const params = {}
              if (branchFilter) params.branch = branchFilter
              if (e.target.value) params.program = e.target.value
              setSearchParams(params)
            }}
          >
            <option value="">All Programs</option>
            {config.programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}

        <select
          className="select-control"
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <p>No members found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Age</th>
                  <th>{isFight ? 'Branch' : 'Session'}</th>
                  {isFight && <th>Program</th>}
                  <th>Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const status = store.memberService.getStatus(m)
                  return (
                    <tr key={m.id}>
                      <td>
                        <div
                          className="flex items-center gap-2"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/members/${m.id}`)}
                        >
                          <div className="avatar" style={{ borderColor: system.color, color: system.color, background: `${system.color}14` }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{m.name}</span>
                        </div>
                      </td>
                      <td className="text-muted">{m.phone || '—'}</td>
                      <td className="text-muted">{m.age || '—'}</td>
                      <td className="text-muted">{groupLabel(m)}</td>
                      {isFight && (
                        <td className="text-muted" style={{ textTransform: 'capitalize' }}>
                          {m.program || '—'}
                        </td>
                      )}
                      <td className="text-muted" style={{ textTransform: 'capitalize' }}>{m.membershipType || '—'}</td>
                      <td className="text-muted">
                        {m.membershipStart
                          ? new Date(m.membershipStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="text-muted">
                        {m.membershipEnd
                          ? new Date(m.membershipEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td><span className={`badge badge-${status}`}>{status}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => navigate(`/members/${m.id}`)}
                            title="View Profile"
                          >
                            →
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => { setEditMember(m); setShowModal(true) }}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => setDelete(m)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <MemberModal
          member={editMember}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditMember(null) }}
          systemId={systemId}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Member"
          message={`Delete "${deleteTarget.name}"? This will also remove their attendance records and comments.`}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDelete(null)}
        />
      )}
    </div>
  )
}
