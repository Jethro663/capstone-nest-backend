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
    mockProfilesService.updateProfile.mockResolvedValue({ userId: 'student-1' });

    const result = await controller.uploadMyAvatar(
      { userId: 'student-1' },
      { filename: 'avatar.png' } as Express.Multer.File,
    );

    expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
      'student-1',
      { profilePicture: '/api/profiles/images/avatar.png' },
    );
    expect(result.data.profilePicture).toBe('/api/profiles/images/avatar.png');
  });

  it('rejects avatar uploads without a file', async () => {
    await expect(
      controller.uploadMyAvatar({ userId: 'student-1' }, undefined as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('serves a stored profile image', async () => {
    const uploadDir = path.resolve('./uploads/profile-pictures');
    const storedFile = path.join(uploadDir, 'avatar.png');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(storedFile, 'avatar');
    const sendFile = jest.fn();

    await controller.serveProfileImage('avatar.png', { sendFile } as any);

    expect(sendFile).toHaveBeenCalledWith(
      path.resolve(storedFile),
    );

    fs.unlinkSync(storedFile);
  });

  it('rejects unknown profile images', async () => {
    await expect(
      controller.serveProfileImage('missing.png', { sendFile: jest.fn() } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
