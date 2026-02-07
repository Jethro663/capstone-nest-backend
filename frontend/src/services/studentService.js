import api from './api';

// Student-facing API (matches backend "classes" module)
const studentService = {
  // Get classes with optional filters (maps to GET /classes/all)
  async getClasses(params = {}) {
    const response = await api.get('/classes/all', { params });
    return response.data;
  },

  // Get a specific class by ID (GET /classes/:id)
  async getClassById(id) {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  // Get classes by teacher (GET /classes/teacher/:teacherId)
  async getClassesByTeacher(teacherId) {
    const response = await api.get(`/classes/teacher/${teacherId}`);
    return response.data;
  },

  // Get classes by section (GET /classes/section/:sectionId)
  async getClassesBySection(sectionId) {
    const response = await api.get(`/classes/section/${sectionId}`);
    return response.data;
  },

  // Get classes by subject (GET /classes/subject/:subjectId)
  async getClassesBySubject(subjectId) {
    const response = await api.get(`/classes/subject/${subjectId}`);
    return response.data;
  }
};

export default studentService;
