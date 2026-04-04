import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn(),
    findPublicById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    adminResetPassword: jest.fn(),
    deleteUser: jest.fn(),
    suspendUser: jest.fn(),
    reactivateUser: jest.fn(),
    softDeleteUser: jest.fn(),
    exportUserData: jest.fn(),
    purgeUser: jest.fn(),
    bulkLifecycleAction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('getAllUsers returns backward-compatible list plus pagination metadata', async () => {
    mockUsersService.findAll.mockResolvedValue({
      data: [{ id: 'u1', email: 'u1@example.com' }],
      page: 2,
      limit: 10,
      total: 31,
      totalPages: 4,
    });

    const result = await controller.getAllUsers(
      'teacher',
      'ACTIVE',
      2,
      10,
      undefined,
    );

    expect(result).toEqual({
      success: true,
      users: [{ id: 'u1', email: 'u1@example.com' }],
      page: 2,
      limit: 10,
      total: 31,
      totalPages: 4,
    });
  });

  it('passes includeStatusCounts and returns the counts when requested', async () => {
    mockUsersService.findAll.mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      statusCounts: {
        ACTIVE: 4,
        PENDING: 1,
        SUSPENDED: 2,
        DELETED: 3,
      },
    });

    const result = await controller.getAllUsers(
      undefined,
      undefined,
      1,
      20,
      'true',
    );

    expect(mockUsersService.findAll).toHaveBeenCalledWith({
      role: undefined,
      status: undefined,
      page: 1,
      limit: 20,
      includeStatusCounts: true,
    });
    expect(result.statusCounts).toEqual({
      ACTIVE: 4,
      PENDING: 1,
      SUSPENDED: 2,
      DELETED: 3,
    });
  });

  it('getUserById uses sanitized service path', async () => {
    mockUsersService.findPublicById.mockResolvedValue({
      id: 'u1',
      email: 'safe@example.com',
      password: undefined,
    });

    const result = await controller.getUserById('u1');

    expect(mockUsersService.findPublicById).toHaveBeenCalledWith('u1');
    expect(result.success).toBe(true);
    expect(result.data.user.password).toBeUndefined();
  });

  it('createUser forwards actor context for audited admin writes', async () => {
    mockUsersService.createUser.mockResolvedValue({
      id: 'u2',
      email: 'new@example.com',
    });

    const result = await controller.createUser(
      {
        email: 'new@example.com',
        firstName: 'New',
        middleName: '',
        lastName: 'User',
        role: 'student',
      } as any,
      { sub: 'admin-7' },
    );

    expect(mockUsersService.createUser).toHaveBeenCalledWith(
      {
        email: 'new@example.com',
        firstName: 'New',
        middleName: '',
        lastName: 'User',
        role: 'student',
      },
      'admin-7',
    );
    expect(result).toEqual({
      success: true,
      message: 'User created successfully. Verification email sent.',
      data: {
        user: {
          id: 'u2',
          email: 'new@example.com',
        },
      },
    });
  });

  it('updateUser forwards actor context for audited admin writes', async () => {
    mockUsersService.updateUser.mockResolvedValue({
      id: 'u1',
      email: 'updated@example.com',
    });

    const result = await controller.updateUser(
      'u1',
      { email: 'updated@example.com' } as any,
      { id: 'admin-8' },
    );

    expect(mockUsersService.updateUser).toHaveBeenCalledWith(
      'u1',
      { email: 'updated@example.com' },
      'admin-8',
    );
    expect(result).toEqual({
      success: true,
      message: 'User updated successfully.',
      data: {
        user: {
          id: 'u1',
          email: 'updated@example.com',
        },
      },
    });
  });

  it('resetUserPassword returns generated password payload', async () => {
    mockUsersService.adminResetPassword.mockResolvedValue({
      message: 'Password reset successfully',
      userId: 'u1',
      generatedPassword: 'Temp@12345A',
    });

    const result = await controller.resetUserPassword('u1', { sub: 'admin-1' });

    expect(mockUsersService.adminResetPassword).toHaveBeenCalledWith(
      'u1',
      'admin-1',
    );
    expect(result).toEqual({
      success: true,
      message: 'Password reset successfully',
      userId: 'u1',
      generatedPassword: 'Temp@12345A',
    });
  });

  it('deleteUser forwards actor context for legacy audited path', async () => {
    mockUsersService.deleteUser.mockResolvedValue({
      message: 'User successfully deleted',
      userId: 'u1',
    });

    const result = await controller.deleteUser('u1', { sub: 'admin-9' });

    expect(mockUsersService.deleteUser).toHaveBeenCalledWith('u1', 'admin-9');
    expect(result).toEqual({
      success: true,
      message: 'User set to DELETED',
    });
  });

  it('bulkLifecycle returns the response envelope with action summary data', async () => {
    mockUsersService.bulkLifecycleAction.mockResolvedValue({
      message: '2 users suspended; 1 failed.',
      data: {
        action: 'suspend',
        requested: 3,
        succeeded: ['u1', 'u2'],
        failed: [{ userId: 'u3', reason: 'You cannot suspend your own account' }],
      },
    });

    const result = await controller.bulkLifecycle(
      { action: 'suspend', userIds: ['u1', 'u2', 'u3'] },
      { sub: 'admin-1' },
    );

    expect(mockUsersService.bulkLifecycleAction).toHaveBeenCalledWith(
      { action: 'suspend', userIds: ['u1', 'u2', 'u3'] },
      'admin-1',
    );
    expect(result).toEqual({
      success: true,
      message: '2 users suspended; 1 failed.',
      data: {
        action: 'suspend',
        requested: 3,
        succeeded: ['u1', 'u2'],
        failed: [{ userId: 'u3', reason: 'You cannot suspend your own account' }],
      },
    });
  });

  it('exportUserData forwards actor context and streams JSON response', async () => {
    mockUsersService.exportUserData.mockResolvedValue({
      user: { id: 'u1' },
      exportedAt: '2026-04-05T00:00:00.000Z',
    });
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    await controller.exportUserData('u1', res, { sub: 'admin-10' });

    expect(mockUsersService.exportUserData).toHaveBeenCalledWith(
      'u1',
      'admin-10',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json',
    );
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"user"'));
  });
});
