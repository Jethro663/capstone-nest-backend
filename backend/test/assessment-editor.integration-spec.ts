import { AiAssessmentAuthoringService } from '../src/modules/ai-mentor/ai-assessment-authoring.service';
import {
  aiGenerationJobs,
  aiGenerationOutputs,
  classRecords,
} from '../src/drizzle/schema';
import {
  AssessmentType,
  Quarter,
} from '../src/modules/assessments/DTO/assessment.dto';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../src/database/database.service';
import {
  academicSystemStates,
  assessmentAttempts,
  assessmentQuestionOptions,
  classes,
  sections,
  users,
} from '../src/drizzle/schema';
import {
  AcademicPolicyService,
  ACADEMIC_STATE_ID,
} from '../src/modules/academic-state/academic-policy.service';
import { AssessmentAccessService } from '../src/modules/assessments/assessment-access.service';
import { AssessmentEditorService } from '../src/modules/assessments/assessment-editor.service';
import { AssessmentsService } from '../src/modules/assessments/assessments.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { QuestionType } from '../src/modules/assessments/DTO/assessment.dto';
import { SaveAssessmentEditorDto } from '../src/modules/assessments/DTO/assessment-editor.dto';

const url = process.env.ACADEMIC_TEST_DATABASE_URL;
if (
  !url ||
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
  !new URL(url).pathname.startsWith('/nexora_academic_test')
)
  throw new Error('Use a disposable local nexora_academic_test database');

