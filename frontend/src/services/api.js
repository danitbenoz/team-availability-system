import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

// Users API endpoints
export const usersAPI = {
  getAllUsers: (statusFilter) => {
    const params = statusFilter ? { status: statusFilter } : {};
    return api.get('/users', { params });
  },
  getCurrentUser: () => api.get('/users/me'),
  updateUserStatus: (statusId) => api.put('/users/me/status', { statusId }),
  getUserById: (id) => api.get(`/users/${id}`),
};

// Statuses API endpoints
export const statusesAPI = {
  getAllStatuses: () => api.get('/statuses'),
  getStatusById: (id) => api.get(`/statuses/${id}`),
  getStatusUserCount: (id) => api.get(`/statuses/${id}/users/count`),
};

export default api;