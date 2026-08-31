import { AssessmentEditorService } from './assessment-editor.service';
import { AssessmentType, QuestionType } from './DTO/assessment.dto';
import { SaveAssessmentEditorDto } from './DTO/assessment-editor.dto';

describe('atomic assessment editor', () => {
  const user = { userId: 'teacher', roles: ['teacher'] };
  const assessment = {
    id: 'assessment',
    classId: 'class',
    editorRevision: 4,
    title: 'Title',
    type: AssessmentType.QUIZ,
    passingScore: 60,
    isPublished: false,
    class: { teacherId: 'teacher' },
    questions: [],
  };
  let database: {
    academicTransaction: jest.Mock;
    db: {
      query: { assessmentEditorReceipts: { findFirst: jest.Mock } };
      insert: jest.Mock;
    };
  };
  let assessments: Record<
    | 'getAssessmentById'
    | 'updateAssessment'
    | 'createAssessment'
    | 'updateQuestion'
    | 'createQuestion'
    | 'deleteQuestion',
    jest.Mock
  >;
  let service: AssessmentEditorService;
  let writes: jest.Mock;
  const dto = (): SaveAssessmentEditorDto => ({
    mutationId: 'mutation',
    expectedRevision: 4,
    action: 'save',
    settings: {},
  });
  beforeEach(() => {
    writes = jest.fn().mockResolvedValue(undefined);
    database = {
      academicTransaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
      db: {
        query: {
          assessmentEditorReceipts: {
            findFirst: jest.fn().mockResolvedValue(undefined),
          },
        },
        insert: jest.fn(() => ({ values: writes })),
      },
    };
    assessments = {
      getAssessmentById: jest.fn().mockResolvedValue(assessment),
      updateAssessment: jest.fn().mockResolvedValue(assessment),
      createAssessment: jest.fn(),
      updateQuestion: jest.fn(),
      createQuestion: jest.fn(),
      deleteQuestion: jest.fn(),
    };
    service = new AssessmentEditorService(
      database as never,
      assessments as never,
    );
  });

  it('rejects stale edits before any write', async () => {
    await expect(
      service.save('assessment', { ...dto(), expectedRevision: 3 }, user),
    ).rejects.toThrow('changed');
    expect(assessments.updateAssessment).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  });

  it('rejects ownership before exposing a saved draft', async () => {
    await expect(
      service.save('assessment', dto(), {
        userId: 'other',
        roles: ['teacher'],
      }),
    ).rejects.toThrow('own classes');
    expect(assessments.updateAssessment).not.toHaveBeenCalled();
  });

  it('saves incomplete content without publishing', async () => {
    assessments.getAssessmentById.mockResolvedValue({
      ...assessment,
      title: 'Untitled assessment',
    });
    const result = await service.save('assessment', dto(), user);
    expect(
      result.publicationIssues.some((issue) => issue.field === 'title'),
    ).toBe(true);
    expect(assessments.updateAssessment).toHaveBeenCalledWith(
      'assessment',
      {},
      user,
    );
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it('does not rewrite unchanged questions on settings-only edits', async () => {
    const question = {
      id: 'question',
      type: QuestionType.MULTIPLE_CHOICE,
      content: '<p>Q</p>',
      points: 1,
      order: 1,
      options: [],
    };
    assessments.getAssessmentById.mockResolvedValue({
      ...assessment,
      questions: [question],
    });
    await service.save(
      'assessment',
      { ...dto(), questions: [{ ...question, clientId: 'q' }] },
      user,
    );
    expect(assessments.updateQuestion).not.toHaveBeenCalled();
    expect(assessments.createQuestion).not.toHaveBeenCalled();
  });

  it('never returns success when a write fails', async () => {
    assessments.updateAssessment.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(service.save('assessment', dto(), user)).rejects.toThrow(
      'database unavailable',
    );
    expect(writes).not.toHaveBeenCalled();
  });
});
