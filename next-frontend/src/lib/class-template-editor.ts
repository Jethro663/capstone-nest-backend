import { classTemplateService } from '@/services/class-template-service';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateContent,
  ClassTemplateModule,
  ClassTemplateModuleItem,
  ClassTemplateModuleSection,
} from '@/types/class-template';

export interface ClassTemplateEditorState {
  modules: ClassTemplateModule[];
  assessments: ClassTemplateAssessment[];
  announcements: ClassTemplateAnnouncement[];
}

export interface LoadedTemplateWorkspace {
  template: ClassTemplate | null;
  state: ClassTemplateEditorState;
}

export interface LessonItemContext {
  moduleIndex: number;
  sectionIndex: number;
  itemIndex: number;
  module: ClassTemplateModule;
  section: ClassTemplateModuleSection;
  item: ClassTemplateModuleItem;
}

const INDEX_KEY_PREFIX = 'idx-';

export const classTemplateDraftStorageKey = (templateId: string) => `class-template-editor:${templateId}:draft`;

export function cloneTemplateEditorState(state: ClassTemplateEditorState): ClassTemplateEditorState {
  return JSON.parse(JSON.stringify(state)) as ClassTemplateEditorState;
}

function toEditorState(content: Partial<ClassTemplateContent> | undefined): ClassTemplateEditorState {
  return {
    modules: content?.modules ?? [],
    assessments: content?.assessments ?? [],
    announcements: content?.announcements ?? [],
  };
}

function isEditorState(value: unknown): value is ClassTemplateEditorState {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Partial<ClassTemplateEditorState>;
  return Array.isArray(maybe.modules) && Array.isArray(maybe.assessments) && Array.isArray(maybe.announcements);
}

