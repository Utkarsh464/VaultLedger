import axios from 'axios';

// ── Base URL ──────────────────────────────────────────────────────────────────
// Dev: VITE_API_URL is empty → uses Vite proxy → /api → localhost:5000
// Prod: VITE_API_URL = https://your-backend.onrender.com → full URL + /api
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s timeout (Render free tier cold starts)
});

// ── Attach stored token on every request ─────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// ── Response interceptor — handle common errors ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (backend down, no internet)
    if (!error.response) {
      error.message = 'Cannot connect to server. Please check your connection.';
      return Promise.reject(error);
    }

    // Session expired — clear token but DON'T hard redirect
    // Let the React router / auth context handle it
    if (error.response.status === 401) {
      const isLoginRoute = error.config?.url?.includes('/auth/login');
      if (!isLoginRoute) {
        localStorage.removeItem('vl_token');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
