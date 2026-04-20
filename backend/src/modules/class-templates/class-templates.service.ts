import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  classTemplateAnnouncements,
  classTemplateAssessmentQuestionOptions,
  classTemplateAssessmentQuestions,
  classTemplateAssessments,
  classTemplateEngineChunks,
  classTemplateLessonBlocks,
  classTemplateLessons,
  classTemplateModuleItems,
  classTemplateModuleSections,
  classTemplateModules,
  classTemplates,
  lessons,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { RoleName } from '../auth/decorators/roles.decorator';
import {
  areSubjectCodesEquivalent,
  normalizeSubjectCode,
} from '../../common/utils/subject-code.util';
import {
  ClassTemplateStatus,
  CreateClassTemplateDto,
  PublishClassTemplateDto,
  type UpdateClassTemplateContentDto,
  UpdateClassTemplateDto,
} from './dto/class-template.dto';
import { sanitizeRichTextHtml } from '../../common/utils/rich-text-sanitizer';
import {
  deriveEngineChunks,
  ENGINE_SCHEMA_VERSION,
  ENGINE_VERSION,
  parseEngineManifest,
  stringifyEngineManifest,
  type EngineModuleItemManifest,
  type EngineTemplateManifest,
  validateEngineManifest,
} from './engine-manifest';

type JsonRecord = Record<string, unknown>;

type CanonicalTemplateLesson = {
  id: string;
  title: string;
  summary: string;
  order: number;
  blocks: Array<{
    id: string;
    blockType: string;
    blockVersion: number;
    order: number;
    payload: JsonRecord;
  }>;
};

type CanonicalTemplateAssessment = {
  id: string;
  title: string;
  description: string;
  type: string;
  dueDateOffsetDays: number | null;
  settings: JsonRecord;
  totalPoints: number;
  order: number;
  questions: Array<{
    id: string;
    type: string;
    content: string;
    points: number;
    order: number;
    isRequired: boolean;
    explanation: string | null;
    imageUrl: string | null;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      order: number;
    }>;
  }>;
};

@Injectable()
export class ClassTemplatesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private sanitizeMetadata(metadata: Record<string, unknown> | null | undefined) {
    if (!metadata || typeof metadata !== 'object' || metadata === null) {
      return metadata as Record<string, unknown> | null;
    }

    const next = { ...metadata };
    const lessonSummary = next.lessonSummary;
    if (typeof lessonSummary === 'string') {
      next.lessonSummary = sanitizeRichTextHtml(lessonSummary);
    }

    const lessonTitle = next.lessonTitle;
    if (typeof lessonTitle === 'string') {
      next.lessonTitle = lessonTitle.trim();
    }

