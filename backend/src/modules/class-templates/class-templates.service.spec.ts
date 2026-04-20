import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassTemplatesService } from './class-templates.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

describe('ClassTemplatesService', () => {
  let service: ClassTemplatesService;

  const mockDb: any = {
    query: {
      classTemplates: { findFirst: jest.fn(), findMany: jest.fn() },
      classTemplateModules: { findMany: jest.fn() },
      classTemplateModuleSections: { findMany: jest.fn() },
      classTemplateModuleItems: { findMany: jest.fn() },
      classTemplateAssessments: { findMany: jest.fn() },
      classTemplateAssessmentQuestions: { findMany: jest.fn() },
      classTemplateAssessmentQuestionOptions: { findMany: jest.fn() },
      classTemplateAnnouncements: { findMany: jest.fn() },
      classTemplateLessons: { findMany: jest.fn() },
      classTemplateLessonBlocks: { findMany: jest.fn() },
      classTemplateEngineChunks: { findMany: jest.fn() },
    },
    transaction: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockDatabaseService = { db: mockDb };
  const mockAuditService = { log: jest.fn() };
  const makeUpdateReturningChain = (rows: any[] = []) => ({
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(rows),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.query.classTemplates.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Template A',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      status: 'draft',
      createdBy: 'admin-id',
    });
    mockDb.query.classTemplateModules.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateModuleSections.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateModuleItems.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateAssessments.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateAssessmentQuestions.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateAssessmentQuestionOptions.findMany.mockResolvedValue(
      [],
    );
    mockDb.query.classTemplateAnnouncements.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateLessons.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateLessonBlocks.findMany.mockResolvedValue([]);
    mockDb.query.classTemplateEngineChunks.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassTemplatesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ClassTemplatesService>(ClassTemplatesService);
  });

  it('returns validation failure for malformed yaml', async () => {
    const result = await service.validateEngineImport(':::not-yaml:::');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('builds a versioned engine export payload', async () => {
    const result = await service.getEngineExport(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(result.fileName).toContain('engine-template-');
    expect(result.yaml).toContain('schemaVersion: "1.0"');
    expect(result.manifest.template.id).toBe(
      '11111111-1111-1111-1111-111111111111',
    );
  });

  it('rejects import when manifest validation fails', async () => {
    await expect(
      service.importEngine(
        `
schemaVersion: "2.0"
engineVersion: "1.0"
exportedAt: "2026-04-19T00:00:00.000Z"
template:
  id: "11111111-1111-1111-1111-111111111111"
  name: "Broken"
  subjectCode: "MATH-7"
  subjectGradeLevel: "7"
  status: "draft"
modules: []
lessons: []
assessments: []
announcements: []
chunks: []
`,
        'admin-id',
        ['admin'],
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('publishes template and cascades core lessons/assessments to published state', async () => {
    mockDb.update.mockReset();
    const templateUpdateChain = makeUpdateReturningChain([
      { id: '11111111-1111-1111-1111-111111111111', status: 'published' },
    ]);
    const lessonUpdateChain = makeUpdateReturningChain([{ id: 'lesson-1' }]);
    const assessmentUpdateChain = makeUpdateReturningChain([
      { id: 'assessment-1' },
    ]);
    mockDb.update
      .mockImplementationOnce(() => templateUpdateChain)
      .mockImplementationOnce(() => lessonUpdateChain)
      .mockImplementationOnce(() => assessmentUpdateChain);

    await service.publish(
      '11111111-1111-1111-1111-111111111111',
      { status: 'published' } as any,
      'admin-id',
      ['admin'],
    );

    expect(templateUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    );
    expect(lessonUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isDraft: false }),
    );
    expect(assessmentUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: true }),
    );
  });

  it('unpublishes template and cascades core lessons/assessments to draft state', async () => {
    mockDb.update.mockReset();
    const templateUpdateChain = makeUpdateReturningChain([
      { id: '11111111-1111-1111-1111-111111111111', status: 'draft' },
    ]);
    const lessonUpdateChain = makeUpdateReturningChain([{ id: 'lesson-1' }]);
    const assessmentUpdateChain = makeUpdateReturningChain([
      { id: 'assessment-1' },
    ]);
    mockDb.update
      .mockImplementationOnce(() => templateUpdateChain)
      .mockImplementationOnce(() => lessonUpdateChain)
      .mockImplementationOnce(() => assessmentUpdateChain);

    await service.publish(
      '11111111-1111-1111-1111-111111111111',
      { status: 'draft' } as any,
      'admin-id',
      ['admin'],
    );

    expect(templateUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', publishedAt: null }),
    );
    expect(lessonUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isDraft: true }),
    );
    expect(assessmentUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: false }),
    );
  });
});
