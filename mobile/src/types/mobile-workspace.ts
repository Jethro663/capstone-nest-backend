import type { ScheduleDay } from "./class";
import type { OfflineWorkspaceState } from "../services/offline/workspace-loader";

export type MobileSchedule = {
  id: string;
  days: ScheduleDay[];
  startTime: string;
  endTime: string;
};

export type MobileStudentCourseOverview = {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
  schoolYear: string;
  sectionName: string;
  sectionGradeLevel: string;
  teacherName: string;
  totalLessons: number;
  completedLessonCount: number;
  totalAssessments: number;
  assessmentDueCount: number;
  announcementCount: number;
  classmateCount: number;
  progress: number;
  schedules: MobileSchedule[];
};

export type MobileClassSummary = {
  id: string;
  sectionId: string;
  isActive: boolean;
  subjectName: string;
  subjectCode: string;
  schoolYear: string;
  room?: string;
  section: { id: string; name: string; gradeLevel: string };
  enrollmentCount: number;
  schedules: MobileSchedule[];
};

export type MobileAssessmentSummary = {
  id: string;
  classId: string;
  title: string;
  description?: string | null;
  dueDate: string | null;
  isPublished: boolean;
  createdAt?: string;
};

export type MobileAnnouncementSummary = {
  id: string;
  classId: string;
  title: string;
  content?: string;
  createdAt: string;
  scheduledAt: string | null;
  publishedAt?: string | null;
};

export type MobileSchoolEventSummary = {
  id: string;
  eventType: "school_event" | "holiday_break";
  schoolYear: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
};

export type MobileStudentOverview = {
  schemaVersion: 1;
  courses: MobileStudentCourseOverview[];
  sections: { courses: "ok" | "unavailable" };
  generatedAt: string;
  requestBudget: { clientRequests: 1; dbQueries: 1 };
  offlineSnapshotReadsEnabled: boolean;
  offlineState?: OfflineWorkspaceState;
};

export type MobileTeacherOverview = {
  schemaVersion: 1;
  classes: MobileClassSummary[];
  assessments: MobileAssessmentSummary[];
  announcements: MobileAnnouncementSummary[];
  atRiskCounts: Record<string, number>;
  sections: Record<
    "classes" | "assessments" | "announcements" | "atRiskCounts",
    "ok" | "unavailable"
  >;
  generatedAt: string;
  requestBudget: { clientRequests: 1; dbQueries: 4 };
  offlineSnapshotReadsEnabled: boolean;
  offlineState?: OfflineWorkspaceState;
};

export type MobileTeacherLibraryModule = {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  order: number;
  isVisible: boolean;
  isLocked: boolean;
  classLabel: string;
  sectionCount: number;
  lessonCount: number;
};

export type MobileTeacherLibraryIndex = {
  schemaVersion: 1;
  modules: MobileTeacherLibraryModule[];
  generatedAt: string;
  requestBudget: { clientRequests: 1; dbQueries: 1 };
};

export type MobileCalendarWorkspace = {
  schemaVersion: 1;
  classes: MobileClassSummary[];
  assessments: MobileAssessmentSummary[];
  announcements: MobileAnnouncementSummary[];
  schoolEvents: MobileSchoolEventSummary[];
  sections: Record<
    "classes" | "assessments" | "announcements" | "schoolEvents",
    "ok" | "unavailable"
  >;
  generatedAt: string;
  requestBudget: { clientRequests: 1; dbQueries: 4 };
  offlineSnapshotReadsEnabled: boolean;
  offlineState?: OfflineWorkspaceState;
};
