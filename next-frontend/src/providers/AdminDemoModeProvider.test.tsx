import { act, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "@/providers/AuthProvider";
import { adminDemoModeService } from "@/services/admin-demo-mode-service";
import {
  AdminDemoModeProvider,
  useAdminDemoMode,
} from "./AdminDemoModeProvider";

jest.mock("@/providers/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/services/admin-demo-mode-service", () => ({
  adminDemoModeService: {
    getStatus: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  },
}));

const active = {
  available: true,
  active: true,
  state: "active" as const,
  version: 4,
  serverTime: "2026-09-12T00:00:00.000Z",
  activatedAt: "2026-09-12T00:00:00.000Z",
  expiresAt: "2026-09-12T00:15:00.000Z",
  reason: "School defense rehearsal",
  activatedBy: { id: "admin-1", displayName: "Ada Admin" },
  relaxedRules: [],
  protectedRules: [],
};

function Probe() {
  const { status, loading, error } = useAdminDemoMode();
  return (
    <div>
      <span>{loading ? "loading" : "settled"}</span>
      <span>{status?.state ?? "no-status"}</span>
      <span>{error ?? "no-error"}</span>
    </div>
  );
}

describe("AdminDemoModeProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-12T00:00:00.000Z"));
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ role: "admin" });
    (adminDemoModeService.getStatus as jest.Mock).mockResolvedValue(active);
  });

  afterEach(() => jest.useRealTimers());

  it("loads status for administrators and refetches on focus and every 30 seconds", async () => {
    render(
      <AdminDemoModeProvider>
        <Probe />
      </AdminDemoModeProvider>,
    );

    expect(await screen.findByText("active")).toBeInTheDocument();
    expect(adminDemoModeService.getStatus).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(adminDemoModeService.getStatus).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(adminDemoModeService.getStatus).toHaveBeenCalledTimes(3);
  });

  it("does not request or expose status outside the admin shell", async () => {
    (useAuth as jest.Mock).mockReturnValue({ role: "teacher" });
    render(
      <AdminDemoModeProvider>
        <Probe />
      </AdminDemoModeProvider>,
    );

    expect(screen.getByText("settled")).toBeInTheDocument();
    expect(screen.getByText("no-status")).toBeInTheDocument();
    expect(adminDemoModeService.getStatus).not.toHaveBeenCalled();
  });

  it("reports an API failure without claiming Demo mode is disabled", async () => {
    (adminDemoModeService.getStatus as jest.Mock).mockRejectedValue(
      new Error("status unavailable"),
    );
    render(
      <AdminDemoModeProvider>
        <Probe />
      </AdminDemoModeProvider>,
    );

    expect(await screen.findByText("status unavailable")).toBeInTheDocument();
    expect(screen.getByText("no-status")).toBeInTheDocument();
  });

  it("expires active status using the backend clock instead of leaving a stale capability", async () => {
    (adminDemoModeService.getStatus as jest.Mock).mockResolvedValue({
      ...active,
      expiresAt: "2026-09-12T00:00:02.000Z",
    });
    render(
      <AdminDemoModeProvider>
        <Probe />
      </AdminDemoModeProvider>,
    );
    expect(await screen.findByText("active")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2_100);
      await Promise.resolve();
    });
    expect(screen.getByText("expired")).toBeInTheDocument();
  });
});
