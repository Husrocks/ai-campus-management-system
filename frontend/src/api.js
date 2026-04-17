import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 
                 (window.location.hostname === 'localhost' ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`);

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Store the logout callback — AuthContext will register it
let logoutCallback = null;
export function setLogoutCallback(fn) {
  logoutCallback = fn;
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear token and call logout (no page reload)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only auto-logout for non-auth endpoints (don't loop on login/register)
      const url = error.config?.url || '';
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
        localStorage.removeItem('tp_token');
        localStorage.removeItem('tp_user');
        if (logoutCallback) logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
