/**
 * Auth service — handles login, register, logout API calls.
 * TODO: Connect to your backend endpoints.
 */
import api from './api'

const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => {
    localStorage.removeItem('token')
  },
}

export default authService