export function readTemplateEditorDraft(templateId: string): ClassTemplateEditorState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(classTemplateDraftStorageKey(templateId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isEditorState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTemplateEditorDraft(templateId: string, state: ClassTemplateEditorState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(classTemplateDraftStorageKey(templateId), JSON.stringify(state));
}

export function clearTemplateEditorDraft(templateId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(classTemplateDraftStorageKey(templateId));
}

export async function loadTemplateWorkspace(templateId: string): Promise<LoadedTemplateWorkspace> {
  const [templateRes, contentRes] = await Promise.all([
    classTemplateService.getAll(),
    classTemplateService.getContent(templateId),
  ]);

  const template = (templateRes.data || []).find((entry) => entry.id === templateId) || null;
  return {
    template,
    state: toEditorState(contentRes.data),
  };
}

export async function resolveAndSaveTemplateContent(
  templateId: string,
  state: ClassTemplateEditorState,
): Promise<ClassTemplateEditorState> {
  const working = cloneTemplateEditorState(state);

  for (const moduleEntry of working.modules) {
    for (const section of moduleEntry.sections ?? []) {
      for (const item of section.items ?? []) {
        const key = (item.metadata?.linkedAssessmentKey as string | undefined) ?? '';
        if (key.startsWith('id:')) {
          item.templateAssessmentId = key.slice(3);
        } else {
          item.templateAssessmentId = undefined;
        }
      }
    }
  }

  const firstSave = await classTemplateService.updateContent(templateId, working);

  let hasDraftAssessmentLinks = false;
  for (const moduleEntry of state.modules) {
    for (const section of moduleEntry.sections ?? []) {
      for (const item of section.items ?? []) {
        const key = (item.metadata?.linkedAssessmentKey as string | undefined) ?? '';
        if (key.startsWith('draft:')) {
          hasDraftAssessmentLinks = true;
        }
      }
    }
  }

  if (!hasDraftAssessmentLinks) {
    return toEditorState(firstSave.data);
  }

  const secondPayload = cloneTemplateEditorState(toEditorState(firstSave.data));

  for (let moduleIndex = 0; moduleIndex < state.modules.length; moduleIndex += 1) {
    const sourceModule = state.modules[moduleIndex];
    const targetModule = secondPayload.modules[moduleIndex];
    if (!sourceModule || !targetModule) continue;

    for (let sectionIndex = 0; sectionIndex < (sourceModule.sections ?? []).length; sectionIndex += 1) {
      const sourceSection = sourceModule.sections?.[sectionIndex];
      const targetSection = targetModule.sections?.[sectionIndex];
      if (!sourceSection || !targetSection) continue;

      for (let itemIndex = 0; itemIndex < (sourceSection.items ?? []).length; itemIndex += 1) {
        const sourceItem = sourceSection.items?.[itemIndex];
        const targetItem = targetSection.items?.[itemIndex];
        if (!sourceItem || !targetItem) continue;

        const key = (sourceItem.metadata?.linkedAssessmentKey as string | undefined) ?? '';
        if (!key.startsWith('draft:')) continue;

        const draftIndex = Number.parseInt(key.slice(6), 10);
        if (Number.isNaN(draftIndex)) continue;

        const mapped = secondPayload.assessments[draftIndex];
        if (!mapped?.id) continue;

        targetItem.templateAssessmentId = mapped.id;
        targetItem.metadata = {
          ...(targetItem.metadata ?? {}),
          linkedAssessmentKey: `id:${mapped.id}`,
        };
      }
    }
  }

  const secondSave = await classTemplateService.updateContent(templateId, secondPayload);
  return toEditorState(secondSave.data);
}

export function buildIndexKey(index: number): string {
  return `${INDEX_KEY_PREFIX}${index}`;
}

export function resolveIndexKey(key: string): number {
  if (key.startsWith(INDEX_KEY_PREFIX)) {
    const value = Number.parseInt(key.slice(INDEX_KEY_PREFIX.length), 10);
    return Number.isNaN(value) ? -1 : value;
  }

  const fallback = Number.parseInt(key, 10);
  return Number.isNaN(fallback) ? -1 : fallback;
}

export function buildLessonItemKey(moduleIndex: number, sectionIndex: number, itemIndex: number): string {
  return `m${moduleIndex}-s${sectionIndex}-i${itemIndex}`;
}

export function parseLessonItemKey(key: string): {
  moduleIndex: number;
  sectionIndex: number;
  itemIndex: number;
} | null {
  const match = key.match(/^m(\d+)-s(\d+)-i(\d+)$/);
  if (!match) return null;

  const moduleIndex = Number.parseInt(match[1], 10);
  const sectionIndex = Number.parseInt(match[2], 10);
  const itemIndex = Number.parseInt(match[3], 10);

  if ([moduleIndex, sectionIndex, itemIndex].some((entry) => Number.isNaN(entry))) {
    return null;
  }

  return { moduleIndex, sectionIndex, itemIndex };
}

export function findLessonItemContext(modules: ClassTemplateModule[], key: string): LessonItemContext | null {
  const parsed = parseLessonItemKey(key);
  if (!parsed) return null;

  const moduleEntry = modules[parsed.moduleIndex];
  const section = moduleEntry?.sections?.[parsed.sectionIndex];
  const item = section?.items?.[parsed.itemIndex];

  if (!moduleEntry || !section || !item || item.itemType !== 'lesson') {
    return null;
  }

  return {
    moduleIndex: parsed.moduleIndex,
    sectionIndex: parsed.sectionIndex,
    itemIndex: parsed.itemIndex,
    module: moduleEntry,
    section,
    item,
  };
}

export function updateTemplateModuleByIndex(
  modules: ClassTemplateModule[],
  moduleIndex: number,
  updater: (module: ClassTemplateModule) => ClassTemplateModule,
): ClassTemplateModule[] {
  if (moduleIndex < 0 || !modules[moduleIndex]) return modules;

  const nextModules = modules.slice();
  nextModules[moduleIndex] = updater(nextModules[moduleIndex]);
  return nextModules;
}

export function updateTemplateSectionByIndex(
  modules: ClassTemplateModule[],
  moduleIndex: number,
  sectionIndex: number,
  updater: (section: ClassTemplateModuleSection) => ClassTemplateModuleSection,
): ClassTemplateModule[] {
  return updateTemplateModuleByIndex(modules, moduleIndex, (moduleEntry) => {
    const sections = moduleEntry.sections ?? [];
    if (sectionIndex < 0 || !sections[sectionIndex]) return moduleEntry;

    const nextSections = sections.slice();
    nextSections[sectionIndex] = updater(nextSections[sectionIndex]);

    return {
      ...moduleEntry,
      sections: nextSections,
    };
  });
}

export function updateTemplateItemByIndex(
  modules: ClassTemplateModule[],
  moduleIndex: number,
  sectionIndex: number,
  itemIndex: number,
  updater: (item: ClassTemplateModuleItem) => ClassTemplateModuleItem,
): ClassTemplateModule[] {
  return updateTemplateSectionByIndex(
    modules,
    moduleIndex,
    sectionIndex,
    (sectionEntry) => {
      const items = sectionEntry.items ?? [];
      if (itemIndex < 0 || !items[itemIndex]) return sectionEntry;

      const nextItems = items.slice();
      nextItems[itemIndex] = updater(nextItems[itemIndex]);

      return {
        ...sectionEntry,
        items: nextItems,
      };
    },
  );
}

export function updateLessonMetadataByKey(
  modules: ClassTemplateModule[],
  key: string,
  metadataPatch: Record<string, unknown>,
): ClassTemplateModule[] {
  const parsed = parseLessonItemKey(key);
  if (!parsed) return modules;

  const nextModules = modules.slice();
  const targetModule = nextModules[parsed.moduleIndex];
  if (!targetModule) return modules;

  const nextSections = (targetModule.sections ?? []).slice();
  const targetSection = nextSections[parsed.sectionIndex];
  if (!targetSection) return modules;

  const nextItems = (targetSection.items ?? []).slice();
  const targetItem = nextItems[parsed.itemIndex];
  if (!targetItem || targetItem.itemType !== 'lesson') return modules;

  nextItems[parsed.itemIndex] = {
    ...targetItem,
    metadata: {
      ...(targetItem.metadata ?? {}),
      ...metadataPatch,
    },
  };

  nextSections[parsed.sectionIndex] = {
    ...targetSection,
    items: nextItems,
  };

  nextModules[parsed.moduleIndex] = {
    ...targetModule,
    sections: nextSections,
  };

  return nextModules;
}
