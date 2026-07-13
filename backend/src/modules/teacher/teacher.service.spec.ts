import { TeacherService } from './teacher.service';

describe('TeacherService', () => {
  it('loads lessons only for classes owned by the teacher facade', async () => {
    const lessonsService = {
      getLessonsByClassIds: jest.fn().mockResolvedValue([{ id: 'lesson-1' }]),
    };
    const assessmentsService = { getAssessmentsByTeacher: jest.fn() };
    const classesService = {
      getClassesByTeacher: jest
        .fn()
        .mockResolvedValue([{ id: 'class-1' }, { id: 'class-2' }]),
    };
    const service = new TeacherService(
      lessonsService as never,
      assessmentsService as never,
      classesService as never,
    );

    await expect(
      service.getTeacherLessons('teacher-1', ['teacher']),
    ).resolves.toEqual([{ id: 'lesson-1' }]);
    expect(classesService.getClassesByTeacher).toHaveBeenCalledWith(
      'teacher-1',
      'teacher-1',
      ['teacher'],
    );
    expect(lessonsService.getLessonsByClassIds).toHaveBeenCalledWith([
      'class-1',
      'class-2',
    ]);
  });

  it('delegates teacher assessment reads without broadening scope', async () => {
    const assessmentsService = {
      getAssessmentsByTeacher: jest.fn().mockResolvedValue([]),
    };
    const service = new TeacherService(
      {} as never,
      assessmentsService as never,
      {} as never,
    );

    await service.getTeacherAssessments('teacher-1');
    expect(assessmentsService.getAssessmentsByTeacher).toHaveBeenCalledWith(
      'teacher-1',
    );
  });
});
