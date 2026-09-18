import axios from "axios";
import {
  workspaceSnapshotStore,
  type WorkspaceSnapshotKind,
} from "./workspace-snapshot";

let offlineWorkspaceReadsEnabled =
  process.env.EXPO_PUBLIC_OFFLINE_WORKSPACE_SNAPSHOTS !== "disabled";

export function setOfflineWorkspaceReadsEnabled(enabled: boolean): void {
  offlineWorkspaceReadsEnabled = enabled;
}

type SnapshotPort = Pick<typeof workspaceSnapshotStore, "read" | "write">;

export type OfflineWorkspaceState = {
  readOnly: true;
  lastSyncedAt: string;
};

type LoadWorkspaceOptions<T extends object> = {
  userId: string;
  kind: WorkspaceSnapshotKind;
  request: () => Promise<T>;
  snapshot?: SnapshotPort;
  prepareForSnapshot?: (data: T) => unknown;
  acceptSnapshot?: (payload: unknown) => boolean;
};

function isNetworkFailure(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (!error.response || error.code === "ERR_NETWORK")
  );
}

export async function loadWorkspaceWithSnapshot<T extends object>({
  userId,
  kind,
  request,
  snapshot = workspaceSnapshotStore,
  prepareForSnapshot,
  acceptSnapshot,
}: LoadWorkspaceOptions<T>): Promise<
  T & { offlineState?: OfflineWorkspaceState }
> {
  try {
    const data = await request();
    if (offlineWorkspaceReadsEnabled) {
      await Promise.resolve(
        snapshot.write(
          userId,
          kind,
          prepareForSnapshot ? prepareForSnapshot(data) : data,
        ),
      ).catch(() => undefined);
    }
    return data;
  } catch (error) {
    if (!isNetworkFailure(error) || !offlineWorkspaceReadsEnabled) throw error;

    const cached = await snapshot.read(userId, kind);
    if (!cached || (acceptSnapshot && !acceptSnapshot(cached.payload))) {
      throw error;
    }

    return {
      ...(cached.payload as T),
      offlineState: {
        readOnly: true,
        lastSyncedAt: new Date(cached.savedAt).toISOString(),
      },
    };
  }
}