    return next;
  }

  private assertAdmin(roles: string[]) {
    if (!roles.includes(RoleName.Admin)) {
      throw new ForbiddenException('Only admins can manage class templates');
    }
  }

  private coerceString(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  private coerceNumber(value: unknown, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private coerceBoolean(value: unknown, fallback = false) {
    return typeof value === 'boolean' ? value : fallback;
  }

  private coerceOptionalUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
      ? normalized
      : null;
  }

  private normalizeModuleItemIdentifiers(
    modules: UpdateClassTemplateContentDto['modules'] | undefined,
  ) {
    for (const moduleEntry of modules ?? []) {
      for (const section of moduleEntry.sections ?? []) {
        for (const item of section.items ?? []) {
          const normalizedItemId = this.coerceOptionalUuid(item.id) ?? randomUUID();
          item.id = normalizedItemId;

          if (item.itemType === 'lesson') {
            item.templateLessonId =
              this.coerceOptionalUuid(item.templateLessonId) ?? normalizedItemId;
            item.templateAssessmentId = undefined;
            continue;
          }

          if (item.itemType === 'assessment') {
            item.templateAssessmentId =
              this.coerceOptionalUuid(item.templateAssessmentId) ?? undefined;
            item.templateLessonId = undefined;
            continue;
          }

          item.templateAssessmentId = undefined;
          item.templateLessonId = undefined;
        }
      }
    }
  }

  private stripCanonicalLessonFields(metadata: JsonRecord | null | undefined) {
    if (!metadata || typeof metadata !== 'object') {
      return metadata ?? {};
    }
    const next = { ...metadata };
    delete next.lessonTitle;
    delete next.lessonSummary;
    delete next.lessonBlocks;
    delete next.contentBlocks;
    return next;
  }

  private normalizeLessonBlocks(raw: unknown, lessonId: string) {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((entry, index) => {
      const source = (entry ?? {}) as JsonRecord;
      const payload = source.payload as JsonRecord | undefined;
      const content = payload?.content ?? source.content ?? '';
      const metadata = payload?.metadata ?? source.metadata ?? {};
      return {
        id: this.coerceOptionalUuid(source.id) ?? randomUUID(),
        blockType: this.coerceString(source.blockType ?? source.type, 'text'),
        blockVersion: this.coerceNumber(source.blockVersion, 1),
        order: this.coerceNumber(source.order, index + 1),
        payload: {
          content,
          metadata,
          lessonId,
        },
      };
    });
  }

  private deriveLessonsFromContent(
    content: UpdateClassTemplateContentDto,
  ): CanonicalTemplateLesson[] {
    if (content.lessons && content.lessons.length > 0) {
      return content.lessons.map((lesson, lessonIndex) => ({
        id: this.coerceOptionalUuid(lesson.id) ?? randomUUID(),
        title: (lesson.title ?? '').trim() || 'Untitled Lesson',
        summary: sanitizeRichTextHtml(lesson.summary ?? ''),
        order: lesson.order ?? lessonIndex + 1,
        blocks: (lesson.blocks ?? []).map((block, blockIndex) => ({
          id: this.coerceOptionalUuid(block.id) ?? randomUUID(),
          blockType: block.blockType,
          blockVersion: block.blockVersion ?? 1,
          order: block.order ?? blockIndex + 1,
          payload: block.payload ?? {},
        })),
      }));
    }

    const lessons: CanonicalTemplateLesson[] = [];
    const seen = new Set<string>();
    for (const moduleEntry of content.modules ?? []) {
      for (const section of moduleEntry.sections ?? []) {
        for (const item of section.items ?? []) {
          if (item.itemType !== 'lesson') continue;
          const metadata = (item.metadata ?? {}) as JsonRecord;
          const lessonId =
            this.coerceOptionalUuid(item.templateLessonId) ??
            this.coerceOptionalUuid(item.id) ??
            randomUUID();
          if (seen.has(lessonId)) continue;
          seen.add(lessonId);
          lessons.push({
            id: lessonId,
            title:
              this.coerceString(metadata.lessonTitle).trim() || 'Untitled Lesson',
            summary: sanitizeRichTextHtml(
              this.coerceString(metadata.lessonSummary, ''),
            ),
            order: item.order ?? lessons.length + 1,
            blocks: this.normalizeLessonBlocks(
              metadata.lessonBlocks ?? metadata.contentBlocks ?? [],
              lessonId,
            ),
          });
        }
      }
    }

    return lessons;
  }

  private normalizeAssessments(
    content: UpdateClassTemplateContentDto,
  ): CanonicalTemplateAssessment[] {
    return (content.assessments ?? []).map((assessment, assessmentIndex) => ({
      id: this.coerceOptionalUuid(assessment.id) ?? randomUUID(),
      title: (assessment.title ?? '').trim(),
      description: sanitizeRichTextHtml(assessment.description ?? ''),
      type: assessment.type ?? 'quiz',
      dueDateOffsetDays: assessment.settings?.dueDateOffsetDays ?? null,
      settings: (assessment.settings ?? {}) as JsonRecord,
      totalPoints: assessment.totalPoints ?? 0,
      order: assessment.order ?? assessmentIndex + 1,
      questions: (assessment.questions ?? []).map((question, questionIndex) => ({
        id: this.coerceOptionalUuid(question.id) ?? randomUUID(),
        type: question.type ?? 'multiple_choice',
        content: sanitizeRichTextHtml(question.content ?? '<p></p>'),
        points: question.points ?? 1,
        order: question.order ?? questionIndex + 1,
        isRequired: question.isRequired ?? true,
        explanation: question.explanation
          ? sanitizeRichTextHtml(question.explanation)
          : null,
        imageUrl: question.imageUrl ?? null,
        options: (question.options ?? []).map((option, optionIndex) => ({
          id: this.coerceOptionalUuid(option.id) ?? randomUUID(),
          text: option.text ?? '',
          isCorrect: option.isCorrect ?? false,
          order: option.order ?? optionIndex + 1,
        })),
      })),
    }));
  }

  private async persistDerivedChunks(
    tx: any,
    templateId: string,
    lessons: CanonicalTemplateLesson[],
    assessments: CanonicalTemplateAssessment[],
  ) {
    await tx
      .delete(classTemplateEngineChunks)
      .where(eq(classTemplateEngineChunks.templateId, templateId));

    const chunks = deriveEngineChunks(
      lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        order: lesson.order,
        blocks: lesson.blocks.map((block) => ({
          id: block.id,
          blockType: block.blockType,
          blockVersion: block.blockVersion,
          order: block.order,
          payload: block.payload,
        })),
      })),
      assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        dueDateOffsetDays: assessment.dueDateOffsetDays,
        settings: assessment.settings,
        totalPoints: assessment.totalPoints,
        order: assessment.order,
        questions: assessment.questions.map((question) => ({
          id: question.id,
          type: question.type,
          content: question.content,
          points: question.points,
          order: question.order,
          isRequired: question.isRequired,
          explanation: question.explanation,
          imageUrl: question.imageUrl,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order,
          })),
        })),
      })),
    );

    if (chunks.length === 0) {
      return chunks;
    }

    await tx.insert(classTemplateEngineChunks).values(
      chunks.map((chunk) => ({
        id: chunk.id,
        templateId,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        chunkOrder: chunk.chunkOrder,
        content: chunk.content,
        metadata: chunk.metadata ?? {},
      })),
    );

    return chunks;
  }

  async findAll(query?: { subjectCode?: string; subjectGradeLevel?: string }) {
    const filters: SQL[] = [];
    if (query?.subjectCode) {
      filters.push(
        eq(classTemplates.subjectCode, query.subjectCode.toUpperCase()),
      );
    }
    if (query?.subjectGradeLevel) {
      filters.push(
        eq(classTemplates.subjectGradeLevel, query.subjectGradeLevel),
      );
    }

    const rows = await this.db.query.classTemplates.findMany({
      where: filters.length ? and(...filters) : undefined,
      orderBy: [asc(classTemplates.subjectCode), asc(classTemplates.name)],
    });

    return rows;
  }

  async create(
    dto: CreateClassTemplateDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    const payload = {
      name: dto.name.trim(),
      subjectCode: normalizeSubjectCode(dto.subjectCode),
      subjectGradeLevel: dto.subjectGradeLevel,
      createdBy: actorId,
    };

    const [created] = await this.db
      .insert(classTemplates)
      .values(payload)
      .returning();

    await this.auditService.log({
      actorId,
      action: 'class_template.created',
      targetType: 'class_template',
      targetId: created.id,
      metadata: {
        subjectCode: created.subjectCode,
        subjectGradeLevel: created.subjectGradeLevel,
      },
    });

    return created;
  }

  async findOne(id: string) {
    const row = await this.db.query.classTemplates.findFirst({
      where: eq(classTemplates.id, id),
    });
    if (!row) {
      throw new NotFoundException('Class template not found');
    }
    return row;
  }

  async update(
    id: string,
    dto: UpdateClassTemplateDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    const existing = await this.findOne(id);
    const [updated] = await this.db
      .update(classTemplates)
      .set({
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(classTemplates.id, id))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'class_template.updated',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        previousName: existing.name,
        nextName: updated.name,
      },
    });

    return updated;
  }

  async remove(id: string, actorId: string, actorRoles: string[]) {
    this.assertAdmin(actorRoles);
    const existing = await this.findOne(id);
    await this.db.delete(classTemplates).where(eq(classTemplates.id, id));

    await this.auditService.log({
      actorId,
      action: 'class_template.deleted',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        name: existing.name,
        subjectCode: existing.subjectCode,
      },
    });

    return { success: true };
  }

  async publish(
    id: string,
    dto: PublishClassTemplateDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    await this.findOne(id);
    const status = dto.status ?? ClassTemplateStatus.Published;
    const now = new Date();
    const [updated] = await this.db
      .update(classTemplates)
      .set({
        status,
        publishedAt:
          status === ClassTemplateStatus.Published ? now : null,
        updatedAt: now,
      })
      .where(eq(classTemplates.id, id))
      .returning();

    const [updatedLessons, updatedAssessments] = await Promise.all([
      this.db
        .update(lessons)
        .set({
          isDraft: status !== ClassTemplateStatus.Published,
          updatedAt: now,
        })
        .where(
          and(
            eq(lessons.templateId, id),
            eq(lessons.isCoreTemplateAsset, true),
          ),
        )
        .returning({ id: lessons.id }),
      this.db
        .update(assessments)
        .set({
          isPublished: status === ClassTemplateStatus.Published,
          updatedAt: now,
        })
        .where(
          and(
            eq(assessments.templateId, id),
            eq(assessments.isCoreTemplateAsset, true),
          ),
        )
        .returning({ id: assessments.id }),
    ]);

    await this.auditService.log({
      actorId,
      action: 'class_template.published',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        status: updated.status,
        updatedCoreLessons: updatedLessons.length,
        updatedCoreAssessments: updatedAssessments.length,
      },
    });

    return updated;
  }

  async getContent(id: string) {
    await this.findOne(id);

    const [
      modules,
      assessments,
      announcements,
      lessons,
      chunks,
    ] = await Promise.all([
      this.db.query.classTemplateModules.findMany({
        where: eq(classTemplateModules.templateId, id),
        orderBy: [asc(classTemplateModules.order)],
      }),
      this.db.query.classTemplateAssessments.findMany({
        where: eq(classTemplateAssessments.templateId, id),
        orderBy: [asc(classTemplateAssessments.order)],
      }),
      this.db.query.classTemplateAnnouncements.findMany({
        where: eq(classTemplateAnnouncements.templateId, id),
        orderBy: [asc(classTemplateAnnouncements.order)],
      }),
      this.db.query.classTemplateLessons.findMany({
        where: eq(classTemplateLessons.templateId, id),
        orderBy: [asc(classTemplateLessons.order)],
      }),
      this.db.query.classTemplateEngineChunks.findMany({
        where: eq(classTemplateEngineChunks.templateId, id),
        orderBy: [asc(classTemplateEngineChunks.chunkOrder)],
      }),
    ]);

    const lessonIds = lessons.map((entry) => entry.id);
    const assessmentIds = assessments.map((entry) => entry.id);
    const [lessonBlocks, assessmentQuestions] = await Promise.all([
      lessonIds.length
        ? this.db.query.classTemplateLessonBlocks.findMany({
            where: inArray(classTemplateLessonBlocks.templateLessonId, lessonIds),
            orderBy: [asc(classTemplateLessonBlocks.order)],
          })
        : Promise.resolve([]),
      assessmentIds.length
        ? this.db.query.classTemplateAssessmentQuestions.findMany({
            where: inArray(
              classTemplateAssessmentQuestions.templateAssessmentId,
              assessmentIds,
            ),
            orderBy: [asc(classTemplateAssessmentQuestions.order)],
          })
        : Promise.resolve([]),
    ]);

    const questionIds = assessmentQuestions.map((entry) => entry.id);
    const assessmentQuestionOptions = questionIds.length
      ? await this.db.query.classTemplateAssessmentQuestionOptions.findMany({
          where: inArray(
            classTemplateAssessmentQuestionOptions.templateAssessmentQuestionId,
            questionIds,
          ),
          orderBy: [asc(classTemplateAssessmentQuestionOptions.order)],
        })
      : [];

    const lessonIdSet = new Set(lessons.map((entry) => entry.id));
    const assessmentIdSet = new Set(assessments.map((entry) => entry.id));
    const lessonBlocksByLesson = new Map<string, any[]>();
    for (const block of lessonBlocks) {
      if (!lessonIdSet.has(block.templateLessonId)) continue;
      if (!lessonBlocksByLesson.has(block.templateLessonId)) {
        lessonBlocksByLesson.set(block.templateLessonId, []);
      }
      lessonBlocksByLesson.get(block.templateLessonId)!.push(block);
    }

    const optionsByQuestion = new Map<string, any[]>();
    for (const option of assessmentQuestionOptions) {
      if (!optionsByQuestion.has(option.templateAssessmentQuestionId)) {
        optionsByQuestion.set(option.templateAssessmentQuestionId, []);
      }
      optionsByQuestion.get(option.templateAssessmentQuestionId)!.push(option);
    }

    const questionsByAssessment = new Map<string, any[]>();
    for (const question of assessmentQuestions) {
      if (!assessmentIdSet.has(question.templateAssessmentId)) continue;
      if (!questionsByAssessment.has(question.templateAssessmentId)) {
        questionsByAssessment.set(question.templateAssessmentId, []);
      }
      questionsByAssessment.get(question.templateAssessmentId)!.push({
        id: question.id,
        type: question.type,
        content: question.content,
        points: question.points,
        order: question.order,
        isRequired: question.isRequired,
        explanation: question.explanation,
        imageUrl: question.imageUrl,
        options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          order: option.order,
        })),
      });
    }

    const lessonById = new Map(
      lessons.map((lesson) => [
        lesson.id,
        {
          ...lesson,
          blocks: (lessonBlocksByLesson.get(lesson.id) ?? []).map((block) => ({
            id: block.id,
            blockType: block.blockType,
            blockVersion: block.blockVersion,
            order: block.order,
            payload: (block.payload ?? {}) as JsonRecord,
          })),
        },
      ]),
    );

    const moduleIds = modules.map((m) => m.id);
    const sections = moduleIds.length
      ? await this.db.query.classTemplateModuleSections.findMany({
          where: inArray(
            classTemplateModuleSections.templateModuleId,
            moduleIds,
          ),
          orderBy: [asc(classTemplateModuleSections.order)],
        })
      : [];

    const filteredSections = sections.filter((section) =>
      moduleIds.includes(section.templateModuleId),
    );
    const sectionIds = filteredSections.map((section) => section.id);
    const items = sectionIds.length
      ? await this.db.query.classTemplateModuleItems.findMany({
          where: inArray(
            classTemplateModuleItems.templateSectionId,
            sectionIds,
          ),
          orderBy: [asc(classTemplateModuleItems.order)],
        })
      : [];
    const filteredItems = items.filter((item) =>
      sectionIds.includes(item.templateSectionId),
    );

    const sectionByModule = new Map<string, any[]>();
    for (const section of filteredSections) {
      if (!sectionByModule.has(section.templateModuleId)) {
        sectionByModule.set(section.templateModuleId, []);
      }
      sectionByModule.get(section.templateModuleId)!.push({
        ...section,
        items: filteredItems
          .filter((item) => item.templateSectionId === section.id)
          .map((item) => {
            if (item.itemType !== 'lesson' || !item.templateLessonId) {
              return item;
            }
            const lesson = lessonById.get(item.templateLessonId);
            const metadata = {
              ...(item.metadata ?? {}),
              lessonTitle: lesson?.title ?? 'Untitled Lesson',
              lessonSummary: lesson?.summary ?? '',
              lessonBlocks: lesson?.blocks.map((block) => ({
                id: block.id,
                type: block.blockType,
                blockType: block.blockType,
                blockVersion: block.blockVersion,
                order: block.order,
                content: block.payload?.content ?? '',
                metadata:
                  typeof block.payload?.metadata === 'object'
                    ? (block.payload.metadata as JsonRecord)
                    : {},
              })),
            };
            return {
              ...item,
              metadata,
            };
          }),
      });
    }

    return {
      modules: modules.map((module) => ({
        ...module,
        sections: sectionByModule.get(module.id) ?? [],
      })),
      assessments: assessments.map((assessment) => ({
        ...assessment,
        questions: questionsByAssessment.get(assessment.id) ?? [],
      })),
      announcements,
      lessons: Array.from(lessonById.values()),
      chunks,
    };
  }

  async updateContent(
    id: string,
    dto: UpdateClassTemplateContentDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    await this.findOne(id);
    this.normalizeModuleItemIdentifiers(dto.modules);

    await this.db.transaction(async (tx) => {
      const canonicalLessons = this.deriveLessonsFromContent(dto);
      const canonicalAssessments = this.normalizeAssessments(dto);
      const canonicalLessonIdSet = new Set(canonicalLessons.map((lesson) => lesson.id));
      const canonicalAssessmentIdSet = new Set(
        canonicalAssessments.map((assessment) => assessment.id),
      );

      if (dto.assessments) {
        await tx
          .delete(classTemplateAssessments)
          .where(eq(classTemplateAssessments.templateId, id));

        if (canonicalAssessments.length > 0) {
          await tx.insert(classTemplateAssessments).values(
            canonicalAssessments.map((assessment) => ({
              id: assessment.id,
              templateId: id,
              title: assessment.title,
              description: assessment.description,
              type: assessment.type,
              dueDateOffsetDays: assessment.dueDateOffsetDays,
              settings: assessment.settings,
              totalPoints: assessment.totalPoints,
              order: assessment.order,
            })),
          );

          for (const assessment of canonicalAssessments) {
            if (assessment.questions.length === 0) continue;
            await tx.insert(classTemplateAssessmentQuestions).values(
              assessment.questions.map((question) => ({
                id: question.id,
                templateAssessmentId: assessment.id,
                type: question.type,
                content: question.content,
                points: question.points,
                order: question.order,
                isRequired: question.isRequired,
                explanation: question.explanation,
                imageUrl: question.imageUrl,
                metadata: {},
              })),
            );

            for (const question of assessment.questions) {
              if (question.options.length === 0) continue;
              await tx.insert(classTemplateAssessmentQuestionOptions).values(
                question.options.map((option) => ({
                  id: option.id,
                  templateAssessmentQuestionId: question.id,
                  text: option.text,
                  isCorrect: option.isCorrect,
                  order: option.order,
                  metadata: {},
                })),
              );
            }
          }
        }
      }

      if (dto.modules || dto.lessons) {
        await tx
          .delete(classTemplateLessons)
          .where(eq(classTemplateLessons.templateId, id));

        if (canonicalLessons.length > 0) {
          await tx.insert(classTemplateLessons).values(
            canonicalLessons.map((lesson) => ({
              id: lesson.id,
              templateId: id,
              title: lesson.title,
              summary: lesson.summary,
              order: lesson.order,
            })),
          );

          for (const lesson of canonicalLessons) {
            if (lesson.blocks.length === 0) continue;
            await tx.insert(classTemplateLessonBlocks).values(
              lesson.blocks.map((block) => ({
                id: block.id,
                templateLessonId: lesson.id,
                blockType: block.blockType,
                blockVersion: block.blockVersion,
                payload: block.payload,
                order: block.order,
              })),
            );
          }
        }
      }

      if (dto.modules) {
        await tx
          .delete(classTemplateModules)
          .where(eq(classTemplateModules.templateId, id));
        if (dto.modules.length > 0) {
          const lessonIdByItem = new Map<string, string>();
          for (const moduleEntry of dto.modules) {
            for (const section of moduleEntry.sections ?? []) {
              for (const item of section.items ?? []) {
                if (item.itemType !== 'lesson') continue;
                const itemId = this.coerceOptionalUuid(item.id) ?? randomUUID();
                item.id = itemId;
                const templateLessonId =
                  this.coerceOptionalUuid(item.templateLessonId) ?? itemId;
                item.templateLessonId = templateLessonId;
                lessonIdByItem.set(itemId, templateLessonId);
              }
            }
          }

          const insertedModules = await tx
            .insert(classTemplateModules)
            .values(
              dto.modules.map((module, index) => ({
                ...(module.id ? { id: module.id } : {}),
                templateId: id,
                title: module.title,
                description: sanitizeRichTextHtml(module.description ?? ''),
                order: module.order ?? index + 1,
                themeKind: module.themeKind ?? 'gradient',
                gradientId: module.gradientId ?? 'oceanic-blue',
                coverImageUrl: module.coverImageUrl ?? null,
                imagePositionX: module.imagePositionX ?? 50,
                imagePositionY: module.imagePositionY ?? 50,
                imageScale: module.imageScale ?? 120,
                isVisible: module.isVisible ?? false,
                isLocked: module.isLocked ?? true,
                teacherNotes: sanitizeRichTextHtml(module.teacherNotes ?? ''),
              })),
            )
            .returning();

          for (
            let moduleIndex = 0;
            moduleIndex < dto.modules.length;
            moduleIndex += 1
          ) {
            const moduleInput = dto.modules[moduleIndex];
            const moduleRow = insertedModules[moduleIndex];
            const sectionInputs = moduleInput.sections ?? [];
            if (sectionInputs.length === 0) continue;

            const insertedSections = await tx
              .insert(classTemplateModuleSections)
              .values(
                sectionInputs.map((section, sectionIndex) => ({
                  ...(section.id ? { id: section.id } : {}),
                  templateModuleId: moduleRow.id,
                  title: section.title,
                  description: sanitizeRichTextHtml(section.description ?? ''),
                  order: section.order ?? sectionIndex + 1,
                })),
              )
              .returning();

            for (
              let sectionIndex = 0;
              sectionIndex < sectionInputs.length;
              sectionIndex += 1
            ) {
              const sectionInput = sectionInputs[sectionIndex];
              const sectionRow = insertedSections[sectionIndex];
              const itemInputs = sectionInput.items ?? [];
              if (itemInputs.length === 0) continue;

              await tx.insert(classTemplateModuleItems).values(
                itemInputs.map((item, itemIndex) => {
                  const itemId = this.coerceOptionalUuid(item.id) ?? randomUUID();
                  const templateAssessmentId =
                    item.itemType === 'assessment' && this.coerceOptionalUuid(item.templateAssessmentId)
                      ? this.coerceOptionalUuid(item.templateAssessmentId)
                      : null;
                  const normalizedAssessmentId =
                    templateAssessmentId && canonicalAssessmentIdSet.has(templateAssessmentId)
                      ? templateAssessmentId
                      : null;
                  const templateLessonId =
                    item.itemType === 'lesson'
                      ? (this.coerceOptionalUuid(item.templateLessonId) ??
                        lessonIdByItem.get(itemId) ??
                        itemId)
                      : null;
                  const normalizedLessonId =
                    templateLessonId && canonicalLessonIdSet.has(templateLessonId)
                      ? templateLessonId
                      : null;
                  return {
                    id: itemId,
                    templateSectionId: sectionRow.id,
                    itemType: item.itemType,
                    templateAssessmentId: normalizedAssessmentId,
                    templateLessonId: normalizedLessonId,
                    order: item.order ?? itemIndex + 1,
                    isRequired: item.isRequired ?? false,
                    metadata:
                      item.itemType === 'lesson'
                        ? this.stripCanonicalLessonFields(
                            this.sanitizeMetadata(
                              item.metadata as Record<string, unknown>,
                            ),
                          )
                        : (item.metadata ?? {}),
                    points: item.points ?? null,
                  };
                }),
              );
            }
          }
        }
      }

      if (dto.announcements) {
        await tx
          .delete(classTemplateAnnouncements)
          .where(eq(classTemplateAnnouncements.templateId, id));
        if (dto.announcements.length > 0) {
          await tx.insert(classTemplateAnnouncements).values(
            dto.announcements.map((announcement, index) => ({
              id: announcement.id ?? randomUUID(),
              templateId: id,
              title: announcement.title,
              content: sanitizeRichTextHtml(announcement.content),
              isPinned: announcement.isPinned ?? false,
              order: announcement.order ?? index + 1,
            })),
          );
        }
      }

      await this.persistDerivedChunks(
        tx,
        id,
        canonicalLessons,
        canonicalAssessments,
      );

      await tx
        .update(classTemplates)
        .set({ updatedAt: new Date(), status: ClassTemplateStatus.Draft })
        .where(eq(classTemplates.id, id));
    });

    await this.auditService.log({
      actorId,
      action: 'class_template.content.updated',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        modules: dto.modules?.length ?? 0,
        assessments: dto.assessments?.length ?? 0,
        announcements: dto.announcements?.length ?? 0,
      },
    });

    return this.getContent(id);
  }

  async getPublishedByCompatibility(
    subjectCode: string,
    subjectGradeLevel: string,
  ) {
    if (!subjectCode || !subjectGradeLevel) {
      throw new BadRequestException(
        'subjectCode and subjectGradeLevel are required to filter templates',
      );
    }

    const rows = await this.db.query.classTemplates.findMany({
      where: and(
        eq(classTemplates.subjectGradeLevel, subjectGradeLevel),
        eq(classTemplates.status, ClassTemplateStatus.Published),
      ),
      orderBy: [asc(classTemplates.name)],
    });

    return rows.filter((row) =>
      areSubjectCodesEquivalent(row.subjectCode, subjectCode),
    );
  }

  async getEngineExport(id: string) {
    const template = await this.findOne(id);
    const content = await this.getContent(id);
    const derivedChunks = deriveEngineChunks(
      (content.lessons ?? []).map((lesson: any) => ({
        id: lesson.id,
        title: this.coerceString(lesson.title, 'Untitled Lesson'),
        summary: this.coerceString(lesson.summary, ''),
        order: this.coerceNumber(lesson.order, 0),
        blocks: (lesson.blocks ?? []).map((block: any) => ({
          id: block.id,
          blockType: this.coerceString(block.blockType, 'text'),
          blockVersion: this.coerceNumber(block.blockVersion, 1),
          order: this.coerceNumber(block.order, 0),
          payload: (block.payload ?? {}) as JsonRecord,
        })),
      })),
      (content.assessments ?? []).map((assessment: any) => ({
        id: assessment.id,
        id: this.coerceString(assessment.id),
        title: this.coerceString(assessment.title, 'Untitled Assessment'),
        description: this.coerceString(assessment.description, ''),
        type: this.coerceString(assessment.type, 'quiz'),
        dueDateOffsetDays:
          assessment.dueDateOffsetDays == null
            ? null
            : this.coerceNumber(assessment.dueDateOffsetDays, 0),
        settings: (assessment.settings ?? {}) as JsonRecord,
        totalPoints: this.coerceNumber(assessment.totalPoints, 0),
        order: this.coerceNumber(assessment.order, 0),
        questions: (assessment.questions ?? []).map((question: any) => ({
          id: question.id,
          type: this.coerceString(question.type, 'multiple_choice'),
          content: this.coerceString(question.content),
          points: this.coerceNumber(question.points, 1),
          order: this.coerceNumber(question.order, 0),
          isRequired: this.coerceBoolean(question.isRequired, true),
          explanation: this.coerceString(question.explanation, ''),
          imageUrl: this.coerceString(question.imageUrl, ''),
          options: (question.options ?? []).map((option: any) => ({
            id: option.id,
            text: this.coerceString(option.text),
            isCorrect: this.coerceBoolean(option.isCorrect, false),
            order: this.coerceNumber(option.order, 0),
          })),
        })),
      })),
    );

    const manifest: EngineTemplateManifest = {
      schemaVersion: ENGINE_SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      exportedAt: new Date().toISOString(),
      template: {
        id: this.coerceString(template.id),
        name: this.coerceString(template.name, 'Untitled Template'),
        subjectCode: this.coerceString(template.subjectCode, 'UNKNOWN'),
        subjectGradeLevel: this.coerceString(
          template.subjectGradeLevel,
          'Unknown',
        ),
        status: template.status,
        notes: null,
      },
      modules: (content.modules ?? []).map((module: any) => ({
        id: this.coerceString(module.id),
        title: this.coerceString(module.title, 'Untitled Module'),
        description: this.coerceString(module.description, ''),
        order: this.coerceNumber(module.order, 0),
        themeKind: this.coerceString(module.themeKind, 'gradient'),
        gradientId: this.coerceString(module.gradientId, 'oceanic-blue'),
        coverImageUrl:
          typeof module.coverImageUrl === 'string' ? module.coverImageUrl : null,
        imagePositionX: this.coerceNumber(module.imagePositionX, 50),
        imagePositionY: this.coerceNumber(module.imagePositionY, 50),
        imageScale: this.coerceNumber(module.imageScale, 120),
        isVisible: this.coerceBoolean(module.isVisible, false),
        isLocked: this.coerceBoolean(module.isLocked, true),
        teacherNotes: this.coerceString(module.teacherNotes, ''),
        sections: (module.sections ?? []).map((section: any) => ({
          id: this.coerceString(section.id),
          title: this.coerceString(section.title, 'Untitled Section'),
          description: this.coerceString(section.description, ''),
          order: this.coerceNumber(section.order, 0),
          items: (section.items ?? []).map((item: any) => ({
            id: this.coerceString(item.id),
            itemType: this.coerceString(
              item.itemType,
              'file',
            ) as EngineModuleItemManifest['itemType'],
            order: this.coerceNumber(item.order, 0),
            isRequired: this.coerceBoolean(item.isRequired, false),
            points:
              item.points == null ? null : this.coerceNumber(item.points, 0),
            lessonId:
              item.templateLessonId == null
                ? null
                : this.coerceString(item.templateLessonId),
            assessmentId:
              item.templateAssessmentId == null
                ? null
                : this.coerceString(item.templateAssessmentId),
            metadata: (item.metadata ?? {}) as JsonRecord,
          })),
        })),
      })),
      lessons: (content.lessons ?? []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary ?? '',
        order: lesson.order ?? 0,
        blocks: (lesson.blocks ?? []).map((block: any) => ({
          id: block.id,
          blockType: block.blockType,
          blockVersion: block.blockVersion ?? 1,
          order: block.order ?? 0,
          payload: (block.payload ?? {}) as JsonRecord,
        })),
      })),
      assessments: (content.assessments ?? []).map((assessment: any) => ({
        id: assessment.id,
        title: assessment.title,
        description: assessment.description ?? '',
        type: assessment.type ?? 'quiz',
        dueDateOffsetDays: assessment.dueDateOffsetDays ?? null,
        settings: (assessment.settings ?? {}) as JsonRecord,
        totalPoints: assessment.totalPoints ?? 0,
        order: assessment.order ?? 0,
        questions: (assessment.questions ?? []).map((question: any) => ({
          id: question.id,
          type: question.type ?? 'multiple_choice',
          content: question.content ?? '',
          points: question.points ?? 1,
          order: question.order ?? 0,
          isRequired: question.isRequired ?? true,
          explanation: question.explanation ?? null,
          imageUrl: question.imageUrl ?? null,
          options: (question.options ?? []).map((option: any) => ({
            id: option.id,
            text: option.text ?? '',
            isCorrect: option.isCorrect ?? false,
            order: option.order ?? 0,
          })),
        })),
      })),
      announcements: (content.announcements ?? []).map((announcement: any) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        isPinned: announcement.isPinned ?? false,
        order: announcement.order ?? 0,
      })),
      chunks: derivedChunks,
    };

    return {
      fileName: `engine-template-${template.subjectCode}-${template.id}.yaml`,
      manifest,
      yaml: stringifyEngineManifest(manifest),
    };
  }

  async validateEngineImport(manifestText: string) {
    let manifest: EngineTemplateManifest;
    try {
      manifest = parseEngineManifest(manifestText);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: 'manifest',
            message:
              error instanceof Error ? error.message : 'Failed to parse YAML',
          },
        ],
        warnings: [],
        summary: {
          modules: 0,
          sections: 0,
          items: 0,
          lessons: 0,
          lessonBlocks: 0,
          assessments: 0,
          questions: 0,
          options: 0,
          chunks: 0,
        },
        normalizedPreview: null,
      };
    }

    return validateEngineManifest(manifest);
  }

  async importEngine(
    manifestText: string,
    actorId: string,
    actorRoles: string[],
    publish = false,
  ) {
    this.assertAdmin(actorRoles);

    const manifest = parseEngineManifest(manifestText);
    const validation = validateEngineManifest(manifest);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Engine manifest validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const templateId = manifest.template.id;
    await this.db.transaction(async (tx) => {
      const nextStatus = publish
        ? ClassTemplateStatus.Published
        : (manifest.template.status as ClassTemplateStatus) ??
          ClassTemplateStatus.Draft;

      await tx
        .insert(classTemplates)
        .values({
          id: templateId,
          name: manifest.template.name.trim(),
          subjectCode: normalizeSubjectCode(manifest.template.subjectCode),
          subjectGradeLevel: manifest.template.subjectGradeLevel,
          status: nextStatus,
          createdBy: actorId,
          publishedAt:
            nextStatus === ClassTemplateStatus.Published ? new Date() : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: classTemplates.id,
          set: {
            name: manifest.template.name.trim(),
            subjectCode: normalizeSubjectCode(manifest.template.subjectCode),
            subjectGradeLevel: manifest.template.subjectGradeLevel,
            status: nextStatus,
            publishedAt:
              nextStatus === ClassTemplateStatus.Published ? new Date() : null,
            updatedAt: new Date(),
          },
        });

      await tx
        .delete(classTemplateAnnouncements)
        .where(eq(classTemplateAnnouncements.templateId, templateId));
      await tx
        .delete(classTemplateModules)
        .where(eq(classTemplateModules.templateId, templateId));
      await tx
        .delete(classTemplateAssessments)
        .where(eq(classTemplateAssessments.templateId, templateId));
      await tx
        .delete(classTemplateLessons)
        .where(eq(classTemplateLessons.templateId, templateId));
      await tx
        .delete(classTemplateEngineChunks)
        .where(eq(classTemplateEngineChunks.templateId, templateId));

      if (manifest.announcements.length > 0) {
        await tx.insert(classTemplateAnnouncements).values(
          manifest.announcements.map((announcement) => ({
            id: announcement.id,
            templateId,
            title: announcement.title,
            content: sanitizeRichTextHtml(announcement.content),
            isPinned: announcement.isPinned,
            order: announcement.order,
          })),
        );
      }

      if (manifest.lessons.length > 0) {
        await tx.insert(classTemplateLessons).values(
          manifest.lessons.map((lesson) => ({
            id: lesson.id,
            templateId,
            title: lesson.title,
            summary: lesson.summary ?? '',
            order: lesson.order,
          })),
        );

        for (const lesson of manifest.lessons) {
          if (lesson.blocks.length === 0) continue;
          await tx.insert(classTemplateLessonBlocks).values(
            lesson.blocks.map((block) => ({
              id: block.id,
              templateLessonId: lesson.id,
              blockType: block.blockType,
              blockVersion: block.blockVersion,
              payload: block.payload,
              order: block.order,
            })),
          );
        }
      }

      if (manifest.assessments.length > 0) {
        await tx.insert(classTemplateAssessments).values(
          manifest.assessments.map((assessment) => ({
            id: assessment.id,
            templateId,
            title: assessment.title,
            description: assessment.description ?? '',
            type: assessment.type,
            dueDateOffsetDays: assessment.dueDateOffsetDays ?? null,
            settings: assessment.settings ?? {},
            totalPoints: assessment.totalPoints,
            order: assessment.order,
          })),
        );

        for (const assessment of manifest.assessments) {
          if (assessment.questions.length === 0) continue;
          await tx.insert(classTemplateAssessmentQuestions).values(
            assessment.questions.map((question) => ({
              id: question.id,
              templateAssessmentId: assessment.id,
              type: question.type,
              content: sanitizeRichTextHtml(question.content),
              points: question.points,
              order: question.order,
              isRequired: question.isRequired,
              explanation: question.explanation ?? null,
              imageUrl: question.imageUrl ?? null,
              metadata: {},
            })),
          );

          for (const question of assessment.questions) {
            if (question.options.length === 0) continue;
            await tx.insert(classTemplateAssessmentQuestionOptions).values(
              question.options.map((option) => ({
                id: option.id,
                templateAssessmentQuestionId: question.id,
                text: option.text,
                isCorrect: option.isCorrect,
                order: option.order,
                metadata: {},
              })),
            );
          }
        }
      }

      if (manifest.modules.length > 0) {
        await tx.insert(classTemplateModules).values(
          manifest.modules.map((module) => ({
            id: module.id,
            templateId,
            title: module.title,
            description: sanitizeRichTextHtml(module.description ?? ''),
            order: module.order,
            themeKind: module.themeKind ?? 'gradient',
            gradientId: module.gradientId ?? 'oceanic-blue',
            coverImageUrl: module.coverImageUrl ?? null,
            imagePositionX: module.imagePositionX ?? 50,
            imagePositionY: module.imagePositionY ?? 50,
            imageScale: module.imageScale ?? 120,
            isVisible: module.isVisible ?? false,
            isLocked: module.isLocked ?? true,
            teacherNotes: sanitizeRichTextHtml(module.teacherNotes ?? ''),
          })),
        );

        for (const module of manifest.modules) {
          if (module.sections.length === 0) continue;
          await tx.insert(classTemplateModuleSections).values(
            module.sections.map((section) => ({
              id: section.id,
              templateModuleId: module.id,
              title: section.title,
              description: sanitizeRichTextHtml(section.description ?? ''),
              order: section.order,
            })),
          );

          for (const section of module.sections) {
            if (section.items.length === 0) continue;
            await tx.insert(classTemplateModuleItems).values(
              section.items.map((item) => ({
                id: item.id,
                templateSectionId: section.id,
                itemType: item.itemType,
                templateAssessmentId:
                  item.itemType === 'assessment'
                    ? this.coerceOptionalUuid(item.assessmentId)
                    : null,
                templateLessonId:
                  item.itemType === 'lesson'
                    ? this.coerceOptionalUuid(item.lessonId)
                    : null,
                order: item.order,
                isRequired: item.isRequired ?? false,
                metadata:
                  item.itemType === 'lesson'
                    ? this.stripCanonicalLessonFields(item.metadata ?? {})
                    : (item.metadata ?? {}),
                points: item.points ?? null,
              })),
            );
          }
        }
      }

      const regeneratedChunks = deriveEngineChunks(
        manifest.lessons,
        manifest.assessments,
      );

      if (regeneratedChunks.length > 0) {
        await tx.insert(classTemplateEngineChunks).values(
          regeneratedChunks.map((chunk) => ({
            id: chunk.id,
            templateId,
            sourceType: chunk.sourceType,
            sourceId: chunk.sourceId,
            chunkOrder: chunk.chunkOrder,
            content: chunk.content,
            metadata: chunk.metadata ?? {},
          })),
        );
      }
    });

    await this.auditService.log({
      actorId,
      action: 'class_template.engine_imported',
      targetType: 'class_template',
      targetId: templateId,
      metadata: {
        schemaVersion: manifest.schemaVersion,
        engineVersion: manifest.engineVersion,
      },
    });

    return {
      template: await this.findOne(templateId),
      summary: validation.summary,
      warnings: validation.warnings,
      regeneratedChunkJobs: [],
    };
  }
}
