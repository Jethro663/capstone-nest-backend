import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from './users.service';
import { DatabaseService } from '../../database/database.service';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import {
  archivedUsers,
  roles,
  studentProfiles,
  userRoles,
  users,
} from '../../drizzle/schema';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { hash: jest.Mock };

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  email: 'user@example.com',
  password: 'hashed-password',
  firstName: 'Jane',
  middleName: null,
  lastName: 'Doe',
  status: 'ACTIVE',
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  roles: [{ id: 'role-1', name: 'student' }],
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: any;

  const mockOtpService = {
    createAndSendOTP: jest.fn(),
  };

  const mockMailService = {
    sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'AUTH_PASSWORD_HASH_ROUNDS') return '12';
      return undefined;
    }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed-password');
    mockOtpService.createAndSendOTP.mockResolvedValue(undefined);
    mockAuditService.log.mockResolvedValue(undefined);

    mockDb = {
      query: {
        users: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        roles: {
          findFirst: jest.fn(),
        },
        userRoles: {
          findMany: jest.fn(),
        },
        studentProfiles: {
          findFirst: jest.fn(),
        },
        classes: {
          findMany: jest.fn(),
        },
        archivedUsers: {
          findMany: jest.fn(),
        },
        lessonCompletions: {
          findMany: jest.fn(),
        },
        assessmentAttempts: {
          findMany: jest.fn(),
        },
      },
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: OtpService, useValue: mockOtpService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns paginated metadata and strips password from list results', async () => {
      const roleSubqueryChain = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue('role-subquery'),
      };
      const countChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: 1 }]),
      };
      mockDb.select
        .mockReturnValueOnce(roleSubqueryChain)
        .mockReturnValueOnce(countChain);

      mockDb.query.users.findMany.mockResolvedValue([
        {
          ...makeUser({ password: 'secret-hash' }),
          userRoles: [{ role: { id: 'role-2', name: 'teacher' } }],
        },
      ]);

      const result = await service.findAll({
        role: 'teacher',
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].password).toBeUndefined();
      expect(result.data[0].roles).toEqual([{ id: 'role-2', name: 'teacher' }]);
    });

    it('throws BadRequestException on invalid status filter', async () => {
      await expect(
        service.findAll({ status: 'BROKEN' as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns statusCounts when includeStatusCounts is enabled', async () => {
      const countChain = (total: number) => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total }]),
      });

      mockDb.select
        .mockReturnValueOnce(countChain(1))
        .mockReturnValueOnce(countChain(4))
        .mockReturnValueOnce(countChain(1))
        .mockReturnValueOnce(countChain(2))
        .mockReturnValueOnce(countChain(3));
      mockDb.query.users.findMany.mockResolvedValue([
        {
          ...makeUser({ password: 'secret-hash' }),
          userRoles: [{ role: { id: 'role-1', name: 'student' } }],
        },
      ]);

      const result = await service.findAll({
        status: 'ACTIVE',
        includeStatusCounts: true,
      });

      expect(result.statusCounts).toEqual({
        ACTIVE: 4,
        PENDING: 1,
        SUSPENDED: 2,
        DELETED: 3,
      });
    });
  });

  describe('createUser', () => {
    it('creates a user and does not expose temporaryPassword or password', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);
      mockDb.query.roles.findFirst.mockResolvedValue({
        id: 'role-teacher',
        name: 'teacher',
      });

      const tx = {
        insert: jest.fn().mockImplementation((table: any) => {
          if (table === users) {
            return {
              values: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([
                  {
                    id: 'new-user',
                    email: 'teacher@example.com',
                    password: 'hashed-password',
                    firstName: 'Teach',
                    middleName: null,
                    lastName: 'Er',
                    status: 'PENDING',
                    isEmailVerified: false,
                  },
                ]),
              }),
            };
          }
          return { values: jest.fn().mockResolvedValue(undefined) };
        }),
      };
      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      const result = await service.createUser({
        email: 'teacher@example.com',
        password: 'P@ssword1',
        firstName: 'Teach',
        middleName: '',
        lastName: 'Er',
        role: 'teacher',
        employeeId: 'EMP-001',
        contactNumber: '09171234567',
      });

      expect(result.password).toBeUndefined();
      expect((result as any).temporaryPassword).toBeUndefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          userId: 'new-user',
          email: 'teacher@example.com',
          requiresOTP: true,
        }),
      );
    });

    it('maps DB unique email violation to ConflictException', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);
      mockDb.query.roles.findFirst.mockResolvedValue({
        id: 'role-teacher',
        name: 'teacher',
      });
      mockDb.transaction.mockRejectedValue({
        code: '23505',
        constraint: 'users_email_unique',
      });

      await expect(
        service.createUser({
          email: 'dup@example.com',
          password: 'P@ssword1',
          firstName: 'Dup',
          middleName: '',
          lastName: 'User',
          role: 'teacher',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('writes actor-aware audit metadata when admin context is provided', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);
      mockDb.query.roles.findFirst.mockResolvedValue({
        id: 'role-student',
        name: 'student',
      });

      const tx = {
        insert: jest.fn().mockImplementation((table: any) => {
          if (table === users) {
            return {
              values: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([
                  {
                    id: 'new-user',
                    email: 'student@example.com',
                    password: 'hashed-password',
                    firstName: 'Stu',
                    middleName: null,
                    lastName: 'Dent',
                    status: 'PENDING',
                    isEmailVerified: false,
                  },
                ]),
              }),
            };
          }
          return { values: jest.fn().mockResolvedValue(undefined) };
        }),
      };
      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      await service.createUser(
        {
          email: 'student@example.com',
          password: 'P@ssword1',
          firstName: 'Stu',
          middleName: '',
          lastName: 'Dent',
          role: 'student',
          lrn: '123456789012',
        },
        'admin-1',
      );

      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.created',
        targetType: 'user',
        targetId: 'new-user',
        metadata: {
          role: 'student',
          status: 'PENDING',
        },
      });
    });
  });

  describe('updateUser', () => {
    it('rejects direct status changes', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(makeUser());

      await expect(
        service.updateUser('user-1', { status: 'DELETED' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('fails role update atomically when role does not exist (no role wipe)', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ email: 'a@b.com' }));

      const tx = {
        query: {
          roles: { findFirst: jest.fn().mockResolvedValue(null) },
          studentProfiles: { findFirst: jest.fn() },
        },
        delete: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
      };
      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      await expect(
        service.updateUser('user-1', { role: 'missing-role' as any }),
      ).rejects.toThrow(NotFoundException);

      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('rolls back when profile upsert fails inside transaction', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ email: 'a@b.com' }));

      const tx = {
        query: {
          studentProfiles: {
            findFirst: jest.fn().mockResolvedValue({ userId: 'user-1' }),
          },
          roles: { findFirst: jest.fn() },
        },
        update: jest.fn().mockImplementation((table: any) => {
          if (table === studentProfiles) {
            return {
              set: jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error('profile fail')),
              }),
            };
          }
          return {
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          };
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      await expect(
        service.updateUser('user-1', { phone: '0917-123-4567' } as any),
      ).rejects.toThrow('profile fail');
    });

    it('maps dateOfBirth and profilePicture into the student profile payload', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ email: 'a@b.com' }));

      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      const tx = {
        query: {
          studentProfiles: {
            findFirst: jest.fn().mockResolvedValue({ userId: 'user-1' }),
          },
          roles: { findFirst: jest.fn() },
        },
        update: jest.fn().mockImplementation((table: any) => {
          if (table === studentProfiles) {
            return { set };
          }
          return {
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          };
        }),
        insert: jest.fn(),
        delete: jest.fn(),
      };

      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));
      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(makeUser({ email: 'a@b.com' }))
        .mockResolvedValueOnce(
          makeUser({
            email: 'a@b.com',
            dateOfBirth: '2005-08-15T00:00:00.000Z',
            profilePicture: '/api/profiles/images/test.png',
          }),
        );

      const result = await service.updateUser('user-1', {
        dateOfBirth: '2005-08-15',
        profilePicture: '/api/profiles/images/test.png',
      } as any);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          dateOfBirth: expect.any(Date),
          profilePicture: '/api/profiles/images/test.png',
          updatedAt: expect.any(Date),
        }),
      );
      expect(result.profilePicture).toBe('/api/profiles/images/test.png');
      expect(result.dateOfBirth).toBe('2005-08-15T00:00:00.000Z');
    });

    it('writes actor-aware audit metadata when admin context is provided', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(makeUser({ email: 'before@example.com' }))
        .mockResolvedValueOnce(
          makeUser({
            email: 'before@example.com',
            firstName: 'Updated',
          }),
        );

      const tx = {
        query: {
          studentProfiles: { findFirst: jest.fn() },
          roles: { findFirst: jest.fn() },
          teacherProfiles: { findFirst: jest.fn() },
        },
        update: jest.fn().mockImplementation(() => ({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        })),
        insert: jest.fn(),
        delete: jest.fn(),
      };
      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      await service.updateUser(
        'user-1',
        {
          firstName: 'Updated',
        } as any,
        'admin-1',
      );

      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.updated',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'ACTIVE',
          changedFields: ['firstName'],
        },
      });
    });
  });

  describe('deleteUser', () => {
    it('writes actor-aware audit metadata for legacy status-flip deletion', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ status: 'ACTIVE' }));

      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      const result = await service.deleteUser('user-1', 'admin-1');

      expect(result).toEqual({
        message: 'User successfully deleted',
        userId: 'user-1',
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.deleted_legacy',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'ACTIVE',
        },
      });
    });
  });

  describe('adminResetPassword', () => {
    it('resets password for ACTIVE/PENDING users and sends email', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(
        makeUser({
          id: 'user-1',
          email: 'user@example.com',
          status: 'ACTIVE',
        }),
      );

      const updatePasswordSpy = jest
        .spyOn(service, 'updatePassword')
        .mockResolvedValue({
          message: 'Password successfully updated',
          userId: 'user-1',
        });

      const result = await service.adminResetPassword('user-1', 'admin-1');

      expect(updatePasswordSpy).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
      );
      expect(mockMailService.sendPasswordEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
      );
      expect(result).toEqual(
        expect.objectContaining({
          message: 'Password reset successfully',
          userId: 'user-1',
          generatedPassword: expect.any(String),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.password.reset_admin',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'ACTIVE',
        },
      });
    });

    it('throws NotFoundException if user does not exist', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);

      await expect(
        service.adminResetPassword('missing-id', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-resettable statuses', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ status: 'SUSPENDED' }));

      await expect(
        service.adminResetPassword('user-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockMailService.sendPasswordEmail).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteUser', () => {
    it('archives and sets deleted status inside one transaction', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(
          makeUser({ status: 'SUSPENDED', roles: [{ name: 'teacher' }] }),
        );
      (service as any).collectUserData = jest
        .fn()
        .mockResolvedValue({ snapshot: true });

      const tx = {
        insert: jest.fn().mockImplementation((table: any) => {
          if (table === archivedUsers)
            return { values: jest.fn().mockResolvedValue(undefined) };
          return { values: jest.fn().mockResolvedValue(undefined) };
        }),
        update: jest.fn().mockImplementation(() => ({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        })),
      };
      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      const result = await service.softDeleteUser('user-1', 'admin-1');
      expect(result.userId).toBe('user-1');
      expect(tx.insert).toHaveBeenCalledWith(archivedUsers);
      expect(tx.update).toHaveBeenCalledWith(users);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.archived',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'SUSPENDED',
          roles: ['teacher'],
        },
      });
    });
  });

  describe('exportUserData', () => {
    it('writes actor-aware audit metadata for sensitive data exports', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(makeUser());
      (service as any).collectUserData = jest.fn().mockResolvedValue({
        exportedAt: '2026-04-05T00:00:00.000Z',
        user: { id: 'user-1' },
      });

      const result = await service.exportUserData('user-1', 'admin-1');

      expect(result).toEqual({
        exportedAt: '2026-04-05T00:00:00.000Z',
        user: { id: 'user-1' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.exported',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'ACTIVE',
        },
      });
    });
  });

  describe('purgeUser', () => {
    it('marks archive as purged and deletes user in transaction', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ status: 'DELETED' }));

      const tx = {
        query: {
          archivedUsers: {
            findMany: jest.fn().mockResolvedValue([{ id: 'archive-1' }]),
          },
        },
        update: jest.fn().mockImplementation(() => ({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        })),
        delete: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
      };
      mockDb.transaction.mockImplementation(async (cb: Function) => cb(tx));

      const result = await service.purgeUser('user-1', 'admin-1');
      expect(result.userId).toBe('user-1');
      expect(tx.delete).toHaveBeenCalledWith(users);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.purged',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'DELETED',
        },
      });
    });
  });

  describe('reactivateUser', () => {
    it('reactivates suspended user and writes audit metadata', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ status: 'SUSPENDED' }));

      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      const result = await service.reactivateUser('user-1', 'admin-1');

      expect(result).toEqual({
        message: 'User reactivated successfully',
        userId: 'user-1',
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.reactivated',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'SUSPENDED',
        },
      });
    });
  });

  describe('suspendUser', () => {
    it('suspends active user and writes audit metadata', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ status: 'ACTIVE', roles: [] }));
      mockDb.query.classes.findMany.mockResolvedValue([]);

      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      const result = await service.suspendUser('user-1', 'admin-1');

      expect(result).toEqual({
        message: 'User suspended successfully',
        userId: 'user-1',
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: 'admin-1',
        action: 'user.suspended',
        targetType: 'user',
        targetId: 'user-1',
        metadata: {
          previousStatus: 'ACTIVE',
          hasWarnings: false,
        },
      });
    });
  });

  describe('bulkLifecycleAction', () => {
    it('aggregates successes and failures without aborting the batch', async () => {
      const suspendSpy = jest
        .spyOn(service, 'suspendUser')
        .mockResolvedValueOnce({
          message: 'User suspended successfully',
          userId: 'user-1',
        })
        .mockRejectedValueOnce(new BadRequestException('Cannot suspend a deleted user'))
        .mockResolvedValueOnce({
          message: 'User suspended successfully',
          userId: 'user-3',
        });

      const result = await service.bulkLifecycleAction(
        {
          action: 'suspend',
          userIds: ['user-1', 'user-2', 'user-3'],
        },
        'admin-1',
      );

      expect(suspendSpy).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        message: '2 users suspended; 1 failed.',
        data: {
          action: 'suspend',
          requested: 3,
          succeeded: ['user-1', 'user-3'],
          failed: [{ userId: 'user-2', reason: 'Cannot suspend a deleted user' }],
        },
      });
    });
  });

  describe('findPublicById', () => {
    it('never returns password', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeUser({ password: 'sensitive-hash' }));

      const result = await service.findPublicById('user-1');
      expect(result?.password).toBeUndefined();
    });
  });
});
