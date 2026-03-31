import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

const mockClassesService = {
  findAll: jest.fn(),
  getStudentClassPresentationPreferences: jest.fn(),
  updateStudentClassPresentationPreference: jest.fn(),
  getStudentCourseViewPreference: jest.fn(),
  setStudentCourseViewPreference: jest.fn(),
  getStudentsMasterlistForClass: jest.fn(),
  bulkLifecycleAction: jest.fn(),
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

      const result = await controller.bulkLifecycle({
        action: 'restore',
        classIds: ['class-1', 'class-2'],
      });

      expect(mockClassesService.bulkLifecycleAction).toHaveBeenCalledWith({
        action: 'restore',
        classIds: ['class-1', 'class-2'],
      });
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
});
