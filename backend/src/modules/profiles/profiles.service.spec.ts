import { ProfilesService } from './profiles.service';
import { DatabaseService } from '../../database/database.service';
import { studentProfiles } from '../../drizzle/schema';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: {
        studentProfiles: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
    };

    service = new ProfilesService({ db: mockDb } as DatabaseService);
  });

  it('maps dob aliases and profilePicture when creating a profile', async () => {
    const returning = jest.fn().mockResolvedValue([{ userId: 'user-1' }]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    await service.createProfile('user-1', {
      dateOfBirth: '2005-08-15',
      profilePicture: '/api/profiles/images/test.png',
    });

    expect(mockDb.insert).toHaveBeenCalledWith(studentProfiles);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        dateOfBirth: expect.any(Date),
        profilePicture: '/api/profiles/images/test.png',
      }),
    );
  });

  it('maps dob aliases and profilePicture when updating an existing profile', async () => {
    mockDb.query.studentProfiles.findFirst.mockResolvedValue({
      userId: 'user-1',
    });
    const returning = jest.fn().mockResolvedValue([{ userId: 'user-1' }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await service.updateProfile('user-1', {
      dob: '2005-08-15',
      profilePicture: '/api/profiles/images/test.png',
    });

    expect(mockDb.update).toHaveBeenCalledWith(studentProfiles);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: expect.any(Date),
        profilePicture: '/api/profiles/images/test.png',
        updatedAt: expect.any(Date),
      }),
    );
  });
});
