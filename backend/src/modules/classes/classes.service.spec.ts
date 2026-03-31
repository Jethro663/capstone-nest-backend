import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CLASS_ID = 'class-uuid-1';
const SECTION_ID = 'section-uuid-1';
const TEACHER_ID = 'teacher-uuid-1';
const STUDENT_ID = 'student-uuid-1';
const ENROLLMENT_ID = 'enrollment-uuid-1';
const SCHOOL_YEAR = '2026-2027';

const makeClass = (overrides: Partial<any> = {}) => ({
  id: CLASS_ID,
  subjectName: 'Mathematics',
  subjectCode: 'MATH-7',
  subjectGradeLevel: '7',
  sectionId: SECTION_ID,
  teacherId: TEACHER_ID,
  schoolYear: SCHOOL_YEAR,
  schedules: [] as any[],
  room: 'Room 101',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  section: { id: SECTION_ID, name: 'Sampaguita', gradeLevel: '7' },
  teacher: {
    id: TEACHER_ID,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@school.edu',
  },
  ...overrides,
});

const makeEnrollment = (overrides: Partial<any> = {}) => ({
  id: ENROLLMENT_ID,
  studentId: STUDENT_ID,
  classId: CLASS_ID,
  sectionId: SECTION_ID,
  status: 'enrolled',
  enrolledAt: new Date('2026-01-01'),
  ...overrides,
});

const makeTeacher = (overrides: Partial<any> = {}) => ({
  id: TEACHER_ID,
  firstName: 'Jane',
  lastName: 'Smith',
  userRoles: [{ role: { name: 'teacher' } }],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock DB builder helpers
// ---------------------------------------------------------------------------

const makeSelectChain = (rows: any[] = []) => ({
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(rows),
});

const makeInsertChain = (rows: any[] = []) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(rows),
});

const makeUpdateChain = (result: any = undefined) => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(result),
});

