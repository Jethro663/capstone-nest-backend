import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { DatabaseService } from '../../database/database.service';

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
      classSchedules: { findFirst: jest.fn(), findMany: jest.fn() },
      sections: { findFirst: jest.fn() },
      users: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
      lessons: { findMany: jest.fn() },
      assessments: { findMany: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  };

  const mockDatabaseService = { db: mockDb };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
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

      expect(result).toEqual(classList);
    });

    it("allows an admin to view any teacher's classes", async () => {
      const classList = [makeClass()];
      mockDb.query.classes.findMany.mockResolvedValue(classList);

      const result = await service.getClassesByTeacher(
        TEACHER_ID,
        'admin-uuid',
        ['admin'],
      );

      expect(result).toEqual(classList);
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

      await service.enrollStudent(CLASS_ID, STUDENT_ID);

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

      await service.enrollStudent(CLASS_ID, STUDENT_ID);

      expect(txMock.insert).toHaveBeenCalledTimes(1);
      expect(txMock.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the student does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollStudent(CLASS_ID, 'nonexistent-student'),
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

      await expect(service.enrollStudent(CLASS_ID, STUDENT_ID)).rejects.toThrow(
        ConflictException,
      );
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

      await expect(service.enrollStudent(CLASS_ID, STUDENT_ID)).rejects.toThrow(
        BadRequestException,
      );
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

      await service.removeStudent(CLASS_ID, STUDENT_ID);

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

      await service.removeStudent(CLASS_ID, STUDENT_ID);

      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the student is not enrolled in the class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.enrollments.findFirst.mockResolvedValue(null);

      await expect(service.removeStudent(CLASS_ID, STUDENT_ID)).rejects.toThrow(
        NotFoundException,
      );

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
