/**
 * Centralized configuration for Nexora LMS k6 load testing suite.
 * All environment variables can be overridden during k6 execution:
 * e.g., k6 run -e BASE_URL=https://staging.nexora.edu load-tests/k6/classroom-burst.js
 */

export const CONFIG = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  aiServiceUrl: __ENV.AI_SERVICE_URL || 'http://localhost:8000',
  
  // Staging / test environment seeded credentials
  credentials: {
    student: {
      email: __ENV.TEST_STUDENT_EMAIL || 'student1@nexora.test',
      password: __ENV.TEST_STUDENT_PASSWORD || 'Password123!',
    },
    teacher: {
      email: __ENV.TEST_TEACHER_EMAIL || 'teacher1@nexora.test',
      password: __ENV.TEST_TEACHER_PASSWORD || 'Password123!',
    },
  },

  // Environment-driven seeded entity IDs for test scenarios
  testData: {
    classId: __ENV.TEST_CLASS_ID || '11111111-1111-1111-1111-111111111111',
    sectionId: __ENV.TEST_SECTION_ID || '22222222-2222-2222-2222-222222222222',
    assessmentId: __ENV.TEST_ASSESSMENT_ID || '33333333-3333-3333-3333-333333333333',
    questionId: __ENV.TEST_QUESTION_ID || '44444444-4444-4444-4444-444444444444',
    lessonId: __ENV.TEST_LESSON_ID || '55555555-5555-5555-5555-555555555555',
    interventionCaseId: __ENV.TEST_INTERVENTION_CASE_ID || '66666666-6666-6666-6666-666666666666',
  },

  // Standard headers
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Returns HTTP headers including the Bearer access token.
 * @param {string} token - JWT access token
 * @returns {object} Headers object
 */
export function getAuthHeaders(token) {
  return {
    ...CONFIG.defaultHeaders,
    'Authorization': `Bearer ${token}`,
  };
}
