import { AcademicStateService } from './academic-state.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import {
  assessmentQuestions,
  assessments,
  classModules,
  lessons,
  moduleSections,
} from '../../drizzle/schema';

function buildLearningAssetDatabase(size: number) {
  const sourceAssessments = Array.from({ length: size }, (_, index) => ({
    id: `assessment-${index}`,
    classId: 'class-source',
    title: `Assessment ${index}`,
  }));
  const sourceQuestions = sourceAssessments.flatMap((assessment) =>
    Array.from({ length: 2 }, (_, index) => ({
      id: `${assessment.id}-question-${index}`,
      assessmentId: assessment.id,
      order: index,
    })),
  );
  const sourceOptions = sourceQuestions.flatMap((question) =>
    Array.from({ length: 2 }, (_, index) => ({
      id: `${question.id}-option-${index}`,
      questionId: question.id,
      text: `Option ${index}`,
      order: index,
    })),
  );
  const sourceLessons = Array.from({ length: size }, (_, index) => ({
    id: `lesson-${index}`,
    classId: 'class-source',
    title: `Lesson ${index}`,
    order: index,
  }));
  const sourceBlocks = sourceLessons.flatMap((lesson) =>
    Array.from({ length: 2 }, (_, index) => ({
      id: `${lesson.id}-block-${index}`,
      lessonId: lesson.id,
      type: 'text',
      order: index,
      content: `Block ${index}`,
    })),
  );
  const sourceModules = Array.from({ length: size }, (_, index) => ({
    id: `module-${index}`,
    classId: 'class-source',
    title: `Module ${index}`,
    order: index,
  }));
  const sourceModuleSections = sourceModules.flatMap((module) =>
    Array.from({ length: 2 }, (_, index) => ({
      id: `${module.id}-section-${index}`,
      moduleId: module.id,
      title: `Section ${index}`,
      order: index,
    })),
  );
  const sourceScaleEntries = sourceModules.map((module) => ({
    id: `${module.id}-scale`,
    moduleId: module.id,
    letter: 'P',
    order: 1,
  }));
  const sourceModuleItems = sourceModuleSections.map((section, index) => ({
    id: `${section.id}-item`,
    moduleSectionId: section.id,
    itemType: 'lesson',
    lessonId: `lesson-${Math.floor(index / 2)}`,
    assessmentId: null,
    order: index % 2,
  }));

  const insertCalls: Array<{ table: unknown; values: unknown }> = [];
  const idCounters = new Map<unknown, number>();
  const database = {
    query: {
      assessments: { findMany: jest.fn().mockResolvedValue(sourceAssessments) },
      assessmentQuestions: {
        findMany: jest.fn().mockResolvedValue(sourceQuestions),
      },
      assessmentQuestionOptions: {
        findMany: jest.fn().mockResolvedValue(sourceOptions),
      },
      lessons: { findMany: jest.fn().mockResolvedValue(sourceLessons) },
      lessonContentBlocks: {
        findMany: jest.fn().mockResolvedValue(sourceBlocks),
      },
      classModules: { findMany: jest.fn().mockResolvedValue(sourceModules) },
      moduleSections: {
        findMany: jest.fn().mockResolvedValue(sourceModuleSections),
      },
      moduleGradingScaleEntries: {
        findMany: jest.fn().mockResolvedValue(sourceScaleEntries),
      },
      moduleItems: { findMany: jest.fn().mockResolvedValue(sourceModuleItems) },
    },
    insert: jest.fn((table: unknown) => ({
      values: jest.fn((values: unknown) => {
        insertCalls.push({ table, values });
        return {
          returning: jest.fn(() => {
            const next = idCounters.get(table) ?? 0;
            idCounters.set(table, next + 1);
            const prefix =
              table === assessments
                ? 'assessment'
                : table === assessmentQuestions
                  ? 'question'
                  : table === lessons
                    ? 'lesson'
                    : table === classModules
                      ? 'module'
                      : table === moduleSections
                        ? 'section'
                        : 'row';
            return Promise.resolve([{ id: `new-${prefix}-${next}` }]);
          }),
        };
      }),
    })),
  };

  return { database, insertCalls };
}

