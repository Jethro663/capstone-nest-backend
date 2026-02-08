import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService, userService } from '../services';
import { storageService } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth on app start
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await storageService.getItem('user');

      if (savedToken && savedUser) {
        // Extract role from roles array if needed
        if (savedUser.roles && Array.isArray(savedUser.roles) && savedUser.roles.length > 0 && !savedUser.role) {
          savedUser.role = savedUser.roles[0].name || savedUser.roles[0];
        }
        setUser(savedUser);
      }
    } catch (e) {
      console.error('Failed to restore token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authService.login(email, password);

      // Handle both direct response and wrapped response format
      const accessToken = response.accessToken || response.data?.accessToken;
      let user = response.user || response.data?.user;

      if (accessToken && user) {
        // Extract first role from roles array if roles exist
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          user.role = user.roles[0].name || user.roles[0];
        }
        
        await AsyncStorage.setItem('authToken', accessToken);
        await storageService.setItem('user', user);
        setUser(user);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response format from server' };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authService.signup(userData);
      return {
        success: true,
        data: response,
      };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      setError(null);
      const response = await authService.verifyEmail(email, otp);

      // Handle both direct response and wrapped response format
      const accessToken = response.accessToken || response.data?.accessToken;
      let user = response.user || response.data?.user;

      if (accessToken && user) {
        // Extract first role from roles array if roles exist
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          user.role = user.roles[0].name || user.roles[0];
        }
        
        await AsyncStorage.setItem('authToken', accessToken);
        await storageService.setItem('user', user);
        setUser(user);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response format from server' };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resendOTP = async (email) => {
    try {
      setError(null);
      await authService.resendOTP(email);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      await authService.forgotPassword(email);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      setError(null);
      await authService.resetPassword(email, otp, newPassword);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    // Clear local state immediately so UI responds instantly
    await AsyncStorage.removeItem('authToken');
    await storageService.removeItem('user');
    setUser(null);
    setError(null);

    // Try to notify server (don't block on this)
    try {
      await Promise.race([
        authService.logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 1000))
      ]);
    } catch (err) {
      // Logout already completed locally, server call is optional
      console.log('Server logout failed, but local logout completed');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await userService.getCurrentUser();
      await storageService.setItem('user', response);
      setUser(response);
      return response;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    signup,
    verifyEmail,
    resendOTP,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
    isSignedIn: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
