import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, usersAPI } from '../services/api';

// Context that manages user login state across the whole app
const AuthContext = createContext(null);

// Hook to use auth context in any component
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);        // Current logged in user info
  const [loading, setLoading] = useState(true);  // Are we still checking if user is logged in?
  const [error, setError] = useState(null);      // Any login/auth errors

  // Helper function to get current user info from server
  const hydrateUser = async () => {
    const { data } = await usersAPI.getCurrentUser(); // This uses the stored token
    if (!data?.user) throw new Error('Failed to load current user');
    setUser(data.user);
    return data.user;
  };

  // When app starts, check if user is already logged in
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Token exists, try to get user info
          await hydrateUser();
        }
      } catch (e) {
        console.error('Token validation failed:', e?.response?.data || e.message);
        // Token is invalid, remove it
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Function to log user in
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      // Send login request to server
      const { data } = await authAPI.login({ username, password });
      const token = data?.token || data?.accessToken;
      if (!token) throw new Error('No token in response.');

      // Save token so user stays logged in
      localStorage.setItem('authToken', token);

      // Get fresh user info from server
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

  // Function to log user out
  const logout = () => {
    localStorage.removeItem('authToken'); // Remove saved token
    setUser(null); // Clear user info
    setError(null);
  };

  // Function to update user info (like when they change status)
  const updateUser = (updated) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const clearError = () => setError(null);

  // All the auth functions and state that components can use
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
