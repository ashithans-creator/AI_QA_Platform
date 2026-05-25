import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Setup Axios Defaults
axios.defaults.baseURL = 'http://localhost:5001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Login disabled as per user request
    const adminUser = { id: 1, username: 'admin', role: 'ADMIN' };
    setUser(adminUser);
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { token, user: userData } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: errMsg };
    }
  };

  const register = async (username, password, role = 'QA_ENGINEER') => {
    try {
      await axios.post('/api/auth/register', { username, password, role });
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      const errMsg = err.response?.data?.message || 'Registration failed.';
      return { success: false, error: errMsg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
