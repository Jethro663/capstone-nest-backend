import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  MobileCalendarWorkspace,
  MobileStudentOverview,
  MobileTeacherLibraryIndex,
  MobileTeacherOverview,
} from "../../types/mobile-workspace";
import {
  loadWorkspaceWithSnapshot,
  setOfflineWorkspaceReadsEnabled,
} from "../../services/offline/workspace-loader";

type CalendarRange = { from: string; to: string };

export const mobileWorkspaceApi = {
  async getStudentOverview(): Promise<MobileStudentOverview> {
    const response = await apiClient.get<ApiEnvelope<MobileStudentOverview>>(
      "/mobile-workspace/student/overview",
    );
    const data = unwrapEnvelope(response.data);
    setOfflineWorkspaceReadsEnabled(data.offlineSnapshotReadsEnabled !== false);
    return data;
  },

  async getTeacherOverview(): Promise<MobileTeacherOverview> {
    const response = await apiClient.get<ApiEnvelope<MobileTeacherOverview>>(
      "/mobile-workspace/teacher/overview",
    );
    const data = unwrapEnvelope(response.data);
    setOfflineWorkspaceReadsEnabled(data.offlineSnapshotReadsEnabled !== false);
    return data;
  },

  async getTeacherLibraryIndex(): Promise<MobileTeacherLibraryIndex> {
    const response = await apiClient.get<
      ApiEnvelope<MobileTeacherLibraryIndex>
    >("/mobile-workspace/teacher/library-index");
    return unwrapEnvelope(response.data);
  },

  async getCalendar(
    role: "student" | "teacher",
    range: CalendarRange,
  ): Promise<MobileCalendarWorkspace> {
    const response = await apiClient.get<ApiEnvelope<MobileCalendarWorkspace>>(
      `/mobile-workspace/${role}/calendar`,
      { params: range },
    );
    const data = unwrapEnvelope(response.data);
    setOfflineWorkspaceReadsEnabled(data.offlineSnapshotReadsEnabled !== false);
    return data;
  },

  getStudentOverviewForUser(userId: string): Promise<MobileStudentOverview> {
    return loadWorkspaceWithSnapshot({
      userId,
      kind: "student_overview",
      request: () => mobileWorkspaceApi.getStudentOverview(),
    });
  },

  getTeacherOverviewForUser(userId: string): Promise<MobileTeacherOverview> {
    return loadWorkspaceWithSnapshot({
      userId,
      kind: "teacher_overview",
      request: () => mobileWorkspaceApi.getTeacherOverview(),
    });
  },

  getCalendarForUser(
    userId: string,
    role: "student" | "teacher",
    range: CalendarRange,
  ): Promise<MobileCalendarWorkspace> {
    return loadWorkspaceWithSnapshot({
      userId,
      kind: "calendar",
      request: () => mobileWorkspaceApi.getCalendar(role, range),
      prepareForSnapshot: (data) => ({ ...data, snapshotRange: range }),
      acceptSnapshot: (payload) => {
        const value = payload as { snapshotRange?: CalendarRange };
        return (
          value.snapshotRange?.from === range.from &&
          value.snapshotRange?.to === range.to
        );
      },
    });
  },
};
