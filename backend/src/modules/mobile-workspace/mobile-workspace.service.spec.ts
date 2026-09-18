import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MobileWorkspaceService } from './mobile-workspace.service';

describe('MobileWorkspaceService bounded read models', () => {
  let execute: jest.Mock;
  let service: MobileWorkspaceService;

  beforeEach(() => {
    execute = jest.fn();
    service = new MobileWorkspaceService({
      db: { execute },
    } as unknown as DatabaseService);
  });

  it('builds the student course overview in one query regardless of class count', async () => {
    execute.mockResolvedValue({
      rows: [
        {
          id: 'class-1',
          subject_name: 'Mathematics',
          subject_code: 'MATH-7',
          section_name: 'Bonifacio',
          teacher_first_name: 'Ada',
          teacher_last_name: 'Lovelace',
          school_year: '2026-2027',
          total_lessons: '12',
          completed_lesson_count: '5',
          total_assessments: '4',
          classmate_count: '39',
        },
      ],
    });

    const result = await service.getStudentOverview('student-1');

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.courses[0]).toEqual(
      expect.objectContaining({
        id: 'class-1',
        totalLessons: 12,
        completedLessonCount: 5,
        totalAssessments: 4,
        classmateCount: 39,
        progress: 42,
      }),
    );
    expect(result.requestBudget).toEqual({ clientRequests: 1, dbQueries: 1 });
  });

  it('keeps teacher overview query count fixed at four', async () => {
    execute
      .mockResolvedValueOnce({ rows: [{ id: 'class-1', schedules: [] }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ class_id: 'class-1', count: '2' }] });

    const result = await service.getTeacherOverview('teacher-1');

    expect(execute).toHaveBeenCalledTimes(4);
    expect(result.atRiskCounts).toEqual({ 'class-1': 2 });
    expect(result.requestBudget).toEqual({ clientRequests: 1, dbQueries: 4 });
    expect(result.schemaVersion).toBe(1);
    expect(result.sections).toEqual({
      classes: 'ok',
      assessments: 'ok',
      announcements: 'ok',
      atRiskCounts: 'ok',
    });
  });

  it('keeps 100 teacher classes inside the same four-query budget', async () => {
    const classes = Array.from({ length: 100 }, (_, index) => ({
      id: `class-${index + 1}`,
      section_id: `section-${index + 1}`,
      is_active: true,
      subject_name: `Subject ${index + 1}`,
      subject_code: `SUB-${index + 1}`,
      school_year: '2026-2027',
      section_name: `Section ${index + 1}`,
      section_grade_level: '7',
      enrollment_count: '40',
      schedules: [],
    }));
    execute
      .mockResolvedValueOnce({ rows: classes })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.getTeacherOverview('teacher-high-load');

    expect(execute).toHaveBeenCalledTimes(4);
    expect(result.classes).toHaveLength(100);
    expect(result.requestBudget).toEqual({ clientRequests: 1, dbQueries: 4 });
  });

  it('keeps required teacher classes when an optional section fails', async () => {
    execute
      .mockResolvedValueOnce({
        rows: [{ id: 'class-1', section_id: 'section-1', schedules: [] }],
      })
      .mockRejectedValueOnce(new Error('assessment query failed'))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.getTeacherOverview('teacher-1');

    expect(result.classes).toHaveLength(1);
    expect(result.assessments).toEqual([]);
    expect(result.sections.assessments).toBe('unavailable');
    expect(result.sections.classes).toBe('ok');
  });

  it('returns a bounded teacher library index in one query', async () => {
    execute.mockResolvedValue({
      rows: Array.from({ length: 100 }, (_, index) => ({
        id: `module-${index + 1}`,
        class_id: `class-${index + 1}`,
        title: `Module ${index + 1}`,
        description: null,
        order: index,
        is_visible: true,
        is_locked: false,
        subject_code: `SUB-${index + 1}`,
        subject_name: `Subject ${index + 1}`,
        section_count: '2',
        lesson_count: '5',
      })),
    });

    const result = await service.getTeacherLibraryIndex('teacher-1');

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.modules).toHaveLength(100);
    expect(result.modules[0]).toEqual(
      expect.objectContaining({
        id: 'module-1',
        classLabel: 'SUB-1 | Subject 1',
        sectionCount: 2,
        lessonCount: 5,
      }),
    );
    expect(result.requestBudget).toEqual({ clientRequests: 1, dbQueries: 1 });
  });

  it('marks an optional calendar section unavailable instead of returning a false empty success', async () => {
    execute
      .mockResolvedValueOnce({ rows: [{ id: 'class-1', schedules: [] }] })
      .mockResolvedValueOnce({ rows: [{ id: 'assessment-1' }] })
      .mockRejectedValueOnce(new Error('announcement query failed'))
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.getCalendar('student-1', 'student', {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-15T23:59:59.999Z',
    });

    expect(execute).toHaveBeenCalledTimes(4);
    expect(result.sections.announcements).toBe('unavailable');
    expect(result.announcements).toEqual([]);
    expect(result.sections.assessments).toBe('ok');
    expect(result.assessments).toEqual([
      expect.objectContaining({ id: 'assessment-1' }),
    ]);
    expect(result.schemaVersion).toBe(1);
  });

  it('rejects unbounded calendar ranges', async () => {
    await expect(
      service.getCalendar('student-1', 'student', {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('exposes the server-controlled offline snapshot kill switch', async () => {
    const previous = process.env.MOBILE_OFFLINE_SNAPSHOTS_ENABLED;
    process.env.MOBILE_OFFLINE_SNAPSHOTS_ENABLED = 'false';
    execute.mockResolvedValue({ rows: [] });

    try {
      await expect(service.getStudentOverview('student-1')).resolves.toEqual(
        expect.objectContaining({ offlineSnapshotReadsEnabled: false }),
      );
    } finally {
      if (previous === undefined) {
        delete process.env.MOBILE_OFFLINE_SNAPSHOTS_ENABLED;
      } else {
        process.env.MOBILE_OFFLINE_SNAPSHOTS_ENABLED = previous;
      }
    }
  });
});
