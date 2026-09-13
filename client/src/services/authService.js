import api from './api';

/**
 * Transform Axios errors into user-friendly messages
 */
const handleError = (error) => {
  if (error.response) {
    // Server responded with an error status
    const data = error.response.data;
    throw new Error(data.message || data.error || 'Something went wrong. Please try again.');
  } else if (error.request) {
    // Request was sent but no response received
    throw new Error(
      'Unable to connect to the server. Please check if the backend is running on ' +
      (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
    );
  } else {
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

/**
 * Register a new user
 * POST /auth/register
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Login user
 * POST /auth/login
 * Expected response: { token, user: { id, name, email, phone, role, address, isVerified } }
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Get current user profile
 * GET /auth/profile
 */
export const getProfile = async () => {
  try {
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Update user profile
 * PUT /auth/profile
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Forgot password - request reset email
 * POST /auth/forgot-password
 */
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Reset password - set new password using token
 * PUT /auth/reset-password/:token
 */
export const resetPassword = async (token, password) => {
  try {
    const response = await api.put(`/auth/reset-password/${token}`, { password });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
