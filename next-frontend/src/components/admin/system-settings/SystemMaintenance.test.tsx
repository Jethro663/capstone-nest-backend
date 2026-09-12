import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { SystemMaintenance } from "./SystemMaintenance";
import { systemResetService } from "@/services/system-reset-service";
import {
  readResetOperationId,
  clearResetOperationId,
  readResetUrlOperationId,
} from "@/lib/system-reset-session";
import { clearAccessToken } from "@/lib/api-client";

jest.mock("@/services/system-reset-service", () => ({
  systemResetService: { getPublicStatus: jest.fn(), getOperation: jest.fn() },
}));
jest.mock("@/lib/system-reset-session", () => ({
  readResetOperationId: jest.fn(),
  clearResetOperationId: jest.fn(),
  readResetUrlOperationId: jest.fn(),
  rememberResetOperationId: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({ clearAccessToken: jest.fn() }));
const clearQueries = jest.fn();
const setUser = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: clearQueries }),
}));
jest.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ setUser }) }));

describe("public reset progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.mocked(readResetOperationId).mockReturnValue("mine");
    jest.mocked(readResetUrlOperationId).mockReturnValue(null);
  });
  afterEach(() => jest.restoreAllMocks());
  it("clears local authentication and caches only for matching completion", async () => {
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "mine",
        status: "completed",
        phase: "complete",
        retrying: false,
      },
    });
    render(<SystemMaintenance />);
    expect(
      await screen.findByRole("heading", {
        name: "School data reset complete",
      }),
    ).toBeInTheDocument();
    expect(clearAccessToken).toHaveBeenCalledTimes(1);
    expect(clearQueries).toHaveBeenCalledTimes(1);
    expect(setUser).toHaveBeenCalledWith(null);
    expect(clearResetOperationId).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("link", { name: "Sign in again" }),
    ).toHaveAttribute("href", "/login");
  });
  it("clears every content-derived browser cache while preserving preferences", async () => {
    const removedLocalKeys = [
      "assignment-creation:v1:teacher:class",
      "assessment-create-pending:class",
      "class-template-editor:template:draft",
      "teacher-ai-draft-jobs:class",
      "teacher-extraction-jobs:class",
      "nexora:notification-surface:v1:admin",
    ];
    const removedSessionKeys = [
      "nexora.student.announcement-board.dismissed",
      "nexora.teacherPendingInterventionCount:teacher",
    ];
    for (const key of removedLocalKeys)
      window.localStorage.setItem(key, JSON.stringify({ old: true }));
    for (const key of removedSessionKeys)
      window.sessionStorage.setItem(key, "old");
    window.localStorage.setItem("nexora.adminSidebarCollapsed", "true");
    window.localStorage.setItem("nexora.demo.sfx.enabled", "0");

    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "mine",
        status: "completed",
        phase: "complete",
        retrying: false,
      },
    });

    render(<SystemMaintenance />);
    await screen.findByRole("link", { name: "Sign in again" });

    for (const key of removedLocalKeys)
      expect(window.localStorage.getItem(key)).toBeNull();
    for (const key of removedSessionKeys)
      expect(window.sessionStorage.getItem(key)).toBeNull();
    expect(window.localStorage.getItem("nexora.adminSidebarCollapsed")).toBe(
      "true",
    );
    expect(window.localStorage.getItem("nexora.demo.sfx.enabled")).toBe("0");
  });
  it("never claims another operation completed this request", async () => {
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "someone-else",
        status: "completed",
        phase: "complete",
        retrying: false,
      },
    });
    render(<SystemMaintenance />);
    await screen.findByText(/does not match/);
    expect(clearAccessToken).not.toHaveBeenCalled();
    expect(clearResetOperationId).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "School data reset complete" }),
    ).not.toBeInTheDocument();
  });
  it("preserves the session and offers return when the matching reset aborts", async () => {
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "mine",
        status: "aborted",
        phase: "aborted",
        retrying: false,
      },
    });
    render(<SystemMaintenance />);
    await waitFor(() =>
      expect(screen.getByText(/School data was preserved/)).toBeInTheDocument(),
    );
    expect(clearAccessToken).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("link", { name: "Return to system settings" }),
    ).toBeInTheDocument();
  });
  it("preserves saved A when URL and public completion identify B", async () => {
    jest.mocked(readResetUrlOperationId).mockReturnValue("other");
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "other",
        phase: "complete",
        status: "completed",
        retrying: false,
      },
    });
    render(<SystemMaintenance />);
    await screen.findByText(/link identifies a different operation/);
    expect(clearAccessToken).not.toHaveBeenCalled();
    expect(clearResetOperationId).not.toHaveBeenCalled();
  });
  it("does not automatically trust a URL-only completed operation", async () => {
    jest.mocked(readResetOperationId).mockReturnValue(null);
    jest.mocked(readResetUrlOperationId).mockReturnValue("linked");
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "linked",
        phase: "complete",
        status: "completed",
        retrying: false,
      },
    });
    render(<SystemMaintenance />);
    await screen.findByRole("button", {
      name: "Verify linked request with administrator session",
    });
    expect(clearAccessToken).not.toHaveBeenCalled();
  });
  it("uses a matching authenticated owned receipt to resolve an older operation", async () => {
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "newer",
        phase: "complete",
        status: "completed",
        retrying: false,
      },
    });
    jest.mocked(systemResetService.getOperation).mockResolvedValue({
      success: true,
      message: "",
      data: {
        operationId: "mine",
        phase: "complete",
        status: "completed",
        retrying: false,
      },
    } as never);
    render(<SystemMaintenance />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Check authenticated receipt",
      }),
    );
    await screen.findByRole("heading", { name: "School data reset complete" });
    expect(clearAccessToken).toHaveBeenCalled();
  });
  it("continues auth and cache cleanup after storage denial and allows cleanup retry", async () => {
    window.sessionStorage.setItem(
      "nexora.student.announcement-board.dismissed",
      "dismissed",
    );
    const removeItem = Storage.prototype.removeItem;
    let denyOnce = true;
    jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(function (this: Storage, key: string) {
        if (
          denyOnce &&
          key === "nexora.student.announcement-board.dismissed"
        ) {
          denyOnce = false;
          throw new Error("Storage denied");
        }
        return removeItem.call(this, key);
      });
    jest.mocked(systemResetService.getPublicStatus).mockResolvedValue({
      success: true,
      message: "",
      data: {
        active: false,
        operationId: "mine",
        phase: "complete",
        status: "completed",
        retrying: false,
      },
    });
    render(<SystemMaintenance />);
    await screen.findByRole("button", { name: "Retry local cleanup" });
    expect(clearAccessToken).toHaveBeenCalled();
    expect(clearQueries).toHaveBeenCalled();
    expect(setUser).toHaveBeenCalledWith(null);
    expect(clearResetOperationId).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry local cleanup" }),
    );
    await screen.findByRole("link", { name: "Sign in again" });
  });
  it("keeps an owned terminal receipt when an older public poll resolves afterward", async () => {
    let resolvePublic!: (
      value: Awaited<ReturnType<typeof systemResetService.getPublicStatus>>,
    ) => void;
    jest.mocked(systemResetService.getPublicStatus).mockReturnValue(
      new Promise((resolve) => {
        resolvePublic = resolve;
      }),
    );
    jest
      .mocked(systemResetService.getOperation)
      .mockResolvedValue({
        success: true,
        message: "",
        data: {
          operationId: "mine",
          phase: "complete",
          status: "completed",
          retrying: false,
        },
      } as never);
    render(<SystemMaintenance />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Check authenticated receipt",
      }),
    );
    await screen.findByRole("link", { name: "Sign in again" });
    await act(async () =>
      resolvePublic({
        success: true,
        message: "",
        data: {
          active: false,
          operationId: "newer",
          phase: "complete",
          status: "completed",
          retrying: false,
        },
      }),
    );
    expect(
      screen.getByRole("heading", { name: "School data reset complete" }),
    ).toBeInTheDocument();
    expect(clearAccessToken).toHaveBeenCalledTimes(1);
  });
  it("does not accept a mismatched authenticated receipt", async () => {
    jest
      .mocked(systemResetService.getPublicStatus)
      .mockResolvedValue({
        success: true,
        message: "",
        data: {
          active: false,
          operationId: "other",
          phase: "complete",
          status: "completed",
          retrying: false,
        },
      });
    jest
      .mocked(systemResetService.getOperation)
      .mockResolvedValue({
        success: true,
        message: "",
        data: {
          operationId: "other",
          phase: "complete",
          status: "completed",
          retrying: false,
        },
      } as never);
    render(<SystemMaintenance />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Check authenticated receipt",
      }),
    );
    await screen.findByText(/owned receipt could not be verified/);
    expect(clearAccessToken).not.toHaveBeenCalled();
    expect(clearResetOperationId).not.toHaveBeenCalled();
  });
  it("does not offer completion navigation until tracking removal succeeds", async () => {
    jest.mocked(clearResetOperationId).mockImplementationOnce(() => {
      throw new Error("Storage denied");
    });
    jest
      .mocked(systemResetService.getPublicStatus)
      .mockResolvedValue({
        success: true,
        message: "",
        data: {
          active: false,
          operationId: "mine",
          phase: "complete",
          status: "completed",
          retrying: false,
        },
      });
    render(<SystemMaintenance />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Retry local cleanup" }),
    );
    await screen.findByRole("link", { name: "Sign in again" });
    expect(clearResetOperationId).toHaveBeenCalledTimes(2);
  });
});
