import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SECTION_ID = 'section-uuid-1';
const ADVISER_ID = 'adviser-uuid-1';
const STUDENT_ID = 'student-uuid-1';
const STUDENT_ID_2 = 'student-uuid-2';
const ENROLLMENT_ID = 'enrollment-uuid-1';
const SCHOOL_YEAR = '2026-2027';

const TEACHER_USER: RequestingUser = { userId: ADVISER_ID, roles: ['teacher'] };
const ADMIN_USER: RequestingUser = { userId: 'admin-uuid-1', roles: ['admin'] };
const OTHER_TEACHER: RequestingUser = {
  userId: 'other-teacher-uuid',
  roles: ['teacher'],
};

// Keep this type local for fixture clarity
type RequestingUser = { userId: string; roles: string[] };

const makeSection = (overrides: Partial<any> = {}) => ({
  id: SECTION_ID,
  name: 'Rizal',
  gradeLevel: '7',
  schoolYear: SCHOOL_YEAR,
  capacity: 40,
  roomNumber: '101',
  adviserId: ADVISER_ID,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  adviser: {
    id: ADVISER_ID,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@school.edu',
  },
  ...overrides,
});

const makeEnrollment = (overrides: Partial<any> = {}) => ({
  id: ENROLLMENT_ID,
  studentId: STUDENT_ID,
  classId: null as string | null,
  sectionId: SECTION_ID,
  status: 'enrolled',
  enrolledAt: new Date('2026-01-01'),
  ...overrides,
});

const makeUser = (id = STUDENT_ID, overrides: Partial<any> = {}) => ({
  id,
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  email: `${id}@school.edu`,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock DB chain helpers
// ---------------------------------------------------------------------------

const makeSelectChain = (rows: any[] = []) => {
  const chain: any = {
    from: jest.fn().mockImplementation(() => chain),
    innerJoin: jest.fn().mockImplementation(() => chain),
    where: jest.fn().mockImplementation(() => chain),
    groupBy: jest.fn().mockImplementation(() => chain),
    orderBy: jest.fn().mockImplementation(() => chain),
    limit: jest.fn().mockImplementation(() => chain),
    // Make the chain thenable so `await chain.where()` resolves to rows
    then: (resolve: any) => resolve(rows),
  };
  return chain;
};

const makeInsertChain = (rows: any[] = []) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(rows),
});

const makeUpdateChain = () => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(undefined),
});

