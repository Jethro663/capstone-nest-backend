import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, getAuthHeaders } from '../config.js';

/**
 * Starts an assessment attempt.
 * Route: POST /assessments/:assessmentId/start
 * @param {string} token - Access token
 * @param {string} assessmentId - Assessment UUID
 * @returns {string|null} Attempt ID if successful, null otherwise
 */
export function startAssessmentAttempt(token, assessmentId) {
  const url = `${CONFIG.baseUrl}/assessments/${assessmentId}/start`;
  const res = http.post(url, null, { headers: getAuthHeaders(token) });
  
  const success = check(res, {
    'start attempt status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'start attempt returns attempt id': (r) => {
      try {
        const body = r.json();
        return !!(body && body.data && body.data.id);
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = res.json();
  return body.data ? body.data.id : null;
}

/**
 * Updates an ongoing assessment attempt progress.
 * Route: PATCH /assessments/attempts/:attemptId/progress
 * @param {string} token - Access token
 * @param {string} attemptId - Attempt UUID
 * @param {number} currentQuestionIndex - Question index reached
 * @param {number} timeSpentSeconds - Elapsed time in seconds
 * @returns {boolean} True if successful
 */
export function updateAttemptProgress(token, attemptId, currentQuestionIndex, timeSpentSeconds) {
  const url = `${CONFIG.baseUrl}/assessments/attempts/${attemptId}/progress`;
  const payload = JSON.stringify({
    currentQuestionIndex,
    timeSpentSeconds,
  });

  const res = http.patch(url, payload, { headers: getAuthHeaders(token) });
  
  return check(res, {
    'update progress status is 200': (r) => r.status === 200,
  });
}

/**
 * Submits an assessment attempt with answers.
 * Route: POST /assessments/submit
 * @param {string} token - Access token
 * @param {string} assessmentId - Assessment UUID
 * @param {Array} responses - Array of response answer DTOs
 * @param {number} timeSpentSeconds - Elapsed time in seconds
 * @returns {boolean} True if successful
 */
export function submitAssessment(token, assessmentId, responses, timeSpentSeconds) {
  const url = `${CONFIG.baseUrl}/assessments/submit`;
  const payload = JSON.stringify({
    assessmentId,
    responses,
    timeSpentSeconds,
  });

  const res = http.post(url, payload, { headers: getAuthHeaders(token) });
  
  return check(res, {
    'submit assessment status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
}

/**
 * Retrieves an ongoing attempt if one exists.
 * Route: GET /assessments/:assessmentId/ongoing-attempt
 * @param {string} token - Access token
 * @param {string} assessmentId - Assessment UUID
 * @returns {object|null} Ongoing attempt data or null
 */
export function getOngoingAttempt(token, assessmentId) {
  const url = `${CONFIG.baseUrl}/assessments/${assessmentId}/ongoing-attempt`;
  const res = http.get(url, { headers: getAuthHeaders(token) });
  
  if (res.status === 200) {
    try {
      const body = res.json();
      return body.data || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}