describe('AcademicStateService rollover characterization', () => {
  it.each([
    {
      name: 'promotes when every subject is at least 75',
      sourceGradeLevel: '8' as const,
      subjectFinalGrades: [
        [75, 75],
        [90, 82],
      ],
      expected: { outcome: 'promoted', targetGradeLevel: '9' },
    },
    {
      name: 'retains when one subject final grade is below 75',
      sourceGradeLevel: '8' as const,
      subjectFinalGrades: [
        [95, 91],
        [74, 74],
      ],
      expected: { outcome: 'retained', targetGradeLevel: '8' },
    },
    {
      name: 'graduates a passing Grade 10 student',
      sourceGradeLevel: '10' as const,
      subjectFinalGrades: [[75], [88], [93]],
      expected: { outcome: 'graduated', targetGradeLevel: null },
    },
  ])('$name', ({ sourceGradeLevel, subjectFinalGrades, expected }) => {
    const service = new AcademicStateService(
      { db: {} } as DatabaseService,
      { log: jest.fn() } as unknown as AuditService,
      {} as never,
      {} as never,
    );

    const result = (
      service as unknown as {
        classifyStudentOutcome: (input: {
          studentId: string;
          sourceGradeLevel: '7' | '8' | '9' | '10';
          subjectFinalGrades: number[][];
        }) => { outcome: string; targetGradeLevel: string | null };
      }
    ).classifyStudentOutcome({
      studentId: 'student-1',
      sourceGradeLevel,
      subjectFinalGrades,
    });

    expect(result).toMatchObject(expected);
  });

  it('notifies teachers for finalized and pending active classes', async () => {
    const activeClassRows = [
      {
        classId: 'class-finalized',
        subjectName: 'Mathematics',
        teacherId: 'teacher-1',
        sectionId: 'section-1',
        sectionName: 'Rizal',
        sectionGradeLevel: '8',
        classRecordId: 'record-1',
        classRecordStatus: 'finalized',
      },
      {
        classId: 'class-pending',
        subjectName: 'Science',
        teacherId: 'teacher-2',
        sectionId: 'section-1',
        sectionName: 'Rizal',
        sectionGradeLevel: '8',
        classRecordId: 'record-2',
        classRecordStatus: 'draft',
      },
    ];
    const where = jest.fn().mockResolvedValue(activeClassRows);
    const database = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            leftJoin: jest.fn(() => ({ where })),
          })),
        })),
      })),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const notificationsService = {
      createBulk: jest.fn().mockResolvedValue(undefined),
    };
    const notificationsGateway = { emitToUser: jest.fn() };
    const service = new AcademicStateService(
      { db: database } as unknown as DatabaseService,
      auditService as unknown as AuditService,
      notificationsService as never,
      notificationsGateway as never,
    );
    jest
      .spyOn(service as never, 'ensureCurrentState' as never)
      .mockResolvedValue({ schoolYear: '2025-2026' } as never);

    const result = await service.notifyUnfinalizedTeachers('admin-1');

    expect(notificationsService.createBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'teacher-1',
        body: expect.stringContaining('are finalized'),
        metadata: expect.objectContaining({ allRecordsFinalized: true }),
      }),
      expect.objectContaining({
        userId: 'teacher-2',
        body: expect.stringContaining('complete and finalize'),
        metadata: expect.objectContaining({ allRecordsFinalized: false }),
      }),
    ]);
    expect(result).toMatchObject({
      notifiedClassesCount: 2,
      notifiedTeachersCount: 2,
    });
    expect(notificationsGateway.emitToUser).toHaveBeenCalledTimes(2);
  });

  it.each([1, 4, 12])(
    'clones exact nested asset counts for graph size %i',
    async (size) => {
      const { database, insertCalls } = buildLearningAssetDatabase(size);
      const service = new AcademicStateService(
        { db: database } as unknown as DatabaseService,
        { log: jest.fn() } as unknown as AuditService,
      );
      const startedAt = performance.now();

      const counts = await (
        service as unknown as {
          cloneClassLearningAssets: (
            db: unknown,
            classIds: Map<string, string>,
            now: Date,
          ) => Promise<Record<string, number>>;
        }
      ).cloneClassLearningAssets(
        database,
        new Map([['class-source', 'class-target']]),
        new Date('2026-07-13T00:00:00Z'),
      );

      expect(counts).toEqual({
        assessmentsCreated: size,
        assessmentQuestionsCreated: size * 2,
        lessonsCreated: size,
        lessonBlocksCreated: size * 2,
        modulesCreated: size,
        moduleSectionsCreated: size * 2,
        moduleItemsCreated: size * 2,
        moduleGradingScaleEntriesCreated: size,
      });
      expect(database.query.assessments.findMany).toHaveBeenCalledTimes(1);
      expect(database.query.moduleItems.findMany).toHaveBeenCalledTimes(1);
      // Parent IDs make assessment/question and module/section writes serial;
      // existing child rows are already inserted in batches.
      expect(insertCalls.length).toBe(size * 11 + 1);
      expect(performance.now() - startedAt).toBeGreaterThanOrEqual(0);
    },
  );

  it('propagates a transactional write failure without auditing completion', async () => {
    const auditService = { log: jest.fn() };
    let rolledBack = false;
    const transaction = jest.fn(
      async (work: (tx: unknown) => Promise<void>) => {
        try {
          await work({
            query: { sections: { findMany: jest.fn().mockResolvedValue([]) } },
            select: jest.fn(() => ({
              from: jest.fn(() => ({
                where: jest.fn().mockResolvedValue([]),
              })),
            })),
            insert: jest.fn(() => ({
              values: jest.fn(() => ({
                onConflictDoUpdate: jest
                  .fn()
                  .mockRejectedValue(new Error('state write failed')),
              })),
            })),
          });
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      },
    );
    const service = new AcademicStateService(
      { db: { transaction } } as unknown as DatabaseService,
      auditService as unknown as AuditService,
    );
    jest
      .spyOn(service as never, 'verifyAdminPassword' as never)
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(service as never, 'ensureCurrentState' as never)
      .mockResolvedValue({
        schoolYear: '2025-2026',
        quarter: 'Q4',
      } as never);
    jest
      .spyOn(service as never, 'getTransitionTargets' as never)
      .mockResolvedValue({
        classRecordIdsToFinalize: [],
        schoolEventIdsToArchive: [],
        classIdsToArchive: [],
        sectionIdsToArchive: [],
        enrollmentIdsToComplete: [],
        sectionsToClone: [],
        classesToClone: [],
        promotionReadiness: { transitionBlocked: false },
      } as never);

    await expect(
      service.transition(
        {
          schoolYear: '2026-2027',
          currentPassword: 'secret',
          confirmationText: AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
        },
        'admin-1',
      ),
    ).rejects.toThrow('state write failed');

    expect(rolledBack).toBe(true);
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