const makeDeleteChain = () => ({
  where: jest.fn().mockResolvedValue(undefined),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SectionsService', () => {
  let service: SectionsService;

  const mockDb: any = {
    query: {
      sections: { findFirst: jest.fn(), findMany: jest.fn() },
      sectionVisibilityPreferences: { findFirst: jest.fn(), findMany: jest.fn() },
      classes: { findMany: jest.fn() },
      users: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  };

  const mockDatabaseService = { db: mockDb };
  const mockAuditService = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuditService.log.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
  });

  // =========================================================================
  // findById
  // =========================================================================

  describe('findById', () => {
    it('returns the section when found', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());

      const result = await service.findById(SECTION_ID);

      expect(result).toEqual(makeSection());
      expect(mockDb.query.sections.findFirst).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows a teacher to access a section they advise', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(
        service.findById(SECTION_ID, TEACHER_USER),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException when a teacher tries to access a section they do not advise', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(service.findById(SECTION_ID, OTHER_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows an admin to access any section regardless of adviserId', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(
        service.findById(SECTION_ID, ADMIN_USER),
      ).resolves.toBeDefined();
    });

    it('performs no ownership check when no requestingUser is provided (internal calls)', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(service.findById(SECTION_ID)).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================

  describe('findAll', () => {
    const setupFindAll = (rows: any[] = [], total = 0) => {
      mockDb.query.sections.findMany.mockResolvedValue(rows);
      // first call is the paginated list query; second is the COUNT query
      mockDb.select.mockReturnValue(makeSelectChain([{ total }]));
    };

    it('returns paginated result with total, page, limit, and totalPages', async () => {
      setupFindAll([makeSection()], 1);
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(
          makeSelectChain([{ sectionId: SECTION_ID, studentCount: 2 }]),
        );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: SECTION_ID, studentCount: 2 });
    });

    it('uses page=1 and limit=50 by default', async () => {
      setupFindAll([], 0);

      const result = await service.findAll();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('caps limit at 100 when a higher value is requested', async () => {
      setupFindAll([], 0);

      const result = await service.findAll({ limit: 999 });

      expect(result.pagination.limit).toBe(100);
    });

    it('returns empty data and zero total when no sections match', async () => {
      setupFindAll([], 0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('computes totalPages correctly for multi-page results', async () => {
      setupFindAll([], 55);

      const result = await service.findAll({ limit: 10 });

      expect(result.pagination.totalPages).toBe(6); // ceil(55/10)
    });

    it('returns hidden-only results when status=hidden and requester has hidden preferences', async () => {
      const row = makeSection();
      mockDb.query.sections.findMany.mockResolvedValue([row]);
      mockDb.query.sectionVisibilityPreferences.findMany.mockResolvedValue([
        { sectionId: SECTION_ID },
      ]);
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(
          makeSelectChain([{ sectionId: SECTION_ID, studentCount: 1 }]),
        );

      const result = await service.findAll({
        status: 'hidden',
        requesterId: ADVISER_ID,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: SECTION_ID, isHidden: true });
    });
  });

  // =========================================================================
  // getRoster
  // =========================================================================

  describe('getRoster', () => {
    it('returns mapped roster entries for enrolled students', async () => {
      const enrollmentRow = {
        ...makeEnrollment(),
        student: {
          id: STUDENT_ID,
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan@school.edu',
          profile: { gradeLevel: '7', lrn: '202401230001' },
        },
      };

      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.enrollments.findMany.mockResolvedValue([enrollmentRow]);

      const result = await service.getRoster(SECTION_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: STUDENT_ID,
        enrollmentId: ENROLLMENT_ID,
        studentId: STUDENT_ID,
        status: 'enrolled',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@school.edu',
        lrn: '202401230001',
        gradeLevel: '7',
      });
    });

    it('throws ForbiddenException when a non-adviser teacher requests the roster', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(
        service.getRoster(SECTION_ID, OTHER_TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns an empty array when the section has no enrolled students', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.enrollments.findMany.mockResolvedValue([]);

      const result = await service.getRoster(SECTION_ID);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getCandidates
  // =========================================================================

  describe('getCandidates', () => {
    it('returns an empty array when no users have the student role', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());

      // Role lookup returns nothing
      mockDb.select.mockReturnValue(makeSelectChain([]));

      const result = await service.getCandidates(SECTION_ID);

      expect(result).toEqual([]);
    });

    it('executes a SQL-level join query and returns candidate rows', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());

      const candidateRow = {
        id: STUDENT_ID,
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@school.edu',
        gradeLevel: '7',
      };

      // Three select() calls: enrolled subquery + main candidates query + active section memberships
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([])) // enrolled subquery
        .mockReturnValueOnce(makeSelectChain([candidateRow])) // main candidates query
        .mockReturnValueOnce(makeSelectChain([])); // active section memberships

      const result = await service.getCandidates(SECTION_ID);

      expect(result).toEqual([
        {
          ...candidateRow,
          hasActiveSectionEnrollment: false,
          enrolledSectionId: null,
          enrolledSectionName: null,
        },
      ]);
    });

    it('throws NotFoundException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(service.getCandidates('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // addStudentsToSection
  // =========================================================================

  describe('addStudentsToSection', () => {
    const makeTx = (overrides: Partial<any> = {}) => ({
      select: jest.fn(),
      insert: jest.fn(),
      ...overrides,
    });

    const dto = { studentIds: [STUDENT_ID, STUDENT_ID_2] };

    it('bulk inserts new students in a single transaction', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ capacity: 40 }),
      );

      const tx = makeTx();
      // Count current enrolled (0)
      tx.select.mockReturnValueOnce(makeSelectChain([{ count: '0' }]));
      // Validate students exist
      tx.select.mockReturnValueOnce(
        makeSelectChain([{ id: STUDENT_ID }, { id: STUDENT_ID_2 }]),
      );
      // Verify student role
      tx.select.mockReturnValueOnce(
        makeSelectChain([{ userId: STUDENT_ID }, { userId: STUDENT_ID_2 }]),
      );
      // Already enrolled check (none)
      tx.select.mockReturnValueOnce(makeSelectChain([]));
      // Bulk insert
      const insertedRows = [
        makeEnrollment(),
        makeEnrollment({ id: 'e2', studentId: STUDENT_ID_2 }),
      ];
      tx.insert.mockReturnValue(makeInsertChain(insertedRows));

      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      const result = await service.addStudentsToSection(SECTION_ID, dto as any);

      expect(result.createdCount).toBe(2);
      expect(tx.insert).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when adding students would exceed capacity', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ capacity: 2 }),
      );

      const tx = makeTx();
      // Roster already has 2 members
      tx.select.mockReturnValueOnce(makeSelectChain([{ count: '2' }]));

      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.addStudentsToSection(SECTION_ID, dto as any),
      ).rejects.toThrow(BadRequestException);
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when any of the student IDs do not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ capacity: 40 }),
      );

      const tx = makeTx();
      tx.select.mockReturnValueOnce(makeSelectChain([{ count: '0' }]));
      // Only one of the two exists
      tx.select.mockReturnValueOnce(makeSelectChain([{ id: STUDENT_ID }]));

      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.addStudentsToSection(SECTION_ID, dto as any),
      ).rejects.toThrow(BadRequestException);
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('skips already-enrolled students and returns a skipped count', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ capacity: 40 }),
      );

      const tx = makeTx();
      tx.select.mockReturnValueOnce(makeSelectChain([{ count: '0' }]));
      tx.select.mockReturnValueOnce(
        makeSelectChain([{ id: STUDENT_ID }, { id: STUDENT_ID_2 }]),
      );
      // Verify student role
      tx.select.mockReturnValueOnce(
        makeSelectChain([{ userId: STUDENT_ID }, { userId: STUDENT_ID_2 }]),
      );
      // Both already enrolled
      tx.select.mockReturnValueOnce(
        makeSelectChain([
          { studentId: STUDENT_ID },
          { studentId: STUDENT_ID_2 },
        ]),
      );

      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      const result = await service.addStudentsToSection(SECTION_ID, dto as any);

      expect(result.createdCount).toBe(0);
      expect(result.skipped).toBe(2);
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(
        service.addStudentsToSection('nonexistent', dto as any),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // removeStudentFromSection
  // =========================================================================

  describe('removeStudentFromSection', () => {
    const makeTxForRemove = (
      classEnrollment: any[],
      sectionEnrollment: any[],
    ) => {
      const tx: any = {
        select: jest.fn(),
        delete: jest.fn().mockReturnValue(makeDeleteChain()),
      };
      tx.select
        .mockReturnValueOnce(makeSelectChain(classEnrollment))
        .mockReturnValueOnce(makeSelectChain(sectionEnrollment));
      return tx;
    };

    it('deletes the enrollment row when the student has no class assignment', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForRemove(
        [], // no class enrollment
        [{ id: ENROLLMENT_ID }], // section enrollment found
      );
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.removeStudentFromSection(SECTION_ID, STUDENT_ID),
      ).resolves.toEqual({
        removed: true,
      });
      expect(tx.delete).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when the student has an active class enrollment', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForRemove(
        [{ id: ENROLLMENT_ID, classId: 'class-uuid-1' }], // active class enrollment
        [],
      );
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.removeStudentFromSection(SECTION_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);

      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the student is not enrolled (not found)', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForRemove([], []); // no class enrollment, no section enrollment
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.removeStudentFromSection(SECTION_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not touch dropped or completed enrollment history rows', async () => {
      // The query itself already filters by status='enrolled'; an empty result means
      // there is no *active* enrollment — we expect BadRequestException, not a silent delete
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForRemove([], []); // no matching rows
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.removeStudentFromSection(SECTION_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);

      expect(tx.delete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // createSection
  // =========================================================================

  describe('createSection', () => {
    const dto = {
      name: 'Rizal',
      gradeLevel: '7',
      schoolYear: SCHOOL_YEAR,
      capacity: 40,
      adviserId: ADVISER_ID,
    };

    const setupHappyPath = () => {
      // No duplicate section
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(makeSection()); // findById after insert
      // Adviser exists
      mockDb.query.users.findFirst.mockResolvedValue({ id: ADVISER_ID });
      // Adviser has teacher role
      mockDb.select.mockReturnValue(makeSelectChain([{ roleName: 'teacher' }]));
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: SECTION_ID }]));
    };

    it('creates a section and returns the full record', async () => {
      setupHappyPath();

      const result = await service.createSection(
        dto as any,
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );

      expect(result).toEqual(makeSection());
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADMIN_USER.userId,
        action: 'section.created',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'admin',
          gradeLevel: '7',
          schoolYear: SCHOOL_YEAR,
          adviserId: ADVISER_ID,
          capacity: 40,
        },
      });
    });

    it('throws ConflictException when a section with the same name/grade/year already exists', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());

      await expect(service.createSection(dto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the adviserId does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.createSection(dto as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the adviser does not hold the teacher role', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);
      mockDb.query.users.findFirst.mockResolvedValue({ id: ADVISER_ID });
      // select returns no teacher role rows
      mockDb.select.mockReturnValue(makeSelectChain([]));

      await expect(service.createSection(dto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates a section without an adviser when adviserId is omitted', async () => {
      const dtoWithoutAdviser = { ...dto, adviserId: undefined };
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeSection({ adviserId: null }));
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: SECTION_ID }]));

      await expect(
        service.createSection(dtoWithoutAdviser as any),
      ).resolves.toBeDefined();
      // No user or role lookups needed
      expect(mockDb.query.users.findFirst).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateSection
  // =========================================================================

  describe('updateSection', () => {
    it('updates section fields and returns the refreshed record', async () => {
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(makeSection()) // findById (initial load)
        .mockResolvedValueOnce(makeSection()) // duplicate check — same ID, no conflict
        .mockResolvedValueOnce(makeSection({ name: 'Bonifacio' })); // findById after update
      mockDb.update.mockReturnValue(makeUpdateChain());

      const result = await service.updateSection(
        SECTION_ID,
        { name: 'Bonifacio' },
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );

      expect(result.name).toBe('Bonifacio');
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADMIN_USER.userId,
        action: 'section.updated',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'admin',
          changedFields: ['name'],
          adviserId: ADVISER_ID,
          gradeLevel: '7',
          schoolYear: SCHOOL_YEAR,
        },
      });
    });

    it('throws ConflictException when the updated name+grade+year matches another section', async () => {
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(makeSection()) // current section
        .mockResolvedValueOnce(makeSection({ id: 'other-section' })); // collision

      await expect(
        service.updateSection(SECTION_ID, { name: 'Rizal' }),
      ).rejects.toThrow(ConflictException);

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('does not throw ConflictException when the only match is the section itself', async () => {
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(makeSection()) // current section
        .mockResolvedValueOnce(makeSection()) // "duplicate" — same ID        (collision check)
        .mockResolvedValueOnce(makeSection()); // findById after update
      mockDb.update.mockReturnValue(makeUpdateChain());

      await expect(
        service.updateSection(SECTION_ID, { name: 'Rizal' }),
      ).resolves.toBeDefined();
    });

    it('throws BadRequestException when the new adviser does not hold the teacher role', async () => {
      const newAdviserId = 'non-teacher-uuid';
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.users.findFirst.mockResolvedValue({ id: newAdviserId });
      mockDb.select.mockReturnValue(makeSelectChain([])); // no teacher role

      await expect(
        service.updateSection(SECTION_ID, { adviserId: newAdviserId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the section to update does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSection('nonexistent-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePresentation', () => {
    it('updates cardBannerUrl for adviser teacher and returns refreshed section', async () => {
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(makeSection({ adviserId: ADVISER_ID }))
        .mockResolvedValueOnce(
          makeSection({
            adviserId: ADVISER_ID,
            cardBannerUrl: '/api/sections/banners/new.png',
          }),
        );
      mockDb.update.mockReturnValue(makeUpdateChain());

      const result = await service.updatePresentation(
        SECTION_ID,
        { cardBannerUrl: '/api/sections/banners/new.png' },
        ADVISER_ID,
        ['teacher'],
      );

      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        id: SECTION_ID,
        cardBannerUrl: '/api/sections/banners/new.png',
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADVISER_ID,
        action: 'section.presentation.updated',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'teacher',
          changedFields: ['cardBannerUrl'],
          cardBannerUrl: '/api/sections/banners/new.png',
        },
      });
    });

    it('throws ForbiddenException when non-adviser teacher updates presentation', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(
        service.updatePresentation(
          SECTION_ID,
          { cardBannerUrl: '/api/sections/banners/new.png' },
          OTHER_TEACHER.userId,
          OTHER_TEACHER.roles,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setSectionHiddenState', () => {
    it('creates a visibility preference row when none exists', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );
      mockDb.query.sectionVisibilityPreferences.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue(makeInsertChain([]));

      const result = await service.setSectionHiddenState(
        SECTION_ID,
        ADVISER_ID,
        ['teacher'],
        true,
      );

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ sectionId: SECTION_ID, isHidden: true });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADVISER_ID,
        action: 'section.visibility.updated',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'teacher',
          hidden: true,
        },
      });
    });

    it('updates existing visibility preference row when present', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );
      mockDb.query.sectionVisibilityPreferences.findFirst.mockResolvedValue({
        id: 'pref-1',
        sectionId: SECTION_ID,
        userId: ADVISER_ID,
        isHidden: true,
      });
      mockDb.update.mockReturnValue(makeUpdateChain());

      const result = await service.setSectionHiddenState(
        SECTION_ID,
        ADVISER_ID,
        ['teacher'],
        false,
      );

      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ sectionId: SECTION_ID, isHidden: false });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADVISER_ID,
        action: 'section.visibility.updated',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'teacher',
          hidden: false,
        },
      });
    });

    it('throws ForbiddenException when non-adviser teacher toggles visibility', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(
        service.setSectionHiddenState(
          SECTION_ID,
          OTHER_TEACHER.userId,
          OTHER_TEACHER.roles,
          true,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // deleteSection (soft delete)
  // =========================================================================

  describe('deleteSection', () => {
    it('soft-deletes the section by setting isActive to false', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const txUpdateChain = makeUpdateChain();
      const tx = { update: jest.fn().mockReturnValue(txUpdateChain) };
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await service.deleteSection(SECTION_ID, ADMIN_USER.userId, ADMIN_USER.roles);

      // archiveSection calls tx.update twice: enrollments drop + section archive
      expect(tx.update).toHaveBeenCalledTimes(2);

      // Second update (sections table) sets isActive to false
      const sectionSetArgs = txUpdateChain.set.mock.calls[1][0];
      expect(sectionSetArgs.isActive).toBe(false);
      expect(sectionSetArgs).toHaveProperty('updatedAt');
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADMIN_USER.userId,
        action: 'section.archived',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'admin',
          previousIsActive: true,
        },
      });
    });

    it('throws NotFoundException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(service.deleteSection('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not perform a second DB fetch after the soft-delete', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const txUpdateChain = makeUpdateChain();
      const tx = { update: jest.fn().mockReturnValue(txUpdateChain) };
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await service.deleteSection(SECTION_ID);

      // findFirst is called exactly once (inside findById)
      expect(mockDb.query.sections.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreSection', () => {
    it('restores the section and writes actor-aware audit metadata', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ isActive: false }),
      );
      mockDb.update.mockReturnValue(makeUpdateChain());

      await service.restoreSection(SECTION_ID, ADMIN_USER.userId, ADMIN_USER.roles);

      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADMIN_USER.userId,
        action: 'section.restored',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'admin',
          previousIsActive: false,
        },
      });
    });
  });

  // =========================================================================
  // permanentlyDeleteSection
  // =========================================================================

  describe('permanentlyDeleteSection', () => {
    const makeTxForDelete = (
      activeClasses: string,
      enrolledStudents: string,
    ) => {
      const tx: any = {
        select: jest.fn(),
        delete: jest.fn().mockReturnValue(makeDeleteChain()),
      };
      tx.select
        .mockReturnValueOnce(makeSelectChain([{ count: activeClasses }]))
        .mockReturnValueOnce(makeSelectChain([{ count: enrolledStudents }]));
      return tx;
    };

    it('deletes the section when it has no active classes or enrolled students', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForDelete('0', '0');
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.permanentlyDeleteSection(
          SECTION_ID,
          ADMIN_USER.userId,
          ADMIN_USER.roles,
        ),
      ).resolves.not.toThrow();
      expect(tx.delete).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: ADMIN_USER.userId,
        action: 'section.purged',
        targetType: 'section',
        targetId: SECTION_ID,
        metadata: {
          actorRole: 'admin',
          previousIsActive: true,
        },
      });
    });

    it('throws BadRequestException when there are active classes', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForDelete('2', '0');
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.permanentlyDeleteSection(SECTION_ID),
      ).rejects.toThrow(BadRequestException);
      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when there are enrolled students', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      const tx = makeTxForDelete('0', '5');
      mockDb.transaction.mockImplementation((cb: Function) => cb(tx));

      await expect(
        service.permanentlyDeleteSection(SECTION_ID),
      ).rejects.toThrow(BadRequestException);
      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(
        service.permanentlyDeleteSection('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkLifecycleAction', () => {
    it('aggregates archive successes and failures without aborting the batch', async () => {
      const archiveSpy = jest
        .spyOn(service, 'archiveSection')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new ConflictException('Section is already archived.'))
        .mockResolvedValueOnce(undefined);
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(
          makeSection({ isActive: true }),
        );

      const result = await service.bulkLifecycleAction({
        action: 'archive',
        sectionIds: ['section-1', 'section-2', 'section-3'],
      });

      expect(archiveSpy).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        message: '2 sections archived; 1 failed.',
        data: {
          action: 'archive',
          requested: 3,
          succeeded: ['section-1', 'section-3'],
          failed: [
            { sectionId: 'section-2', reason: 'Section is already archived.' },
          ],
        },
      });
    });

    it('fails restore for already-active sections without aborting the batch', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(makeSection({ isActive: false }))
        .mockResolvedValueOnce(makeSection({ isActive: true }));
      const restoreSpy = jest
        .spyOn(service, 'restoreSection')
        .mockResolvedValueOnce(undefined);

      const result = await service.bulkLifecycleAction({
        action: 'restore',
        sectionIds: ['section-1', 'section-2'],
      });

      expect(restoreSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: '1 section restored; 1 failed.',
        data: {
          action: 'restore',
          requested: 2,
          succeeded: ['section-1'],
          failed: [
            { sectionId: 'section-2', reason: 'Section is already active.' },
          ],
        },
      });
    });
  });

  // =========================================================================
  // getSectionSchedule
  // =========================================================================

  describe('getSectionSchedule', () => {
    const makeClassWithSchedules = (schedules: any[] = []) => ({
      id: 'class-uuid-1',
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      room: 'Room 101',
      isActive: true,
      teacher: { id: ADVISER_ID, firstName: 'Jane', lastName: 'Smith' },
      schedules,
    });

    it('returns structured calendar payload with section info and transformed schedule slots', async () => {
      const slots = [
        {
          id: 'slot-1',
          days: ['M', 'W', 'F'],
          startTime: '09:00',
          endTime: '10:00',
        },
      ];
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.classes.findMany.mockResolvedValue([
        makeClassWithSchedules(slots),
      ]);

      const result = await service.getSectionSchedule(SECTION_ID, ADMIN_USER);

      expect(result.section.id).toBe(SECTION_ID);
      expect(result.section.name).toBe('Rizal');
      expect(result.section.gradeLevel).toBe('7');
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].classId).toBe('class-uuid-1');
      expect(result.classes[0].subjectCode).toBe('MATH-7');
      // toCalendarSlot transforms the raw slot into a calendar-ready shape
      expect(result.classes[0].schedules[0]).toMatchObject({
        id: 'slot-1',
        days: ['M', 'W', 'F'],
        startTime: '09:00',
        endTime: '10:00',
        daysExpanded: ['Monday', 'Wednesday', 'Friday'],
        startHour: 9,
        startMinute: 0,
        endHour: 10,
        endMinute: 0,
      });
    });

    it('returns an empty classes array when the section has no classes', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.classes.findMany.mockResolvedValue([]);

      const result = await service.getSectionSchedule(SECTION_ID, ADMIN_USER);

      expect(result.classes).toEqual([]);
    });

    it('returns an empty schedules array for a class that has no assigned slots', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.classes.findMany.mockResolvedValue([
        makeClassWithSchedules([]),
      ]);

      const result = await service.getSectionSchedule(SECTION_ID, ADMIN_USER);

      expect(result.classes[0].schedules).toEqual([]);
    });

    it('correctly maps a Thursday lab slot (Th) to its full English name', async () => {
      const labSlot = [
        { id: 'slot-2', days: ['Th'], startTime: '13:00', endTime: '15:00' },
      ];
      mockDb.query.sections.findFirst.mockResolvedValue(makeSection());
      mockDb.query.classes.findMany.mockResolvedValue([
        makeClassWithSchedules(labSlot),
      ]);

      const result = await service.getSectionSchedule(SECTION_ID, ADMIN_USER);

      expect(result.classes[0].schedules[0].daysExpanded).toEqual(['Thursday']);
      expect(result.classes[0].schedules[0].startHour).toBe(13);
      expect(result.classes[0].schedules[0].endHour).toBe(15);
    });

    it('inherits teacher ownership check from findById — throws ForbiddenException for non-adviser teacher', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );

      await expect(
        service.getSectionSchedule(SECTION_ID, OTHER_TEACHER),
      ).rejects.toThrow(ForbiddenException);
      // Classes should never be queried when access is denied
      expect(mockDb.query.classes.findMany).not.toHaveBeenCalled();
    });

    it('allows an adviser teacher to retrieve their own section schedule', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: ADVISER_ID }),
      );
      mockDb.query.classes.findMany.mockResolvedValue([]);

      await expect(
        service.getSectionSchedule(SECTION_ID, TEACHER_USER),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(
        service.getSectionSchedule('bad-id', ADMIN_USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // verifyAdviserHasTeacherRole (via createSection / updateSection)
  // =========================================================================

  describe('verifyAdviserHasTeacherRole (internal helper – tested via createSection)', () => {
    it('does not throw when the user has the teacher role', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);
      mockDb.query.users.findFirst.mockResolvedValue({ id: ADVISER_ID });
      mockDb.select.mockReturnValue(makeSelectChain([{ roleName: 'teacher' }]));
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: SECTION_ID }]));
      mockDb.query.sections.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeSection());

      await expect(
        service.createSection({
          name: 'Rizal',
          gradeLevel: '7',
          schoolYear: SCHOOL_YEAR,
          capacity: 40,
          adviserId: ADVISER_ID,
        }),
      ).resolves.toBeDefined();
    });

    it('throws BadRequestException when the user has only the student role', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);
      mockDb.query.users.findFirst.mockResolvedValue({ id: ADVISER_ID });
      mockDb.select.mockReturnValue(makeSelectChain([{ roleName: 'student' }]));

      await expect(
        service.createSection({
          name: 'Rizal',
          gradeLevel: '7',
          schoolYear: SCHOOL_YEAR,
          capacity: 40,
          adviserId: ADVISER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
