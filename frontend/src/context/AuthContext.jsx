import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('vl_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user);
        setAuthError(null);
      })
      .catch(err => {
        // Token invalid / expired → clear it
        localStorage.removeItem('vl_token');
        setAuthError(err.response?.data?.error || null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const res = await api.post('/auth/login', { email: email.trim(), password });
    const { token, user: loggedInUser } = res.data;
    localStorage.setItem('vl_token', token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('vl_token');
    setUser(null);
  }, []);

  // ── Update user in context (after profile edit) ─────────────────────────────
  const updateUser = useCallback((updatedUser, newToken) => {
    if (newToken) localStorage.setItem('vl_token', newToken);
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
