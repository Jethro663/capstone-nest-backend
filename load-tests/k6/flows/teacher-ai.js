import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, getAuthHeaders } from '../config.js';

/**
 * Enqueues a quiz generation job.
 * Route: POST /ai/teacher/quizzes/jobs
 * @param {string} token - Access token
 * @param {object} payloadObj - Request DTO
 * @returns {string|null} Job ID if successful, null otherwise
 */
export function queueQuizJob(token, payloadObj) {
  const url = `${CONFIG.baseUrl}/ai/teacher/quizzes/jobs`;
  const payload = JSON.stringify(payloadObj || {
    classId: CONFIG.testData.classId,
    sourceType: 'lesson',
    sourceIds: [CONFIG.testData.lessonId],
    questionCount: 5,
    difficulty: 'medium',
  });

  const res = http.post(url, payload, { headers: getAuthHeaders(token) });
  
  const success = check(res, {
    'queue quiz job status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'queue quiz job returns jobId': (r) => {
      try {
        const body = r.json();
        return !!(body && (body.jobId || (body.data && body.data.jobId)));
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = res.json();
  return body.jobId || (body.data ? body.data.jobId : null);
}

/**
 * Enqueues a lesson plan generation job.
 * Route: POST /ai/teacher/lesson-plans/jobs
 * @param {string} token - Access token
 * @param {object} payloadObj - Request DTO
 * @returns {string|null} Job ID if successful, null otherwise
 */
export function queueLessonPlanJob(token, payloadObj) {
  const url = `${CONFIG.baseUrl}/ai/teacher/lesson-plans/jobs`;
  const payload = JSON.stringify(payloadObj || {
    classId: CONFIG.testData.classId,
    anchorType: 'lesson',
    anchorId: CONFIG.testData.lessonId,
    teacherNote: 'Load testing burst lesson plan',
  });

  const res = http.post(url, payload, { headers: getAuthHeaders(token) });
  
  const success = check(res, {
    'queue lesson plan job status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'queue lesson plan returns jobId': (r) => {
      try {
        const body = r.json();
        return !!(body && (body.jobId || (body.data && body.data.jobId)));
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = res.json();
  return body.jobId || (body.data ? body.data.jobId : null);
}

/**
 * Enqueues an intervention recommendation job.
 * Route: POST /ai/teacher/interventions/:caseId/jobs
 * @param {string} token - Access token
 * @param {string} caseId - Intervention case UUID
 * @param {object} payloadObj - Request DTO
 * @returns {string|null} Job ID if successful, null otherwise
 */
export function queueInterventionJob(token, caseId, payloadObj) {
  const targetCaseId = caseId || CONFIG.testData.interventionCaseId;
  const url = `${CONFIG.baseUrl}/ai/teacher/interventions/${targetCaseId}/jobs`;
  const payload = JSON.stringify(payloadObj || {});

  const res = http.post(url, payload, { headers: getAuthHeaders(token) });
  
  const success = check(res, {
    'queue intervention job status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'queue intervention returns jobId': (r) => {
      try {
        const body = r.json();
        return !!(body && (body.jobId || (body.data && body.data.jobId)));
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = res.json();
  return body.jobId || (body.data ? body.data.jobId : null);
}

/**
 * Checks the status of an AI generation job.
 * Route: GET /ai/teacher/jobs/:jobId
 * @param {string} token - Access token
 * @param {string} jobId - Job UUID
 * @returns {object|null} Job status object or null
 */
export function getJobStatus(token, jobId) {
  const url = `${CONFIG.baseUrl}/ai/teacher/jobs/${jobId}`;
  const res = http.get(url, { headers: getAuthHeaders(token) });
  
  const success = check(res, {
    'get job status is 200': (r) => r.status === 200,
  });

  if (!success) {
    return null;
  }

  try {
    return res.json().data || res.json();
  } catch (e) {
    return null;
  }
}

/**
 * Gets the completed result of an AI generation job.
 * Route: GET /ai/teacher/jobs/:jobId/result
 * @param {string} token - Access token
 * @param {string} jobId - Job UUID
 * @returns {object|null} Result data or null
 */
export function getJobResult(token, jobId) {
  const url = `${CONFIG.baseUrl}/ai/teacher/jobs/${jobId}/result`;
  const res = http.get(url, { headers: getAuthHeaders(token) });
  
  check(res, {
    'get job result status is 200': (r) => r.status === 200,
  });

  try {
    return res.json().data || res.json();
  } catch (e) {
    return null;
  }
}
