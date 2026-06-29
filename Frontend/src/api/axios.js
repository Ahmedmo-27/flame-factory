import axios from 'axios';
import toast from 'react-hot-toast';
import { logRequest, logResponse, logError } from './apiLogger';

/** Ensure base URL ends with /api (backend mounts routes under /api/*). */
function normalizeApiBaseURL(url) {
  if (!url) return url;
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const rawApiURL = import.meta.env.VITE_API_URL;
const apiBaseURL = normalizeApiBaseURL(rawApiURL);

/** Server origin without /api — use for static paths like /uploads. */
export const apiOrigin = apiBaseURL?.replace(/\/api$/, '') ?? '';

if (!rawApiURL) {
  console.error(
    'VITE_API_URL is not set. Login and API calls will fail. ' +
    'Set VITE_API_URL in Frontend/.env (dev) or your hosting provider env vars (prod).'
  );
} else if (rawApiURL !== apiBaseURL) {
  console.warn(
    `[api] VITE_API_URL should end with /api. Normalized "${rawApiURL}" → "${apiBaseURL}".`
  );
}

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ff_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-Id'] = crypto.randomUUID().slice(0, 8);
  logRequest(config);
  return config;
});

api.interceptors.response.use(
  (res) => {
    logResponse(res);
    return res;
  },
  (err) => {
    logError(err);

    if (err.config?.url?.includes('/users/login')) {
      console.error('[api] Login response error', {
        status: err.response?.status,
        message: err.response?.data?.message,
        baseURL: err.config?.baseURL,
        requestId: err.response?.headers?.['x-request-id'] || err.config?.headers?.['X-Request-Id'],
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
