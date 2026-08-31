import type {
  Assessment,
  EditorQuestionInput,
  SaveAssessmentEditorInput,
} from "../../types/assessment";

export const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "multiple_select", label: "Multiple select" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
  { value: "fill_blank", label: "Fill in the blank" },
  { value: "dropdown", label: "Dropdown" },
] as const;
export type SupportedQuestionType = (typeof QUESTION_TYPES)[number]["value"];
export type EditorDocument = {
  pendingSave?: SaveAssessmentEditorInput;
  id?: string;
  classId: string;
  revision: number;
  isPublished: boolean;
  settings: SaveAssessmentEditorInput["settings"];
  questions: EditorQuestionInput[];
  deletedQuestionIds: string[];
  originalOptionIds: Record<string, string[]>;
  originalQuestionIds?: string[];
};
export const DEFAULT_SETTINGS: SaveAssessmentEditorInput["settings"] = {
  title: "",
  description: "",
  type: "quiz",
  passingScore: 60,
  maxAttempts: 1,
  timeLimitMinutes: null,
  closeWhenDue: true,
  randomizeQuestions: false,
  timedQuestionsEnabled: false,
  questionTimeLimitSeconds: null,
  strictMode: false,
  feedbackLevel: "standard",
  feedbackDelayHours: 24,
};
const SETTING_KEYS = [
  "title",
  "description",
  "type",
  "dueDate",
  "closeWhenDue",
  "randomizeQuestions",
  "timedQuestionsEnabled",
  "questionTimeLimitSeconds",
  "strictMode",
  "fileUploadInstructions",
  "teacherAttachmentFileId",
  "rubricSourceFileId",
  "rubricCriteria",
  "allowedUploadMimeTypes",
  "allowedUploadExtensions",
  "maxUploadSizeBytes",
  "passingScore",
  "maxAttempts",
  "timeLimitMinutes",
  "feedbackLevel",
  "feedbackDelayHours",
  "classRecordCategory",
  "quarter",
  "classRecordItemId",
] as const;

export function newEditor(classId: string): EditorDocument {
  return {
    classId,
    revision: 0,
    isPublished: false,
    settings: { ...DEFAULT_SETTINGS },
    questions: [],
    deletedQuestionIds: [],
    originalOptionIds: {},
  };
}
export function newQuestion(
  type: SupportedQuestionType,
  clientId: string,
): EditorQuestionInput {
  const options = [
    "multiple_choice",
    "multiple_select",
    "dropdown",
    "true_false",
    "fill_blank",
  ].includes(type)
    ? (type === "true_false"
        ? ["True", "False"]
        : type === "fill_blank"
          ? [""]
          : ["", ""]
      ).map((text, index) => ({
        text,
        isCorrect: type === "fill_blank",
        order: index + 1,
      }))
    : undefined;
  return {
    clientId,
    type,
    content: "",
    points: 1,
    order: 1,
    isRequired: true,
    options,
  };
}
export function assessmentToEditor(assessment: Assessment): EditorDocument {
  const document = newEditor(assessment.classId);
  document.id = assessment.id;
  document.revision = assessment.editorRevision ?? 0;
  document.isPublished = assessment.isPublished;
  document.originalQuestionIds = (assessment.questions ?? []).map(
    (question) => question.id,
  );
  for (const key of SETTING_KEYS) {
    const value = assessment[key as keyof Assessment];
    if (value !== undefined)
      (document.settings as Record<string, unknown>)[key] = value;
  }
  if (assessment.classRecordPlacement?.itemId)
    document.settings.classRecordItemId =
      assessment.classRecordPlacement.itemId;
  document.questions = (assessment.questions ?? []).map((question) => ({
    id: question.id,
    clientId: question.id,
    type: question.type,
    content: question.content,
    points: question.points,
    order: question.order,
    isRequired: question.isRequired,
    explanation: question.explanation,
    conceptTags: question.conceptTags,
    imageUrl: question.imageUrl,
    imageDisplayMode: question.imageDisplayMode,
    imageZoom: question.imageZoom ?? undefined,
    imagePositionX: question.imagePositionX ?? undefined,
    imagePositionY: question.imagePositionY ?? undefined,
    options: question.options?.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
      imageUrl: option.imageUrl,
      imageDisplayMode: option.imageDisplayMode,
      imageZoom: option.imageZoom ?? undefined,
      imagePositionX: option.imagePositionX ?? undefined,
      imagePositionY: option.imagePositionY ?? undefined,
    })),
  }));
  for (const question of document.questions)
    if (question.id)
      document.originalOptionIds[question.id] =
        question.options?.flatMap((option) => (option.id ? [option.id] : [])) ??
        [];
  return document;
}
export function buildEditorRequest(
  document: EditorDocument,
  mutationId: string,
  action: SaveAssessmentEditorInput["action"],
): SaveAssessmentEditorInput {
  return {
    mutationId,
    classId: document.classId,
    expectedRevision: document.id ? document.revision : undefined,
    action,
    settings: { ...document.settings },
    deletedQuestionIds: document.deletedQuestionIds,
    questions:
      document.settings.type === "file_upload"
        ? undefined
        : document.questions.map((question, index) => ({
            ...question,
            order:
              document.questions.length ===
                document.originalQuestionIds?.length &&
              document.questions.every(
                (entry, i) => entry.id === document.originalQuestionIds?.[i],
              )
                ? question.order
                : index + 1,
            options: question.options?.map((option, optionIndex) => ({
              ...option,
              order:
                question.options?.length ===
                  document.originalOptionIds[question.id ?? ""]?.length &&
                question.options.every(
                  (entry, i) =>
                    entry.id ===
                    document.originalOptionIds[question.id ?? ""]?.[i],
                )
                  ? option.order
                  : optionIndex + 1,
            })),
            deletedOptionIds: question.id
              ? (document.originalOptionIds[question.id] ?? []).filter(
                  (id) => !question.options?.some((option) => option.id === id),
                )
              : [],
          })),
  };
}
