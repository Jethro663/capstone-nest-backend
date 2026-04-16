import type { AiGenerationJob, AiGenerationStatus } from '@/types/ai';

export interface TrackedAiDraftJobEntry {
  jobId: string;
  jobType: string;
  createdAt: string;
  lastKnownStatus: AiGenerationStatus;
  lastKnownProgress: number;
  assessmentId?: string | null;
  updatedAt?: string | null;
}

const STORAGE_PREFIX = 'teacher-ai-draft-jobs:';
const MAX_TRACKED_JOBS = 20;
const RETENTION_DAYS = 14;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES: AiGenerationStatus[] = ['completed', 'approved', 'failed', 'rejected'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidIsoLike(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function clampProgress(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function toTrackedEntry(value: unknown): TrackedAiDraftJobEntry | null {
  if (!isRecord(value)) return null;
  if (typeof value.jobId !== 'string' || value.jobId.trim().length === 0) return null;
  if (typeof value.jobType !== 'string' || value.jobType.trim().length === 0) return null;
  if (!isValidIsoLike(value.createdAt)) return null;
  if (typeof value.lastKnownStatus !== 'string') return null;

  return {
    jobId: value.jobId,
    jobType: value.jobType,
    createdAt: value.createdAt,
    lastKnownStatus: value.lastKnownStatus as AiGenerationStatus,
    lastKnownProgress: clampProgress(value.lastKnownProgress),
    assessmentId: typeof value.assessmentId === 'string' ? value.assessmentId : null,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  };
}

function byMostRecent(a: TrackedAiDraftJobEntry, b: TrackedAiDraftJobEntry) {
  const aUpdated = Date.parse(a.updatedAt || a.createdAt);
  const bUpdated = Date.parse(b.updatedAt || b.createdAt);
  return bUpdated - aUpdated;
}

function dedupeByJobId(entries: TrackedAiDraftJobEntry[]): TrackedAiDraftJobEntry[] {
  const map = new Map<string, TrackedAiDraftJobEntry>();
  for (const entry of [...entries].sort(byMostRecent)) {
    if (!map.has(entry.jobId)) map.set(entry.jobId, entry);
  }
  return Array.from(map.values()).sort(byMostRecent);
}

export function getAiDraftTrackerStorageKey(classId: string) {
  return `${STORAGE_PREFIX}${classId}`;
}

export function isAiDraftTerminalStatus(status: AiGenerationStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function pruneTrackedAiDraftJobs(entries: TrackedAiDraftJobEntry[]): TrackedAiDraftJobEntry[] {
  const now = Date.now();
  const deduped = dedupeByJobId(entries);
  const retained = deduped.filter((entry) => {
    if (!isAiDraftTerminalStatus(entry.lastKnownStatus)) return true;
    const pivot = Date.parse(entry.updatedAt || entry.createdAt);
    if (!Number.isFinite(pivot)) return false;
    return now - pivot <= RETENTION_MS;
  });
  return retained.slice(0, MAX_TRACKED_JOBS);
}

export function readTrackedAiDraftJobs(classId: string): TrackedAiDraftJobEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getAiDraftTrackerStorageKey(classId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map((entry) => toTrackedEntry(entry))
      .filter((entry): entry is TrackedAiDraftJobEntry => Boolean(entry));
    return pruneTrackedAiDraftJobs(normalized);
  } catch {
    return [];
  }
}

export function writeTrackedAiDraftJobs(classId: string, entries: TrackedAiDraftJobEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = pruneTrackedAiDraftJobs(entries);
    window.localStorage.setItem(getAiDraftTrackerStorageKey(classId), JSON.stringify(normalized));
  } catch {
    // Ignore localStorage failures.
  }
}

export function upsertTrackedAiDraftJob(classId: string, entry: TrackedAiDraftJobEntry) {
  const current = readTrackedAiDraftJobs(classId);
  const merged = pruneTrackedAiDraftJobs([entry, ...current.filter((item) => item.jobId !== entry.jobId)]);
  writeTrackedAiDraftJobs(classId, merged);
  return merged;
}

export function mergeTrackedAiDraftJobFromStatus(
  classId: string,
  job: AiGenerationJob,
  fallbackCreatedAt?: string,
) {
  const createdAt = fallbackCreatedAt && isValidIsoLike(fallbackCreatedAt)
    ? fallbackCreatedAt
    : (job.updatedAt && isValidIsoLike(job.updatedAt) ? job.updatedAt : new Date().toISOString());

  return upsertTrackedAiDraftJob(classId, {
    jobId: job.jobId,
    jobType: job.jobType || 'quiz_generation',
    createdAt,
    lastKnownStatus: job.status,
    lastKnownProgress: clampProgress(job.progressPercent),
    assessmentId: job.assessmentId ?? null,
    updatedAt: job.updatedAt ?? null,
  });
}
