import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../database/database.service';
import { StudentLessonAccessService } from './student-lesson-access.service';

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const CLASS_ID = '00000000-0000-0000-0000-000000000002';
const LESSON_ID = '00000000-0000-0000-0000-000000000003';
const MODULE_ID = '00000000-0000-0000-0000-000000000004';

function buildMockDb() {
  return {
    select: jest.fn(),
  } as any;
}

function mockJoinedSelect(db: any, rows: any[], includeLeftJoin = false) {
  const chain: any = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.leftJoin = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue(rows);
  chain.then = (resolve: (value: any[]) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  db.select.mockReturnValueOnce(chain);

  if (!includeLeftJoin) {
    delete chain.leftJoin;
  }

  return chain;
}

describe('StudentLessonAccessService', () => {
  let service: StudentLessonAccessService;
  let db: ReturnType<typeof buildMockDb>;

  beforeEach(async () => {
    db = buildMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentLessonAccessService,
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();

    service = module.get(StudentLessonAccessService);
  });

  it('allows an enrolled student to access a published lesson through a visible item and unlocked module', async () => {
    mockJoinedSelect(db, [
      { lessonId: LESSON_ID, classId: CLASS_ID, moduleId: MODULE_ID },
    ]);

    await expect(
      service.assertLessonAccessible(STUDENT_ID, LESSON_ID),
    ).resolves.toEqual({
      lessonId: LESSON_ID,
      classId: CLASS_ID,
      moduleId: MODULE_ID,
    });
  });

  it.each([
    'draft lesson',
    'hidden module',
    'locked module',
    'hidden module item',
    'unattached lesson',
    'inactive class',
    'unenrolled student',
    'lesson linked through a module from another class',
  ])('returns the same not-found response for an inaccessible %s', async () => {
    mockJoinedSelect(db, []);

    await expect(
      service.assertLessonAccessible(STUDENT_ID, LESSON_ID),
    ).rejects.toEqual(new NotFoundException('Lesson not found'));
  });

  it('returns the accessible lesson ids for a class', async () => {
    mockJoinedSelect(db, [{ lessonId: LESSON_ID }]);

    await expect(
      service.getAccessibleLessonIdsForClass(STUDENT_ID, CLASS_ID),
    ).resolves.toEqual([LESSON_ID]);
  });

  it('returns recent lessons in database order and serializes updatedAt', async () => {
    const updatedAt = new Date('2026-08-29T04:00:00.000Z');
    const chain = mockJoinedSelect(
      db,
      [
        {
          id: LESSON_ID,
          title: 'Accessible lesson',
          classId: CLASS_ID,
          moduleId: MODULE_ID,
          order: 2,
          updatedAt,
        },
      ],
      true,
    );

    await expect(service.getRecentLessons(STUDENT_ID, 4)).resolves.toEqual([
      {
        id: LESSON_ID,
        title: 'Accessible lesson',
        classId: CLASS_ID,
        moduleId: MODULE_ID,
        order: 2,
        updatedAt: updatedAt.toISOString(),
      },
    ]);
    expect(chain.leftJoin).toHaveBeenCalledTimes(1);
    expect(chain.orderBy).toHaveBeenCalledTimes(1);
    expect(chain.limit).toHaveBeenCalledWith(4);
  });

  it('omits lessons from personally hidden classes from the recent feed', async () => {
    const chain = mockJoinedSelect(db, [], true);

    await expect(service.getRecentLessons(STUDENT_ID, 4)).resolves.toEqual([]);
    expect(chain.leftJoin).toHaveBeenCalledTimes(1);
  });
});