describe('assessment editor PostgreSQL transactions', () => {
  let database: DatabaseService;
  let editor: AssessmentEditorService;
  let service: AssessmentsService;
  let actor: { userId: string; roles: string[] };
  let classId: string;
  const indexing = { queueClassReindex: jest.fn() };
  beforeAll(async () => {
    database = new DatabaseService(
      new ConfigService({
        database: {
          url,
          poolMax: 6,
          idleTimeout: 1000,
          connectionTimeout: 5000,
          statementTimeout: 15000,
        },
        NODE_ENV: 'test',
      }),
    );
    await database.onModuleInit();
    service = new AssessmentsService(
      database,
      new EventEmitter2(),
      {} as never,
      new AuditService(database),
      indexing as never,
      {
        enqueueAssessmentAssigned: jest.fn(),
        rescheduleAssessmentDueReminder: jest.fn(),
        removeAssessmentDueReminder: jest.fn(),
      } as never,
      new AssessmentAccessService(database),
      new AcademicPolicyService(database),
      {} as never,
    );
    editor = new AssessmentEditorService(database, service);
  });
  afterAll(async () => database?.onModuleDestroy());
  beforeEach(async () => {
    jest.restoreAllMocks();
    indexing.queueClassReindex.mockClear();
    await database.db.execute(
      sql`TRUNCATE users, sections, academic_system_states, academic_year_policies CASCADE`,
    );
    await database.db.insert(academicSystemStates).values({
      id: ACADEMIC_STATE_ID,
      schoolYear: '2026-2027',
      quarter: 'Q1',
    });
    const [teacher] = await database.db
      .insert(users)
      .values({
        email: 'editor@example.test',
        password: 'test-only',
        firstName: 'Editor',
        lastName: 'Teacher',
      })
      .returning();
    actor = { userId: teacher.id, roles: ['teacher'] };
    const [section] = await database.db
      .insert(sections)
      .values({ name: 'Editor', schoolYear: '2026-2027', gradeLevel: '8' })
      .returning();
    const [cls] = await database.db
      .insert(classes)
      .values({
        sectionId: section.id,
        teacherId: teacher.id,
        subjectName: 'Mathematics',
        subjectCode: 'MATH-8',
        subjectGradeLevel: '8',
        schoolYear: '2026-2027',
      })
      .returning();
    classId = cls.id;
  });
  const create = (): SaveAssessmentEditorDto => ({
    mutationId: randomUUID(),
    classId,
    action: 'save',
    settings: { title: 'Atomic draft', quarter: 'Q1' as never },
    questions: [
      {
        clientId: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: '<p></p>',
        points: 1,
        order: 1,
        options: [
          { text: '', isCorrect: false, order: 1 },
          { text: '', isCorrect: false, order: 2 },
        ],
      },
    ],
  });

  it('saves incomplete content, replays the exact receipt, and creates no duplicates concurrently', async () => {
    const dto = create();
    const [first, retry] = await Promise.all([
      editor.save(undefined, dto, actor),
      editor.save(undefined, dto, actor),
    ]);
    expect(first.assessment.id).toBe(retry.assessment.id);
    expect(first.publicationIssues.length).toBeGreaterThan(0);
    expect(await database.db.query.assessments.findMany()).toHaveLength(1);
    expect(
      await database.db.query.assessmentEditorReceipts.findMany(),
    ).toHaveLength(1);
    await expect(
      editor.save(
        undefined,
        { ...dto, settings: { title: 'Different payload' } },
        actor,
      ),
    ).rejects.toThrow('different changes');
  });

  it('rolls back metadata, questions, receipts and post-commit indexing on a question failure', async () => {
    const saved = await editor.save(undefined, create(), actor);
    indexing.queueClassReindex.mockClear();
    jest
      .spyOn(service, 'createQuestion')
      .mockRejectedValueOnce(new Error('injected failure'));
    await expect(
      editor.save(
        saved.assessment.id,
        {
          ...create(),
          expectedRevision: saved.revision,
          settings: { title: 'Must roll back' },
        },
        actor,
      ),
    ).rejects.toThrow('injected failure');
    const after = await service.getAssessmentById(saved.assessment.id);
    expect(after.title).toBe('Atomic draft');
    expect(after.editorRevision).toBe(saved.revision);
    expect(after.questions).toHaveLength(1);
    expect(
      await database.db.query.assessmentEditorReceipts.findMany(),
    ).toHaveLength(1);
    expect(indexing.queueClassReindex).not.toHaveBeenCalled();
  });

  it('retains option IDs and image metadata and rejects stale revisions after a legacy mutation', async () => {
    const saved = await editor.save(undefined, create(), actor);
    const question = saved.assessment.questions[0];
    const option = question.options[0];
    const updated = await editor.save(
      saved.assessment.id,
      {
        ...create(),
        expectedRevision: saved.revision,
        questions: [
          {
            clientId: 'q1',
            id: question.id,
            type: QuestionType.MULTIPLE_CHOICE,
            content: '<p>Ready?</p>',
            points: 1,
            order: 1,
            options: [
              {
                id: option.id,
                text: 'Yes',
                isCorrect: true,
                order: 1,
                imageUrl: '/image.png',
                imageZoom: 125,
              },
            ],
          },
        ],
      },
      actor,
    );
    expect(
      updated.assessment.questions[0].options.map((entry) => entry.id),
    ).toContain(option.id);
    const stored = await database.db.query.assessmentQuestionOptions.findFirst({
      where: eq(assessmentQuestionOptions.id, option.id),
    });
    expect(stored?.metadata).toMatchObject({ imageZoom: 125 });
    await service.updateAssessment(
      saved.assessment.id,
      { title: 'Legacy update' },
      actor,
    );
    await expect(
      editor.save(
        saved.assessment.id,
        { ...create(), expectedRevision: updated.revision, questions: [] },
        actor,
      ),
    ).rejects.toThrow('changed');
  });

  it('rolls back the entire save when an option write fails inside PostgreSQL', async () => {
    const saved = await editor.save(undefined, create(), actor);
    indexing.queueClassReindex.mockClear();
    await database.db.execute(
      sql`CREATE FUNCTION editor_test_option_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.text = 'reject-option-write' THEN RAISE EXCEPTION 'injected option failure'; END IF; RETURN NEW; END $$`,
    );
    await database.db.execute(
      sql`CREATE TRIGGER editor_test_option_failure BEFORE INSERT OR UPDATE ON assessment_question_options FOR EACH ROW EXECUTE FUNCTION editor_test_option_failure()`,
    );
    try {
      const question = saved.assessment.questions[0];
      await expect(
        editor.save(
          saved.assessment.id,
          {
            mutationId: randomUUID(),
            expectedRevision: saved.revision,
            action: 'save',
            settings: { title: 'Must not persist' },
            questions: [
              {
                ...create().questions![0],
                id: question.id,
                content: '<p>Must also roll back</p>',
                options: [
                  {
                    id: question.options[0].id,
                    text: 'reject-option-write',
                    isCorrect: true,
                    order: 1,
                  },
                ],
              },
            ],
          },
          actor,
        ),
      ).rejects.toThrow();
      const after = await service.getAssessmentById(saved.assessment.id);
      expect(after.title).toBe(saved.assessment.title);
      expect(after.questions).toEqual(saved.assessment.questions);
      expect(after.editorRevision).toBe(saved.revision);
      expect(
        await database.db.query.assessmentEditorReceipts.findMany(),
      ).toHaveLength(1);
      expect(indexing.queueClassReindex).not.toHaveBeenCalled();
    } finally {
      await database.db.execute(
        sql`DROP TRIGGER editor_test_option_failure ON assessment_question_options`,
      );
      await database.db.execute(
        sql`DROP FUNCTION editor_test_option_failure()`,
      );
    }
  });

  it('rolls back an already-written metadata change if persistence subsequently fails', async () => {
    const saved = await editor.save(undefined, create(), actor);
    const update = service.updateAssessment.bind(service);
    jest
      .spyOn(service, 'updateAssessment')
      .mockImplementationOnce(async (...args) => {
        await update(...args);
        throw new Error('injected metadata failure');
      });
    await expect(
      editor.save(
        saved.assessment.id,
        {
          mutationId: randomUUID(),
          expectedRevision: saved.revision,
          action: 'save',
          settings: { title: 'Must roll back' },
        },
        actor,
      ),
    ).rejects.toThrow('injected metadata failure');
    const after = await service.getAssessmentById(saved.assessment.id);
    expect(after.title).toBe(saved.assessment.title);
    expect(after.editorRevision).toBe(saved.revision);
    expect(
      await database.db.query.assessmentEditorReceipts.findMany(),
    ).toHaveLength(1);
  });

  it('requires explicitly moving published work to draft before unfinished edits', async () => {
    const dto = create();
    dto.action = 'publish';
    dto.questions![0].content = '<p>Choose one</p>';
    dto.questions![0].options = [
      { text: 'Yes', isCorrect: true, order: 1 },
      { text: 'No', isCorrect: false, order: 2 },
    ];
    const saved = await editor.save(undefined, dto, actor);
    const incomplete: SaveAssessmentEditorDto = {
      mutationId: randomUUID(),
      expectedRevision: saved.revision,
      action: 'save',
      settings: {},
      questions: [
        {
          ...dto.questions![0],
          id: saved.assessment.questions[0].id,
          content: '<p></p>',
          options: undefined,
        },
      ],
    };
    await expect(
      editor.save(saved.assessment.id, incomplete, actor),
    ).rejects.toThrow('Move this assessment to draft');
    expect(
      (await service.getAssessmentById(saved.assessment.id)).isPublished,
    ).toBe(true);
    const draft = await editor.save(
      saved.assessment.id,
      { ...incomplete, mutationId: randomUUID(), action: 'unpublish' },
      actor,
    );
    expect(draft.assessment.isPublished).toBe(false);
    expect(draft.publicationIssues.length).toBeGreaterThan(0);
  });

  it.each([
    AssessmentType.QUIZ,
    AssessmentType.EXAM,
    AssessmentType.ASSIGNMENT,
  ])(
    'preserves question totals for a %s full-settings save with an empty rubric',
    async (type) => {
      const dto = create();
      dto.settings.type = type;
      const saved = await editor.save(undefined, dto, actor);
      const result = await editor.save(
        saved.assessment.id,
        {
          mutationId: randomUUID(),
          expectedRevision: saved.revision,
          action: 'save',
          settings: {
            type,
            description: '<p>Mobile edit</p>',
            rubricCriteria: null,
          },
        },
        actor,
      );
      expect(result.assessment.totalPoints).toBe(1);
      expect(result.assessment.questions).toEqual(saved.assessment.questions);
    },
  );

  it('preserves rubric review metadata when file-upload settings are resubmitted unchanged', async () => {
    const rubricCriteria = [
      {
        id: 'reasoning',
        title: 'Reasoning',
        description: 'Show steps',
        points: 100,
      },
    ];
    const saved = await editor.save(
      undefined,
      {
        ...create(),
        questions: [],
        settings: {
          type: AssessmentType.FILE_UPLOAD,
          quarter: Quarter.Q1,
          rubricCriteria,
        },
      },
      actor,
    );
    const result = await editor.save(
      saved.assessment.id,
      {
        mutationId: randomUUID(),
        expectedRevision: saved.revision,
        action: 'save',
        settings: { description: '<p>Mobile edit</p>', rubricCriteria },
      },
      actor,
    );
    expect(result.assessment.rubricParsedAt).toEqual(
      saved.assessment.rubricParsedAt,
    );
    expect(result.assessment.rubricParseStatus).toBe(
      saved.assessment.rubricParseStatus,
    );
    expect(result.assessment.rubricCriteria).toEqual(
      saved.assessment.rubricCriteria,
    );
    expect(result.assessment.totalPoints).toBe(100);
  });

  it('allows metadata-only editing after attempts without rewriting the existing questions', async () => {
    const saved = await editor.save(undefined, create(), actor);
    await database.db.insert(assessmentAttempts).values({
      assessmentId: saved.assessment.id,
      studentId: actor.userId,
      attemptNumber: 1,
    });
    const spy = jest.spyOn(service, 'updateQuestion');
    const result = await editor.save(
      saved.assessment.id,
      {
        mutationId: randomUUID(),
        expectedRevision: saved.revision,
        action: 'save',
        settings: { title: 'Renamed' },
        questions: saved.assessment.questions.map((question) => ({
          ...create().questions![0],
          id: question.id,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order,
          })),
          conceptTags: [],
          imageUrl: '',
          explanation: '',
        })),
      },
      actor,
    );
    expect(result.assessment.title).toBe('Renamed');
    expect(spy).not.toHaveBeenCalled();
  });
  it.each([
    QuestionType.MULTIPLE_CHOICE,
    QuestionType.MULTIPLE_SELECT,
    QuestionType.TRUE_FALSE,
    QuestionType.SHORT_ANSWER,
    QuestionType.FILL_BLANK,
    QuestionType.DROPDOWN,
  ])(
    'round trips %s without replacing question or option identifiers',
    async (type) => {
      const dto = create();
      dto.questions![0].type = type;
      const first = await editor.save(undefined, dto, actor);
      const question = first.assessment.questions[0];
      const second = await editor.save(
        first.assessment.id,
        {
          ...dto,
          mutationId: randomUUID(),
          expectedRevision: first.revision,
          questions: [
            {
              ...dto.questions![0],
              id: question.id,
              content: '<p><strong>Updated</strong></p>',
              options: question.options.map((option) => ({
                id: option.id,
                text: option.text,
                isCorrect: option.isCorrect,
                order: option.order,
              })),
            },
          ],
        },
        actor,
      );
      expect(second.assessment.questions[0].id).toBe(question.id);
      expect(
        second.assessment.questions[0].options.map((option) => option.id),
      ).toEqual(question.options.map((option) => option.id));
      expect(second.assessment.questions[0].content).toContain(
        '<strong>Updated</strong>',
      );
    },
  );

  it('rejects incomplete publication and rolls the whole save back', async () => {
    const dto = create();
    dto.action = 'publish';
    await expect(editor.save(undefined, dto, actor)).rejects.toThrow(
      'highlighted fields',
    );
    expect(await database.db.query.assessments.findMany()).toHaveLength(0);
    expect(
      await database.db.query.assessmentEditorReceipts.findMany(),
    ).toHaveLength(0);
  });

  const authoring = () =>
    new AiAssessmentAuthoringService(
      database,
      new AcademicPolicyService(database),
      editor,
    );
  const aiActor = () => ({ id: actor.userId, roles: actor.roles });
  async function aiJob(
    reviewed = true,
    type: AssessmentType = AssessmentType.QUIZ,
  ) {
    const settings = {
      title: 'Teacher title',
      type,
      quarter: Quarter.Q1,
      maxAttempts: 3,
      strictMode: true,
      feedbackDelayHours: 7,
      passingScore: 82,
      timeLimitMinutes: 23,
      randomizeQuestions: true,
      timedQuestionsEnabled: true,
      questionTimeLimitSeconds: 45,
      closeWhenDue: false,
    };
    const sourceFilters = {
      assessmentSettings: settings,
      assessmentSettingsReviewed: reviewed,
    };
    const [job] = await database.db
      .insert(aiGenerationJobs)
      .values({
        jobType: 'quiz_generation',
        classId,
        teacherId: actor.userId,
        status: 'completed',
        sourceFilters,
      })
      .returning();
    await database.db.insert(aiGenerationOutputs).values({
      jobId: job.id,
      outputType: 'assessment_draft',
      targetClassId: classId,
      targetTeacherId: actor.userId,
      sourceFilters,
      structuredOutput: {
        title: 'Model title must not win',
        qualityGate: 'pass',
        reviewRequired: false,
        questions: [
          {
            type: 'short_answer',
            content: '<p>Explain.</p>',
            points: 2,
            reviewed: true,
          },
        ],
      },
    });
    return job;
  }
  it.each([
    AssessmentType.QUIZ,
    AssessmentType.EXAM,
    AssessmentType.ASSIGNMENT,
  ])(
    'applies %s exactly once concurrently with authoritative teacher settings',
    async (type) => {
      const job = await aiJob(true, type);
      const [first, second] = await Promise.all([
        authoring().apply(job.id, aiActor()),
        authoring().apply(job.id, aiActor()),
      ]);
      expect(first.applyResult!.assessmentId).toBe(
        second.applyResult!.assessmentId,
      );
      expect(await database.db.query.assessments.findMany()).toHaveLength(1);
      const created = await service.getAssessmentById(
        first.applyResult!.assessmentId,
      );
      expect(created).toMatchObject({
        title: 'Teacher title',
        type,
        isPublished: false,
        quarter: 'Q1',
        maxAttempts: 3,
        strictMode: true,
        feedbackDelayHours: 7,
        passingScore: 82,
        timeLimitMinutes: 23,
        randomizeQuestions: true,
        timedQuestionsEnabled: true,
        questionTimeLimitSeconds: 45,
        closeWhenDue: false,
      });
    },
  );
  it('requires legacy settings review and changes settings without changing generated questions', async () => {
    const job = await aiJob(false);
    expect((await authoring().preview(job.id, aiActor())).canApply).toBe(false);
    const before = await database.db.query.aiGenerationOutputs.findFirst({
      where: eq(aiGenerationOutputs.jobId, job.id),
    });
    await authoring().updateSettings(
      job.id,
      { maxAttempts: 5, quarter: Quarter.Q2 },
      aiActor(),
    );
    const after = await database.db.query.aiGenerationOutputs.findFirst({
      where: eq(aiGenerationOutputs.jobId, job.id),
    });
    expect(after!.structuredOutput).toEqual(before!.structuredOutput);
    const applied = await authoring().apply(job.id, aiActor());
    expect(
      await service.getAssessmentById(applied.applyResult!.assessmentId),
    ).toMatchObject({ maxAttempts: 5, quarter: 'Q2', isPublished: false });
  });
  it('checks academic changes again between preview and apply', async () => {
    const job = await aiJob();
    expect((await authoring().preview(job.id, aiActor())).canApply).toBe(true);
    await database.db.insert(classRecords).values({
      classId,
      teacherId: actor.userId,
      gradingPeriod: 'Q1',
      status: 'locked',
    });
    await expect(authoring().apply(job.id, aiActor())).rejects.toThrow(
      'needs review',
    );
    expect(await database.db.query.assessments.findMany()).toHaveLength(0);
  });
});
