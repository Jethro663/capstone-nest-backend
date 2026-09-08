import { buildAssignmentRequest, emptyAssignmentSetup } from "../model";

describe("mobile guided assignment request", () => {
  it("creates an exact complete question-assignment request", () => {
    const request = buildAssignmentRequest(
      "class-1",
      "mutation-1",
      {
        ...emptyAssignmentSetup(),
        type: "quiz",
        quarter: "Q2",
        category: "written_work",
        itemId: "slot-2",
        title: "  Fractions practice  ",
        maxAttempts: "3",
      },
      "Q1",
      false,
    );
    expect(request).toMatchObject({
      mutationId: "mutation-1",
      classId: "class-1",
      action: "save",
      settings: {
        title: "Fractions practice",
        type: "quiz",
        quarter: "Q2",
        classRecordCategory: "written_work",
        classRecordItemId: "slot-2",
        maxAttempts: 3,
      },
      questions: [],
    });
  });

  it("keeps skip minimal and preserves the selected format", () => {
    const request = buildAssignmentRequest(
      "class-1",
      "mutation-2",
      { ...emptyAssignmentSetup(), type: "file_upload", title: "Ignored" },
      "Q3",
      true,
    );
    expect(request.settings).toEqual({
      title: "",
      type: "file_upload",
      quarter: "Q3",
    });
    expect(request.settings).not.toHaveProperty("maxAttempts");
  });
});
