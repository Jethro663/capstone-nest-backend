import { AssessmentsController } from './assessments.controller';

describe('administrator assessment inventory', () => {
  it('returns one bounded cross-class page', async () => {
    const page = {
      data: [{ id: 'assessment-1' }],
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    };
    const service = { getAdminInventory: jest.fn().mockResolvedValue(page) };
    const controller = new AssessmentsController(service as never, {} as never);
    const query = {
      page: '1',
      limit: '25',
      search: 'quiz',
      publication: 'draft' as const,
    };
    await expect(
      controller.getAdminInventory(query, {
        userId: 'admin-1',
        roles: ['admin'],
      }),
    ).resolves.toEqual({
      success: true,
      message: 'Administrator assessment inventory retrieved',
      ...page,
    });
    expect(service.getAdminInventory).toHaveBeenCalledWith(
      { page: 1, limit: 25, search: 'quiz', publication: 'draft' },
      { userId: 'admin-1', roles: ['admin'] },
    );
  });
});
