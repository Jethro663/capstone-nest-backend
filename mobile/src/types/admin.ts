import type { User } from "./user";

export interface AdminOverview {
  stats: {
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
    totalClasses: number;
    totalSections: number;
    activeClasses: number;
    totalEnrollments: number;
    fetchedAt: string;
  };
  usageSummary: {
    activeTeachers: number;
    activeStudents: number;
    assessmentSubmissions: number;
    lessonCompletions: number;
    interventionOpens: number;
    interventionClosures: number;
    topActions: Array<{ action: string; total: number }>;
    generatedAt: string;
  };
  analyticsOverview: {
    totals: {
      teachers: number;
      students: number;
      classes: number;
      activeInterventions: number;
      atRiskStudents: number;
    };
    action: string;
  };
  readiness: {
    ready: boolean;
    timestamp: string;
    dependencies: Record<
      string,
      { ok: boolean; degraded?: boolean; message?: string }
    >;
  };
  fetchedAt: string;
}

export interface AdminUserList {
  users: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  statusCounts?: Record<"ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED", number>;
}

export interface CreateAdminUserDto {
  email: string;
  password?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: "student" | "teacher" | "admin";
  employeeId?: string;
  contactNumber?: string;
  lrn?: string;
  gradeLevel?: "7" | "8" | "9" | "10";
}

export interface UpdateAdminUserDto {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: "student" | "teacher" | "admin";
  employeeId?: string;
  contactNumber?: string;
  lrn?: string;
  gradeLevel?: "7" | "8" | "9" | "10";
  dateOfBirth?: string;
  gender?: "Male" | "Female";
  phone?: string;
  address?: string;
  familyName?: string;
  familyRelationship?: "Father" | "Mother" | "Guardian" | "Sibling" | "Other";
  familyContact?: string;
}

export interface ResetAdminUserPasswordResponse {
  success: boolean;
  message: string;
  userId: string;
  generatedPassword: string;
  emailDeliveryStatus?: "sent" | "failed";
  emailDeliveryError?: string;
}

export interface UserMonitoringReportItem extends User {
  lastLogoutAt?: string | null;
  lastActivityAt?: string | null;
  activityIp?: string | null;
  inactiveFor: string;
  isCurrentlyActive: boolean;
  isSuspended: boolean;
  isArchived: boolean;
}

export interface UserMonitoringReportPage {
  data: UserMonitoringReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type BulkUserLifecycleAction =
  | "suspend"
  | "reactivate"
  | "archive"
  | "purge";
export interface BulkUserLifecycleDto {
  action: BulkUserLifecycleAction;
  userIds: string[];
}
export interface BulkUserLifecycleResponse {
  success: boolean;
  message: string;
  data: {
    action: BulkUserLifecycleAction;
    requested: number;
    succeeded: string[];
    failed: Array<{ userId: string; reason: string }>;
  };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminHealth {
  ready: boolean;
  timestamp: string;
  dependencies: Record<
    string,
    { ok: boolean; degraded?: boolean; message?: string }
  >;
}

export interface ClassTemplateSummary {
  id: string;
  name: string;
  subjectCode?: string;
  subjectGradeLevel?: string;
  status?: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
}
