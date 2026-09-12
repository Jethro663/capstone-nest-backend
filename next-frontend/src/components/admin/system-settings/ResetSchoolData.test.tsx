import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResetSchoolData } from "./ResetSchoolData";
import { systemResetService } from "@/services/system-reset-service";
import {
  openResetProgress,
  readResetOperationId,
  rememberResetOperationId,
  clearResetOperationId,
} from "@/lib/system-reset-session";

jest.mock("@/services/system-reset-service", () => ({
  systemResetService: {
    getCapability: jest.fn(),
    getPolicy: jest.fn(),
    preview: jest.fn(),
    execute: jest.fn(),
    getPublicStatus: jest.fn(),
    getOperation: jest.fn(),
  },
}));
const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/lib/system-reset-session", () => ({
  openResetProgress: jest.fn(),
  readResetOperationId: jest.fn(),
  rememberResetOperationId: jest.fn(),
  clearResetOperationId: jest.fn(),
}));
const service = jest.mocked(systemResetService);
const acknowledgementCodes = [
  "OTHER_ACCOUNTS_REMOVED",
  "SCHOOL_CONTENT_REMOVED",
  "FILES_AND_INDEXES_REMOVED",
  "AUDIT_AND_SETTINGS_RETAINED",
  "SIGN_IN_AGAIN",
];
const preview = () => ({
  actor: {
    id: "admin",
    email: "admin@school.test",
    displayName: "School admin",
  },
  environment: "test",
  schoolYear: "2026-2027",
  period: "T1",
  policy: { periods: [{ key: "T1", label: "Term 1" }] },
  confirmation: "RESET SCHOOL DATA EXACT",
  previewToken: "secret-preview",
  expiresAt: new Date(Date.now() + 300000).toISOString(),
  counts: { users: 12 },
  tables: [
    { name: "users", action: "administrator", group: "accounts", count: 12 },
  ],
});

async function review() {
  await screen.findByLabelText("School year");
  fireEvent.change(screen.getByLabelText("School year"), {
    target: { value: "2026-2027" },
  });
  await screen.findByRole("option", { name: "Term 1" });
  fireEvent.change(screen.getByLabelText("Starting grading period"), {
    target: { value: "T1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));
  await screen.findByText("RESET SCHOOL DATA EXACT");
}
function completeForm() {
  fireEvent.change(screen.getByLabelText("Reason for reset"), {
    target: { value: "Restart supervised school testing" },
  });
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "current-password" },
  });
  fireEvent.change(screen.getByLabelText("Type the confirmation phrase"), {
    target: { value: "RESET SCHOOL DATA EXACT" },
  });
  for (const code of acknowledgementCodes)
    fireEvent.click(screen.getByLabelText(code));
}

