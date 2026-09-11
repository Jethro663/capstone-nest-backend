import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  ClassTemplate,
  ClassTemplateContent,
  CreateClassTemplateDto,
  EngineImportValidationResult,
  EngineTemplateExportPayload,
  EngineTemplateImportResult,
} from "../../types/class-template";

function sanitizeContentPayload(
  content: Partial<ClassTemplateContent>,
): Partial<ClassTemplateContent> {
  return {
    modules: content.modules?.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      teacherNotes: module.teacherNotes,
      order: module.order,
      isVisible: module.isVisible ?? false,
      isLocked: module.isLocked ?? true,
      themeKind: module.themeKind,
      gradientId: module.gradientId,
      coverImageUrl: module.coverImageUrl,
      imagePositionX: module.imagePositionX,
      imagePositionY: module.imagePositionY,
      imageScale: module.imageScale,
      sections: module.sections?.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
        items: section.items?.map((item) => ({
          id: item.id,
          itemType: item.itemType,
          templateAssessmentId: item.templateAssessmentId || undefined,
          templateLessonId: item.templateLessonId || undefined,
          order: item.order,
          isRequired: item.isRequired,
          metadata: item.metadata,
          points: item.points,
        })),
      })),
    })),
    lessons: content.lessons?.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      order: lesson.order,
      blocks: lesson.blocks?.map((block) => ({
        id: block.id,
        blockType: block.blockType,
        blockVersion: block.blockVersion,
        order: block.order,
        payload: block.payload,
      })),
    })),
    assessments: content.assessments?.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      totalPoints: assessment.totalPoints,
      order: assessment.order,
      settings: assessment.settings ? { ...assessment.settings } : undefined,
      questions: assessment.questions?.map((question) => ({
        id: question.id,
        type: question.type,
        content: question.content,
        points: question.points,
        order: question.order,
        isRequired: question.isRequired,
        explanation: question.explanation,
        imageUrl: question.imageUrl,
        imageDisplayMode: question.imageDisplayMode,
        imageZoom: question.imageZoom,
        imagePositionX: question.imagePositionX,
        imagePositionY: question.imagePositionY,
        options: question.options?.map((option) => ({ ...option })),
      })),
    })),
    announcements: content.announcements?.map((announcement) => ({
      ...announcement,
    })),
    chunks: content.chunks?.map((chunk) => ({
      ...chunk,
      metadata: chunk.metadata ? { ...chunk.metadata } : undefined,
    })),
  };
}

export const classTemplatesApi = {
  async getAll(query?: { subjectCode?: string; subjectGradeLevel?: string }) {
    const response = await apiClient.get<ApiEnvelope<ClassTemplate[]>>(
      "/class-templates",
      { params: query },
    );
    return unwrapEnvelope(response.data);
  },
  async getCompatible(subjectCode: string, subjectGradeLevel: string) {
    const response = await apiClient.get<ApiEnvelope<ClassTemplate[]>>(
      "/class-templates/compatible",
      { params: { subjectCode, subjectGradeLevel } },
    );
    return unwrapEnvelope(response.data);
  },
  async create(dto: CreateClassTemplateDto) {
    const response = await apiClient.post<ApiEnvelope<ClassTemplate>>(
      "/class-templates",
      dto,
    );
    return unwrapEnvelope(response.data);
  },
  async getById(id: string) {
    const response = await apiClient.get<ApiEnvelope<ClassTemplate>>(
      `/class-templates/${id}`,
    );
    return unwrapEnvelope(response.data);
  },
  async update(id: string, dto: { name?: string }) {
    const response = await apiClient.patch<ApiEnvelope<ClassTemplate>>(
      `/class-templates/${id}`,
      dto,
    );
    return unwrapEnvelope(response.data);
  },
  async remove(id: string) {
    const response = await apiClient.delete<ApiEnvelope<{ success: boolean }>>(
      `/class-templates/${id}`,
    );
    return unwrapEnvelope(response.data);
  },
  async publish(id: string, status: "draft" | "published" = "published") {
    const response = await apiClient.post<ApiEnvelope<ClassTemplate>>(
      `/class-templates/${id}/publish`,
      { status },
    );
    return unwrapEnvelope(response.data);
  },
  async getContent(id: string) {
    const response = await apiClient.get<ApiEnvelope<ClassTemplateContent>>(
      `/class-templates/${id}/content`,
    );
    return unwrapEnvelope(response.data);
  },
  async updateContent(id: string, content: Partial<ClassTemplateContent>) {
    const response = await apiClient.put<ApiEnvelope<ClassTemplateContent>>(
      `/class-templates/${id}/content`,
      sanitizeContentPayload(content),
    );
    return unwrapEnvelope(response.data);
  },
  async uploadAssessmentImage(id: string, imageUri: string) {
    const name = imageUri.split("/").pop() || "assessment-image.jpg";
    const extension = name.split(".").pop()?.toLowerCase();
    const type =
      extension === "png"
        ? "image/png"
        : extension === "gif"
          ? "image/gif"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
    const form = new FormData();
    form.append("image", { uri: imageUri, name, type } as unknown as Blob);
    const response = await apiClient.post<ApiEnvelope<{ imageUrl: string }>>(
      `/class-templates/${id}/assessment-images`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapEnvelope(response.data);
  },
  async exportEngine(id: string) {
    const response = await apiClient.get<
      ApiEnvelope<EngineTemplateExportPayload>
    >(`/class-templates/${id}/engine-export`);
    return unwrapEnvelope(response.data);
  },
  async validateEngineImport(manifest: string) {
    const response = await apiClient.post<
      ApiEnvelope<EngineImportValidationResult>
    >("/class-templates/engine-import/validate", { manifest });
    return unwrapEnvelope(response.data);
  },
  async importEngine(manifest: string, options?: { publish?: boolean }) {
    const response = await apiClient.post<
      ApiEnvelope<EngineTemplateImportResult>
    >("/class-templates/engine-import", {
      manifest,
      publish: options?.publish ?? false,
    });
    return unwrapEnvelope(response.data);
  },
};
