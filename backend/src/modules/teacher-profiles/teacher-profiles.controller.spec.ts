import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TeacherProfilesController } from './teacher-profiles.controller';

describe('TeacherProfilesController', () => {
  const mockTeacherProfilesService = {
    findByUserId: jest.fn(),
    updateProfile: jest.fn(),
  };

  let controller: TeacherProfilesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TeacherProfilesController(mockTeacherProfilesService as any);
  });

  it('passes actor context to updateByUserId', async () => {
    mockTeacherProfilesService.updateProfile.mockResolvedValue({
      userId: 'teacher-1',
    });

    const result = await controller.updateByUserId(
      'teacher-1',
      { department: 'Math' } as any,
      { userId: 'admin-1', roles: ['admin'] },
    );

    expect(mockTeacherProfilesService.updateProfile).toHaveBeenCalledWith(
      'teacher-1',
      { department: 'Math' },
      'admin-1',
      ['admin'],
    );
    expect(result.success).toBe(true);
  });

  it('rejects updateByUserId when non-admin updates another teacher profile', async () => {
    await expect(
      controller.updateByUserId(
        'teacher-2',
        { department: 'Math' } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('passes actor context to uploadMyAvatar', async () => {
    mockTeacherProfilesService.updateProfile.mockResolvedValue({
      userId: 'teacher-1',
    });

    const result = await controller.uploadMyAvatar(
      { userId: 'teacher-1', roles: ['teacher'] },
      { filename: 'avatar.png' } as Express.Multer.File,
    );

    expect(mockTeacherProfilesService.updateProfile).toHaveBeenCalledWith(
      'teacher-1',
      { profilePicture: '/api/profiles/images/avatar.png' },
      'teacher-1',
      ['teacher'],
    );
    expect(result.success).toBe(true);
  });

  it('rejects uploadMyAvatar when file is missing', async () => {
    await expect(
      controller.uploadMyAvatar(
        { userId: 'teacher-1', roles: ['teacher'] },
        undefined as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
