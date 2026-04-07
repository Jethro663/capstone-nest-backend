import { api } from '@/lib/api-client';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateAssessmentSettings,
  ClassTemplateContent,
  ClassTemplateModule,
  ClassTemplateModuleItem,
  ClassTemplateModuleSection,
  ClassTemplateQuestion,
  ClassTemplateQuestionOption,
  CreateClassTemplateDto,
} from '@/types/class-template';

function sanitizeQuestionOption(option: ClassTemplateQuestionOption): ClassTemplateQuestionOption {
  return {
    id: option.id,
    text: option.text,
    isCorrect: option.isCorrect,
    order: option.order,
  };
}

function sanitizeQuestion(question: ClassTemplateQuestion): ClassTemplateQuestion {
  return {
    id: question.id,
    type: question.type,
    content: question.content,
    points: question.points,
    order: question.order,
    isRequired: question.isRequired,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    options: question.options?.map(sanitizeQuestionOption),
  };
}

function sanitizeAssessmentSettings(
  settings: ClassTemplateAssessmentSettings | undefined,
): ClassTemplateAssessmentSettings | undefined {
  if (!settings) return undefined;
  return {
    dueDateOffsetDays: settings.dueDateOffsetDays,
    maxAttempts: settings.maxAttempts,
    passingScore: settings.passingScore,
    randomizeQuestions: settings.randomizeQuestions,
    closeWhenDue: settings.closeWhenDue,
  };
}

function sanitizeAssessment(assessment: ClassTemplateAssessment): ClassTemplateAssessment {
  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    type: assessment.type,
    settings: sanitizeAssessmentSettings(assessment.settings),
    questions: assessment.questions?.map(sanitizeQuestion),
    totalPoints: assessment.totalPoints,
    order: assessment.order,
  };
}

function sanitizeModuleItem(item: ClassTemplateModuleItem): ClassTemplateModuleItem {
  return {
    id: item.id,
    itemType: item.itemType,
    templateAssessmentId: item.templateAssessmentId || undefined,
    order: item.order,
    isRequired: item.isRequired,
    metadata: item.metadata,
    points: item.points,
  };
}

function sanitizeModuleSection(section: ClassTemplateModuleSection): ClassTemplateModuleSection {
  return {
    id: section.id,
    title: section.title,
    description: section.description,
    order: section.order,
    items: section.items?.map(sanitizeModuleItem),
  };
}

function sanitizeModule(module: ClassTemplateModule): ClassTemplateModule {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    order: module.order,
    themeKind: module.themeKind,
    gradientId: module.gradientId,
    coverImageUrl: module.coverImageUrl,
    imagePositionX: module.imagePositionX,
    imagePositionY: module.imagePositionY,
    imageScale: module.imageScale,
    sections: module.sections?.map(sanitizeModuleSection),
  };
}

function sanitizeAnnouncement(
  announcement: ClassTemplateAnnouncement,
): ClassTemplateAnnouncement {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    isPinned: announcement.isPinned,
    order: announcement.order,
  };
}

function sanitizeContentPayload(content: Partial<ClassTemplateContent>): Partial<ClassTemplateContent> {
  return {
    modules: content.modules?.map(sanitizeModule),
    assessments: content.assessments?.map(sanitizeAssessment),
    announcements: content.announcements?.map(sanitizeAnnouncement),
  };
}

export const classTemplateService = {
  async getAll(query?: { subjectCode?: string; subjectGradeLevel?: string }) {
    const { data } = await api.get('/class-templates', { params: query });
    return data as { success: boolean; message: string; data: ClassTemplate[] };
  },

  async getCompatible(subjectCode: string, subjectGradeLevel: string) {
    const { data } = await api.get('/class-templates/compatible', {
      params: { subjectCode, subjectGradeLevel },
    });
    return data as { success: boolean; message: string; data: ClassTemplate[] };
  },

  async create(dto: CreateClassTemplateDto) {
    const { data } = await api.post('/class-templates', dto);
    return data as { success: boolean; message: string; data: ClassTemplate };
  },

  async update(id: string, dto: { name?: string }) {
    const { data } = await api.patch(`/class-templates/${id}`, dto);
    return data as { success: boolean; message: string; data: ClassTemplate };
  },

  async remove(id: string) {
    const { data } = await api.delete(`/class-templates/${id}`);
    return data as { success: boolean; message: string; data: { success: boolean } };
  },

  async publish(id: string, status: 'draft' | 'published' = 'published') {
    const { data } = await api.post(`/class-templates/${id}/publish`, { status });
    return data as { success: boolean; message: string; data: ClassTemplate };
  },

  async getContent(id: string) {
    const { data } = await api.get(`/class-templates/${id}/content`);
    return data as { success: boolean; message: string; data: ClassTemplateContent };
  },

  async updateContent(id: string, content: Partial<ClassTemplateContent>) {
    const { data } = await api.put(
      `/class-templates/${id}/content`,
      sanitizeContentPayload(content),
    );
    return data as { success: boolean; message: string; data: ClassTemplateContent };
  },
};
