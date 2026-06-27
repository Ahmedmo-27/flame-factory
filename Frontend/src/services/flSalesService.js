/**
 * FightLocation Sales Service
 * Recording a sale automatically creates/updates the member record.
 */

import { uid, today } from './storageService'
import { flMemberService, FL_MEMBERSHIP_TYPES } from './flMemberService'

const KEY = 'fl_sales'

export const FL_BRANCHES = [
  { id: 'carleton',     label: 'Carleton',    icon: '📍' },
  { id: 'my_fair',      label: 'My Fair',     icon: '📍' },
  { id: 'central_park', label: 'Central Park', icon: '📍' },
]

export const FL_CATEGORIES = [
  { id: 'membership', label: 'Membership'       },
  { id: 'pt',         label: 'Personal Training' },
  { id: 'supplement', label: 'Supplements'       },
  { id: 'gear',       label: 'Gear & Apparel'    },
  { id: 'other',      label: 'Other'             },
]

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(data) { localStorage.setItem(KEY, JSON.stringify(data)) }

/** Calculate end date from start date + membership type */
function calcEndDate(startDate, membershipTypeId) {
  const typeObj = FL_MEMBERSHIP_TYPES.find((t) => t.id === membershipTypeId)
  if (!typeObj || !startDate) return ''
  const d = new Date(startDate)
  d.setMonth(d.getMonth() + typeObj.months)
  return d.toISOString().slice(0, 10)
}

/** Upsert member from sale data — matches by phone, then by name+branch */
function syncMember(sale) {
  if (!sale.clientName) return   // no name = no member record

  const members = flMemberService.getAll()

  // Try to find existing member: phone match first, then name+branch
  let existing = null
  if (sale.clientPhone) {
    existing = members.find((m) => m.phone === sale.clientPhone)
  }
  if (!existing) {
    existing = members.find(
      (m) =>
        m.name.toLowerCase() === sale.clientName.toLowerCase() &&
        m.branch === sale.branchId
    )
  }

  const membershipEnd = sale.membershipType
    ? calcEndDate(sale.date, sale.membershipType)
    : ''

  if (existing) {
    // Update membership details if this is a membership sale
    if (sale.category === 'membership' && sale.membershipType) {
      flMemberService.update(existing.id, {
        name:            sale.clientName,
        phone:           sale.clientPhone || existing.phone,
        age:             sale.clientAge   || existing.age,
        branch:          sale.branchId,
        membershipType:  sale.membershipType,
        membershipStart: sale.date,
        membershipEnd,
        price:           sale.amount,
      })
    }
    return existing.id
  } else {
    // Create new member
    const m = flMemberService.create({
      name:            sale.clientName,
      phone:           sale.clientPhone || '',
      age:             sale.clientAge   || '',
      branch:          sale.branchId,
      membershipType:  sale.membershipType || '',
      membershipStart: sale.category === 'membership' ? sale.date : '',
      membershipEnd:   sale.category === 'membership' ? membershipEnd : '',
      price:           sale.category === 'membership' ? sale.amount : '',
      notes:           '',
    })
    return m.id
  }
}

export const flSalesService = {
  getAll() {
    return load().sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  create(data) {
    const sales = load()
    const memberId = syncMember(data)
    const sale = { ...data, id: uid(), memberId, createdAt: new Date().toISOString() }
    sales.push(sale)
    save(sales)
    return sale
  },

  update(id, data) {
    const sales = load()
    const idx = sales.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Sale not found')
    const updated = { ...sales[idx], ...data, updatedAt: new Date().toISOString() }
    // Re-sync member with updated data
    const memberId = syncMember(updated)
    updated.memberId = memberId
    sales[idx] = updated
    save(sales)
    return sales[idx]
  },

  delete(id) {
    save(load().filter((s) => s.id !== id))
  },

  getMonthlySummary() {
    const sales = load()
    const map = {}
    sales.forEach((s) => {
      const month = s.date.slice(0, 7)
      if (!map[month]) map[month] = { month, total: 0, count: 0, byBranch: {} }
      map[month].total += Number(s.amount)
      map[month].count += 1
      const b = s.branchId || 'unknown'
      map[month].byBranch[b] = (map[month].byBranch[b] || 0) + Number(s.amount)
    })
    return Object.values(map)
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .map((m) => ({
        ...m,
        label: new Date(m.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
      }))
  },

  getTodaySummary() {
    const todayStr = today()
    const result = {}
    FL_BRANCHES.forEach((b) => { result[b.id] = 0 })
    load()
      .filter((s) => s.date === todayStr)
      .forEach((s) => { result[s.branchId] = (result[s.branchId] || 0) + Number(s.amount) })
    return result
  },
}
