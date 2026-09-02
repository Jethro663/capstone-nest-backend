import type { User } from "./user";

export interface AdminOverview {
  stats: { totalUsers: number; totalStudents: number; totalTeachers: number; totalAdmins: number; totalClasses: number; totalSections: number; activeClasses: number; totalEnrollments: number; fetchedAt: string };
  usageSummary: { activeTeachers: number; activeStudents: number; assessmentSubmissions: number; lessonCompletions: number; interventionOpens: number; interventionClosures: number; topActions: Array<{ action: string; total: number }>; generatedAt: string };
  analyticsOverview: { totals: { teachers: number; students: number; classes: number; activeInterventions: number; atRiskStudents: number }; action: string };
  readiness: { ready: boolean; timestamp: string; dependencies: Record<string, { ok: boolean; degraded?: boolean; message?: string }> };
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
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
}

export interface AuditLogPage { data: AuditLogEntry[]; page: number; limit: number; total: number; totalPages: number }

export interface AdminHealth {
  ready: boolean;
  timestamp: string;
  dependencies: Record<string, { ok: boolean; degraded?: boolean; message?: string }>;
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
