import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";
import { systemCapabilitiesService } from "@/services/system-capabilities-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    getImpactPreview: jest.fn(),
    previewActivation: jest.fn(),
    activatePeriod: jest.fn(),
    transition: jest.fn(),
    notifyTeachers: jest.fn(),
  },
}));

jest.mock("@/services/system-capabilities-service", () => ({
  systemCapabilitiesService: { getSnapshot: jest.fn() },
}));

jest.mock("@/components/admin/AcademicBackSubjectsPanel", () => ({
  AcademicBackSubjectsPanel: () => <p>Learner completion panel</p>,
}));

jest.mock("@/components/admin/AcademicRecoveryPanel", () => ({
  AcademicRecoveryPanel: () => <p>Recovery panel</p>,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const current = {
  id: "state",
  schoolYear: "2026-2027",
  quarter: "Q3",
  version: 4,
  periods: [
    { key: "Q1", label: "Quarter 1" },
    { key: "Q2", label: "Quarter 2" },
    { key: "Q3", label: "Quarter 3" },
    { key: "Q4", label: "Quarter 4" },
  ],
  policy: {
    id: "deped-2026-q4-v2",
    gradeMethod: "adjusted_2026",
    periods: [
      { key: "Q1", label: "Quarter 1" },
      { key: "Q2", label: "Quarter 2" },
      { key: "Q3", label: "Quarter 3" },
      { key: "Q4", label: "Quarter 4" },
    ],
  },
  updatedAt: "2026-09-05T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};

const capabilities = {
  version: 1 as const,
  observedAt: "2026-09-29T03:00:00.000Z",
  roleScope: ["admin"],
  capabilities: {
    academicOperations: {
      available: true,
      allowed: true,
      state: "active" as const,
      reasonCode: null,
      source: "academic-state" as const,
      observedAt: "2026-09-29T03:00:00.000Z",
    },
    maintenanceAccess: {
      available: true,
      allowed: true,
      state: "inactive" as const,
      reasonCode: "MAINTENANCE_INACTIVE",
      source: "admin-maintenance" as const,
      observedAt: "2026-09-29T03:00:00.000Z",
    },
    systemReadiness: {
      available: true,
      allowed: true,
      state: "ready" as const,
      reasonCode: null,
      source: "health-readiness" as const,
      observedAt: "2026-09-29T03:00:00.000Z",
    },
    workflowDiagnostics: {
      available: true,
      allowed: true,
      state: "degraded" as const,
      reasonCode: "WORKFLOW_ALERTS_PRESENT",
      source: "workflow-diagnostics" as const,
      observedAt: "2026-09-29T03:00:00.000Z",
    },
  },
};

describe("Admin system settings overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
    (systemCapabilitiesService.getSnapshot as jest.Mock).mockResolvedValue(
      capabilities,
    );
  });

  it("shows backend-owned capability states with semantic labels", async () => {
    render(<Page />);

    expect(screen.getByText("Live system capabilities")).toBeInTheDocument();
    expect(await screen.findByText("Academic operations")).toBeInTheDocument();
    expect(screen.getByText("Workflow diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("WORKFLOW_ALERTS_PRESENT")).toBeInTheDocument();
  });

  it("keeps settings destinations usable when capabilities are unavailable", async () => {
    (systemCapabilitiesService.getSnapshot as jest.Mock).mockRejectedValue(
      new Error("Capability snapshot unavailable"),
    );

    render(<Page />);

    expect(
      await screen.findByText("Capability snapshot unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Reset school data/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Review or change the active period/ }),
    ).toBeInTheDocument();
  });

  it("makes the active state and current-period assessment rule explicit without loading advanced panels", async () => {
    render(<Page />);

    expect(await screen.findByText("Active school year")).toBeInTheDocument();
    expect(screen.getByText("2026–2027")).toBeInTheDocument();
    expect(screen.getByText("Active grading period")).toBeInTheDocument();
    expect(screen.getByText("Quarter 3")).toBeInTheDocument();
    expect(
      screen.getByText(/new student attempts must use quarter 3/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review assessment rules" }),
    ).toHaveAttribute(
      "href",
      "/dashboard/admin/system-settings/assessments-grading",
    );
    expect(academicStateService.getImpactPreview).not.toHaveBeenCalled();
    expect(screen.queryByText("Learner completion panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Recovery panel")).not.toBeInTheDocument();
  });

  it("ends loading after a current-state failure and retries only that request", async () => {
    (academicStateService.getCurrent as jest.Mock)
      .mockRejectedValueOnce(new Error("Academic state unavailable"))
      .mockResolvedValueOnce({ data: current });

    render(<Page />);

    expect(
      await screen.findByRole("alert", { name: "Academic state unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Loading the academic state…"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reset school data/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review or change the active period/ })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry current state" }),
    );

    expect(await screen.findByText("Active school year")).toBeInTheDocument();
    await waitFor(() => {
      expect(academicStateService.getCurrent).toHaveBeenCalledTimes(2);
    });
    expect(academicStateService.getImpactPreview).not.toHaveBeenCalled();
  });
});
