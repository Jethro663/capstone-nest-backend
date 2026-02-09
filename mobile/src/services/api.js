import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================
// IMPORTANT: Configure your PC's IP address here
// ============================================================
// Get your IPv4 address by running: ipconfig (in PowerShell)
// Then replace '192.168.1.100' with your actual IP address
// For example: '192.168.0.50' or '10.0.0.5'
const PC_IP_ADDRESS = '10.206.183.114'; // <-- Your WiFi hotspot IP
const API_PORT = 3000;

const getApiBaseUrl = () => {
  // Allow override from env
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // For physical devices, always use the PC's IP address
  if (Platform.OS === 'android') {
    return `http://${PC_IP_ADDRESS}:${API_PORT}/api`;
  }

  if (Platform.OS === 'ios') {
    return `http://${PC_IP_ADDRESS}:${API_PORT}/api`;
  }

  // Web fallback
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      // Navigation to login would be handled by the app
    }
    return Promise.reject(error);
  }
);

export default api;
