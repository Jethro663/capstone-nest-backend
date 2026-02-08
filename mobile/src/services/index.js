import api from './api';

export const authService = {
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  signup: async (userData) => {
    const { data } = await api.post('/auth/signup', userData);
    return data;
  },

  verifyEmail: async (email, otp) => {
    const { data } = await api.post('/auth/verify-email', { email, otp });
    return data;
  },

  resendOTP: async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email });
    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (email, otp, newPassword) => {
    const { data } = await api.post('/auth/reset-password', {
      email,
      otp,
      newPassword,
    });
    return data;
  },

  refreshToken: async () => {
    const { data } = await api.post('/auth/refresh');
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};

export const userService = {
  getCurrentUser: async () => {
    const { data } = await api.get('/users/me');
    return data;
  },

  updateProfile: async (userData) => {
    const { data } = await api.put('/users/me', userData);
    return data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const { data } = await api.put('/users/change-password', {
      oldPassword,
      newPassword,
    });
    return data;
  },
};

export const courseService = {
  getStudentCourses: async () => {
    const { data } = await api.get('/students/courses');
    return data;
  },

  getCourseDetails: async (courseId) => {
    const { data } = await api.get(`/courses/${courseId}`);
    return data;
  },

  enrollCourse: async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/enroll`);
    return data;
  },
};

export const teacherService = {
  getTeacherClasses: async () => {
    const { data } = await api.get('/teachers/classes');
    return data;
  },

  getClassDetails: async (classId) => {
    const { data } = await api.get(`/classes/${classId}`);
    return data;
  },

  createClass: async (classData) => {
    const { data } = await api.post('/classes', classData);
    return data;
  },
};

export const lessonService = {
  getLessonsByClass: async (classId) => {
    const { data } = await api.get(`/lessons/class/${classId}`);
    return data;
  },

  getLessonById: async (lessonId) => {
    const { data } = await api.get(`/lessons/${lessonId}`);
    return data;
  },

  markLessonComplete: async (lessonId) => {
    const { data } = await api.post(`/lessons/${lessonId}/complete`);
    return data;
  },

  checkLessonCompletion: async (lessonId) => {
    const { data } = await api.get(`/lessons/${lessonId}/completion-status`);
    return data;
  },

  getCompletedLessonsForClass: async (classId) => {
    const { data } = await api.get(`/lessons/class/${classId}/completed`);
    return data;
  },
};

export const assessmentService = {
  getAssessmentsByClass: async (classId) => {
    const { data } = await api.get(`/assessments/class/${classId}`);
    return data;
  },

  getAssessmentById: async (assessmentId) => {
    const { data } = await api.get(`/assessments/${assessmentId}`);
    return data;
  },

  startAttempt: async (assessmentId) => {
    const { data } = await api.post(`/assessments/${assessmentId}/start`);
    return data;
  },

  submitAssessment: async (submissionData) => {
    const { data } = await api.post('/assessments/submit', submissionData);
    return data;
  },

  getStudentAttempts: async (assessmentId) => {
    const { data } = await api.get(`/assessments/${assessmentId}/student-attempts`);
    return data;
  },

  getAttemptResults: async (attemptId) => {
    const { data } = await api.get(`/assessments/attempts/${attemptId}/results`);
    return data;
  },
};

export const profilesService = {
  getProfileByUserId: async (userId) => {
    const { data } = await api.get(`/profiles/user/${userId}`);
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/profiles/me', profileData);
    return data;
  },
};

export const adminService = {
  getUsers: async (filters = {}) => {
    const { data } = await api.get('/admin/users', { params: filters });
    return data;
  },

  deleteUser: async (userId) => {
    const { data } = await api.delete(`/admin/users/${userId}`);
    return data;
  },

  getSubjects: async () => {
    const { data } = await api.get('/admin/subjects');
    return data;
  },

  createSubject: async (subjectData) => {
    const { data } = await api.post('/admin/subjects', subjectData);
    return data;
  },

  getSections: async () => {
    const { data } = await api.get('/admin/sections');
    return data;
  },

  createSection: async (sectionData) => {
    const { data } = await api.post('/admin/sections', sectionData);
    return data;
  },
};
