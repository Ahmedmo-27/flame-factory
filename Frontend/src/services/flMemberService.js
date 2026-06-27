/**
 * FightLocation Member & Lead Service
 * Completely separate from Flame Factory members.
 */

import { uid, today, formatDate } from './storageService'

const KEYS = {
  MEMBERS:  'fl_members',
  COMMENTS: 'fl_member_comments',
  LEADS:    'fl_leads',
  LEAD_NOTES: 'fl_lead_notes',
}

export const FL_MEMBERSHIP_TYPES = [
  { id: '1month',  label: '1 Month',  months: 1  },
  { id: '3months', label: '3 Months', months: 3  },
  { id: '6months', label: '6 Months', months: 6  },
  { id: '1year',   label: '1 Year',   months: 12 },
]

export const LEAD_STATUSES = [
  { id: 'new',       label: 'New',       color: '#3b82f6' },
  { id: 'contacted', label: 'Contacted', color: '#f97316' },
  { id: 'converted', label: 'Converted', color: '#22c55e' },
  { id: 'lost',      label: 'Lost',      color: '#6b7280' },
]

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

// ── Members ──────────────────────────────────────────────────────────────────

export const flMemberService = {
  getAll() { return load(KEYS.MEMBERS) },

  getById(id) { return load(KEYS.MEMBERS).find((m) => m.id === id) || null },

  create(data) {
    const members = load(KEYS.MEMBERS)
    const member = {
      ...data,
      id: uid(),
      frozen: false,
      freezeDate: null,
      totalFrozenDays: 0,
      createdAt: new Date().toISOString(),
    }
    members.push(member)
    save(KEYS.MEMBERS, members)
    return member
  },

  update(id, data) {
    const members = load(KEYS.MEMBERS)
    const idx = members.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Member not found')
    members[idx] = { ...members[idx], ...data, updatedAt: new Date().toISOString() }
    save(KEYS.MEMBERS, members)
    return members[idx]
  },

  delete(id) {
    save(KEYS.MEMBERS,  load(KEYS.MEMBERS).filter((m) => m.id !== id))
    save(KEYS.COMMENTS, load(KEYS.COMMENTS).filter((c) => c.memberId !== id))
  },

  freeze(id) {
    const members = load(KEYS.MEMBERS)
    const idx = members.findIndex((m) => m.id === id)
    if (idx === -1 || members[idx].frozen) return members[idx]
    members[idx].frozen = true
    members[idx].freezeDate = today()
    members[idx].updatedAt = new Date().toISOString()
    save(KEYS.MEMBERS, members)
    return members[idx]
  },

  unfreeze(id) {
    const members = load(KEYS.MEMBERS)
    const idx = members.findIndex((m) => m.id === id)
    if (idx === -1 || !members[idx].frozen) return members[idx]
    const frozenDays = Math.ceil((new Date() - new Date(members[idx].freezeDate)) / 86400000)
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

  getStatus(member) {
    if (member.frozen) return 'frozen'
    if (!member.membershipEnd) return 'active'
    const diff = Math.ceil(
      (new Date(member.membershipEnd).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
    )
    if (diff < 0)  return 'expired'
    if (diff <= 7) return 'expiring'
    return 'active'
  },

  // Comments on member profile
  getComments(memberId) {
    return load(KEYS.COMMENTS)
      .filter((c) => c.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  },
  addComment(memberId, text) {
    const comments = load(KEYS.COMMENTS)
    const c = { id: uid(), memberId, text, createdAt: new Date().toISOString() }
    comments.push(c)
    save(KEYS.COMMENTS, comments)
    return c
  },
  updateComment(id, text) {
    const comments = load(KEYS.COMMENTS)
    const idx = comments.findIndex((c) => c.id === id)
    if (idx === -1) return
    comments[idx] = { ...comments[idx], text, updatedAt: new Date().toISOString() }
    save(KEYS.COMMENTS, comments)
    return comments[idx]
  },
  deleteComment(id) {
    save(KEYS.COMMENTS, load(KEYS.COMMENTS).filter((c) => c.id !== id))
  },
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export const flLeadService = {
  getAll() {
    return load(KEYS.LEADS).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  },

  getById(id) { return load(KEYS.LEADS).find((l) => l.id === id) || null },

  create(data) {
    const leads = load(KEYS.LEADS)
    const lead = { ...data, id: uid(), status: data.status || 'new', createdAt: new Date().toISOString() }
    leads.push(lead)
    save(KEYS.LEADS, leads)
    return lead
  },

  update(id, data) {
    const leads = load(KEYS.LEADS)
    const idx = leads.findIndex((l) => l.id === id)
    if (idx === -1) throw new Error('Lead not found')
    leads[idx] = { ...leads[idx], ...data, updatedAt: new Date().toISOString() }
    save(KEYS.LEADS, leads)
    return leads[idx]
  },

  delete(id) {
    save(KEYS.LEADS,      load(KEYS.LEADS).filter((l) => l.id !== id))
    save(KEYS.LEAD_NOTES, load(KEYS.LEAD_NOTES).filter((n) => n.leadId !== id))
  },

  // Notes on lead
  getNotes(leadId) {
    return load(KEYS.LEAD_NOTES)
      .filter((n) => n.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  },
  addNote(leadId, text) {
    const notes = load(KEYS.LEAD_NOTES)
    const n = { id: uid(), leadId, text, createdAt: new Date().toISOString() }
    notes.push(n)
    save(KEYS.LEAD_NOTES, notes)
    return n
  },
  deleteNote(id) {
    save(KEYS.LEAD_NOTES, load(KEYS.LEAD_NOTES).filter((n) => n.id !== id))
  },
}
