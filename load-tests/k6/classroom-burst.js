import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, getAuthHeaders } from './config.js';
import { webLogin, logout } from './flows/auth.js';
import { startAssessmentAttempt, updateAttemptProgress, submitAssessment } from './flows/assessments.js';
import { queueQuizJob, queueLessonPlanJob, queueInterventionJob, getJobStatus } from './flows/teacher-ai.js';

export const options = {
  scenarios: {
    student_login_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 }, // ramp up to 30 VUs
        { duration: '1m', target: 50 },  // burst to 50 VUs
        { duration: '30s', target: 0 },  // ramp down
      ],
      gracefulStop: '10s',
      exec: 'studentLoginBurstScenario',
    },
    student_assessment_flow: {
      executor: 'constant-vus',
      vus: 15,
      duration: '2m',
      gracefulStop: '10s',
      exec: 'studentAssessmentFlowScenario',
    },
    teacher_dashboard_polling: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      gracefulStop: '10s',
      exec: 'teacherDashboardPollingScenario',
    },
    teacher_ai_jobs: {
      executor: 'constant-vus',
      vus: 3,
      duration: '2m',
      gracefulStop: '15s',
      exec: 'teacherAiJobsScenario',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'], // Error rate must be < 2%
    'http_req_duration{scenario:student_login_burst}': ['p(95)<750'],
    'http_req_duration{scenario:teacher_dashboard_polling}': ['p(95)<750'],
    'http_req_duration{scenario:student_assessment_flow}': ['p(99)<1500'],
    'checks{scenario:teacher_ai_jobs}': ['rate>0.95'],
  },
};

/**
 * Scenario 1: Student Login Burst (30-50 VUs)
 * Hits login and one protected fetch (/classes/all).
 */
export function studentLoginBurstScenario() {
  const token = webLogin(CONFIG.credentials.student.email, CONFIG.credentials.student.password);
  
  if (token) {
    sleep(0.5);
    const classesUrl = `${CONFIG.baseUrl}/classes/all`;
    const res = http.get(classesUrl, { headers: getAuthHeaders(token) });
    check(res, {
      'classes fetch status is 200': (r) => r.status === 200,
    });
    sleep(1);
    logout(token);
  }
  sleep(1);
}

/**
 * Scenario 2: Student Assessment Flow
 * Parallel start/progress/submit calls against assessment endpoints.
 */
export function studentAssessmentFlowScenario() {
  const token = webLogin(CONFIG.credentials.student.email, CONFIG.credentials.student.password);
  if (!token) {
    sleep(1);
    return;
  }

  const attemptId = startAssessmentAttempt(token, CONFIG.testData.assessmentId);
  if (attemptId) {
    sleep(1);
    updateAttemptProgress(token, attemptId, 1, 15);
    sleep(1);
    updateAttemptProgress(token, attemptId, 2, 30);
    sleep(1);
    
    const responses = [
      {
        questionId: CONFIG.testData.questionId,
        selectedOption: 'A',
      },
    ];
    submitAssessment(token, CONFIG.testData.assessmentId, responses, 45);
  }
  
  logout(token);
  sleep(2);
}

/**
 * Scenario 3: Teacher Dashboard Polling
 * Lower VU count, repeated polling of dashboard / notifications / roster-like routes.
 */
export function teacherDashboardPollingScenario() {
  const token = webLogin(CONFIG.credentials.teacher.email, CONFIG.credentials.teacher.password);
  if (!token) {
    sleep(1);
    return;
  }

  for (let i = 0; i < 3; i++) {
    const classesRes = http.get(`${CONFIG.baseUrl}/classes/all`, { headers: getAuthHeaders(token) });
    check(classesRes, { 'teacher classes list is 200': (r) => r.status === 200 });
    sleep(0.5);

    const enrollmentsRes = http.get(`${CONFIG.baseUrl}/classes/${CONFIG.testData.classId}/enrollments`, {
      headers: getAuthHeaders(token),
    });
    check(enrollmentsRes, { 'enrollments list is 200': (r) => r.status === 200 });
    sleep(0.5);

    const notifRes = http.get(`${CONFIG.baseUrl}/notifications/unread-count`, {
      headers: getAuthHeaders(token),
    });
    check(notifRes, { 'unread count is 200': (r) => r.status === 200 });
    sleep(2);
  }

  logout(token);
  sleep(1);
}

/**
 * Scenario 4: Teacher AI Jobs
 * 2-5 VUs creating quiz, lesson-plan, and intervention jobs while polling job status.
 */
export function teacherAiJobsScenario() {
  const token = webLogin(CONFIG.credentials.teacher.email, CONFIG.credentials.teacher.password);
  if (!token) {
    sleep(1);
    return;
  }

  // 1. Enqueue Quiz Job
  const quizJobId = queueQuizJob(token);
  if (quizJobId) {
    sleep(1);
    const status = getJobStatus(token, quizJobId);
    check(status, { 'quiz job status retrieved': (s) => !!s });
  }

  // 2. Enqueue Lesson Plan Job
  const lpJobId = queueLessonPlanJob(token);
  if (lpJobId) {
    sleep(1);
    const status = getJobStatus(token, lpJobId);
    check(status, { 'lesson plan job status retrieved': (s) => !!s });
  }

  // 3. Enqueue Intervention Job
  const intJobId = queueInterventionJob(token);
  if (intJobId) {
    sleep(1);
    const status = getJobStatus(token, intJobId);
    check(status, { 'intervention job status retrieved': (s) => !!s });
  }

  logout(token);
  sleep(3);
}
