export const ROLES = {
  SALES: 'Sales',
  SALES_MANAGER: 'Sales Manager',
  OWNER: 'Owner',
}

export function isSalesRole(role) {
  return role === ROLES.SALES
}

export function isSalesManagerRole(role) {
  return role === ROLES.SALES_MANAGER
}

export function usesSalesPortal(role) {
  return isSalesRole(role) || isSalesManagerRole(role)
}

export function getDefaultRoute(role) {
  if (isSalesRole(role)) return '/sales/dashboard'
  if (isSalesManagerRole(role)) return '/sales-manager/dashboard'
  return '/'
}

export const DEFAULT_ABILITIES = {
  canCommentOnMembers: true,
  canRequestAssignment: true,
  canRequestTakeover: true,
}

export function resolveAbilities(user) {
  if (!user?.abilities) return { ...DEFAULT_ABILITIES }
  return {
    canCommentOnMembers: user.abilities.canCommentOnMembers !== false,
    canRequestAssignment: user.abilities.canRequestAssignment !== false,
    canRequestTakeover: user.abilities.canRequestTakeover !== false,
  }
}

export function hasAbility(user, ability) {
  if (!isSalesRole(user?.role)) return true
  return resolveAbilities(user)[ability] !== false
}
