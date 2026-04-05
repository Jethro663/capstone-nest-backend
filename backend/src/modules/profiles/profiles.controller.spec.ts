import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';

describe('ProfilesController', () => {
  const mockProfilesService = {
    findByUserId: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  let controller: ProfilesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProfilesController(mockProfilesService as any);
  });

  it('uploads the student avatar and stores the public path', async () => {
    mockProfilesService.updateProfile.mockResolvedValue({
      userId: 'student-1',
    });

    const result = await controller.uploadMyAvatar(
      { userId: 'student-1', roles: ['student'] },
      {
        filename: 'avatar.png',
      } as Express.Multer.File,
    );

    expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
      'student-1',
      { profilePicture: '/api/profiles/images/avatar.png' },
      'student-1',
      ['student'],
    );
    expect(result.data.profilePicture).toBe('/api/profiles/images/avatar.png');
  });

  it('rejects avatar uploads without a file', async () => {
    await expect(
      controller.uploadMyAvatar(
        { userId: 'student-1', roles: ['student'] },
        undefined as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes actor context to admin create profile endpoint', async () => {
    mockProfilesService.createProfile.mockResolvedValue({
      id: 'profile-1',
      userId: 'student-1',
    });

    const result = await controller.createProfile(
      {
        userId: 'student-1',
        gradeLevel: '7',
      } as any,
      { userId: 'admin-1', roles: ['admin'] },
    );

    expect(mockProfilesService.createProfile).toHaveBeenCalledWith(
      'student-1',
      { gradeLevel: '7' },
      'admin-1',
      ['admin'],
    );
    expect(result.success).toBe(true);
  });

  it('passes actor context to update profile endpoint', async () => {
    mockProfilesService.updateProfile.mockResolvedValue({
      id: 'profile-1',
      userId: 'student-1',
    });

    const result = await controller.updateProfile(
      'student-1',
      { phone: '09998887777' } as any,
      { userId: 'student-1', roles: ['student'] },
    );

    expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
      'student-1',
      { phone: '09998887777' },
      'student-1',
      ['student'],
    );
    expect(result.success).toBe(true);
  });

  it('serves a stored profile image', async () => {
    const uploadDir = path.resolve('./uploads/profile-pictures');
    const storedFile = path.join(uploadDir, 'avatar.png');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(storedFile, 'avatar');
    const sendFile = jest.fn();

    await controller.serveProfileImage('avatar.png', { sendFile } as any);

    expect(sendFile).toHaveBeenCalledWith(path.resolve(storedFile));

    fs.unlinkSync(storedFile);
  });

  it('rejects unknown profile images', async () => {
    await expect(
      controller.serveProfileImage('missing.png', {
        sendFile: jest.fn(),
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
