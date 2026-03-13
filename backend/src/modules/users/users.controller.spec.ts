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
    deleteUser: jest.fn(),
    suspendUser: jest.fn(),
    reactivateUser: jest.fn(),
    softDeleteUser: jest.fn(),
    exportUserData: jest.fn(),
    purgeUser: jest.fn(),
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

    const result = await controller.getAllUsers('teacher', 'ACTIVE', 2, 10);

    expect(result).toEqual({
      success: true,
      users: [{ id: 'u1', email: 'u1@example.com' }],
      page: 2,
      limit: 10,
      total: 31,
      totalPages: 4,
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
});
