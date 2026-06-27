/**
 * Storage service — namespaced per system so FitAcademy and FightLocation
 * data are completely isolated.
 *
 * Usage:
 *   import { createStore } from './storageService'
 *   const store = createStore('fitacademy')   // or 'fightlocation'
 *   store.memberService.getAll()
 */

// ─── Shared constants ────────────────────────────────────────────────────────

export const FITACADEMY_CONFIG = {
  sessions: [
    { id: 'crossfit_adults', label: 'CrossFit — Adults' },
    { id: 'crossfit_kids',   label: 'CrossFit — Kids'   },
    { id: 'calisthenics',    label: 'Calisthenics'       },
  ],
  membershipTypes: [
    { id: '1month',  label: '1 Month',  months: 1  },
    { id: '3months', label: '3 Months', months: 3  },
    { id: '6months', label: '6 Months', months: 6  },
    { id: '1year',   label: '1 Year',   months: 12 },
  ],
  sessionPackages: [
    { id: '8',   label: '8 Sessions',   count: 8   },
    { id: '12',  label: '12 Sessions',  count: 12  },
    { id: '16',  label: '16 Sessions',  count: 16  },
    { id: '20',  label: '20 Sessions',  count: 20  },
    { id: '24',  label: '24 Sessions',  count: 24  },
    { id: 'custom', label: 'Custom',    count: null },
  ],
  groupLabel: 'Session',
  groupKey: 'session',
}

