import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAdminDemoMode } from "@/providers/AdminDemoModeProvider";
import type { AdminDemoModeStatus } from "@/types/admin-demo-mode";
import Page from "./page";

jest.mock("@/providers/AdminDemoModeProvider", () => ({
  useAdminDemoMode: jest.fn(),
}));

const disabled: AdminDemoModeStatus = {
  available: true,
  active: false,
  state: "disabled" as const,
  version: 5,
  serverTime: "2026-09-12T00:00:00.000Z",
  activatedAt: null,
  expiresAt: null,
  reason: null,
  activatedBy: null,
  relaxedRules: [
    {
      code: "section_capacity",
      label: "Section capacity",
      description: "Allow a presentation overbooking.",
    },
  ],
  protectedRules: [
    {
      code: "authentication_and_rbac",
      label: "Authentication and roles",
      description: "Authentication remains required.",
    },
  ],
};

const activate = jest.fn();
const deactivate = jest.fn();
const refresh = jest.fn();

function mockContextState(status: typeof disabled | null, overrides = {}) {
  (useAdminDemoMode as jest.Mock).mockReturnValue({
    status,
    loading: false,
    error: null,
    mutating: false,
    activate,
    deactivate,
    refresh,
    ...overrides,
  });
}

function completeActivationForm() {
  fireEvent.change(screen.getByLabelText("Reason for Demo mode"), {
    target: { value: "School defense rehearsal" },
  });
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "Test@123" },
  });
  fireEvent.change(screen.getByLabelText("Type ENABLE DEMO MODE"), {
    target: { value: "ENABLE DEMO MODE" },
  });
  for (const checkbox of screen.getAllByRole("checkbox")) {
    fireEvent.click(checkbox);
  }
}

describe("Demo mode settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activate.mockResolvedValue(undefined);
    deactivate.mockResolvedValue(undefined);
    mockContextState(disabled);
  });

  it("keeps activation disabled until the reason, password, phrase, and every acknowledgement are valid", async () => {
    render(<Page />);

    const button = screen.getByRole("button", { name: "Activate Demo mode" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Section capacity")).toBeInTheDocument();
    expect(screen.getByText("Authentication and roles")).toBeInTheDocument();

    completeActivationForm();
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(activate).toHaveBeenCalledWith({
        currentPassword: "Test@123",
        confirmation: "ENABLE DEMO MODE",
        reason: "School defense rehearsal",
        durationMinutes: 30,
        expectedVersion: 5,
        acknowledgements: [
          "SHARED_DATA_CAN_CHANGE",
          "ACTIONS_REMAIN_AUDITED",
          "HARD_SAFEGUARDS_REMAIN",
        ],
      }),
    );
  });

  it("clears the password and shows backend evidence after a rejected activation", async () => {
    activate.mockRejectedValue(new Error("Current password is incorrect."));
    render(<Page />);
    completeActivationForm();
    fireEvent.click(screen.getByRole("button", { name: "Activate Demo mode" }));

    expect(
      await screen.findByText("Current password is incorrect."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("shows stale-version errors without silently changing the displayed state", async () => {
    activate.mockRejectedValue(
      new Error("Demo mode changed. Refresh and review the latest status."),
    );
    render(<Page />);
    completeActivationForm();
    fireEvent.click(screen.getByRole("button", { name: "Activate Demo mode" }));

    expect(await screen.findByText(/refresh and review/i)).toBeInTheDocument();
    expect(screen.getByText("Demo mode is off")).toBeInTheDocument();
  });

  it("deactivates active mode only after the exact phrase", async () => {
    mockContextState({
      ...disabled,
      active: true,
      state: "active",
      expiresAt: "2026-09-12T00:15:00.000Z",
      reason: "School defense rehearsal",
    });
    render(<Page />);

    const button = screen.getByRole("button", { name: "Deactivate Demo mode" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type DISABLE DEMO MODE"), {
      target: { value: "DISABLE DEMO MODE" },
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(deactivate).toHaveBeenCalledWith({
        confirmation: "DISABLE DEMO MODE",
        expectedVersion: 5,
      }),
    );
  });

  it.each([
    ["loading", null, { loading: true }, "Loading Demo mode status"],
    [
      "error",
      null,
      { error: "Status could not be loaded." },
      "Status could not be loaded.",
    ],
    [
      "unavailable",
      { ...disabled, available: false, state: "unavailable" },
      {},
      "unavailable in this deployment",
    ],
    [
      "expired",
      { ...disabled, state: "expired" },
      {},
      "The previous Demo mode window expired",
    ],
  ])("renders the %s state honestly", (_name, status, overrides, expected) => {
    mockContextState(status as typeof disabled | null, overrides);
    render(<Page />);
    expect(screen.getByText(new RegExp(expected, "i"))).toBeInTheDocument();
  });
});
