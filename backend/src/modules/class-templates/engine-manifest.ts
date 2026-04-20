import YAML from 'yaml';

export const ENGINE_SCHEMA_VERSION = '1.0';
export const ENGINE_VERSION = '1.0';

export interface EngineTemplateIdentity {
  id: string;
  name: string;
  subjectCode: string;
  subjectGradeLevel: string;
  status: string;
  notes?: string | null;
}

export interface EngineModuleItemManifest {
  id: string;
  itemType: 'lesson' | 'assessment' | 'file';
  order: number;
  isRequired?: boolean;
  points?: number | null;
  lessonId?: string | null;
  assessmentId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface EngineModuleSectionManifest {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  items: EngineModuleItemManifest[];
}

export interface EngineModuleManifest {
  id: string;
  title: string;
  description?: string | null;
  teacherNotes?: string | null;
  order: number;
  isVisible?: boolean;
  isLocked?: boolean;
  themeKind?: string;
  gradientId?: string;
  coverImageUrl?: string | null;
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
  sections: EngineModuleSectionManifest[];
}

export interface EngineLessonBlockManifest {
  id: string;
  blockType: string;
  blockVersion: number;
  order: number;
  payload: Record<string, unknown>;
}

export interface EngineLessonManifest {
  id: string;
  title: string;
  summary?: string | null;
  order: number;
  blocks: EngineLessonBlockManifest[];
}

export interface EngineAssessmentOptionManifest {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface EngineAssessmentQuestionManifest {
  id: string;
  type: string;
  content: string;
  points: number;
  order: number;
  isRequired: boolean;
  explanation?: string | null;
  imageUrl?: string | null;
  options: EngineAssessmentOptionManifest[];
}

export interface EngineAssessmentManifest {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  dueDateOffsetDays?: number | null;
  settings?: Record<string, unknown> | null;
  totalPoints: number;
  order: number;
  questions: EngineAssessmentQuestionManifest[];
}

export interface EngineAnnouncementManifest {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  order: number;
}

export interface EngineChunkManifest {
  id: string;
  sourceType: 'lesson_block' | 'assessment_question';
  sourceId: string;
  chunkOrder: number;
  content: string;
  metadata?: Record<string, unknown> | null;
}

export interface EngineTemplateManifest {
  schemaVersion: string;
  engineVersion: string;
  exportedAt: string;
  template: EngineTemplateIdentity;
  modules: EngineModuleManifest[];
  lessons: EngineLessonManifest[];
  assessments: EngineAssessmentManifest[];
  announcements: EngineAnnouncementManifest[];
  chunks: EngineChunkManifest[];
}

export interface EngineImportValidationIssue {
  path: string;
  message: string;
}

export interface EngineImportValidationResult {
  valid: boolean;
  errors: EngineImportValidationIssue[];
  warnings: EngineImportValidationIssue[];
  summary: {
    modules: number;
    sections: number;
    items: number;
    lessons: number;
    lessonBlocks: number;
    assessments: number;
    questions: number;
    options: number;
    chunks: number;
  };
  normalizedPreview: EngineTemplateManifest | null;
}

const SUPPORTED_BLOCK_TYPES = new Set([
  'text',
  'image',
  'video',
  'question',
  'file',
  'divider',
]);

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toChunkTextFromPayload(payload: Record<string, unknown>): string {
  const content = payload.content;
  if (typeof content === 'string') {
    return stripHtml(content);
  }
  if (content && typeof content === 'object') {
    return JSON.stringify(content);
  }
  return '';
}

function countSummary(manifest: EngineTemplateManifest) {
  let sections = 0;
  let items = 0;
  let lessonBlocks = 0;
  let questions = 0;
  let options = 0;

  for (const moduleEntry of manifest.modules) {
    sections += moduleEntry.sections.length;
    for (const section of moduleEntry.sections) {
      items += section.items.length;
    }
  }

  for (const lesson of manifest.lessons) {
    lessonBlocks += lesson.blocks.length;
  }

  for (const assessment of manifest.assessments) {
    questions += assessment.questions.length;
    for (const question of assessment.questions) {
      options += question.options.length;
    }
  }

  return {
    modules: manifest.modules.length,
    sections,
    items,
    lessons: manifest.lessons.length,
    lessonBlocks,
    assessments: manifest.assessments.length,
    questions,
    options,
    chunks: manifest.chunks.length,
  };
}

function pushDuplicateIssues(
  errors: EngineImportValidationIssue[],
  ids: string[],
  path: string,
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  for (const id of duplicates) {
    errors.push({ path, message: `Duplicate id "${id}"` });
  }
}

export function deriveEngineChunks(
  lessons: EngineLessonManifest[],
  assessments: EngineAssessmentManifest[],
): EngineChunkManifest[] {
  const chunks: EngineChunkManifest[] = [];
  let order = 1;

  for (const lesson of [...lessons].sort((a, b) => a.order - b.order)) {
    for (const block of [...lesson.blocks].sort((a, b) => a.order - b.order)) {
      const content = toChunkTextFromPayload(block.payload);
      chunks.push({
        id: `chunk.lesson.${lesson.id}.${block.id}`,
        sourceType: 'lesson_block',
        sourceId: block.id,
        chunkOrder: order,
        content: [lesson.title, content].filter(Boolean).join('\n'),
        metadata: {
          lessonId: lesson.id,
          blockType: block.blockType,
          blockOrder: block.order,
        },
      });
      order += 1;
    }
  }

  for (const assessment of [...assessments].sort((a, b) => a.order - b.order)) {
    for (const question of [...assessment.questions].sort(
      (a, b) => a.order - b.order,
    )) {
      chunks.push({
        id: `chunk.assessment.${assessment.id}.${question.id}`,
        sourceType: 'assessment_question',
        sourceId: question.id,
        chunkOrder: order,
        content: [assessment.title, stripHtml(question.content)]
          .filter(Boolean)
          .join('\n'),
        metadata: {
          assessmentId: assessment.id,
          questionType: question.type,
          questionOrder: question.order,
        },
      });
      order += 1;
    }
  }

  return chunks;
}

export function parseEngineManifest(manifestText: string): EngineTemplateManifest {
  const parsed = YAML.parse(manifestText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Manifest must be a YAML object');
  }
  return parsed as EngineTemplateManifest;
}

export function stringifyEngineManifest(manifest: EngineTemplateManifest): string {
  return YAML.stringify(manifest, {
    sortMapEntries: true,
    lineWidth: 120,
  });
}

export function validateEngineManifest(
  manifest: EngineTemplateManifest,
): EngineImportValidationResult {
  const errors: EngineImportValidationIssue[] = [];
  const warnings: EngineImportValidationIssue[] = [];
  const asArray = <T>(
    value: unknown,
    path: string,
    message = `${path} must be an array`,
  ): T[] => {
    if (Array.isArray(value)) {
      return value as T[];
    }
    errors.push({ path, message });
    return [];
  };

  const modules = asArray<EngineModuleManifest>(manifest.modules, 'modules');
  const lessons = asArray<EngineLessonManifest>(manifest.lessons, 'lessons');
  const assessments = asArray<EngineAssessmentManifest>(
    manifest.assessments,
    'assessments',
  );
  const announcements = asArray<EngineAnnouncementManifest>(
    manifest.announcements,
    'announcements',
  );
  const chunks = asArray<EngineChunkManifest>(manifest.chunks, 'chunks');

  const normalizedManifest: EngineTemplateManifest = {
    schemaVersion: manifest.schemaVersion,
    engineVersion: manifest.engineVersion,
    exportedAt: manifest.exportedAt,
    template: manifest.template ?? ({} as EngineTemplateIdentity),
    modules,
    lessons,
    assessments,
    announcements,
    chunks,
  };

  if (normalizedManifest.schemaVersion !== ENGINE_SCHEMA_VERSION) {
    errors.push({
      path: 'schemaVersion',
      message: `Unsupported schemaVersion "${normalizedManifest.schemaVersion}". Expected "${ENGINE_SCHEMA_VERSION}".`,
    });
  }

  if (!normalizedManifest.template?.id) {
    errors.push({
      path: 'template.id',
      message: 'template.id is required',
    });
  }

  const lessonsById = new Set(lessons.map((entry) => entry.id));
  const assessmentsById = new Set(assessments.map((entry) => entry.id));

  pushDuplicateIssues(
    errors,
    modules.map((entry) => entry.id),
    'modules',
  );
  pushDuplicateIssues(errors, lessons.map((entry) => entry.id), 'lessons');
  pushDuplicateIssues(
    errors,
    assessments.map((entry) => entry.id),
    'assessments',
  );

  for (const moduleEntry of modules) {
    const sections = asArray<EngineModuleSectionManifest>(
      moduleEntry.sections,
      `modules.${moduleEntry.id}.sections`,
    );
    pushDuplicateIssues(
      errors,
      sections.map((entry) => entry.id),
      `modules.${moduleEntry.id}.sections`,
    );

    for (const section of sections) {
      const items = asArray<EngineModuleItemManifest>(
        section.items,
        `modules.${moduleEntry.id}.sections.${section.id}.items`,
      );
      pushDuplicateIssues(
        errors,
        items.map((entry) => entry.id),
        `modules.${moduleEntry.id}.sections.${section.id}.items`,
      );

      for (const item of items) {
        if (item.itemType === 'lesson') {
          if (!item.lessonId) {
            errors.push({
              path: `modules.${moduleEntry.id}.sections.${section.id}.items.${item.id}`,
              message: 'lesson item must define lessonId',
            });
          } else if (!lessonsById.has(item.lessonId)) {
            errors.push({
              path: `modules.${moduleEntry.id}.sections.${section.id}.items.${item.id}.lessonId`,
              message: `Unknown lesson reference "${item.lessonId}"`,
            });
          }
        }
        if (item.itemType === 'assessment') {
          if (!item.assessmentId) {
            errors.push({
              path: `modules.${moduleEntry.id}.sections.${section.id}.items.${item.id}`,
              message: 'assessment item must define assessmentId',
            });
          } else if (!assessmentsById.has(item.assessmentId)) {
            errors.push({
              path: `modules.${moduleEntry.id}.sections.${section.id}.items.${item.id}.assessmentId`,
              message: `Unknown assessment reference "${item.assessmentId}"`,
            });
          }
        }
      }
    }
  }

  for (const lesson of lessons) {
    const blocks = asArray<EngineLessonBlockManifest>(
      lesson.blocks,
      `lessons.${lesson.id}.blocks`,
    );
    pushDuplicateIssues(
      errors,
      blocks.map((entry) => entry.id),
      `lessons.${lesson.id}.blocks`,
    );
    for (const block of blocks) {
      if (!block.payload || typeof block.payload !== 'object') {
        errors.push({
          path: `lessons.${lesson.id}.blocks.${block.id}.payload`,
          message: 'block payload must be an object',
        });
      }
      if (!SUPPORTED_BLOCK_TYPES.has(block.blockType)) {
        warnings.push({
          path: `lessons.${lesson.id}.blocks.${block.id}.blockType`,
          message: `Unsupported blockType "${block.blockType}" will be preserved but materialized as text fallback.`,
        });
      }
    }
  }

  for (const assessment of assessments) {
    const questions = asArray<EngineAssessmentQuestionManifest>(
      assessment.questions,
      `assessments.${assessment.id}.questions`,
    );
    pushDuplicateIssues(
      errors,
      questions.map((entry) => entry.id),
      `assessments.${assessment.id}.questions`,
    );
    for (const question of questions) {
      const options = asArray<EngineAssessmentOptionManifest>(
        question.options,
        `assessments.${assessment.id}.questions.${question.id}.options`,
      );
      pushDuplicateIssues(
        errors,
        options.map((entry) => entry.id),
        `assessments.${assessment.id}.questions.${question.id}.options`,
      );
      if (!question.content) {
        errors.push({
          path: `assessments.${assessment.id}.questions.${question.id}.content`,
          message: 'question content is required',
        });
      }
    }
  }

  const derived = deriveEngineChunks(lessons, assessments);
  const providedChunkMap = new Map(chunks.map((entry) => [entry.id, entry]));
  for (const chunk of derived) {
    const provided = providedChunkMap.get(chunk.id);
    if (!provided) {
      warnings.push({
        path: `chunks.${chunk.id}`,
        message: 'Missing derived chunk; import will regenerate runtime chunks.',
      });
      continue;
    }
    if (provided.content !== chunk.content) {
      warnings.push({
        path: `chunks.${chunk.id}.content`,
        message: 'Chunk content drift detected against canonical lesson/assessment assets.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: countSummary(normalizedManifest),
    normalizedPreview: errors.length === 0 ? normalizedManifest : null,
  };
}
