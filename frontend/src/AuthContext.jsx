import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api, { setLogoutCallback } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('navtac_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false); // Start with false — trust localStorage

  // Register the logout callback so the interceptor can trigger logout
  const logout = useCallback(() => {
    localStorage.removeItem('navtac_token');
    localStorage.removeItem('navtac_user');
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutCallback(logout);
    const token = localStorage.getItem('navtac_token');
    if (token) refreshUser();
  }, [logout]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('navtac_token', access_token);
    localStorage.setItem('navtac_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await api.post('/api/auth/register', data);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('navtac_token', access_token);
    localStorage.setItem('navtac_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data);
      localStorage.setItem('navtac_user', JSON.stringify(res.data));
    } catch (e) {
      // Don't logout on refresh failure — let the interceptor handle real 401s
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
