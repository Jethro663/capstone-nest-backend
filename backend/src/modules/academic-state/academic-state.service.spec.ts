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
  it.each([1, 4, 12])(
    'clones exact nested asset counts for graph size %i',
    async (size) => {
      const { database, insertCalls } = buildLearningAssetDatabase(size);
      const service = new AcademicStateService(
        { db: database } as unknown as DatabaseService,
        { log: jest.fn() } as unknown as AuditService,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      const startedAt = performance.now();

      const counts = await (
        service as unknown as {
          cloneClassLearningAssets: (
            db: unknown,
            classIds: Map<string, string>,
            now: Date,
            mapping: Record<string, string>,
            periods: string[],
          ) => Promise<Record<string, number>>;
        }
      ).cloneClassLearningAssets(
        database,
        new Map([['class-source', 'class-target']]),
        new Date('2026-07-13T00:00:00Z'),
        { unassigned: 'Q1', Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q3' },
        ['Q1', 'Q2', 'Q3'],
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
});
