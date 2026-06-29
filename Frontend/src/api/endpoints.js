import api from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login        = (email, password) =>
  api.post('/users/login', { email, password });

export const getSalesUsers   = () => api.get('/users/sales');
export const getSalesTeam    = () => api.get('/users/team');
export const getSalesProfile = (id) => api.get(`/users/team/${id}`);

// ── Members ───────────────────────────────────────────────────────────────────
export const getAllMembers     = ()         => api.get('/members');
export const getAllNotes       = ()         => api.get('/members/all-notes');
export const getMemberProfile  = (id)       => api.get(`/members/${id}`);
export const createMember      = (data)     => api.post('/members', data);
export const assignSales       = (id, salesId) =>
  api.patch(`/members/${id}/assign-sales`, { salesId });
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
