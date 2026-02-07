import api from './api';

const profilesService = {
  // Get current user's profile
  async getMyProfile() {
    const response = await api.get('/profiles/me');
    return response.data;
  },

  // Get profile by user id (admin)
  async getProfileByUserId(userId) {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
  },

  // Update profile (owner or admin)
  async updateProfile(userId, dto) {
    const response = await api.put(`/profiles/update/${userId}`, dto);
    return response.data;
  },
};

export default profilesService;
