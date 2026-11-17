import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { getDashboardPath } from '../utils/roleRedirect';

const AuthContext = createContext(null);

/**
 * Custom hook to access auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider — manages authentication state for the entire app
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!token && !!user;

  /**
   * Restore user session on mount / page refresh
   * Tries to fetch profile with the stored token.
   * If it fails, the token was invalid — clear it silently.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Pre-hydrate user state from cached localStorage to avoid UI flickers
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore corrupted JSON
        }
      }

      try {
        const data = await authService.getProfile();
        const userData = data.user || data;
        setUser(userData);
        setToken(storedToken);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (err) {
        // Only clear storage and logout if server explicitly answered with 401 Unauthorized
        // For cold starts / timeouts / network failures, preserve the local cached session
        if (err?.message?.includes('401') || err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        } else {
          console.warn('[AuthContext] Backend profile verification deferred:', err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Register a new user
   */
  const register = useCallback(async (formData) => {
    const data = await authService.register(formData);

    if (data.token && data.user) {
      // Auto-login after registration
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      navigate(getDashboardPath(data.user.role));
    }

    return data;
  }, [navigate]);

  /**
   * Log in an existing user
   */
  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);

    if (data.token && data.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      navigate(getDashboardPath(data.user.role));
    }

    return data;
  }, [navigate]);

  /**
   * Log out — clear everything and redirect to login
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  /**
   * Update user profile data (in context + localStorage)
   */
  const updateUser = useCallback(async (profileData) => {
    const data = await authService.updateProfile(profileData);
    const updatedUser = data.user || data;
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
