import api from './api';

const assessmentService = {
  // Assessment Management
  async getAssessmentsByClass(classId) {
    try {
      const response = await api.get(`/assessments/class/${classId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }
  },

  async getAssessmentById(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment:', error);
      throw error;
    }
  },

  async createAssessment(assessmentData) {
    try {
      const response = await api.post('/assessments', assessmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  },

  async updateAssessment(assessmentId, assessmentData) {
    try {
      const response = await api.put(`/assessments/${assessmentId}`, assessmentData);
      return response.data;
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  },

  async deleteAssessment(assessmentId) {
    try {
      const response = await api.delete(`/assessments/${assessmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }
  },

  // Question Management
  async createQuestion(questionData) {
    try {
      const response = await api.post('/assessments/questions', questionData);
      return response.data;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  },

  async updateQuestion(questionId, questionData) {
    try {
      const response = await api.put(`/assessments/questions/${questionId}`, questionData);
      return response.data;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  },

  async deleteQuestion(questionId) {
    try {
      const response = await api.delete(`/assessments/questions/${questionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },

  // Attempt Management
  async startAttempt(assessmentId) {
    try {
      const response = await api.post(`/assessments/${assessmentId}/start`);
      return response.data;
    } catch (error) {
      console.error('Error starting attempt:', error);
      throw error;
    }
  },

  async submitAssessment(submissionData) {
    try {
      const response = await api.post('/assessments/submit', submissionData);
      return response.data;
    } catch (error) {
      console.error('Error submitting assessment:', error);
      throw error;
    }
  },

  async getStudentAttempts(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}/student-attempts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student attempts:', error);
      throw error;
    }
  },

  async getAssessmentAttempts(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}/all-attempts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment attempts:', error);
      throw error;
    }
  },

  async getAttemptResults(attemptId) {
    try {
      const response = await api.get(`/assessments/attempts/${attemptId}/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attempt results:', error);
      throw error;
    }
  },

  async getAssessmentStats(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment stats:', error);
      throw error;
    }
  },
};

export default assessmentService;
