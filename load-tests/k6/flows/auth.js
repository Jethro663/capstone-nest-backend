import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, getAuthHeaders } from '../config.js';

/**
 * Authenticates a user via web login route (/auth/login).
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string|null} Access token if successful, null otherwise
 */
export function webLogin(email, password) {
  const url = `${CONFIG.baseUrl}/auth/login`;
  const payload = JSON.stringify({ email, password });
  
  const res = http.post(url, payload, { headers: CONFIG.defaultHeaders });
  
  const success = check(res, {
    'web login status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'web login returns token': (r) => {
      try {
        const body = r.json();
        return !!(body && (body.accessToken || (body.data && body.data.accessToken)));
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = res.json();
  return body.accessToken || (body.data ? body.data.accessToken : null);
}

/**
 * Authenticates a user via mobile login route (/auth/mobile/login).
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string|null} Access token if successful, null otherwise
 */
export function mobileLogin(email, password) {
  const url = `${CONFIG.baseUrl}/auth/mobile/login`;
  const payload = JSON.stringify({ email, password });
  
  const res = http.post(url, payload, { headers: CONFIG.defaultHeaders });
  
  const success = check(res, {
    'mobile login status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'mobile login returns token': (r) => {
      try {
        const body = r.json();
        return !!(body && (body.accessToken || (body.data && body.data.accessToken)));
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = res.json();
  return body.accessToken || (body.data ? body.data.accessToken : null);
}

/**
 * Logs out the authenticated user via web logout route (/auth/logout).
 * @param {string} token - Access token
 */
export function logout(token) {
  if (!token) return;
  const url = `${CONFIG.baseUrl}/auth/logout`;
  const res = http.post(url, null, { headers: getAuthHeaders(token) });
  check(res, {
    'logout status is 200 or 204 or 201': (r) => [200, 201, 204].includes(r.status),
  });
}

/**
 * Logs out via mobile logout route (/auth/mobile/logout).
 * @param {string} token - Access token
 */
export function mobileLogout(token) {
  if (!token) return;
  const url = `${CONFIG.baseUrl}/auth/mobile/logout`;
  const res = http.post(url, null, { headers: getAuthHeaders(token) });
  check(res, {
    'mobile logout status is 200 or 204 or 201': (r) => [200, 201, 204].includes(r.status),
  });
}