describe("ResetSchoolData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(readResetOperationId).mockReturnValue(null);
    service.getCapability.mockResolvedValue({
      success: true,
      message: "",
      data: {
        available: true,
        active: false,
        operationId: null,
        phase: null,
        environment: "test",
        blockers: [],
        retainedAdmin: preview().actor,
        acknowledgements: acknowledgementCodes.map((code) => ({
          code,
          label: code,
        })),
      },
    });
    service.getPolicy.mockResolvedValue({
      success: true,
      message: "",
      data: { policy: preview().policy },
    } as never);
    service.preview.mockResolvedValue({
      success: true,
      message: "",
      data: preview(),
    } as never);
    service.getPublicStatus.mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: null,
        status: "idle",
        phase: null,
        retrying: false,
      },
    });
  });
  it("uses backend periods and requires review and every acknowledgement", async () => {
    render(<ResetSchoolData />);
    await review();
    expect(screen.getByText("11 other accounts")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    ).toBeDisabled();
    completeForm();
    expect(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    ).toBeEnabled();
  });
  it("discards sensitive review state when changing the target", async () => {
    render(<ResetSchoolData />);
    await review();
    completeForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Change calendar / cancel preview" }),
    );
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    await review();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("Reason for reset")).toHaveValue("");
  });
  it("blocks an expired preview", async () => {
    service.preview.mockResolvedValue({
      success: true,
      message: "",
      data: { ...preview(), expiresAt: new Date(Date.now() - 1).toISOString() },
    } as never);
    render(<ResetSchoolData />);
    await review();
    completeForm();
    expect(screen.getByText(/Preview expired/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    ).toBeDisabled();
  });
  it("prevents double execution and reuses the same key after a lost response", async () => {
    service.execute.mockRejectedValue(new Error("Network Error"));
    render(<ResetSchoolData />);
    await review();
    completeForm();
    const button = screen.getByRole("button", {
      name: "Reset school data permanently",
    });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText(/Acceptance is not confirmed/);
    expect(service.execute).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Reason for reset")).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry the same request" }),
    );
    await waitFor(() => expect(service.execute).toHaveBeenCalledTimes(2));
    expect(service.execute.mock.calls[0][0]).toEqual(
      service.execute.mock.calls[1][0],
    );
  });
  it("shows backend blockers and never permits preview when unavailable", async () => {
    const data = (await service.getCapability()).data;
    service.getCapability.mockResolvedValue({
      success: true,
      message: "",
      data: {
        ...data,
        available: false,
        blockers: [
          {
            code: "DISABLED",
            message: "Reset is disabled for this environment.",
          },
        ],
      },
    });
    render(<ResetSchoolData />);
    expect(
      await screen.findByText("Reset is disabled for this environment."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Generate preview" }),
    ).not.toBeInTheDocument();
  });
  it("opens public progress after matching acceptance and persists only the operation ID", async () => {
    service.execute.mockImplementation(async (payload) => ({
      success: true,
      message: "",
      data: {
        operationId: payload.idempotencyKey,
        phase: "draining",
        status: "running",
        acceptedAt: new Date().toISOString(),
      },
    }));
    render(<ResetSchoolData />);
    await review();
    completeForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    );
    await waitFor(() => expect(openResetProgress).toHaveBeenCalledTimes(1));
    const id = service.execute.mock.calls[0][0].idempotencyKey;
    expect(rememberResetOperationId).toHaveBeenCalledWith(id);
    expect(openResetProgress).toHaveBeenCalledWith(id);
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });
  it("blocks a second reset after reconnecting with an unresolved operation", async () => {
    jest
      .mocked(readResetOperationId)
      .mockReturnValue("9e84bb50-91f1-4fba-83e0-e1d84643a6d0");
    render(<ResetSchoolData />);
    expect(
      await screen.findByText(
        /A previous reset request still needs its outcome checked/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Generate preview" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Resume public progress" }),
    );
    expect(openResetProgress).toHaveBeenCalledWith(
      "9e84bb50-91f1-4fba-83e0-e1d84643a6d0",
    );
  });
  it("blocks offline execution without discarding the review", async () => {
    render(<ResetSchoolData />);
    await review();
    completeForm();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    fireEvent(window, new Event("offline"));
    expect(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Reason for reset")).toHaveValue(
      "Restart supervised school testing",
    );
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });
  it("retains the UUID when a preflight or changed-actor lookup returns 404 and a fresh review conflicts", async () => {
    jest
      .mocked(readResetOperationId)
      .mockReturnValue("9e84bb50-91f1-4fba-83e0-e1d84643a6d0");
    service.getOperation.mockRejectedValue({ response: { status: 404 } });
    render(<ResetSchoolData />);
    fireEvent.click(
      screen.getByRole("button", { name: "Check saved request" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Review again with the same operation ID",
      }),
    );
    await review();
    completeForm();
    service.execute.mockRejectedValue({ response: { status: 409 } });
    fireEvent.click(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    );
    await waitFor(() => expect(service.execute).toHaveBeenCalled());
    expect(service.execute.mock.calls[0][0].idempotencyKey).toBe(
      "9e84bb50-91f1-4fba-83e0-e1d84643a6d0",
    );
    expect(clearResetOperationId).not.toHaveBeenCalled();
    expect(openResetProgress).toHaveBeenCalledWith(
      "9e84bb50-91f1-4fba-83e0-e1d84643a6d0",
    );
  });
  it("does not discard an operation after a network or authentication failure", async () => {
    jest
      .mocked(readResetOperationId)
      .mockReturnValue("9e84bb50-91f1-4fba-83e0-e1d84643a6d0");
    service.getOperation.mockRejectedValue({ response: { status: 401 } });
    render(<ResetSchoolData />);
    fireEvent.click(
      screen.getByRole("button", { name: "Check saved request" }),
    );
    await screen.findByText(/could not verify the saved request/);
    expect(
      screen.queryByRole("button", {
        name: "Discard unaccepted request and start review",
      }),
    ).not.toBeInTheDocument();
  });
  it("does not post when saving the ID fails", async () => {
    render(<ResetSchoolData />);
    await review();
    completeForm();
    jest.mocked(rememberResetOperationId).mockImplementationOnce(() => {
      throw new Error("Storage denied");
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Reset school data permanently" }),
    );
    await screen.findByText(/could not be saved/);
    expect(service.execute).not.toHaveBeenCalled();
  });
  it("checks expiry at the click even when the countdown timer was throttled", async () => {
    render(<ResetSchoolData />);
    await review();
    completeForm();
    const clock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 360000);
    try {
      fireEvent.click(
        screen.getByRole("button", { name: "Reset school data permanently" }),
      );
      expect(service.execute).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
    }
  });
});