const makeDeleteChain = (result: any = undefined) => ({
  where: jest.fn().mockResolvedValue(result),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ClassesService', () => {
  let service: ClassesService;

  const mockDb: any = {
    query: {
      classes: { findFirst: jest.fn(), findMany: jest.fn() },
      classVisibilityPreferences: { findFirst: jest.fn(), findMany: jest.fn() },
      studentClassPresentationPreferences: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      studentCourseViewPreferences: { findFirst: jest.fn() },
      classSchedules: { findFirst: jest.fn(), findMany: jest.fn() },
      sections: { findFirst: jest.fn() },
      users: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
      lessons: { findMany: jest.fn() },
      assessments: { findMany: jest.fn() },
      classRecords: { findMany: jest.fn() },
      classRecordCategories: { findMany: jest.fn() },
      classRecordItems: { findMany: jest.fn() },
      classRecordScores: { findMany: jest.fn() },
      classRecordFinalGrades: { findFirst: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
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
    mockDb.query.classVisibilityPreferences.findMany.mockResolvedValue([]);
    mockDb.query.classVisibilityPreferences.findFirst.mockResolvedValue(null);
    mockDb.query.studentClassPresentationPreferences.findMany.mockResolvedValue(
      [],
    );
    mockDb.query.studentClassPresentationPreferences.findFirst.mockResolvedValue(
      null,
    );
    mockDb.query.studentCourseViewPreferences.findFirst.mockResolvedValue(null);
    mockDb.query.classRecords.findMany.mockResolvedValue([]);
    mockDb.query.classRecordCategories.findMany.mockResolvedValue([]);
    mockDb.query.classRecordItems.findMany.mockResolvedValue([]);
    mockDb.query.classRecordScores.findMany.mockResolvedValue([]);
    mockDb.query.classRecordFinalGrades.findFirst.mockResolvedValue(null);
    mockDb.query.assessmentAttempts.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  // =========================================================================
  // findById
  // =========================================================================

  describe('findById', () => {
    it('returns the class when found', async () => {
      const cls = makeClass();
      mockDb.query.classes.findFirst.mockResolvedValue(cls);

      const result = await service.findById(CLASS_ID);

      expect(result).toEqual(cls);
      expect(mockDb.query.classes.findFirst).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the class does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================

  describe('findAll', () => {
    it('returns paginated result with total, page, and limit', async () => {
      const classList = [makeClass()];
      mockDb.select.mockReturnValue(makeSelectChain([{ total: 1 }]));
      mockDb.query.classes.findMany.mockResolvedValue(classList);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({ data: classList, total: 1, page: 1, limit: 10 });
    });

    it('uses page=1 and limit=50 when no filters are provided', async () => {
      mockDb.select.mockReturnValue(makeSelectChain([{ total: 0 }]));
      mockDb.query.classes.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('caps limit at 100 even if a higher value is requested', async () => {
      mockDb.select.mockReturnValue(makeSelectChain([{ total: 0 }]));
      mockDb.query.classes.findMany.mockResolvedValue([]);

      const result = await service.findAll({ page: 1, limit: 999 });

      expect(result.limit).toBe(100);
    });

    it('returns an empty data array when there are no classes', async () => {
      mockDb.select.mockReturnValue(makeSelectChain([{ total: 0 }]));
      mockDb.query.classes.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // create
  // =========================================================================

  describe('create', () => {
    const dto = {
      subjectName: 'Mathematics',
      subjectCode: 'math-7',
      subjectGradeLevel: '7',
      sectionId: SECTION_ID,
      teacherId: TEACHER_ID,
      schoolYear: SCHOOL_YEAR,
    };

    const setupHappyPath = () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(makeTeacher());
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeClass());
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: CLASS_ID }]));
    };

    it('creates a class and returns its full record', async () => {
      setupHappyPath();

      const result = await service.create(dto as any);

      expect(result).toEqual(makeClass());
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('stores subjectCode in UPPERCASE regardless of input case', async () => {
      setupHappyPath();

      await service.create(dto as any);

      const insertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertValues.subjectCode).toBe('MATH-7');
    });

    it('throws BadRequestException when the section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the teacher user does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the user exists but is not a teacher/admin', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(
        makeTeacher({ userRoles: [{ role: { name: 'student' } }] }),
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows an admin user to be assigned as teacher', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(
        makeTeacher({ userRoles: [{ role: { name: 'admin' } }] }),
      );
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeClass());
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: CLASS_ID }]));

      await expect(service.create(dto as any)).resolves.toBeDefined();
    });

    it('throws ConflictException when the same subject+section+year already exists', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(makeTeacher());
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());

      await expect(service.create(dto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // =========================================================================
  // create — schedule slots
  // =========================================================================

  describe('create (with schedules)', () => {
    const dtoWithSlots = {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      sectionId: SECTION_ID,
      teacherId: TEACHER_ID,
      schoolYear: SCHOOL_YEAR,
      room: 'Room 101',
      schedules: [
        { days: ['M', 'W', 'F'], startTime: '09:00', endTime: '10:00' },
      ],
    };

    it('inserts schedule slots into class_schedules when schedules are provided', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(makeTeacher());
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(makeClass()); // findById after insert
      // First insert: classes table; second: class_schedules
      mockDb.insert
        .mockReturnValueOnce(makeInsertChain([{ id: CLASS_ID }]))
        .mockReturnValueOnce(makeInsertChain([{ id: 'slot-uuid-1' }]));
      // Collision check returns no conflicts
      mockDb.select.mockReturnValue(makeSelectChain([]));

      const result = await service.create(dtoWithSlots as any);

      expect(result).toEqual(makeClass());
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('throws ConflictException when a slot collides with another class in the same section', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(makeTeacher());
      mockDb.query.classes.findFirst.mockResolvedValueOnce(null); // no duplicate
      mockDb.insert.mockReturnValueOnce(makeInsertChain([{ id: CLASS_ID }]));

      // Collision check returns a conflicting slot
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            slotId: 'existing-slot',
            classId: 'other-class-uuid',
            days: ['M', 'W', 'F'],
            startTime: '09:00',
            endTime: '10:00',
            subjectName: 'English',
            classSectionId: SECTION_ID,
            classTeacherId: 'other-teacher',
            classRoom: null,
          },
        ]),
      });

      await expect(service.create(dtoWithSlots as any)).rejects.toThrow(
        ConflictException,
      );
      // class row was inserted but class_schedules insert was blocked
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when a slot collides on the same teacher across sections', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(makeTeacher());
      mockDb.query.classes.findFirst.mockResolvedValueOnce(null);
      mockDb.insert.mockReturnValueOnce(makeInsertChain([{ id: CLASS_ID }]));

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            slotId: 's2',
            classId: 'another-class',
            days: ['M'],
            startTime: '08:30',
            endTime: '09:30',
            subjectName: 'Science',
            classSectionId: 'other-section-uuid',
            classTeacherId: TEACHER_ID, // same teacher
            classRoom: null,
          },
        ]),
      });

      await expect(service.create(dtoWithSlots as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('does not run collision check or second insert when schedules is absent from the DTO', async () => {
      const dtoNoSlots = {
        subjectName: 'Science',
        subjectCode: 'SCI-7',
        sectionId: SECTION_ID,
        teacherId: TEACHER_ID,
        schoolYear: SCHOOL_YEAR,
      };
      mockDb.query.sections.findFirst.mockResolvedValue({ id: SECTION_ID });
      mockDb.query.users.findFirst.mockResolvedValue(makeTeacher());
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeClass());
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: CLASS_ID }]));

      await service.create(dtoNoSlots as any);

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // update
  // =========================================================================

  describe('update', () => {
    it('uppercases subjectCode when it is included in the update', async () => {
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(makeClass())
        .mockResolvedValueOnce(makeClass({ subjectCode: 'SCIENCE-7' }));
      mockDb.update.mockReturnValue(makeUpdateChain());

      await service.update(CLASS_ID, { subjectCode: 'science-7' } as any);

      const updateSet =
        mockDb.update.mock.results[0].value.set.mock.calls[0][0];
      expect(updateSet.subjectCode).toBe('SCIENCE-7');
    });

    it('throws BadRequestException when the new sectionId does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.sections.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, { sectionId: 'nonexistent-section' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the new teacherId does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, { teacherId: 'nonexistent-teacher' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // update — schedule slot replacement
  // =========================================================================

  describe('update (with schedules)', () => {
    it('replaces schedule slots: deletes old then inserts new when schedules is provided', async () => {
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(makeClass()) // findById (initial)
        .mockResolvedValueOnce(makeClass()); // findById (after update)
      mockDb.update.mockReturnValue(makeUpdateChain());
      // Collision check returns no conflicts
      mockDb.select.mockReturnValue(makeSelectChain([]));
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: 'new-slot' }]));

      await service.update(CLASS_ID, {
        schedules: [
          { days: ['T', 'Th'], startTime: '10:00', endTime: '11:00' },
        ],
      } as any);

      expect(mockDb.delete).toHaveBeenCalledTimes(1); // old slots cleared
      expect(mockDb.insert).toHaveBeenCalledTimes(1); // new slots inserted
    });

    it('clears all schedule slots when dto.schedules is an empty array', async () => {
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(makeClass())
        .mockResolvedValueOnce(makeClass());
      mockDb.update.mockReturnValue(makeUpdateChain());
      mockDb.delete.mockReturnValue(makeDeleteChain());

      await service.update(CLASS_ID, { schedules: [] } as any);

      expect(mockDb.delete).toHaveBeenCalledTimes(1); // existing slots deleted
      expect(mockDb.insert).not.toHaveBeenCalled(); // nothing to insert
      expect(mockDb.select).not.toHaveBeenCalled(); // no collision check for empty array
    });

    it('does not touch class_schedules when schedules is not in the update payload', async () => {
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(makeClass())
        .mockResolvedValueOnce(makeClass());
      mockDb.update.mockReturnValue(makeUpdateChain());

      await service.update(CLASS_ID, { room: 'Lab 2' } as any);

      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('throws ConflictException on schedule replacement when new slots collide', async () => {
      mockDb.query.classes.findFirst.mockResolvedValueOnce(makeClass());
      mockDb.update.mockReturnValue(makeUpdateChain());

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            slotId: 'conflict-slot',
            classId: 'other-class',
            days: ['T', 'Th'],
            startTime: '10:00',
            endTime: '11:00',
            subjectName: 'English',
            classSectionId: SECTION_ID,
            classTeacherId: 'other-teacher',
            classRoom: null,
          },
        ]),
      });

      await expect(
        service.update(CLASS_ID, {
          schedules: [
            { days: ['T', 'Th'], startTime: '10:00', endTime: '11:00' },
          ],
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // delete
  // =========================================================================

  describe('delete', () => {
    it('deletes the class when it has no enrollments, lessons, or assessments', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findMany.mockResolvedValue([]);
      mockDb.query.lessons.findMany.mockResolvedValue([]);
      mockDb.query.assessments.findMany.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(makeDeleteChain());

      await expect(service.delete(CLASS_ID)).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when there are active enrollments', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findMany.mockResolvedValue([{ id: 'e1' }]);

      await expect(service.delete(CLASS_ID)).rejects.toThrow(ConflictException);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when there are lessons', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findMany.mockResolvedValue([]);
      mockDb.query.lessons.findMany.mockResolvedValue([{ id: 'l1' }]);

      await expect(service.delete(CLASS_ID)).rejects.toThrow(ConflictException);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when there are assessments', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findMany.mockResolvedValue([]);
      mockDb.query.lessons.findMany.mockResolvedValue([]);
      mockDb.query.assessments.findMany.mockResolvedValue([{ id: 'a1' }]);

      await expect(service.delete(CLASS_ID)).rejects.toThrow(ConflictException);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the class does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // purge
  // =========================================================================

  describe('purge', () => {
    it('deletes an archived class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(
        makeClass({ isActive: false }),
      );
      mockDb.delete.mockReturnValue(makeDeleteChain());

      await expect(service.purge(CLASS_ID)).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when class is still active', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(
        makeClass({ isActive: true }),
      );

      await expect(service.purge(CLASS_ID)).rejects.toThrow(ConflictException);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when class does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);

      await expect(service.purge('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('bulkLifecycleAction', () => {
    it('aggregates archive successes and failures without aborting the batch', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(makeClass({ isActive: true }));
      const toggleSpy = jest
        .spyOn(service, 'toggleActive')
        .mockResolvedValueOnce(makeClass({ isActive: false }))
        .mockRejectedValueOnce(new ConflictException('Class is already archived.'))
        .mockResolvedValueOnce(makeClass({ isActive: false }));

      const result = await service.bulkLifecycleAction({
        action: 'archive',
        classIds: ['class-1', 'class-2', 'class-3'],
      });

      expect(toggleSpy).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        message: '2 classes archived; 1 failed.',
        data: {
          action: 'archive',
          requested: 3,
          succeeded: ['class-1', 'class-3'],
          failed: [{ classId: 'class-2', reason: 'Class is already archived.' }],
        },
      });
    });

    it('fails purge for active classes without aborting the batch', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(makeClass({ isActive: false }))
        .mockResolvedValueOnce(makeClass({ isActive: true }));
      const purgeSpy = jest
        .spyOn(service, 'purge')
        .mockResolvedValueOnce(makeClass({ isActive: false }));

      const result = await service.bulkLifecycleAction({
        action: 'purge',
        classIds: ['class-1', 'class-2'],
      });

      expect(purgeSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: '1 class purged; 1 failed.',
        data: {
          action: 'purge',
          requested: 2,
          succeeded: ['class-1'],
          failed: [
            {
              classId: 'class-2',
              reason: 'Only archived classes can be permanently deleted. Archive the class first.',
            },
          ],
        },
      });
    });
  });

  // =========================================================================
  // getClassesByTeacher
  // =========================================================================

  describe('getClassesByTeacher', () => {
    it('returns classes for the teacher when called by that teacher', async () => {
      const classList = [makeClass()];
      mockDb.query.classes.findMany.mockResolvedValue(classList);

      const result = await service.getClassesByTeacher(TEACHER_ID, TEACHER_ID, [
        'teacher',
      ]);

      expect(result).toEqual(
        classList.map((classRecord) => ({
          ...classRecord,
          isHidden: false,
        })),
      );
    });

    it("allows an admin to view any teacher's classes", async () => {
      const classList = [makeClass()];
      mockDb.query.classes.findMany.mockResolvedValue(classList);

      const result = await service.getClassesByTeacher(
        TEACHER_ID,
        'admin-uuid',
        ['admin'],
      );

      expect(result).toEqual(
        classList.map((classRecord) => ({
          ...classRecord,
          isHidden: false,
        })),
      );
    });

    it("throws ForbiddenException when a teacher requests another teacher's classes", async () => {
      await expect(
        service.getClassesByTeacher(TEACHER_ID, 'other-teacher-uuid', [
          'teacher',
        ]),
      ).rejects.toThrow(ForbiddenException);

      expect(mockDb.query.classes.findMany).not.toHaveBeenCalled();
    });

    it('skips the ownership check when requesterId is not provided (internal calls)', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);

      await expect(
        service.getClassesByTeacher(TEACHER_ID),
      ).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // getClassesByStudent
  // =========================================================================

  describe('getClassesByStudent', () => {
    it("throws ForbiddenException when a student requests another student's classes", async () => {
      await expect(
        service.getClassesByStudent(STUDENT_ID, 'other-student-uuid', [
          'student',
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a student to view their own classes', async () => {
      mockDb.query.enrollments.findMany.mockResolvedValue([
        { classId: CLASS_ID },
      ]);
      mockDb.query.classes.findMany.mockResolvedValue([makeClass()]);

      await expect(
        service.getClassesByStudent(STUDENT_ID, STUDENT_ID, ['student']),
      ).resolves.not.toThrow();
    });

    it("allows a teacher to view any student's classes", async () => {
      mockDb.query.enrollments.findMany.mockResolvedValue([
        { classId: CLASS_ID },
      ]);
      mockDb.query.classes.findMany.mockResolvedValue([makeClass()]);

      await expect(
        service.getClassesByStudent(STUDENT_ID, 'teacher-uuid', ['teacher']),
      ).resolves.not.toThrow();
    });

    it('returns an empty array when the student has no enrollments', async () => {
      mockDb.query.enrollments.findMany.mockResolvedValue([]);

      const result = await service.getClassesByStudent(STUDENT_ID, STUDENT_ID, [
        'student',
      ]);

      expect(result).toEqual([]);
      expect(mockDb.query.classes.findMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // enrollStudent
  // =========================================================================

  describe('enrollStudent', () => {
    it('promotes a section-only enrollment row when student has no class yet', async () => {
      const txMock: any = {
        query: { enrollments: { findFirst: jest.fn() } },
        update: jest.fn(),
        insert: jest.fn(),
      };

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });

      txMock.query.enrollments.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeEnrollment({ classId: null }));
      txMock.update.mockReturnValue(makeUpdateChain());

      mockDb.transaction.mockImplementation((cb: Function) => cb(txMock));
      mockDb.query.enrollments.findFirst.mockResolvedValueOnce(
        makeEnrollment(),
      );

      await service.enrollStudent(CLASS_ID, STUDENT_ID, TEACHER_ID);

      expect(txMock.update).toHaveBeenCalledTimes(1);
      expect(txMock.insert).not.toHaveBeenCalled();
    });

    it('inserts a new row when the student already has a separate class enrollment', async () => {
      const txMock: any = {
        query: { enrollments: { findFirst: jest.fn() } },
        update: jest.fn(),
        insert: jest.fn(),
      };

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });

      txMock.query.enrollments.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeEnrollment({ classId: 'other-class-id' }));
      txMock.insert.mockReturnValue(makeInsertChain([{ id: 'new-enroll-id' }]));

      mockDb.transaction.mockImplementation((cb: Function) => cb(txMock));
      mockDb.query.enrollments.findFirst.mockResolvedValueOnce(
        makeEnrollment(),
      );

      await service.enrollStudent(CLASS_ID, STUDENT_ID, TEACHER_ID);

      expect(txMock.insert).toHaveBeenCalledTimes(1);
      expect(txMock.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the student does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollStudent(CLASS_ID, 'nonexistent-student', TEACHER_ID),
      ).rejects.toThrow(BadRequestException);

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the student is already enrolled in the class', async () => {
      const txMock: any = {
        query: { enrollments: { findFirst: jest.fn() } },
        update: jest.fn(),
        insert: jest.fn(),
      };

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });
      txMock.query.enrollments.findFirst.mockResolvedValueOnce(
        makeEnrollment(),
      );

      mockDb.transaction.mockImplementation((cb: Function) => cb(txMock));

      await expect(
        service.enrollStudent(CLASS_ID, STUDENT_ID, TEACHER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when the student is not in the section', async () => {
      const txMock: any = {
        query: { enrollments: { findFirst: jest.fn() } },
        update: jest.fn(),
        insert: jest.fn(),
      };

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });
      txMock.query.enrollments.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockDb.transaction.mockImplementation((cb: Function) => cb(txMock));

      await expect(
        service.enrollStudent(CLASS_ID, STUDENT_ID, TEACHER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // removeStudent  CRITICAL: must not destroy the section membership row
  // =========================================================================

  describe('removeStudent', () => {
    it('reverts classId to NULL when the enrolled row is the promoted section row', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findFirst
        .mockResolvedValueOnce(makeEnrollment({ classId: CLASS_ID }))
        .mockResolvedValueOnce(null); // no separate section-only row

      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue(updateChain);

      await service.removeStudent(CLASS_ID, STUDENT_ID, TEACHER_ID);

      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(updateChain.set.mock.calls[0][0]).toEqual({ classId: null });
    });

    it('deletes the row when a separate section-only row already exists', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findFirst
        .mockResolvedValueOnce(makeEnrollment({ classId: CLASS_ID }))
        .mockResolvedValueOnce(
          makeEnrollment({ id: 'section-only-row', classId: null }),
        );

      const deleteChain = makeDeleteChain();
      mockDb.delete.mockReturnValue(deleteChain);

      await service.removeStudent(CLASS_ID, STUDENT_ID, TEACHER_ID);

      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the student is not enrolled in the class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findFirst.mockResolvedValue(null);

      await expect(
        service.removeStudent(CLASS_ID, STUDENT_ID, TEACHER_ID),
      ).rejects.toThrow(NotFoundException);

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getCandidates
  // =========================================================================

  describe('getCandidates', () => {
    it('returns all section students when no one is enrolled in the class yet', async () => {
      const sectionStudent = {
        ...makeEnrollment({ classId: null }),
        student: {
          id: STUDENT_ID,
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan@school.edu',
          profile: { gradeLevel: '7' },
        },
      };

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findMany
        .mockResolvedValueOnce([]) // no enrolled students in this class
        .mockResolvedValueOnce([sectionStudent]); // candidates from DB

      const result = await service.getCandidates(CLASS_ID);

      expect(result).toEqual([sectionStudent]);
    });

    it('returns an empty array when all section students are already enrolled', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findMany
        .mockResolvedValueOnce([{ studentId: STUDENT_ID }])
        .mockResolvedValueOnce([]);

      const result = await service.getCandidates(CLASS_ID);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getStudentOverviewForClass
  // =========================================================================

  describe('getStudentOverviewForClass', () => {
    it('builds standing and history buckets with student-centric status rules', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(
        makeClass({
          section: {
            id: SECTION_ID,
            name: 'Rizal',
            gradeLevel: '10',
            schoolYear: SCHOOL_YEAR,
          },
          subjectName: 'Mathematics',
          subjectCode: 'MATH-10',
        }),
      );
      mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enroll-1' });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: STUDENT_ID,
        firstName: 'Jamie',
        middleName: null,
        lastName: 'Cruz',
        email: 'jcruz@nexora.edu',
        status: 'ACTIVE',
        profile: {
          lrn: '789012',
          dateOfBirth: null,
          gender: null,
          phone: null,
          address: null,
          gradeLevel: '10',
          familyName: null,
          familyRelationship: null,
          familyContact: null,
          profilePicture: null,
        },
      });
      mockDb.query.sections.findFirst.mockResolvedValue({
        id: SECTION_ID,
        name: 'Rizal',
        gradeLevel: '10',
        schoolYear: SCHOOL_YEAR,
        roomNumber: '101',
        adviser: null,
      });
      mockDb.query.classRecords.findMany.mockResolvedValue([
        {
          id: 'record-q1',
          gradingPeriod: 'q1',
          updatedAt: new Date('2026-03-01'),
          createdAt: new Date('2026-02-01'),
        },
      ]);
      mockDb.query.classRecordCategories.findMany.mockResolvedValue([
        { id: 'cat-ww', name: 'Written Works', weightPercentage: '30' },
        { id: 'cat-pt', name: 'Performance Tasks', weightPercentage: '50' },
        { id: 'cat-qa', name: 'Quarterly Assessment', weightPercentage: '20' },
      ]);
      mockDb.query.classRecordItems.findMany.mockResolvedValue([
        { id: 'item-ww', categoryId: 'cat-ww', maxScore: '100' },
        { id: 'item-pt', categoryId: 'cat-pt', maxScore: '100' },
        { id: 'item-qa', categoryId: 'cat-qa', maxScore: '100' },
      ]);
      mockDb.query.classRecordScores.findMany.mockResolvedValue([
        { classRecordItemId: 'item-ww', score: '85' },
        { classRecordItemId: 'item-pt', score: '93' },
        { classRecordItemId: 'item-qa', score: '88' },
      ]);
      mockDb.query.classRecordFinalGrades.findFirst.mockResolvedValue(null);
      mockDb.query.assessments.findMany.mockResolvedValue([
        {
          id: 'a-finished',
          title: 'Algebra Quiz 1',
          type: 'quiz',
          dueDate: '2026-03-25T00:00:00.000Z',
          totalPoints: 100,
        },
        {
          id: 'a-late',
          title: 'Midterm Exam',
          type: 'quarterly_assessment',
          dueDate: '2026-03-15T00:00:00.000Z',
          totalPoints: 100,
        },
        {
          id: 'a-pending',
          title: 'Group Project',
          type: 'project',
          dueDate: '2026-04-10T00:00:00.000Z',
          totalPoints: 100,
        },
      ]);
      mockDb.query.assessmentAttempts.findMany.mockResolvedValue([
        {
          id: 'attempt-1',
          assessmentId: 'a-finished',
          isSubmitted: true,
          isReturned: false,
          submittedAt: '2026-03-14T08:00:00.000Z',
          returnedAt: null,
          score: 90,
          directScore: null,
          passed: true,
        },
        {
          id: 'attempt-2',
          assessmentId: 'a-late',
          isSubmitted: true,
          isReturned: true,
          submittedAt: '2026-03-16T09:00:00.000Z',
          returnedAt: '2026-03-17T00:00:00.000Z',
          score: 88,
          directScore: null,
          passed: true,
        },
      ]);

      const result = await service.getStudentOverviewForClass(
        CLASS_ID,
        STUDENT_ID,
        TEACHER_ID,
        ['teacher'],
      );

      expect(result.classInfo.sectionLabel).toBe('Grade 10 - Rizal');
      expect(result.standing).toEqual({
        gradingPeriod: 'q1',
        overallGradePercent: 89.6,
        components: {
          writtenWorkPercent: 85,
          performanceTaskPercent: 93,
          quarterlyExamPercent: 88,
        },
      });
      expect(result.history.finished).toHaveLength(1);
      expect(result.history.late).toHaveLength(1);
      expect(result.history.pending).toHaveLength(1);
      expect(result.history.late[0]).toEqual(
        expect.objectContaining({
          assessmentId: 'a-late',
          status: 'late',
          isLate: true,
        }),
      );
      expect(result.history.pending[0]).toEqual(
        expect.objectContaining({
          assessmentId: 'a-pending',
          status: 'not_started',
        }),
      );
    });

    it('throws ForbiddenException when non-owner teacher requests overview', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());

      await expect(
        service.getStudentOverviewForClass(
          CLASS_ID,
          STUDENT_ID,
          'teacher-uuid-2',
          ['teacher'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when student is not enrolled in class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findFirst.mockResolvedValue(null);

      await expect(
        service.getStudentOverviewForClass(
          CLASS_ID,
          STUDENT_ID,
          TEACHER_ID,
          ['teacher'],
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('falls back to the latest record that has computable standing data', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enroll-1' });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: STUDENT_ID,
        firstName: 'Jamie',
        middleName: null,
        lastName: 'Cruz',
        email: 'jcruz@nexora.edu',
        status: 'ACTIVE',
        profile: null,
      });
      mockDb.query.sections.findFirst.mockResolvedValue({
        id: SECTION_ID,
        name: 'Rizal',
        gradeLevel: '10',
        schoolYear: SCHOOL_YEAR,
        roomNumber: null,
        adviser: null,
      });
      mockDb.query.classRecords.findMany.mockResolvedValue([
        {
          id: 'record-empty',
          gradingPeriod: 'q2',
          updatedAt: new Date('2026-04-01'),
          createdAt: new Date('2026-03-01'),
        },
        {
          id: 'record-computable',
          gradingPeriod: 'q1',
          updatedAt: new Date('2026-03-01'),
          createdAt: new Date('2026-02-01'),
        },
      ]);
      mockDb.query.classRecordCategories.findMany
        .mockResolvedValueOnce([
          { id: 'cat-empty', name: 'Written Works', weightPercentage: '30' },
        ])
        .mockResolvedValueOnce([
          { id: 'cat-ww', name: 'Written Works', weightPercentage: '100' },
        ]);
      mockDb.query.classRecordItems.findMany
        .mockResolvedValueOnce([
          { id: 'item-empty', categoryId: 'cat-empty', maxScore: '0' },
        ])
        .mockResolvedValueOnce([
          { id: 'item-ww', categoryId: 'cat-ww', maxScore: '100' },
        ]);
      mockDb.query.classRecordScores.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { classRecordItemId: 'item-ww', score: '92' },
        ]);
      mockDb.query.classRecordFinalGrades.findFirst.mockResolvedValue(null);
      mockDb.query.assessments.findMany.mockResolvedValue([]);

      const result = await service.getStudentOverviewForClass(
        CLASS_ID,
        STUDENT_ID,
        TEACHER_ID,
        ['teacher'],
      );

      expect(result.standing.gradingPeriod).toBe('q1');
      expect(result.standing.overallGradePercent).toBe(92);
    });
  });

  // =========================================================================
  // student preferences
  // =========================================================================

  describe('student presentation preferences', () => {
    it('returns enrolled-class presentation preferences for the requested student', async () => {
      mockDb.query.enrollments.findMany.mockResolvedValue([
        { classId: 'class-1' },
        { classId: 'class-2' },
      ]);
      mockDb.query.studentClassPresentationPreferences.findMany.mockResolvedValue(
        [
          {
            classId: 'class-1',
            styleMode: 'gradient',
            styleToken: 'gradient-blue',
            updatedAt: new Date('2026-03-30'),
          },
        ],
      );

      const result = await service.getStudentClassPresentationPreferences(
        STUDENT_ID,
        STUDENT_ID,
        ['student'],
      );

      expect(result).toEqual([
        expect.objectContaining({
          classId: 'class-1',
          styleMode: 'gradient',
          styleToken: 'gradient-blue',
        }),
      ]);
    });

    it('rejects student preference writes when requester is not a student', async () => {
      await expect(
        service.updateStudentClassPresentationPreference(
          CLASS_ID,
          'teacher-uuid',
          ['teacher'],
          { styleMode: 'gradient', styleToken: 'gradient-blue' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('upserts student preference when requester is enrolled', async () => {
      mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enroll-1' });
      mockDb.query.studentClassPresentationPreferences.findFirst.mockResolvedValue(
        null,
      );
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: 'pref-1' }]));

      const result = await service.updateStudentClassPresentationPreference(
        CLASS_ID,
        STUDENT_ID,
        ['student'],
        { styleMode: 'solid', styleToken: 'solid-blue' },
      );

      expect(result).toEqual({
        classId: CLASS_ID,
        styleMode: 'solid',
        styleToken: 'solid-blue',
      });
    });
  });

  describe('student course view preference', () => {
    it('returns card as the default view mode when no row exists', async () => {
      mockDb.query.studentCourseViewPreferences.findFirst.mockResolvedValue(null);

      const result = await service.getStudentCourseViewPreference(
        STUDENT_ID,
        STUDENT_ID,
        ['student'],
      );

      expect(result).toEqual({ viewMode: 'card' });
    });

    it('stores student course view preference with upsert semantics', async () => {
      mockDb.query.studentCourseViewPreferences.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue(makeInsertChain([{ id: 'view-pref-1' }]));

      const result = await service.setStudentCourseViewPreference(
        STUDENT_ID,
        STUDENT_ID,
        ['student'],
        'wide',
      );

      expect(result).toEqual({ viewMode: 'wide' });
    });
  });

  // =========================================================================
  // toggleActive
  // =========================================================================

  describe('toggleActive', () => {
    it('toggles isActive from true to false', async () => {
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(makeClass({ isActive: true }))
        .mockResolvedValueOnce(makeClass({ isActive: false }));
      mockDb.update.mockReturnValue(makeUpdateChain());

      const result = await service.toggleActive(CLASS_ID);

      expect(result.isActive).toBe(false);
      expect(
        mockDb.update.mock.results[0].value.set.mock.calls[0][0].isActive,
      ).toBe(false);
    });

    it('toggles isActive from false to true', async () => {
      mockDb.query.classes.findFirst
        .mockResolvedValueOnce(makeClass({ isActive: false }))
        .mockResolvedValueOnce(makeClass({ isActive: true }));
      mockDb.update.mockReturnValue(makeUpdateChain());

      const result = await service.toggleActive(CLASS_ID);

      expect(result.isActive).toBe(true);
    });
  });
});
