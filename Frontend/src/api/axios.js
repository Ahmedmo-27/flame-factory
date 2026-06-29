import axios from 'axios';
import toast from 'react-hot-toast';

const apiBaseURL = import.meta.env.VITE_API_URL;

if (!apiBaseURL) {
  console.error(
    'VITE_API_URL is not set. Login and API calls will fail. ' +
    'Set VITE_API_URL in Frontend/.env (dev) or your hosting provider env vars (prod).'
  );
}

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ff_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.config?.url?.includes('/users/login')) {
      console.error('[api] Login response error', {
        status: err.response?.status,
        message: err.response?.data?.message,
        baseURL: err.config?.baseURL,
      });
    }

    if (err.response?.status === 401 && !err.config?.url?.includes('/users/login')) {
      localStorage.removeItem('ff_token');
      localStorage.removeItem('ff_user');
      toast.error('Session expired. Please sign in again.');
      // small delay so toast is visible before redirect
      setTimeout(() => { window.location.href = '/'; }, 1200);
    }
    return Promise.reject(err);
  }
);

export default api;
