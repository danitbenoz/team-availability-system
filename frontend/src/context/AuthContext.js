import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, usersAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);        // { id, username, fullName, ... }
  const [loading, setLoading] = useState(true);  // true until we check token + (maybe) fetch /me
  const [error, setError] = useState(null);      // string | null

  // ---- Helpers ----
  const hydrateUser = async () => {
    const { data } = await usersAPI.getCurrentUser(); // relies on Axios interceptor to attach Bearer token
    // Expecting { success, user }
    if (!data?.user) throw new Error('Failed to load current user');
    setUser(data.user);
    return data.user;
  };

  // ---- Initialize on first load ----
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          await hydrateUser();
        }
      } catch (e) {
        console.error('Token validation failed:', e?.response?.data || e.message);
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- Actions ----
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      // Use the Axios wrapper to keep things consistent (baseURL, interceptors, etc.)
      const { data } = await authAPI.login({ username, password });
      // Expecting { success, token, user? }
      const token = data?.token || data?.accessToken;
      if (!token) throw new Error('No token in response.');

      localStorage.setItem('authToken', token);

      // Hydrate user from server so the app always trusts the server as the source of truth
      const me = await hydrateUser();
      return { success: true, user: me };
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      if (!authAPI.register) {
        throw new Error('Register endpoint not implemented on client.');
      }
      const { data } = await authAPI.login(userData);
      const token = data?.token || data?.accessToken;
      console.log("token",token);
      if (!token) throw new Error('No token in response.');

      localStorage.setItem('authToken', token);

      const me = await hydrateUser();
      return { success: true, user: me };
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setError(null);
  };

  const updateUser = (updated) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const clearError = () => setError(null);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
      clearError,
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
