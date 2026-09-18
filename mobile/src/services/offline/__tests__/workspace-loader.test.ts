import axios from "axios";
import {
  loadWorkspaceWithSnapshot,
  setOfflineWorkspaceReadsEnabled,
} from "../workspace-loader";

describe("loadWorkspaceWithSnapshot", () => {
  const snapshot = {
    write: jest.fn(),
    read: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setOfflineWorkspaceReadsEnabled(true);
  });

  it("writes successful online responses and marks them live", async () => {
    const data = { courses: [], generatedAt: "2026-09-18T00:00:00.000Z" };
    const result = await loadWorkspaceWithSnapshot({
      userId: "user-1",
      kind: "student_overview",
      request: async () => data,
      snapshot,
    });

    expect(snapshot.write).toHaveBeenCalledWith(
      "user-1",
      "student_overview",
      data,
    );
    expect(result).toEqual(data);
  });

  it("uses a valid snapshot only for a network failure and marks it read-only", async () => {
    snapshot.read.mockResolvedValue({
      payload: { courses: [] },
      savedAt: Date.parse("2026-09-18T00:00:00.000Z"),
    });
    const result = await loadWorkspaceWithSnapshot({
      userId: "user-1",
      kind: "student_overview",
      request: async () => {
        throw new axios.AxiosError("offline", "ERR_NETWORK");
      },
      snapshot,
    });

    expect(result).toEqual({
      courses: [],
      offlineState: {
        readOnly: true,
        lastSyncedAt: "2026-09-18T00:00:00.000Z",
      },
    });
  });

  it("does not hide authorization or server errors behind cached data", async () => {
    const error = new axios.AxiosError(
      "forbidden",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      { status: 403 } as never,
    );
    await expect(
      loadWorkspaceWithSnapshot({
        userId: "user-1",
        kind: "student_overview",
        request: async () => {
          throw error;
        },
        snapshot,
      }),
    ).rejects.toBe(error);
    expect(snapshot.read).not.toHaveBeenCalled();
  });

  it("honors a runtime server kill switch without disabling live requests", async () => {
    setOfflineWorkspaceReadsEnabled(false);
    const networkError = new axios.AxiosError("offline", "ERR_NETWORK");
    await expect(
      loadWorkspaceWithSnapshot({
        userId: "user-1",
        kind: "student_overview",
        request: async () => {
          throw networkError;
        },
        snapshot,
      }),
    ).rejects.toBe(networkError);
    expect(snapshot.read).not.toHaveBeenCalled();

    const live = { courses: [] };
    await expect(
      loadWorkspaceWithSnapshot({
        userId: "user-1",
        kind: "student_overview",
        request: async () => live,
        snapshot,
      }),
    ).resolves.toBe(live);
    expect(snapshot.write).not.toHaveBeenCalled();
  });
});
