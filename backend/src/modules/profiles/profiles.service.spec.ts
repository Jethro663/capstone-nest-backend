import { ProfilesService } from './profiles.service';
import { DatabaseService } from '../../database/database.service';
import { studentProfiles } from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let mockDb: any;
  let mockAuditService: { log: jest.Mock };

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

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new ProfilesService(
      { db: mockDb } as DatabaseService,
      mockAuditService as unknown as AuditService,
    );
  });

  it('maps dob aliases and profilePicture when creating a profile', async () => {
    const returning = jest
      .fn()
      .mockResolvedValue([{ id: 'profile-1', userId: 'user-1' }]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    await service.createProfile(
      'user-1',
      {
        dateOfBirth: '2005-08-15',
        profilePicture: '/api/profiles/images/test.png',
      },
      'admin-1',
      ['admin'],
    );

    expect(mockDb.insert).toHaveBeenCalledWith(studentProfiles);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        dateOfBirth: expect.any(Date),
        profilePicture: '/api/profiles/images/test.png',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'student_profile.created',
      targetType: 'student_profile',
      targetId: 'user-1',
      metadata: {
        actorRole: 'admin',
        userId: 'user-1',
        changedFields: ['dateOfBirth', 'profilePicture'],
      },
    });
  });

  it('maps dob aliases and profilePicture when updating an existing profile', async () => {
    mockDb.query.studentProfiles.findFirst.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
    });
    const returning = jest
      .fn()
      .mockResolvedValue([{ id: 'profile-1', userId: 'user-1' }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await service.updateProfile(
      'user-1',
      {
        dob: '2005-08-15',
        profilePicture: '/api/profiles/images/test.png',
      },
      'student-1',
      ['student'],
    );

    expect(mockDb.update).toHaveBeenCalledWith(studentProfiles);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: expect.any(Date),
        profilePicture: '/api/profiles/images/test.png',
        updatedAt: expect.any(Date),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith({
      actorId: 'student-1',
      action: 'student_profile.updated',
      targetType: 'student_profile',
      targetId: 'user-1',
      metadata: {
        actorRole: 'student',
        userId: 'user-1',
        changedFields: ['dateOfBirth', 'profilePicture'],
      },
    });
  });
});
