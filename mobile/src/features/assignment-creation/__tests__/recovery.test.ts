import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAssignmentWithRecovery,
  getPendingAssignmentCreation,
} from "../recovery";
import type { SaveAssessmentEditorInput } from "../../../types/assessment";

jest.mock("@react-native-async-storage/async-storage", () => {
  const values = new Map<string, string>();
  return {
    setItem: jest.fn(async (key: string, value: string) =>
      values.set(key, value),
    ),
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    removeItem: jest.fn(async (key: string) => values.delete(key)),
    clear: jest.fn(async () => values.clear()),
  };
});

const request: SaveAssessmentEditorInput = {
  mutationId: "mutation-1",
  classId: "class-1",
  action: "save",
  settings: { title: "Draft", type: "quiz", quarter: "Q1" },
  questions: [],
};

describe("mobile assignment creation recovery", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("persists before sending and clears after confirmation", async () => {
    const save = jest.fn(async () => {
      expect(
        await getPendingAssignmentCreation("teacher-1", "class-1"),
      ).toEqual(request);
      return { assessment: { id: "assessment-1" } } as never;
    });
    await createAssignmentWithRecovery("teacher-1", request, save);
    expect(
      await getPendingAssignmentCreation("teacher-1", "class-1"),
    ).toBeNull();
  });

  it("retains uncertain requests and only retries the exact body", async () => {
    const networkFailure = Object.assign(new Error("offline"), {
      response: undefined,
    });
    await expect(
      createAssignmentWithRecovery("teacher-1", request, async () => {
        throw networkFailure;
      }),
    ).rejects.toThrow("offline");
    await expect(
      createAssignmentWithRecovery(
        "teacher-1",
        { ...request, settings: { ...request.settings, title: "Different" } },
        async () => ({}) as never,
      ),
    ).rejects.toThrow("Resolve the previous creation request");
  });

  it("clears a definite client rejection", async () => {
    await expect(
      createAssignmentWithRecovery("teacher-1", request, async () => {
        throw { response: { status: 409 } };
      }),
    ).rejects.toBeDefined();
    expect(
      await getPendingAssignmentCreation("teacher-1", "class-1"),
    ).toBeNull();
  });
});
