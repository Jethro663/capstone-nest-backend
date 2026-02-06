import api from './api';

const teacherService = {
  // Lessons
  async getLessons(params = {}) {
    const response = await api.get('/teacher/lessons', { params });
    return response.data;
  },
  async createLesson(lessonData) {
    const response = await api.post('/teacher/lessons', lessonData);
    return response.data;
  },
  async updateLesson(id, lessonData) {
    const response = await api.put(`/teacher/lessons/${id}`, lessonData);
    return response.data;
  },
  async deleteLesson(id) {
    const response = await api.delete(`/teacher/lessons/${id}`);
    return response.data;
  },

  // Assessments
  async getAssessments(params = {}) {
    const response = await api.get('/teacher/assessments', { params });
    return response.data;
  },
  async createAssessment(assessmentData) {
    const response = await api.post('/teacher/assessments', assessmentData);
    return response.data;
  },
  async getAssessmentById(id) {
    const response = await api.get(`/teacher/assessments/${id}`);
    return response.data;
  },
  async updateAssessment(id, assessmentData) {
    const response = await api.put(`/teacher/assessments/${id}`, assessmentData);
    return response.data;
  },
  async deleteAssessment(id) {
    const response = await api.delete(`/teacher/assessments/${id}`);
    return response.data;
  },

  // Classes
  async getClasses() {
    const response = await api.get('/teacher/classes');
    return response.data;
  }
};

export default teacherService;
