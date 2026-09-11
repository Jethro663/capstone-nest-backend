import { AdminAnnouncementsController } from './admin-announcements.controller';

describe('AdminAnnouncementsController', () => {
  it('returns one paginated cross-class inventory envelope', async () => {
    const page = {
      items: [{ id: 'announcement-1' }],
      page: 2,
      limit: 25,
      total: 26,
      totalPages: 2,
    };
    const service = { findAdminFeed: jest.fn().mockResolvedValue(page) };
    const controller = new AdminAnnouncementsController(service as never);
    const query = { page: 2, limit: 25, search: 'exam' };
    await expect(
      controller.findAll(query, { userId: 'admin-1' }),
    ).resolves.toEqual({
      success: true,
      message: 'Administrator announcements retrieved.',
      data: page.items,
      page: 2,
      limit: 25,
      total: 26,
      totalPages: 2,
    });
    expect(service.findAdminFeed).toHaveBeenCalledWith('admin-1', query);
  });
});
