import {
  buildAssignmentRequest,
  emptyAssignmentSetup,
} from "./assignment-creation";

describe("assignment setup payload", () => {
  const setup = {
    ...emptyAssignmentSetup(),
    type: "file_upload" as const,
    quarter: "Q2" as const,
    category: "performance_task" as const,
    itemId: "slot",
    title: "Portfolio",
    dueDate: "2030-09-10T15:00",
    noDueDate: false,
    maxAttempts: "3",
  };
  it("skip preserves format but uses default period without reserving a slot", () => {
    expect(
      buildAssignmentRequest("class", "mutation", setup, "Q1", true),
    ).toEqual({
      mutationId: "mutation",
      classId: "class",
      action: "save",
      questions: [],
      settings: { title: "", type: "file_upload", quarter: "Q1" },
    });
  });
  it("sends exact placement and Manila date without ineffective file attempts", () => {
    const request = buildAssignmentRequest(
      "class",
      "mutation",
      setup,
      "Q1",
      false,
    );
    expect(request.settings).toMatchObject({
      title: "Portfolio",
      type: "file_upload",
      quarter: "Q2",
      classRecordCategory: "performance_task",
      classRecordItemId: "slot",
      dueDate: "2030-09-10T07:00:00.000Z",
    });
    expect(request.settings.maxAttempts).toBeUndefined();
  });
  it("sends question attempts and explicit open-ended schedule", () => {
    const request = buildAssignmentRequest(
      "class",
      "mutation",
      { ...setup, type: "quiz", noDueDate: true },
      "Q1",
      false,
    );
    expect(request.settings).toMatchObject({
      maxAttempts: 3,
      closeWhenDue: false,
    });
    expect(request.settings.dueDate).toBeUndefined();
  });
});
