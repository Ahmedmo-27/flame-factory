import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/useStore'
import { useSystem } from '../context/SystemContext'
import { today } from '../services/storageService'

export default function Attendance() {
  const navigate = useNavigate()
  const { store, groups, isFight, config } = useStore()
  const { SYSTEMS, activeSystem } = useSystem()
  const system = SYSTEMS[activeSystem]

  const [selectedDate,  setSelectedDate]  = useState(today())
  const [groupFilter,   setGroupFilter]   = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [members,       setMembers]       = useState(() => store.memberService.getAll())
  const [allAttendance, setAllAttendance] = useState(() => store.attendanceService.getAll())

  const [search,       setSearch]       = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlighted,  setHighlighted]  = useState(0)
  const searchRef  = useRef(null)
  const dropdownRef = useRef(null)

  function refresh() {
    setMembers(store.memberService.getAll())
    setAllAttendance(store.attendanceService.getAll())
  }

  const dateRecords = useMemo(
    () => allAttendance.filter((a) => a.date === selectedDate),
    [allAttendance, selectedDate]
  )

  const checkedInIds = useMemo(() => new Set(dateRecords.map((a) => a.memberId)), [dateRecords])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q)))
      .slice(0, 8)
  }, [members, search])

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchGroup   = isFight
        ? (!groupFilter || m.branch === groupFilter)
        : (!groupFilter || m.session === groupFilter)
      const matchProgram = !programFilter || m.program === programFilter
      const matchSearch  = !search.trim() || m.name.toLowerCase().includes(search.toLowerCase()) || (m.phone && m.phone.includes(search))
      return matchGroup && matchProgram && matchSearch
    })
  }, [members, groupFilter, programFilter, search])

  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        searchRef.current   && !searchRef.current.contains(e.target)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSearchKey(e) {
    if (!dropdownOpen || searchResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const m = searchResults[highlighted]
      if (m) checkInBySearch(m)
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setSearch('')
    }
  }

  function checkInBySearch(m) {
    if (checkedInIds.has(m.id)) {
      const record = dateRecords.find((a) => a.memberId === m.id)
      if (record) store.attendanceService.delete(record.id)
    } else {
      store.attendanceService.checkIn(m.id, selectedDate)
    }
    refresh()
    setSearch('')
    setDropdownOpen(false)
    setHighlighted(0)
    searchRef.current?.focus()
  }

  function handleToggle(memberId) {
    if (checkedInIds.has(memberId)) {
      const record = dateRecords.find((a) => a.memberId === memberId)
      if (record) { store.attendanceService.delete(record.id); refresh() }
    } else {
      store.attendanceService.checkIn(memberId, selectedDate)
      refresh()
    }
  }

  function handleCheckAll() {
    filteredMembers.forEach((m) => {
      if (!checkedInIds.has(m.id)) store.attendanceService.checkIn(m.id, selectedDate)
    })
    refresh()
  }

  function handleClearAll() {
    filteredMembers.forEach((m) => {
      const r = dateRecords.find((a) => a.memberId === m.id)
      if (r) store.attendanceService.delete(r.id)
    })
    refresh()
  }

  const presentCount = filteredMembers.filter((m) => checkedInIds.has(m.id)).length

  const groupSummary = groups.map((g) => {
    const gMembers = members.filter((m) => isFight ? m.branch === g.id : m.session === g.id)
    return { ...g, total: gMembers.length, present: gMembers.filter((m) => checkedInIds.has(m.id)).length }
  })

  function memberGroupLabel(m) {
    if (isFight) return groups.find((g) => g.id === m.branch)?.label || m.branch || '—'
    return groups.find((g) => g.id === m.session)?.label || m.session || '—'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Activity</h2>
          <p>{presentCount} / {filteredMembers.length} present today</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-success btn-sm" onClick={handleCheckAll}>Check All</button>
          <button className="btn btn-ghost btn-sm" onClick={handleClearAll}>Clear All</button>
        </div>
      </div>

      {/* Quick check-in search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={searchRef}
            className="search-input"
            style={{ paddingLeft: 14, fontSize: 13 }}
            placeholder="Type a name to quickly check in / out..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); setHighlighted(0) }}
            onFocus={() => { if (search) setDropdownOpen(true) }}
            onKeyDown={handleSearchKey}
            autoComplete="off"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setDropdownOpen(false) }}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
              }}
            >✕</button>
          )}
        </div>

        {/* Dropdown results */}
        {dropdownOpen && searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
              zIndex: 50, overflow: 'hidden', marginTop: 4,
            }}
          >
            {searchResults.map((m, i) => {
              const checked = checkedInIds.has(m.id)
              const status  = store.memberService.getStatus(m)
              return (
                <div
                  key={m.id}
                  onClick={() => checkInBySearch(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                    background: i === highlighted ? 'var(--surface2)' : 'transparent',
                    borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <div
                    className="avatar"
                    style={{
                      width: 30, height: 30, fontSize: 12,
                      background:  checked ? 'var(--active-bg)' : `${system.color}14`,
                      borderColor: checked ? 'var(--active)' : system.color,
                      color:       checked ? 'var(--active)' : system.color,
                    }}
                  >
                    {checked ? '✓' : m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {memberGroupLabel(m)}{m.phone ? ` · ${m.phone}` : ''}
                      {m.membershipMode === 'sessions' && (
                        <span style={{ marginLeft: 6, color: m.sessionsRemaining <= 2 ? 'var(--expiring)' : 'var(--active)', fontWeight: 600 }}>
                          · {m.sessionsRemaining ?? 0}/{m.sessionsTotal}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {status !== 'active' && (
                      <span className={`badge badge-${status}`} style={{ fontSize: 10 }}>{status}</span>
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: checked ? 'var(--active)' : system.color,
                      background: checked ? 'var(--active-bg)' : `${system.color}14`,
                      padding: '3px 9px', borderRadius: 20,
                    }}>
                      {checked ? '✓ Present' : '+ Check In'}
                    </span>
                  </div>
                </div>
              )
            })}
            <div style={{ padding: '7px 14px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              ↑↓ navigate · Enter to toggle · Esc to close
            </div>
          </div>
        )}

        {dropdownOpen && search.trim() && searchResults.length === 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 14, fontSize: 13,
            color: 'var(--text-muted)', zIndex: 50,
          }}>
            No members found for "{search}"
          </div>
        )}
      </div>

      {/* Group summary cards */}
      <div className="stats-grid mb-4">
        {groupSummary.map((g) => (
          <div
            key={g.id}
            className="stat-card"
            style={{ cursor: 'pointer', borderColor: groupFilter === g.id ? system.color : undefined }}
            onClick={() => setGroupFilter(groupFilter === g.id ? '' : g.id)}
          >
            <div className="label">{g.label}</div>
            <div className="value" style={{ color: system.color, fontSize: 26 }}>{g.present}</div>
            <div className="sub">of {g.total}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="filter-bar">
        <input
          type="date"
          className="select-control"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <select
          className="select-control"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="">{isFight ? 'All Branches' : 'All Sessions'}</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        {isFight && (
          <select
            className="select-control"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <option value="">All Programs</option>
            {config.programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}
      </div>

      {/* Member grid */}
      {filteredMembers.length === 0 ? (
        <div className="empty"><div className="empty-icon">👥</div><p>No members found.</p></div>
      ) : (
        <div className="attendance-grid">
          {filteredMembers.map((m) => {
            const checked = checkedInIds.has(m.id)
            const status  = store.memberService.getStatus(m)
            return (
              <div
                key={m.id}
                className={`att-member-card${checked ? ' checked' : ''}`}
                onClick={() => handleToggle(m.id)}
              >
                <div
                  className="avatar"
                  style={{
                    width: 32, height: 32, fontSize: 12,
                    background:  checked ? 'var(--active-bg)' : `${system.color}14`,
                    borderColor: checked ? 'var(--active)' : system.color,
                    color:       checked ? 'var(--active)' : system.color,
                  }}
                >
                  {checked ? '✓' : m.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="att-name">{m.name}</div>
                  <div className="att-session">{memberGroupLabel(m)}</div>
                  {isFight && m.program && (
                    <div className="att-session" style={{ color: system.color }}>
                      {m.program.charAt(0).toUpperCase() + m.program.slice(1)}
                    </div>
                  )}
                  {m.membershipMode === 'sessions' && (
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: m.sessionsRemaining <= 2 ? 'var(--expiring)' : 'var(--active)' }}>
                      {m.sessionsRemaining ?? 0}/{m.sessionsTotal} left
                    </div>
                  )}
                  {status !== 'active' && (
                    <span className={`badge badge-${status}`} style={{ marginTop: 4, fontSize: 10 }}>{status}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log table */}
      {dateRecords.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            Log — {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>{isFight ? 'Branch' : 'Session'}</th>
                  {isFight && <th>Program</th>}
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dateRecords.map((a) => {
                  const m = members.find((x) => x.id === a.memberId)
                  return (
                    <tr key={a.id}>
                      <td>
                        <div
                          className="flex items-center gap-2"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/members/${a.memberId}`)}
                        >
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, borderColor: system.color, color: system.color, background: `${system.color}14` }}>
                            {m ? m.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-semibold">{m?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="text-muted">{m ? memberGroupLabel(m) : '—'}</td>
                      {isFight && <td className="text-muted" style={{ textTransform: 'capitalize' }}>{m?.program || '—'}</td>}
                      <td>{a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>
                        {a.checkedOutAt
                          ? new Date(a.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { store.attendanceService.checkOut(a.memberId, selectedDate); refresh() }}
                            >
                              Check Out
                            </button>
                          )}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => { store.attendanceService.delete(a.id); refresh() }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
