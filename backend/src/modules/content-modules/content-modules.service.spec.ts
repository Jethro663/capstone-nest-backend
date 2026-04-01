import { Test, TestingModule } from '@nestjs/testing';
import { ContentModulesService } from './content-modules.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ModuleItemType } from './DTO/module.dto';
import { RoleName } from '../auth/decorators/roles.decorator';

const CLASS_ID = '00000000-0000-0000-0000-000000000101';
const MODULE_ID = '00000000-0000-0000-0000-000000000102';
const SECTION_ID = '00000000-0000-0000-0000-000000000103';
const STUDENT_ID = '00000000-0000-0000-0000-000000000104';
const TEACHER_ID = '00000000-0000-0000-0000-000000000105';
const ITEM_ID = '00000000-0000-0000-0000-000000000106';
const LESSON_ID = '00000000-0000-0000-0000-000000000107';
const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000108';

function buildMockDb() {
  const db: any = {
    query: {
      classes: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn() },
      classModules: { findMany: jest.fn() },
      uploadedFiles: { findMany: jest.fn(), findFirst: jest.fn() },
      lessonCompletions: { findMany: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
      moduleSections: { findFirst: jest.fn() },
      moduleItems: { findFirst: jest.fn() },
      lessons: { findFirst: jest.fn() },
      assessments: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
  };
  return db;
}

function mockSelectWhere(db: any, rows: any[]) {
  const where = jest.fn().mockResolvedValue(rows);
  const from = jest.fn().mockReturnValue({ where });
  db.select.mockReturnValueOnce({ from });
}

describe('ContentModulesService', () => {
  let service: ContentModulesService;
  let db: ReturnType<typeof buildMockDb>;

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    db = buildMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentModulesService,
        {
          provide: DatabaseService,
          useValue: { db },
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ContentModulesService>(ContentModulesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('filters hidden modules, omits locked content, and computes student required progress from visible required items only', async () => {
    db.query.classes.findFirst.mockResolvedValue({ id: CLASS_ID, teacherId: TEACHER_ID });
    db.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    db.query.classModules.findMany.mockResolvedValue([
      {
        id: MODULE_ID,
        classId: CLASS_ID,
        title: 'Visible module',
        description: null,
        order: 1,
        isVisible: true,
        isLocked: false,
        sections: [
          {
            id: SECTION_ID,
            moduleId: MODULE_ID,
            title: 'Section 1',
            order: 1,
            items: [
              {
                id: 'item-lesson-visible-required',
                moduleSectionId: SECTION_ID,
                itemType: ModuleItemType.Lesson,
                lessonId: LESSON_ID,
                assessmentId: null,
                fileId: null,
                isVisible: true,
                isRequired: true,
                isGiven: true,
                metadata: { points: 15 },
                lesson: { id: LESSON_ID, isDraft: false },
                assessment: null,
              },
              {
                id: 'item-lesson-hidden-required',
                moduleSectionId: SECTION_ID,
                itemType: ModuleItemType.Lesson,
                lessonId: 'lesson-hidden',
                assessmentId: null,
                fileId: null,
                isVisible: false,
                isRequired: true,
                isGiven: true,
                metadata: null,
                lesson: { id: 'lesson-hidden', isDraft: false },
                assessment: null,
              },
              {
                id: 'item-assessment-ungiven-required',
                moduleSectionId: SECTION_ID,
                itemType: ModuleItemType.Assessment,
                lessonId: null,
                assessmentId: 'assessment-ungiven',
                fileId: null,
                isVisible: true,
                isRequired: true,
                isGiven: false,
                metadata: null,
                lesson: null,
                assessment: { id: 'assessment-ungiven', isPublished: true },
              },
              {
                id: 'item-assessment-visible-required',
                moduleSectionId: SECTION_ID,
                itemType: ModuleItemType.Assessment,
                lessonId: null,
                assessmentId: ASSESSMENT_ID,
                fileId: null,
                isVisible: true,
                isRequired: true,
                isGiven: true,
                metadata: null,
                lesson: null,
                assessment: { id: ASSESSMENT_ID, isPublished: true },
              },
            ],
          },
        ],
        gradingScaleEntries: [],
      },
      {
        id: 'module-hidden',
        classId: CLASS_ID,
        title: 'Hidden module',
        description: null,
        order: 2,
        isVisible: false,
        isLocked: false,
        sections: [],
        gradingScaleEntries: [],
      },
      {
        id: 'module-locked',
        classId: CLASS_ID,
        title: 'Locked module',
        description: null,
        order: 3,
        isVisible: true,
        isLocked: true,
        sections: [
          {
            id: 'section-locked',
            moduleId: 'module-locked',
            title: 'Locked section',
            order: 1,
            items: [
              {
                id: 'locked-item',
                moduleSectionId: 'section-locked',
                itemType: ModuleItemType.Lesson,
                lessonId: 'locked-lesson',
                assessmentId: null,
                fileId: null,
                isVisible: true,
                isRequired: true,
                isGiven: true,
                metadata: null,
                lesson: { id: 'locked-lesson', isDraft: false },
                assessment: null,
              },
            ],
          },
        ],
        gradingScaleEntries: [],
      },
    ]);

    db.query.lessonCompletions.findMany.mockResolvedValue([{ lessonId: LESSON_ID }]);
    db.query.assessmentAttempts.findMany.mockResolvedValue([{ assessmentId: ASSESSMENT_ID }]);

    const data = await service.getModulesByClass(CLASS_ID, STUDENT_ID, [RoleName.Student]);

    expect(data).toHaveLength(2);
    const visibleModule = data.find((entry) => entry.id === MODULE_ID);
    expect(visibleModule).toBeDefined();
    expect(visibleModule?.requiredVisibleCount).toBe(2);
    expect(visibleModule?.requiredCompletedCount).toBe(2);
    expect(visibleModule?.completed).toBe(true);
    expect(visibleModule?.progressPercent).toBe(100);
    expect(visibleModule?.sections[0]?.items).toHaveLength(2);
    expect(visibleModule?.sections[0]?.items[0]?.lessonPoints).toBe(15);
    expect(
      visibleModule?.sections[0]?.items.every((item) => item.accessible === true),
    ).toBe(true);

    const lockedModule = data.find((entry) => entry.id === 'module-locked');
    expect(lockedModule).toBeDefined();
    expect(lockedModule?.sections).toEqual([]);
    expect(lockedModule?.requiredVisibleCount).toBe(0);
    expect(lockedModule?.completed).toBe(false);
  });

  it('persists lesson points on attach via metadata', async () => {
    db.query.moduleSections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      module: { id: MODULE_ID, classId: CLASS_ID },
    });
    db.query.classes.findFirst.mockResolvedValue({ id: CLASS_ID, teacherId: TEACHER_ID });
    db.query.lessons.findFirst.mockResolvedValue({ id: LESSON_ID, classId: CLASS_ID });
    mockSelectWhere(db, [{ maxOrder: 0 }]);

    const returning = jest.fn().mockResolvedValue([{ id: ITEM_ID, metadata: { points: 20 } }]);
    const values = jest.fn().mockReturnValue({ returning });
    db.insert.mockReturnValueOnce({ values });

    await service.attachItem(
      SECTION_ID,
      {
        itemType: ModuleItemType.Lesson,
        lessonId: LESSON_ID,
        points: 20,
      },
      TEACHER_ID,
      [RoleName.Teacher],
    );

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ points: 20 }),
      }),
    );
  });

  it('persists lesson points on update by merging metadata', async () => {
    db.query.moduleItems.findFirst
      .mockResolvedValueOnce({
        id: ITEM_ID,
        itemType: ModuleItemType.Lesson,
        metadata: { points: 5, note: 'existing' },
        section: { module: { id: MODULE_ID, classId: CLASS_ID } },
      })
      .mockResolvedValueOnce({
        id: ITEM_ID,
        itemType: ModuleItemType.Lesson,
        metadata: { points: 25, note: 'existing' },
      });
    db.query.classes.findFirst.mockResolvedValue({ id: CLASS_ID, teacherId: TEACHER_ID });

    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    db.update.mockReturnValueOnce({ set });

    await service.updateItem(
      ITEM_ID,
      { points: 25 },
      TEACHER_ID,
      [RoleName.Teacher],
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ points: 25, note: 'existing' }),
      }),
    );
  });
});
