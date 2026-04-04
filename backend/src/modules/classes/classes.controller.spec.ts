import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

const mockClassesService = {
  create: jest.fn(),
  update: jest.fn(),
  purge: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  getStudentClassPresentationPreferences: jest.fn(),
  updateStudentClassPresentationPreference: jest.fn(),
  getStudentCourseViewPreference: jest.fn(),
  setStudentCourseViewPreference: jest.fn(),
  getStudentsMasterlistForClass: jest.fn(),
  bulkLifecycleAction: jest.fn(),
  toggleActive: jest.fn(),
  getStudentOverviewForClass: jest.fn(),
};

describe('ClassesController', () => {
  let controller: ClassesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [{ provide: ClassesService, useValue: mockClassesService }],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
  });

  describe('getAllClasses', () => {
    it('parses valid page and limit query params', async () => {
      mockClassesService.findAll.mockResolvedValue([]);

      await controller.getAllClasses(
        'MATH-7',
        'section-1',
        'teacher-1',
        '2026-2027',
        'true',
        'math',
        '2',
        '10',
      );

      expect(mockClassesService.findAll).toHaveBeenCalledWith({
        subjectCode: 'MATH-7',
        sectionId: 'section-1',
        teacherId: 'teacher-1',
        schoolYear: '2026-2027',
        isActive: true,
        search: 'math',
        page: 2,
        limit: 10,
      });
    });

    it('throws BadRequestException for invalid pagination query params', async () => {
      await expect(
        controller.getAllClasses(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          '0',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.getAllClasses(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'abc',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStudentsMasterlistForClass', () => {
    it('throws BadRequestException for invalid page or limit', async () => {
      await expect(
        controller.getStudentsMasterlistForClass(
          'class-1',
          { userId: 'teacher-1', roles: ['teacher'] },
          undefined,
          undefined,
          undefined,
          '-1',
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.getStudentsMasterlistForClass(
          'class-1',
          { userId: 'teacher-1', roles: ['teacher'] },
          undefined,
          undefined,
          undefined,
          undefined,
          'foo',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('student preferences endpoints', () => {
    it('returns student class presentation preferences with success envelope', async () => {
      mockClassesService.getStudentClassPresentationPreferences.mockResolvedValue(
        [
          {
            classId: 'class-1',
            styleMode: 'gradient',
            styleToken: 'gradient-blue',
          },
        ],
      );

      const result = await controller.getStudentClassPresentationPreferences(
        'student-1',
        { userId: 'student-1', roles: ['student'] },
      );

      expect(
        mockClassesService.getStudentClassPresentationPreferences,
      ).toHaveBeenCalledWith('student-1', 'student-1', ['student']);
      expect(result).toEqual({
        success: true,
        message: 'Student class presentation preferences retrieved successfully',
        data: [
          {
            classId: 'class-1',
            styleMode: 'gradient',
            styleToken: 'gradient-blue',
          },
        ],
      });
    });

    it('updates student course view preference with success envelope', async () => {
      mockClassesService.setStudentCourseViewPreference.mockResolvedValue({
        viewMode: 'wide',
      });

      const result = await controller.setStudentCourseViewPreference(
        'student-1',
        { viewMode: 'wide' },
        { userId: 'student-1', roles: ['student'] },
      );

      expect(mockClassesService.setStudentCourseViewPreference).toHaveBeenCalledWith(
        'student-1',
        'student-1',
        ['student'],
        'wide',
      );
      expect(result).toEqual({
        success: true,
        message: 'Student course view preference updated successfully',
        data: { viewMode: 'wide' },
      });
    });
  });

  describe('bulkLifecycle', () => {
    it('returns the response envelope with class bulk summary data', async () => {
      mockClassesService.bulkLifecycleAction.mockResolvedValue({
        message: '1 class restored; 1 failed.',
        data: {
          action: 'restore',
          requested: 2,
          succeeded: ['class-1'],
          failed: [{ classId: 'class-2', reason: 'Class is already active.' }],
        },
      });

      const result = await controller.bulkLifecycle(
        {
          action: 'restore',
          classIds: ['class-1', 'class-2'],
        },
        { userId: 'admin-1', roles: ['admin'] },
      );

      expect(mockClassesService.bulkLifecycleAction).toHaveBeenCalledWith({
        action: 'restore',
        classIds: ['class-1', 'class-2'],
      },
      'admin-1',
      ['admin']);
      expect(result).toEqual({
        success: true,
        message: '1 class restored; 1 failed.',
        data: {
          action: 'restore',
          requested: 2,
          succeeded: ['class-1'],
          failed: [{ classId: 'class-2', reason: 'Class is already active.' }],
        },
      });
    });
  });

  describe('createClass', () => {
    it('forwards actor context and returns success envelope', async () => {
      const payload = {
        subjectName: 'Math',
        subjectCode: 'MATH-7',
        sectionId: 'section-1',
        teacherId: 'teacher-1',
        schoolYear: '2026-2027',
      };
      mockClassesService.create.mockResolvedValue({
        id: 'class-1',
        ...payload,
      });

      const result = await controller.createClass(payload as any, {
        userId: 'admin-1',
        roles: ['admin'],
      });

      expect(mockClassesService.create).toHaveBeenCalledWith(
        payload,
        'admin-1',
        ['admin'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Class created successfully',
        data: {
          id: 'class-1',
          ...payload,
        },
      });
    });
  });

  describe('updateClass', () => {
    it('forwards actor context and returns success envelope', async () => {
      const payload = {
        room: 'Lab 2',
      };
      mockClassesService.update.mockResolvedValue({
        id: 'class-1',
        room: 'Lab 2',
      });

      const result = await controller.updateClass(
        'class-1',
        payload as any,
        { userId: 'admin-1', roles: ['admin'] },
      );

      expect(mockClassesService.update).toHaveBeenCalledWith(
        'class-1',
        payload,
        'admin-1',
        ['admin'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Class updated successfully',
        data: {
          id: 'class-1',
          room: 'Lab 2',
        },
      });
    });
  });

  describe('purgeClass', () => {
    it('forwards actor context and returns success envelope', async () => {
      mockClassesService.purge.mockResolvedValue(undefined);

      const result = await controller.purgeClass('class-1', {
        userId: 'admin-1',
        roles: ['admin'],
      });

      expect(mockClassesService.purge).toHaveBeenCalledWith(
        'class-1',
        'admin-1',
        ['admin'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Class permanently deleted',
      });
    });
  });

  describe('deleteClass', () => {
    it('forwards actor context for hard delete operation', async () => {
      mockClassesService.delete.mockResolvedValue(undefined);

      await controller.deleteClass('class-1', {
        userId: 'admin-1',
        roles: ['admin'],
      });

      expect(mockClassesService.delete).toHaveBeenCalledWith(
        'class-1',
        'admin-1',
        ['admin'],
      );
    });
  });

  describe('getStudentOverviewForClass', () => {
    it('returns the standard success envelope for overview payload', async () => {
      mockClassesService.getStudentOverviewForClass.mockResolvedValue({
        classInfo: {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-10',
          sectionLabel: 'Grade 10 - Rizal',
        },
        student: {
          id: 'student-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          email: 'jcruz@nexora.edu',
          status: 'ACTIVE',
          profile: null,
        },
        section: null,
        standing: {
          gradingPeriod: 'q1',
          overallGradePercent: 90.5,
          components: {
            writtenWorkPercent: 85,
            performanceTaskPercent: 93,
            quarterlyExamPercent: 88,
          },
        },
        history: {
          finished: [],
          late: [],
          pending: [],
        },
      });

      const result = await controller.getStudentOverviewForClass(
        'class-1',
        'student-1',
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(mockClassesService.getStudentOverviewForClass).toHaveBeenCalledWith(
        'class-1',
        'student-1',
        'teacher-1',
        ['teacher'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Student overview retrieved successfully',
        data: expect.objectContaining({
          classInfo: expect.any(Object),
          student: expect.any(Object),
          standing: expect.any(Object),
          history: expect.any(Object),
        }),
      });
    });
  });

  describe('toggleClassStatus', () => {
    it('forwards actor context and returns success envelope', async () => {
      mockClassesService.toggleActive.mockResolvedValue({
        id: 'class-1',
        isActive: false,
      });

      const result = await controller.toggleClassStatus('class-1', {
        userId: 'admin-1',
        roles: ['admin'],
      });

      expect(mockClassesService.toggleActive).toHaveBeenCalledWith(
        'class-1',
        'admin-1',
        ['admin'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Class status toggled successfully',
        data: {
          id: 'class-1',
          isActive: false,
        },
      });
    });
  });
});
