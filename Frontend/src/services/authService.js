import api from './api'

const authService = {
  login: (credentials) => api.post('/users/login', credentials),
  register: (userData) => api.post('/users/register', userData),
  getSalesRevenue: () => api.get('/users/sales-revenue'),
  getSalesReps: () => api.get('/users/sales-reps'),
}

export default authService
