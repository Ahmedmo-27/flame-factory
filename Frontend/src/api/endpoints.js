import api from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login        = (email, password) =>
  api.post('/users/login', { email, password });

export const getSalesUsers   = () => api.get('/users/sales');
export const getSalesTeam    = () => api.get('/users/team');
export const getSalesProfile = (id) => api.get(`/users/team/${id}`);
export const updateSalesRepTarget = (id, monthlyTarget) =>
  api.patch(`/users/${id}/target`, { monthlyTarget });
export const createStaffUser = (data) => api.post('/users/staff', data);

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications    = () => api.get('/notifications');
export const getUnreadCount      = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// ── Members ───────────────────────────────────────────────────────────────────
export const getAllMembers     = ()         => api.get('/members');
export const getAllNotes       = ()         => api.get('/members/all-notes');
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
export const getPackages   = ()         => api.get('/packages');
export const createPackage = (data)     => api.post('/packages', data);
export const updatePackage = (id, data) => api.patch(`/packages/${id}`, data);
export const deletePackage = (id)       => api.delete(`/packages/${id}`);

// ── Sales Requests ────────────────────────────────────────────────────────────
export const getRequests         = ()           => api.get('/requests');
export const createRequest       = (memberId)   =>
  api.post('/requests', { memberId });
export const updateRequestStatus = (id, status) =>
  api.put(`/requests/${id}/status`, { status });
