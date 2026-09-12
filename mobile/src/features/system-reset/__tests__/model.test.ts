import {
  canExecuteReset,
  resetProgress,
  resetBack,
  resetRequestIsUncertain,
} from "../model";

const preview = {
  expiresAt: "2026-09-12T04:05:00Z",
  confirmation: "RESET SCHOOL DATA",
};
const input = {
  reason: "Clean evaluator school data",
  currentPassword: "password",
  confirmation: preview.confirmation,
  acknowledgements: ["A", "B"],
};
describe("school reset safety", () => {
  it("requires a live preview, exact text, all acknowledgements, password, valid reason and online state", () => {
    const valid = {
      preview,
      input,
      required: ["A", "B"],
      now: Date.parse("2026-09-12T04:00:00Z"),
      online: true,
      busy: false,
    };
    expect(canExecuteReset(valid)).toBe(true);
    expect(canExecuteReset({ ...valid, online: false })).toBe(false);
    expect(canExecuteReset({ ...valid, busy: true })).toBe(false);
    expect(
      canExecuteReset({ ...valid, now: Date.parse(preview.expiresAt) }),
    ).toBe(false);
    expect(
      canExecuteReset({
        ...valid,
        input: { ...input, confirmation: "reset school data" },
      }),
    ).toBe(false);
    expect(
      canExecuteReset({
        ...valid,
        input: { ...input, acknowledgements: ["A"] },
      }),
    ).toBe(false);
    expect(
      canExecuteReset({ ...valid, input: { ...input, currentPassword: "" } }),
    ).toBe(false);
    expect(
      canExecuteReset({ ...valid, input: { ...input, reason: "short" } }),
    ).toBe(false);
    expect(
      canExecuteReset({
        ...valid,
        input: { ...input, reason: "x".repeat(501) },
      }),
    ).toBe(false);
    expect(canExecuteReset({ ...valid, required: [] })).toBe(false);
  });
  it("never uses another operation's terminal status", () => {
    const status = {
      operationId: "other",
      active: false,
      phase: "complete",
      status: "completed" as const,
      retrying: false,
    };
    expect(resetProgress("mine", status)).toBe("unknown");
    expect(resetProgress("mine", { ...status, operationId: "mine" })).toBe(
      "completed",
    );
    expect(
      resetProgress("mine", {
        ...status,
        operationId: "mine",
        status: "aborted",
      }),
    ).toBe("aborted");
  });
  it("returns to real history and falls back to System Settings", () => {
    const navigation = {
      canGoBack: () => true,
      goBack: jest.fn(),
      navigate: jest.fn(),
    };
    resetBack(navigation);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    resetBack({ ...navigation, canGoBack: () => false });
    expect(navigation.navigate).toHaveBeenCalledWith("MainTabs", {
      screen: "AdminSettings",
    });
  });
  it("treats transport and server failures as uncertain, but explicit validation rejection as definite", () => {
    expect(resetRequestIsUncertain(new Error("Network error"))).toBe(true);
    expect(resetRequestIsUncertain({ response: { status: 503 } })).toBe(true);
    expect(resetRequestIsUncertain({ response: { status: 409 } })).toBe(true);
    expect(resetRequestIsUncertain({ response: { status: 400 } })).toBe(false);
  });
});
