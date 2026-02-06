import api from './api';

const studentService = {
  // Lessons
  async getLessons(params = {}) {
    const response = await api.get('/student/lessons', { params });
    return response.data;
  },

  // Assessments
  async getAssessments(params = {}) {
    const response = await api.get('/student/assessments', { params });
    return response.data;
  },
  async startAssessment(id) {
    const response = await api.post(`/student/assessments/${id}/start`);
    return response.data;
  },
  async submitAssessment(attemptId, answers) {
    const response = await api.post(`/student/assessments/attempts/${attemptId}/submit`, { answers });
    return response.data;
  },
  async getAttemptDetails(attemptId) {
    const response = await api.get(`/student/assessments/attempts/${attemptId}`);
    return response.data;
  },

  // Enrollments
  async getEnrollments() {
    const response = await api.get('/student/enrollments');
    return response.data;
  }
};

export default studentService;
