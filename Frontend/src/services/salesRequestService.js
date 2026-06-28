import api from './api'

const salesRequestService = {
  getAll: () => api.get('/sales-requests'),
  create: (memberId) => api.post('/sales-requests', { memberId }),
  updateStatus: (id, status) => api.put(`/sales-requests/${id}/status`, { status }),
}

export default salesRequestService