export const FIGHTLOCATION_CONFIG = {
  branches: [
    { id: 'carleton',     label: 'Carleton'      },
    { id: 'my_fair',      label: 'My Fair'        },
    { id: 'central_park', label: 'Central Park'   },
  ],
  programs: [
    { id: 'hustle', label: 'Hustle' },
  ],
  membershipTypes: [
    { id: '1month',  label: '1 Month',  months: 1  },
    { id: '3months', label: '3 Months', months: 3  },
    { id: '6months', label: '6 Months', months: 6  },
    { id: '1year',   label: '1 Year',   months: 12 },
  ],
  groupLabel: 'Branch',
  groupKey: 'branch',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Store factory ────────────────────────────────────────────────────────────

export function createStore(systemId) {
  const ns = `fa_${systemId}` // namespace prefix

  const KEYS = {
    MEMBERS:    `${ns}_members`,
    ATTENDANCE: `${ns}_attendance`,
    COMMENTS:   `${ns}_comments`,
    PAYMENTS:   `${ns}_payments`,
    GUESTS:     `${ns}_guests`,
  }

  // ── Members ──────────────────────────────────────────────────────────────

  const memberService = {
    getAll() {
      return load(KEYS.MEMBERS)
    },

    getById(id) {
      return load(KEYS.MEMBERS).find((m) => m.id === id) || null
    },

    create(data) {
      const members = load(KEYS.MEMBERS)
      const member = {
        ...data,
        id: uid(),
        frozen: false,
        freezeDate: null,
        totalFrozenDays: 0,
        // session-package fields
        sessionsTotal:     data.membershipMode === 'sessions' ? Number(data.sessionsTotal)     : null,
        sessionsRemaining: data.membershipMode === 'sessions' ? Number(data.sessionsTotal)     : null,
        createdAt: new Date().toISOString(),
      }
      members.push(member)
      save(KEYS.MEMBERS, members)
      if (data.price) {
        paymentService.create({
          memberId: member.id,
          memberName: member.name,
          amount: Number(data.price),
          date: data.membershipStart || today(),
          groupId: data.session || data.branch || '',
          program: data.program || '',
          note: data.membershipMode === 'sessions'
            ? `Session package — ${data.sessionsTotal} sessions`
            : `New membership — ${data.membershipType || 'Monthly'}`,
        })
      }
      return member
    },

    update(id, data) {
      const members = load(KEYS.MEMBERS)
      const idx = members.findIndex((m) => m.id === id)
      if (idx === -1) throw new Error('Member not found')
      const prev = members[idx]

      // If switching to sessions mode or renewing a session package, reset sessions
      const renewingSessions =
        data.membershipMode === 'sessions' &&
        (prev.membershipMode !== 'sessions' || data.sessionsTotal !== prev.sessionsTotal || data.membershipStart !== prev.membershipStart)

      const updated = {
        ...prev,
        ...data,
        sessionsTotal:     data.membershipMode === 'sessions' ? Number(data.sessionsTotal) : null,
        sessionsRemaining: renewingSessions
          ? Number(data.sessionsTotal)
          : (data.membershipMode === 'sessions' ? (prev.sessionsRemaining ?? Number(data.sessionsTotal)) : null),
        updatedAt: new Date().toISOString(),
      }
      members[idx] = updated
      save(KEYS.MEMBERS, members)

      // Record payment on renewal
      const isRenewal = data.price && (
        (data.membershipMode === 'sessions' && renewingSessions) ||
        (data.membershipMode !== 'sessions' && data.membershipStart && data.membershipStart !== prev.membershipStart)
      )
      if (isRenewal) {
        paymentService.create({
          memberId: id,
          memberName: members[idx].name,
          amount: Number(data.price),
          date: data.membershipStart || today(),
          groupId: members[idx].session || members[idx].branch || '',
          program: members[idx].program || '',
          note: data.membershipMode === 'sessions'
            ? `Session package renewal — ${data.sessionsTotal} sessions`
            : `Renewal — ${data.membershipType || members[idx].membershipType || 'Monthly'}`,
        })
      }
      return members[idx]
    },

    delete(id) {
      save(KEYS.MEMBERS,    load(KEYS.MEMBERS).filter((m) => m.id !== id))
      save(KEYS.ATTENDANCE, load(KEYS.ATTENDANCE).filter((a) => a.memberId !== id))
      save(KEYS.COMMENTS,   load(KEYS.COMMENTS).filter((c) => c.memberId !== id))
      save(KEYS.PAYMENTS,   load(KEYS.PAYMENTS).filter((p) => p.memberId !== id))
    },

    freeze(id) {
      const members = load(KEYS.MEMBERS)
      const idx = members.findIndex((m) => m.id === id)
      if (idx === -1) throw new Error('Member not found')
      if (members[idx].frozen) return members[idx]
      members[idx].frozen = true
      members[idx].freezeDate = today()
      members[idx].updatedAt = new Date().toISOString()
      save(KEYS.MEMBERS, members)
      return members[idx]
    },

    unfreeze(id) {
      const members = load(KEYS.MEMBERS)
      const idx = members.findIndex((m) => m.id === id)
      if (idx === -1) throw new Error('Member not found')
      if (!members[idx].frozen) return members[idx]
      const frozenDays = Math.ceil(
        (new Date() - new Date(members[idx].freezeDate)) / (1000 * 60 * 60 * 24)
      )
      const end = new Date(members[idx].membershipEnd)
      end.setDate(end.getDate() + frozenDays)
      members[idx].frozen = false
      members[idx].freezeDate = null
      members[idx].totalFrozenDays = (members[idx].totalFrozenDays || 0) + frozenDays
      members[idx].membershipEnd = end.toISOString().slice(0, 10)
      members[idx].updatedAt = new Date().toISOString()
      save(KEYS.MEMBERS, members)
      return members[idx]
    },

    /** 'frozen' | 'active' | 'expiring' | 'expired' */
    getStatus(member) {
      if (member.frozen) return 'frozen'
      // Session-based
      if (member.membershipMode === 'sessions') {
        const rem = member.sessionsRemaining ?? 0
        if (rem <= 0)  return 'expired'
        if (rem <= 2)  return 'expiring'
        return 'active'
      }
      // Time-based
      const todayMs = new Date().setHours(0, 0, 0, 0)
      const endMs   = new Date(member.membershipEnd).setHours(0, 0, 0, 0)
      const diff    = Math.ceil((endMs - todayMs) / 86400000)
      if (diff < 0)  return 'expired'
      if (diff <= 7) return 'expiring'
      return 'active'
    },

    /** Deduct 1 session on check-in (session-package members only). Returns updated member. */
    deductSession(id) {
      const members = load(KEYS.MEMBERS)
      const idx = members.findIndex((m) => m.id === id)
      if (idx === -1) return null
      if (members[idx].membershipMode !== 'sessions') return members[idx]
      const rem = members[idx].sessionsRemaining ?? 0
      if (rem <= 0) return members[idx]
      members[idx].sessionsRemaining = rem - 1
      members[idx].updatedAt = new Date().toISOString()
      save(KEYS.MEMBERS, members)
      return members[idx]
    },

    /** Restore 1 session when a check-in is undone. */
    restoreSession(id) {
      const members = load(KEYS.MEMBERS)
      const idx = members.findIndex((m) => m.id === id)
      if (idx === -1) return null
      if (members[idx].membershipMode !== 'sessions') return members[idx]
      const total = members[idx].sessionsTotal ?? 0
      const rem   = members[idx].sessionsRemaining ?? 0
      members[idx].sessionsRemaining = Math.min(rem + 1, total)
      members[idx].updatedAt = new Date().toISOString()
      save(KEYS.MEMBERS, members)
      return members[idx]
    },
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  const attendanceService = {
    getAll() {
      return load(KEYS.ATTENDANCE)
    },
    getByMember(memberId) {
      return load(KEYS.ATTENDANCE)
        .filter((a) => a.memberId === memberId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    },
    getByDate(date) {
      return load(KEYS.ATTENDANCE).filter((a) => a.date === date)
    },
    checkIn(memberId, date) {
      const attendance = load(KEYS.ATTENDANCE)
      const exists = attendance.find((a) => a.memberId === memberId && a.date === date)
      if (exists) return exists
      const record = { id: uid(), memberId, date, checkedInAt: new Date().toISOString() }
      attendance.push(record)
      save(KEYS.ATTENDANCE, attendance)
      // Auto-deduct session for session-package members
      memberService.deductSession(memberId)
      return record
    },
    checkOut(memberId, date) {
      const attendance = load(KEYS.ATTENDANCE)
      const idx = attendance.findIndex((a) => a.memberId === memberId && a.date === date)
      if (idx === -1) return null
      attendance[idx].checkedOutAt = new Date().toISOString()
      save(KEYS.ATTENDANCE, attendance)
      return attendance[idx]
    },
    delete(id) {
      const all = load(KEYS.ATTENDANCE)
      const record = all.find((a) => a.id === id)
      save(KEYS.ATTENDANCE, all.filter((a) => a.id !== id))
      // Restore session if this was a session-package member
      if (record) memberService.restoreSession(record.memberId)
    },
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  const commentService = {
    getByMember(memberId) {
      return load(KEYS.COMMENTS)
        .filter((c) => c.memberId === memberId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    create(memberId, text) {
      const comments = load(KEYS.COMMENTS)
      const comment = { id: uid(), memberId, text, createdAt: new Date().toISOString() }
      comments.push(comment)
      save(KEYS.COMMENTS, comments)
      return comment
    },
    update(id, text) {
      const comments = load(KEYS.COMMENTS)
      const idx = comments.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Comment not found')
      comments[idx] = { ...comments[idx], text, updatedAt: new Date().toISOString() }
      save(KEYS.COMMENTS, comments)
      return comments[idx]
    },
    delete(id) {
      save(KEYS.COMMENTS, load(KEYS.COMMENTS).filter((c) => c.id !== id))
    },
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  const paymentService = {
    getAll() {
      return load(KEYS.PAYMENTS).sort((a, b) => (a.date < b.date ? 1 : -1))
    },
    create(data) {
      const payments = load(KEYS.PAYMENTS)
      const payment = { ...data, id: uid(), createdAt: new Date().toISOString() }
      payments.push(payment)
      save(KEYS.PAYMENTS, payments)
      return payment
    },
    delete(id) {
      save(KEYS.PAYMENTS, load(KEYS.PAYMENTS).filter((p) => p.id !== id))
    },
    getMonthlySummary(groups) {
      const payments = load(KEYS.PAYMENTS)
      const map = {}
      payments.forEach((p) => {
        const month = p.date.slice(0, 7)
        if (!map[month]) map[month] = { month, total: 0, count: 0, byGroup: {} }
        map[month].total += Number(p.amount)
        map[month].count += 1
        const g = p.groupId || 'unknown'
        map[month].byGroup[g] = (map[month].byGroup[g] || 0) + Number(p.amount)
      })
      return Object.values(map)
        .sort((a, b) => (a.month < b.month ? 1 : -1))
        .map((m) => ({
          ...m,
          label: new Date(m.month + '-01').toLocaleString('default', {
            month: 'long', year: 'numeric',
          }),
        }))
    },
  }

  // ── Guests ────────────────────────────────────────────────────────────────
  // Walk-in visitors who are not yet members.

  const guestService = {
    getAll() {
      return load(KEYS.GUESTS).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },

    getById(id) {
      return load(KEYS.GUESTS).find((g) => g.id === id) || null
    },

    create(data) {
      const guests = load(KEYS.GUESTS)
      const guest = {
        ...data,
        id: uid(),
        convertedToMember: false,
        createdAt: new Date().toISOString(),
      }
      guests.push(guest)
      save(KEYS.GUESTS, guests)
      return guest
    },

    update(id, data) {
      const guests = load(KEYS.GUESTS)
      const idx = guests.findIndex((g) => g.id === id)
      if (idx === -1) throw new Error('Guest not found')
      guests[idx] = { ...guests[idx], ...data, updatedAt: new Date().toISOString() }
      save(KEYS.GUESTS, guests)
      return guests[idx]
    },

    delete(id) {
      save(KEYS.GUESTS, load(KEYS.GUESTS).filter((g) => g.id !== id))
    },

    markConverted(id) {
      const guests = load(KEYS.GUESTS)
      const idx = guests.findIndex((g) => g.id === id)
      if (idx === -1) return
      guests[idx].convertedToMember = true
      guests[idx].convertedAt = new Date().toISOString()
      save(KEYS.GUESTS, guests)
    },
  }

  return { memberService, attendanceService, commentService, paymentService, guestService }
}
