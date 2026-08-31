import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  aiGenerationJobs,
  aiGenerationOutputs,
  assessments,
  classRecords,
  extractedModules,
} from '../../drizzle/schema';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { AssessmentEditorService } from '../assessments/assessment-editor.service';
import { assessmentPublicationIssues } from '../assessments/assessment-readiness';
import {
  AiAssessmentSettingsDto,
  normalizeAiAssessmentSettings,
} from './assessment-settings';
import { GenerateQuizDraftDto } from './DTO/quiz-generation.dto';
import { SaveAssessmentEditorDto } from '../assessments/DTO/assessment-editor.dto';
import { Quarter } from '../assessments/DTO/assessment.dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

type Actor = { id: string; roles: string[] };
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(record) : [];

@Injectable()
export class AiAssessmentAuthoringService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly policy: AcademicPolicyService,
    private readonly editor: AssessmentEditorService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  async resolve(
    classId: string,
    settings: AiAssessmentSettingsDto,
  ): Promise<AiAssessmentSettingsDto> {
    const { cls, policy } = await this.policy.forClass(classId);
    const current = await this.policy.currentState();
    const quarter =
      settings.quarter ??
      (cls.schoolYear === current.schoolYear
        ? current.quarter
        : policy.periods[0].key);
    await this.policy.assertAssessmentAction({ classId, quarter }, 'prepare');
    const workbook = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, classId),
        eq(classRecords.gradingPeriod, quarter),
      ),
    });
    if (workbook && workbook.status !== 'draft')
      throw new ConflictException('The period workbook is finalized or locked');
    return { ...settings, quarter: quarter as Quarter };
  }

  async prepare(dto: GenerateQuizDraftDto) {
    const assessmentSettings = await this.resolve(
      dto.classId,
      normalizeAiAssessmentSettings(dto as unknown as Record<string, unknown>),
    );
    return {
      ...dto,
      title: assessmentSettings.title,
      assessmentType: assessmentSettings.type,
      passingScore: assessmentSettings.passingScore,
      feedbackLevel: assessmentSettings.feedbackLevel,
      classRecordCategory: assessmentSettings.classRecordCategory,
      quarter: assessmentSettings.quarter,
      assessmentSettings,
      assessmentSettingsReviewed: Boolean(dto.assessmentSettings),
    };
  }

  async extractionContext(
    extractionId: string,
    settings?: AiAssessmentSettingsDto,
    sectionIndices?: number[],
  ) {
    const extraction = await this.db.query.extractedModules.findFirst({
      where: eq(extractedModules.id, extractionId),
    });
    if (!extraction?.classId)
      throw new NotFoundException('Extraction class not found');
    // Reopening already-applied historical extraction must not rewrite its assessments.
    if (extraction.isApplied) return {};
    const content = record(extraction.structuredContent);
    const sections = records(content.sections ?? content.lessons);
    const selected = sectionIndices?.length
      ? sections.filter((_, index) => sectionIndices.includes(index))
      : sections;
    if (
      !selected.some(
        (section) =>
          records(record(section.assessmentDraft).questions).length > 0,
      )
    )
      return {};
    if (settings?.classRecordItemId)
      throw new BadRequestException(
        'Choose class-record placement individually in each created assessment',
      );
    const assessmentSettings = await this.resolve(
      extraction.classId,
      normalizeAiAssessmentSettings({ assessmentSettings: settings ?? {} }),
    );
    const state = await this.policy.currentState();
    return { assessmentSettings, academicStateVersion: state.version };
  }

  private async load(jobId: string, actor: Actor, lock = false) {
    if (lock)
      await this.db.execute(
        sql`SELECT id FROM ai_generation_jobs WHERE id = ${jobId} FOR UPDATE`,
      );
    const job = await this.db.query.aiGenerationJobs.findFirst({
      where: eq(aiGenerationJobs.id, jobId),
    });
    if (!job || job.jobType !== 'quiz_generation' || !job.classId)
      throw new NotFoundException('Quiz draft job not found');
    const { cls } = await this.policy.forClass(job.classId);
    if (
      !actor.roles.includes('admin') &&
      (!actor.roles.includes('teacher') ||
        job.teacherId !== actor.id ||
        cls.teacherId !== actor.id)
    )
      throw new ForbiddenException(
        'You can only manage AI drafts for your own classes',
      );
    if (lock)
      await this.db.execute(
        sql`SELECT id FROM ai_generation_outputs WHERE job_id = ${jobId} FOR UPDATE`,
      );
    const output = await this.db.query.aiGenerationOutputs.findFirst({
      where: and(
        eq(aiGenerationOutputs.jobId, jobId),
        eq(aiGenerationOutputs.outputType, 'assessment_draft'),
      ),
      orderBy: [desc(aiGenerationOutputs.createdAt)],
    });
    return {
      job,
      output,
      filters: record(job.sourceFilters),
      structured: record(output?.structuredOutput),
    };
  }

  async settings(jobId: string, actor: Actor) {
    const context = await this.load(jobId, actor);
    const settings = normalizeAiAssessmentSettings(
      context.filters.assessmentSettings
        ? { assessmentSettings: context.filters.assessmentSettings }
        : context.filters,
    );
    const { cls, policy } = await this.policy.forClass(context.job.classId!);
    const current = await this.policy.currentState();
    return {
      assessmentSettings: {
        ...settings,
        quarter:
          settings.quarter ??
          (cls.schoolYear === current.schoolYear
            ? current.quarter
            : policy.periods[0].key),
      },
      requiresSettingsReview: !context.filters.assessmentSettingsReviewed,
      schoolYear: cls.schoolYear,
      periods: policy.periods,
      alreadyApplied: Boolean(
        record(record(context.structured.audit).applyResult).assessmentId ||
        context.structured.assessmentId,
      ),
    };
  }

  async updateSettings(
    jobId: string,
    input: AiAssessmentSettingsDto,
    actor: Actor,
  ) {
    return this.databaseService.academicTransaction(async () => {
      const context = await this.load(jobId, actor, true);
      if (
        context.job.status === 'approved' ||
        record(record(context.structured.audit).applyResult).assessmentId ||
        context.structured.assessmentId
      )
        throw new ConflictException(
          'This draft is already applied; edit its assessment instead',
        );
      if (['cancelled', 'rejected'].includes(context.job.status))
        throw new ConflictException(
          'This job no longer accepts settings changes',
        );
      const assessmentSettings = await this.resolve(
        context.job.classId!,
        normalizeAiAssessmentSettings({
          assessmentSettings: {
            ...record(context.filters.assessmentSettings),
            ...input,
          },
        }),
      );
      const sourceFilters = {
        ...context.filters,
        assessmentSettings,
        assessmentSettingsReviewed: true,
        title: assessmentSettings.title,
        assessmentType: assessmentSettings.type,
        passingScore: assessmentSettings.passingScore,
        feedbackLevel: assessmentSettings.feedbackLevel,
        classRecordCategory: assessmentSettings.classRecordCategory,
        quarter: assessmentSettings.quarter,
      };
      await this.db
        .update(aiGenerationJobs)
        .set({ sourceFilters, updatedAt: new Date() })
        .where(eq(aiGenerationJobs.id, jobId));
      if (context.output)
        await this.db
          .update(aiGenerationOutputs)
          .set({
            sourceFilters: {
              ...record(context.output.sourceFilters),
              ...sourceFilters,
            },
            updatedAt: new Date(),
          })
          .where(eq(aiGenerationOutputs.id, context.output.id));
      return { assessmentSettings, requiresSettingsReview: false };
    });
  }

  private async buildPreview(
    context: Awaited<ReturnType<AiAssessmentAuthoringService['load']>>,
  ) {
    const { job, output, filters, structured } = context;
    const applyResult = record(record(structured.audit).applyResult);
    if (!applyResult.assessmentId && structured.assessmentId)
      applyResult.assessmentId = structured.assessmentId;
    const alreadyApplied = Boolean(applyResult.assessmentId);
    const questions = records(structured.questions);
    const settings = normalizeAiAssessmentSettings(
      filters.assessmentSettings
        ? { assessmentSettings: filters.assessmentSettings }
        : filters,
    );
    const blockedReasons: string[] = [];
    let resolved = settings;
    try {
      resolved = await this.resolve(job.classId!, settings);
    } catch (error) {
      blockedReasons.push(
        error instanceof Error
          ? error.message
          : 'Academic settings need review',
      );
    }
    if (!filters.assessmentSettingsReviewed)
      blockedReasons.push(
        'Review and save assessment settings before applying this draft',
      );
    if (!output || !['completed', 'approved'].includes(job.status))
      blockedReasons.push('Wait for a completed draft before applying');
    if (!questions.length)
      blockedReasons.push('Add at least one reviewed question before applying');
    if (structured.qualityGate === 'fail')
      blockedReasons.push(
        'Rerun or repair the draft because the quality gate failed',
      );
    if (structured.reviewRequired === true)
      blockedReasons.push('Finish the review checklist before applying');
    if (
      records(structured.reviewIssues).some(
        (issue) => issue.severity === 'blocking' && !issue.resolved,
      )
    )
      blockedReasons.push('Resolve blocking review issues before applying');
    const totalPoints = questions.reduce(
      (sum, question) => sum + (Number(question.points) || 1),
      0,
    );
    return {
      canApply: alreadyApplied || blockedReasons.length === 0,
      alreadyApplied,
      blockedReasons: alreadyApplied ? [] : blockedReasons,
      applyResult: alreadyApplied ? applyResult : null,
      assessmentSettings: resolved,
      requiresSettingsReview: !filters.assessmentSettingsReviewed,
      assessment: { ...resolved, totalPoints, questionCount: questions.length },
      questions,
      reviewIssues: records(structured.reviewIssues),
    };
  }

  async preview(jobId: string, actor: Actor) {
    return this.buildPreview(await this.load(jobId, actor));
  }

  async apply(jobId: string, actor: Actor) {
    return this.databaseService.academicTransaction(async () => {
      const context = await this.load(jobId, actor, true);
      const preview = await this.buildPreview(context);
      if (preview.alreadyApplied)
        return {
          jobId,
          outputId: context.output?.id,
          alreadyApplied: true,
          applyResult: preview.applyResult,
          preview,
        };
      if (!preview.canApply || !context.output)
        throw new ConflictException({
          message: 'Quiz draft needs review',
          errors: preview.blockedReasons,
        });
      const payload = plainToInstance(SaveAssessmentEditorDto, {
        mutationId: jobId,
        classId: context.job.classId,
        action: 'save',
        settings: preview.assessmentSettings,
        questions: preview.questions.map((question, index) => ({
          clientId: `ai-${index}`,
          type:
            question.type || context.filters.questionType || 'multiple_choice',
          content: question.content ?? '',
          points: question.points ?? 1,
          order: index + 1,
          isRequired: question.isRequired ?? true,
          explanation: question.explanation ?? undefined,
          conceptTags: question.conceptTags ?? [],
          imageUrl: question.imageUrl ?? undefined,
          imageDisplayMode: question.imageDisplayMode ?? undefined,
          imageZoom: question.imageZoom ?? undefined,
          imagePositionX: question.imagePositionX ?? undefined,
          imagePositionY: question.imagePositionY ?? undefined,
          options: records(question.options).map((option, optionIndex) => ({
            text: option.text ?? '',
            isCorrect: Boolean(option.isCorrect),
            order: optionIndex + 1,
            imageUrl: option.imageUrl ?? undefined,
            imageDisplayMode: option.imageDisplayMode ?? undefined,
            imageZoom: option.imageZoom ?? undefined,
            imagePositionX: option.imagePositionX ?? undefined,
            imagePositionY: option.imagePositionY ?? undefined,
          })),
        })),
      });
      if (
        validateSync(payload, { whitelist: true, forbidNonWhitelisted: true })
          .length
      )
        throw new BadRequestException(
          'The generated draft contains invalid assessment fields; review its questions',
        );
      const saved = await this.editor.save(undefined, payload, actor);
      await this.db
        .update(assessments)
        .set({
          aiOrigin: 'ai_quiz_draft',
          aiGenerationOutputId: context.output.id,
        })
        .where(eq(assessments.id, saved.assessment.id));
      const applyResult = {
        assessmentId: saved.assessment.id,
        outputId: context.output.id,
        questionsCreated: saved.assessment.questions.length,
        totalPoints: saved.assessment.totalPoints,
        appliedAt: new Date().toISOString(),
      };
      const structuredOutput = {
        ...context.structured,
        assessmentId: saved.assessment.id,
        audit: { ...record(context.structured.audit), applyResult },
      };
      await this.db
        .update(aiGenerationOutputs)
        .set({
          structuredOutput,
          status: 'approved',
          approvedBy: actor.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiGenerationOutputs.id, context.output.id));
      await this.db
        .update(aiGenerationJobs)
        .set({ status: 'approved', errorMessage: null, updatedAt: new Date() })
        .where(eq(aiGenerationJobs.id, jobId));
      return {
        jobId,
        outputId: context.output.id,
        alreadyApplied: false,
        applyResult,
        preview: {
          ...preview,
          alreadyApplied: true,
          applyResult,
          blockedReasons: [],
          publicationIssues: assessmentPublicationIssues(saved.assessment),
        },
      };
    });
  }
}
