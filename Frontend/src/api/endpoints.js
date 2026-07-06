import api from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login        = (email, password) =>
  api.post('/users/login', { email, password });

export const getSalesUsers   = () => api.get('/users/sales');
export const getSalesTeam    = () => api.get('/users/team');
export const getSalesProfile = (id) => api.get(`/users/team/${id}`);
export const getSalesManagerRevenue = (params = {}) =>
  api.get('/users/sales-manager/revenue', { params });
export const getSubscriptionsByDate = (params = {}) =>
  api.get('/users/sales-manager/subscriptions', { params });
export const getSalesMySubscriptions = (params = {}) =>
  api.get('/users/my-subscriptions', { params });
export const updateSalesRepTarget = (id, monthlyTarget) =>
  api.patch(`/users/${id}/target`, { monthlyTarget });
export const updateSalesRepAbilities = (id, abilities) =>
  api.patch(`/users/${id}/abilities`, { abilities });
export const createStaffUser = (data) => api.post('/users/staff', data);

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications    = (params) => api.get('/notifications', { params });
export const getUnreadCount      = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// ── Members ───────────────────────────────────────────────────────────────────
export const getAllMembers     = (params) => api.get('/members', { params });
export const getAllNotes       = (params) => api.get('/members/all-notes', { params });
export const getMemberProfile  = (id)       => api.get(`/members/${id}`);
export const createMember      = (data)     => api.post('/members', data);
export const assignSales       = (id, salesId) =>
  api.patch(`/members/${id}/assign-sales`, { salesId });
export const bulkTransferSalesReps = (data) =>
  api.post('/members/bulk-transfer-sales', data);
export const switchSalesRep = (id, newSalesRepId) =>
  api.put(`/members/${id}/sales-rep`, { newSalesRepId });
export const freezeMember      = (id, data) =>
  api.patch(`/members/${id}/freeze`, data);
export const checkInMember     = (id)       => api.post(`/members/${id}/checkin`);
export const addNote           = (id, text) =>
  api.post(`/members/${id}/notes`, { text });
export const addInvitation     = (id, formData) =>
  api.post(`/members/${id}/invitations`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── Packages ──────────────────────────────────────────────────────────────────
export const getPackages   = (params) => api.get('/packages', { params });
export const createPackage = (data)     => api.post('/packages', data);
export const updatePackage = (id, data) => api.patch(`/packages/${id}`, data);
export const deletePackage = (id)       => api.delete(`/packages/${id}`);

export const assignPackage       = (id, data) =>
  api.post(`/members/${id}/package`, data);

// ── Package Exceptions ────────────────────────────────────────────────────────
export const getPackageExceptions         = (params) => api.get('/package-exceptions', { params });
export const getMemberPendingException    = (memberId) =>
  api.get(`/package-exceptions/member/${memberId}`);
export const createPackageException       = (data) => api.post('/package-exceptions', data);
export const updatePackageExceptionStatus = (id, status, reviewNote) =>
  api.put(`/package-exceptions/${id}/status`, { status, reviewNote });

// ── Sales Requests ────────────────────────────────────────────────────────────
export const getRequests         = (params) => api.get('/requests', { params });
export const createRequest       = (memberId)   =>
  api.post('/requests', { memberId });
export const updateRequestStatus = (id, status) =>
  api.put(`/requests/${id}/status`, { status });
