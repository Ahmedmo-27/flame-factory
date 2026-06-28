import api from './api'

const memberApiService = {
  getAll: () => api.get('/members'),
  getById: (id) => api.get(`/members/${id}`),
  addNote: (id, text) => api.post(`/members/${id}/notes`, { text }),
  switchSalesRep: (id, newSalesRepId) =>
    api.put(`/members/${id}/sales-rep`, { newSalesRepId }),
}

export default memberApiService
