const fallbackApiUrl = 'http://localhost:3000/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || fallbackApiUrl;

export const AUTH_STORAGE_KEYS = {
  accessToken: 'nexora.access-token',
  session: 'nexora.session',
} as const;
