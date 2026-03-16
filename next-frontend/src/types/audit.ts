export interface AuditLogActor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: AuditLogActor | null;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsageSummary {
  activeTeachers: number;
  activeStudents: number;
  assessmentSubmissions: number;
  lessonCompletions: number;
  interventionOpens: number;
  interventionClosures: number;
  topActions: {
    action: string;
    total: number;
  }[];
  generatedAt: string;
}
