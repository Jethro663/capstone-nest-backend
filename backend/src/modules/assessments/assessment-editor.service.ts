import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessmentEditorReceipts,
  assessmentQuestionOptions,
} from '../../drizzle/schema';
import { AssessmentsService } from './assessments.service';
import {
  EditorOptionDto,
  SaveAssessmentEditorDto,
} from './DTO/assessment-editor.dto';
import {
  CreateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from './DTO/assessment.dto';
import {
  assessmentPublicationIssues,
  PublicationIssue,
} from './assessment-readiness';
import { sanitizeRichTextHtml } from '../../common/utils/rich-text-sanitizer';

type Actor = { userId?: string; id?: string; roles?: string[] };
type Assessment = Awaited<ReturnType<AssessmentsService['getAssessmentById']>>;
export type EditorSaveResult = {
  assessment: Assessment;
  revision: number;
  questionIds: Record<string, string>;
  publicationIssues: PublicationIssue[];
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

function differs(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  return Object.entries(next).some(([key, value]) => {
    if (value === undefined) return false;
    const before = previous[key];
    if (key === 'content' || key === 'explanation')
      return (
        sanitizeRichTextHtml(String(before ?? '')) !==
        sanitizeRichTextHtml(String(value ?? ''))
      );
    if (key === 'imageUrl') return (before || null) !== (value || null);
    if (key === 'conceptTags')
      return canonical(before ?? []) !== canonical(value ?? []);
    if (key === 'isRequired') return (before ?? true) !== (value ?? true);
    return canonical(before ?? null) !== canonical(value ?? null);
  });
}

@Injectable()
export class AssessmentEditorService {
  constructor(
    private readonly database: DatabaseService,
    private readonly assessments: AssessmentsService,
  ) {}
  private get db() {
    return this.database.db;
  }

  async save(
    id: string | undefined,
    dto: SaveAssessmentEditorDto,
    actor: Actor,
  ): Promise<EditorSaveResult> {
    return this.database.academicTransaction(async () => {
      const actorId = actor.userId ?? actor.id;
      if (
        !actorId ||
        !actor.roles?.some((role) => role === 'teacher' || role === 'admin')
      )
        throw new ForbiddenException('Teacher access is required');
      const existing = id
        ? await this.assessments.getAssessmentById(id, undefined, actor)
        : undefined;
      if (
        existing &&
        !actor.roles.includes('admin') &&
        existing.class?.teacherId !== actorId
      )
        throw new ForbiddenException(
          'You can only manage assessments for your own classes',
        );
      const hash = createHash('sha256')
        .update(canonical({ id: id ?? null, ...dto }))
        .digest('hex');
      const receipt = await this.db.query.assessmentEditorReceipts.findFirst({
        where: and(
          eq(assessmentEditorReceipts.actorId, actorId),
          eq(assessmentEditorReceipts.mutationId, dto.mutationId),
        ),
      });
      if (receipt) {
        if (receipt.requestHash !== hash)
          throw new ConflictException(
            'This save identifier was already used for different changes',
          );
        // Access may have changed since the original request, including on create replays.
        await this.assessments.getAssessmentById(
          receipt.assessmentId,
          undefined,
          actor,
        );
        return receipt.response as EditorSaveResult;
      }
      if (
        existing &&
        (dto.expectedRevision === undefined ||
          dto.expectedRevision !== Number(existing.editorRevision ?? 0))
      )
        throw new ConflictException({
          code: 'ASSESSMENT_REVISION_CONFLICT',
          message:
            'This assessment changed on another device. Reload it before saving; your recovery copy is retained.',
        });
      if (existing && dto.classId && dto.classId !== existing.classId)
        throw new BadRequestException(
          'An existing assessment cannot be moved to a different class',
        );
      if (!existing && !dto.classId)
        throw new BadRequestException('Select a class first');
      const settings = { ...(dto.settings ?? {}) };
      if ('title' in settings || !existing)
        settings.title = settings.title?.trim() || 'Untitled assessment';
      let assessment: Assessment;
      if (existing)
        assessment = await this.assessments.updateAssessment(
          existing.id,
          settings,
          actor,
        );
      else {
        const { rubricCriteria, ...createSettings } = settings;
        assessment = await this.assessments.createAssessment(
          {
            ...createSettings,
            title: settings.title!,
            classId: dto.classId!,
          } as CreateAssessmentDto,
          actor,
        );
        if (rubricCriteria)
          await this.assessments.updateAssessment(
            assessment.id,
            { rubricCriteria },
            actor,
          );
      }
      const previous = new Map(
        (existing?.questions ?? []).map((question) => [question.id, question]),
      );
      const deleted = new Set(dto.deletedQuestionIds ?? []);
      if (deleted.size !== (dto.deletedQuestionIds ?? []).length)
        throw new BadRequestException('Question deletions contain duplicates');
      for (const questionId of deleted) {
        if (!previous.has(questionId))
          throw new BadRequestException(
            'Deleted question does not belong to this assessment',
          );
        if (existing?.isCoreTemplateAsset)
          throw new ForbiddenException(
            'Core template questions cannot be changed',
          );
        await this.assessments.deleteQuestion(questionId, actor);
      }
      const questionIds: Record<string, string> = Object.create(null);
      const seen = new Set<string>();
      for (const question of dto.questions ?? []) {
        if (
          questionIds[question.clientId] ||
          (question.id && seen.has(question.id))
        )
          throw new BadRequestException('Question identifiers must be unique');
        if (question.id) seen.add(question.id);
        if (question.id && deleted.has(question.id))
          throw new BadRequestException(
            'A question cannot be updated and deleted in the same save',
          );
        const {
          id: questionId,
          clientId,
          type,
          options,
          deletedOptionIds,
          ...fields
        } = question;
        if (!questionId) {
          if (existing?.isCoreTemplateAsset)
            throw new ForbiddenException(
              'Core template questions cannot be changed',
            );
          const created = await this.assessments.createQuestion(
            {
              ...fields,
              type,
              assessmentId: assessment.id,
              options: options?.map(({ id: _id, ...option }) => option),
            } as CreateQuestionDto,
            actor,
          );
          questionIds[clientId] = created.id;
          continue;
        }
        const old = previous.get(questionId);
        if (!old)
          throw new BadRequestException(
            'Question does not belong to this assessment',
          );
        if (old.type !== type)
          throw new BadRequestException(
            'Existing question types cannot be changed; add a replacement question',
          );
        const optionChanges = this.optionsChanged(
          old.options,
          options,
          deletedOptionIds,
        );
        if (differs(old, fields) || optionChanges) {
          if (existing?.isCoreTemplateAsset)
            throw new ForbiddenException(
              'Core template questions cannot be changed',
            );
          // This enforces ownership, attempt and academic guards without replacing options.
          await this.assessments.updateQuestion(
            questionId,
            fields as UpdateQuestionDto,
            actor,
          );
          if (optionChanges)
            await this.syncOptions(
              questionId,
              old.options,
              options ?? [],
              deletedOptionIds ?? [],
            );
        }
        questionIds[clientId] = questionId;
      }
      assessment = await this.assessments.getAssessmentById(
        assessment.id,
        undefined,
        actor,
      );
      let publicationIssues = assessmentPublicationIssues(assessment);
      if (
        dto.action === 'publish' ||
        (assessment.isPublished && dto.action !== 'unpublish')
      ) {
        if (publicationIssues.length)
          throw new BadRequestException({
            code: 'ASSESSMENT_NOT_READY',
            message: assessment.isPublished
              ? 'Move this assessment to draft before saving unfinished content'
              : 'Complete the highlighted fields before Ready to give',
            errors: publicationIssues.map((issue) => issue.message),
            fieldErrors: publicationIssues,
          });
      }
      if (dto.action !== 'save') {
        await this.assessments.updateAssessment(
          assessment.id,
          { isPublished: dto.action === 'publish' },
          actor,
        );
        assessment = await this.assessments.getAssessmentById(
          assessment.id,
          undefined,
          actor,
        );
        publicationIssues = assessmentPublicationIssues(assessment);
      }
      const result: EditorSaveResult = {
        assessment,
        revision: Number(assessment.editorRevision ?? 0),
        questionIds,
        publicationIssues,
      };
      await this.db.insert(assessmentEditorReceipts).values({
        actorId,
        mutationId: dto.mutationId,
        assessmentId: assessment.id,
        requestHash: hash,
        response: result,
      });
      return result;
    });
  }

  private optionsChanged(
    old: Record<string, unknown>[],
    options?: EditorOptionDto[],
    deleted?: string[],
  ): boolean {
    if (deleted?.length) return true;
    return (options ?? []).some((option) => {
      const previous = old.find((entry) => entry.id === option.id);
      const { id: _id, ...fields } = option;
      return !previous || differs(previous, fields);
    });
  }

  private async syncOptions(
    questionId: string,
    old: Record<string, unknown>[],
    options: EditorOptionDto[],
    deleted: string[],
  ) {
    const ids = new Set(old.map((option) => String(option.id)));
    if (deleted.some((id) => !ids.has(id)))
      throw new BadRequestException(
        'Deleted option does not belong to this question',
      );
    if (deleted.length)
      await this.db
        .delete(assessmentQuestionOptions)
        .where(
          and(
            eq(assessmentQuestionOptions.questionId, questionId),
            inArray(assessmentQuestionOptions.id, deleted),
          ),
        );
    const seen = new Set<string>();
    for (const option of options) {
      if (
        option.id &&
        (!ids.has(option.id) ||
          deleted.includes(option.id) ||
          seen.has(option.id))
      )
        throw new BadRequestException(
          'Option does not belong to this question or is duplicated/deleted',
        );
      if (option.id) seen.add(option.id);
      const previous = old.find((entry) => entry.id === option.id);
      const metadata = {
        ...((previous?.metadata as Record<string, unknown>) ?? {}),
      };
      for (const key of [
        'imageDisplayMode',
        'imageZoom',
        'imagePositionX',
        'imagePositionY',
      ] as const) {
        if (option[key] !== undefined) metadata[key] = option[key];
      }
      const values = {
        text: option.text,
        isCorrect: option.isCorrect,
        order: option.order,
        ...(option.imageUrl !== undefined ? { imageUrl: option.imageUrl } : {}),
        metadata,
      };
      if (option.id)
        await this.db
          .update(assessmentQuestionOptions)
          .set(values)
          .where(eq(assessmentQuestionOptions.id, option.id));
      else
        await this.db
          .insert(assessmentQuestionOptions)
          .values({ ...values, questionId });
    }
  }
}
