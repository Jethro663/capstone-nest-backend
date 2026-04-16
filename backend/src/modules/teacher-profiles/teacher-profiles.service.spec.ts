import { TeacherProfilesService } from './teacher-profiles.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { teacherProfiles } from '../../drizzle/schema';

describe('TeacherProfilesService', () => {
  let service: TeacherProfilesService;
  let mockDb: any;
  let mockAuditService: { log: jest.Mock };

  beforeEach(() => {
    mockDb = {
      query: {
        teacherProfiles: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
    };
    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new TeacherProfilesService(
      { db: mockDb } as DatabaseService,
      mockAuditService as unknown as AuditService,
    );
  });

  it('creates profile and writes actor-aware audit metadata', async () => {
    const returning = jest.fn().mockResolvedValue([{ userId: 'teacher-1' }]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    await service.createProfile(
      'teacher-1',
      { dob: '1990-01-01', phone: '09998887777' },
      'admin-1',
      ['admin'],
    );

    expect(mockDb.insert).toHaveBeenCalledWith(teacherProfiles);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'teacher-1',
        dateOfBirth: expect.any(Date),
        contactNumber: '09998887777',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'teacher_profile.created',
      targetType: 'teacher_profile',
      targetId: 'teacher-1',
      metadata: {
        actorRole: 'admin',
        userId: 'teacher-1',
        changedFields: ['dob', 'phone'],
      },
    });
  });

  it('updates existing profile and writes actor-aware audit metadata', async () => {
    mockDb.query.teacherProfiles.findFirst.mockResolvedValue({
      userId: 'teacher-1',
      dateOfBirth: null,
      gender: null,
      address: null,
      department: null,
      specialization: null,
      profilePicture: null,
      contactNumber: null,
      employeeId: null,
    });
    const returning = jest.fn().mockResolvedValue([{ userId: 'teacher-1' }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await service.updateProfile(
      'teacher-1',
      { profilePicture: '/api/profiles/images/t1.png' },
      'teacher-1',
      ['teacher'],
    );

    expect(mockDb.update).toHaveBeenCalledWith(teacherProfiles);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePicture: '/api/profiles/images/t1.png',
        updatedAt: expect.any(Date),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith({
      actorId: 'teacher-1',
      action: 'teacher_profile.updated',
      targetType: 'teacher_profile',
      targetId: 'teacher-1',
      metadata: {
        actorRole: 'teacher',
        userId: 'teacher-1',
        changedFields: ['profilePicture'],
      },
    });
  });

  it('falls back to create path when profile does not exist', async () => {
    mockDb.query.teacherProfiles.findFirst.mockResolvedValue(null);
    const returning = jest.fn().mockResolvedValue([{ userId: 'teacher-1' }]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    await service.updateProfile('teacher-1', { department: 'Math' });

    expect(mockAuditService.log).toHaveBeenCalledWith({
      actorId: 'teacher-1',
      action: 'teacher_profile.created',
      targetType: 'teacher_profile',
      targetId: 'teacher-1',
      metadata: {
        actorRole: 'system',
        userId: 'teacher-1',
        changedFields: ['department'],
      },
    });
  });
});
