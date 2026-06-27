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
