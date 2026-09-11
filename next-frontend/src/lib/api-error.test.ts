import { getApiErrorEvidence, getApiErrorMessage } from "./api-error";

describe("structured API error evidence", () => {
  it("retains HTTP status, backend code, details, and field errors", () => {
    const error = {
      response: {
        status: 422,
        data: {
          statusCode: 422,
          code: "ASSESSMENT_NOT_READY",
          message: "Fix the draft",
          errors: ["Question is empty"],
          fieldErrors: [
            { field: "questions.0.content", message: "Question is empty" },
          ],
        },
      },
    };

    expect(getApiErrorEvidence(error, "Fallback")).toEqual({
      statusCode: 422,
      code: "ASSESSMENT_NOT_READY",
      message: "Fix the draft",
      errors: ["Question is empty"],
      fieldErrors: {
        "questions.0.content": ["Question is empty"],
      },
    });
    expect(getApiErrorMessage(error, "Fallback")).toBe("Fix the draft");
  });
});
