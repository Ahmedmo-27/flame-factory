import api from './api'

const authService = {
  login: (credentials) => api.post('/users/login', credentials),
  register: (userData) => api.post('/users/register', userData),
  getMyProfile: () => api.get('/users/me'),
  getUser: (id) => api.get(`/users/${id}`),
  updateAbilities: (id, abilities) => api.patch(`/users/${id}/abilities`, { abilities }),
  getSalesRevenue: () => api.get('/users/sales-revenue'),
  getSalesReps: () => api.get('/users/sales-reps'),
}

export default authService
