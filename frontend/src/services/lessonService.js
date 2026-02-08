import api from './api';

const lessonService = {
  // Lessons
  async getLessonsByClass(classId) {
    const response = await api.get(`/lessons/class/${classId}`);
    return response.data;
  },

  async getLessonById(lessonId) {
    const response = await api.get(`/lessons/${lessonId}`);
    return response.data;
  },

  async createLesson(lessonData) {
    const response = await api.post('/lessons', lessonData);
    return response.data;
  },

  async updateLesson(lessonId, lessonData) {
    const response = await api.put(`/lessons/${lessonId}`, lessonData);
    return response.data;
  },

  async publishLesson(lessonId) {
    const response = await api.put(`/lessons/${lessonId}/publish`, {});
    return response.data;
  },

  async deleteLesson(lessonId) {
    const response = await api.delete(`/lessons/${lessonId}`);
    return response.data;
  },

  // Content Blocks
  async addContentBlock(blockData) {
    
    const { lessonId, ...bodyData } = blockData;
    console.log(lessonId)
    const response = await api.post(
      `/lessons/${lessonId}/blocks`,
      bodyData,
    );
    return response.data;
  },

  async updateContentBlock(blockId, blockData) {
    const response = await api.put(`/lessons/blocks/${blockId}`, blockData);
    return response.data;
  },

  async deleteContentBlock(blockId) {
    const response = await api.delete(`/lessons/blocks/${blockId}`);
    return response.data;
  },

  async reorderBlocks(lessonId, blocks) {
    const response = await api.put(`/lessons/${lessonId}/reorder-blocks`, {
      blocks,
    });
    return response.data;
  },
};

export default lessonService;
