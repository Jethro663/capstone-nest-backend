import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

const mockClassesService = {
  findAll: jest.fn(),
  getStudentsMasterlistForClass: jest.fn(),
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
});
