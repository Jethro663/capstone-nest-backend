import {
  assessmentToEditor,
  buildEditorRequest,
  newQuestion,
  QUESTION_TYPES,
} from "../model";
import type { Assessment } from "../../../types/assessment";

describe("mobile assessment editor document", () => {
  const assessment: Assessment = {
    id: "assessment",
    classId: "class",
    title: "Web assessment",
    type: "quiz",
    editorRevision: 7,
    isPublished: false,
    quarter: "Q2",
    strictMode: true,
    randomizeQuestions: true,
    feedbackLevel: "detailed",
    feedbackDelayHours: 2,
    maxAttempts: 3,
    closeWhenDue: false,
    questions: [
      {
        id: "question",
        assessmentId: "assessment",
        type: "multiple_choice",
        content: "<p><strong>Hello</strong></p>",
        points: 2,
        order: 1,
        conceptTags: ["fractions"],
        options: [
          {
            id: "option",
            text: "Yes",
            isCorrect: true,
            order: 1,
            imageUrl: "/image.png",
            imageZoom: 125,
          },
        ],
      },
    ],
  };
  it("preserves web settings, HTML, images and existing IDs", () => {
    const request = buildEditorRequest(
      assessmentToEditor(assessment),
      "mutation",
      "save",
    );
    expect(request.expectedRevision).toBe(7);
    expect(request.settings).toMatchObject({
      strictMode: true,
      randomizeQuestions: true,
      feedbackDelayHours: 2,
      closeWhenDue: false,
    });
    expect(request.questions?.[0]).toMatchObject({
      id: "question",
      content: "<p><strong>Hello</strong></p>",
      conceptTags: ["fractions"],
      options: [
        expect.objectContaining({
          id: "option",
          imageUrl: "/image.png",
          imageZoom: 125,
        }),
      ],
    });
  });
  it("allows unfinished questions and never silently publishes", () => {
    const document = assessmentToEditor(assessment);
    document.questions = [newQuestion("multiple_choice", "new")];
    const request = buildEditorRequest(document, "mutation", "save");
    expect(request.action).toBe("save");
    expect(request.questions?.[0].content).toBe("");
    expect(request.settings).not.toHaveProperty("isPublished");
  });
  it("keeps legacy ordering unchanged unless the teacher moves questions or choices", () => {
    const legacy: Assessment = {
      ...assessment,
      questions: assessment.questions!.map((question) => ({
        ...question,
        order: 0,
        options: question.options?.map((option) => ({ ...option, order: 0 })),
      })),
    };
    const request = buildEditorRequest(
      assessmentToEditor(legacy),
      "mutation",
      "save",
    );
    expect(request.questions?.[0].order).toBe(0);
    expect(request.questions?.[0].options?.[0].order).toBe(0);
  });
  it("offers exactly the six backend question types", () => {
    expect(QUESTION_TYPES.map((type) => type.value)).toEqual([
      "multiple_choice",
      "multiple_select",
      "true_false",
      "short_answer",
      "fill_blank",
      "dropdown",
    ]);
  });
  it("preserves manual file-upload settings, attachments and rubric on metadata edits", () => {
    const fileAssessment: Assessment = {
      ...assessment,
      type: "file_upload",
      questions: [],
      fileUploadInstructions: "<p><strong>Upload your work</strong></p>",
      teacherAttachmentFileId: "teacher-file",
      rubricSourceFileId: "rubric-file",
      allowedUploadExtensions: [".pdf"],
      allowedUploadMimeTypes: ["application/pdf"],
      maxUploadSizeBytes: 10485760,
      rubricCriteria: [
        {
          id: "criterion",
          title: "Reasoning",
          description: "Explain each step",
          points: 10,
        },
      ],
    };
    const document = assessmentToEditor(fileAssessment);
    document.settings.title = "Renamed upload";
    const request = buildEditorRequest(document, "mutation", "save");
    expect(request.questions).toBeUndefined();
    expect(request.settings).toMatchObject({
      title: "Renamed upload",
      teacherAttachmentFileId: "teacher-file",
      rubricSourceFileId: "rubric-file",
      fileUploadInstructions: fileAssessment.fileUploadInstructions,
      rubricCriteria: fileAssessment.rubricCriteria,
      allowedUploadExtensions: [".pdf"],
      allowedUploadMimeTypes: ["application/pdf"],
      maxUploadSizeBytes: 10485760,
      maxAttempts: 3,
      closeWhenDue: false,
      feedbackLevel: "detailed",
      feedbackDelayHours: 2,
    });
  });
});
