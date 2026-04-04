import { teacherProfileService } from '@/services/teacher-profile-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('teacherProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the current teacher profile from /teacher-profiles/me', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'profile-1', userId: 'teacher-1' },
      },
    });

    const result = await teacherProfileService.getMine();

    expect(mockedApi.get).toHaveBeenCalledWith('/teacher-profiles/me');
    expect(result.success).toBe(true);
  });

  it('updates a teacher profile through the user-specific endpoint', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        success: true,
        message: 'Profile updated',
        data: { id: 'profile-1', userId: 'teacher-1', department: 'Math' },
      },
    });

    const result = await teacherProfileService.update('teacher-1', {
      department: 'Math',
      specialization: 'Algebra',
    });

    expect(mockedApi.put).toHaveBeenCalledWith('/teacher-profiles/teacher-1', {
      department: 'Math',
      specialization: 'Algebra',
    });
    expect(result.message).toBe('Profile updated');
  });

  it('uploads avatar as multipart form data', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Avatar uploaded',
        data: {
          profile: { id: 'profile-1', userId: 'teacher-1' },
          profilePicture: 'https://cdn.example/avatar.jpg',
        },
      },
    });

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await teacherProfileService.uploadAvatar(file);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = mockedApi.post.mock.calls[0];
    expect(url).toBe('/teacher-profiles/me/avatar');
    expect(formData).toBeInstanceOf(FormData);
    expect(config).toMatchObject({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });
});
