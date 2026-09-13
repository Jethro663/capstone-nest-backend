import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";

const open = jest.fn().mockResolvedValue(undefined);
const close = jest.fn().mockResolvedValue(undefined);
const refresh = jest.fn().mockResolvedValue(undefined);
let mockStatus: Record<string, unknown> = {};

jest.mock("@/providers/AdminMaintenanceProvider", () => ({
  useAdminMaintenance: () => ({
    status: mockStatus,
    loading: false,
    error: null,
    mutating: false,
    open,
    close,
    refresh,
  }),
}));

const inactiveStatus = {
  available: true,
  active: false,
  state: "inactive",
  sessionId: null,
  serverTime: "2026-09-13T01:00:00.000Z",
  startedAt: null,
  expiresAt: null,
  reason: null,
  scopeCodes: [],
  rules: [],
  protectedRules: [],
};

describe("Maintenance Access settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = { ...inactiveStatus };
  });

  it("requires the exact reviewed contract and opens one actor-bound window", async () => {
    render(<Page />);
    const submit = screen.getByRole("button", {
      name: "Open Maintenance Access",
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Prepare evaluator walkthrough." },
    });
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "Current@123" },
    });
    fireEvent.change(screen.getByLabelText("Type OPEN MAINTENANCE ACCESS"), {
      target: { value: "OPEN MAINTENANCE ACCESS" },
    });
    fireEvent.click(
      screen.getByLabelText(
        /live classes, sections, rosters, and account state can change/i,
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        /finalized grades, submitted evidence, and audit history stay protected/i,
      ),
    );
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith({
        currentPassword: "Current@123",
        confirmation: "OPEN MAINTENANCE ACCESS",
        reason: "Prepare evaluator walkthrough.",
        acknowledgements: [
          "LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE",
          "FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED",
        ],
      }),
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("shows and closes only the active administrator window", async () => {
    mockStatus = {
      ...inactiveStatus,
      active: true,
      state: "active",
      sessionId: "session-1",
      expiresAt: "2099-09-13T01:15:00.000Z",
    };
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Close access now" }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });
});
