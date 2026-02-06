
import api from './api';

const adminService = {
  // User Management
  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  async createUser(userData) {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  async updateUserStatus(id, status) {
    const response = await api.patch(`/admin/users/${id}/status`, { status });
    return response.data;
  },
  async deleteUser(id) {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Subject Management
  async getSubjects(params = {}) {
    const response = await api.get('/admin/subjects', { params });
    return response.data;
  },
  async createSubject(subjectData) {
    const response = await api.post('/admin/subjects', subjectData);
    return response.data;
  },
  async updateSubject(id, subjectData) {
    const response = await api.patch(`/admin/subjects/${id}`, subjectData);
    return response.data;
  },
  async deleteSubject(id) {
    const response = await api.delete(`/admin/subjects/${id}`);
    return response.data;
  },

  // Section Management
  async getSections(params = {}) {
    const response = await api.get('/admin/sections', { params });
    return response.data;
  },
  async createSection(sectionData) {
    const response = await api.post('/admin/sections', sectionData);
    return response.data;
  },
  async updateSection(id, sectionData) {
    const response = await api.patch(`/admin/sections/${id}`, sectionData);
    return response.data;
  },
  async deleteSection(id) {
    const response = await api.delete(`/admin/sections/${id}`);
    return response.data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  }
};

export default adminService;
