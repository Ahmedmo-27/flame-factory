/**
 * Course service — handles all course-related API calls.
 * TODO: Connect to your backend endpoints.
 */
import api from './api'

const courseService = {
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (courseId) => api.post(`/courses/${courseId}/enroll`),
}

export default courseService
