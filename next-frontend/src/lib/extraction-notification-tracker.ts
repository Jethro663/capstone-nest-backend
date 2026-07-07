import type { ExtractionStatus } from '@/types/extraction';

export interface TrackedExtractionNotificationEntry {
  extractionId: string;
  classId: string;
  createdAt: string;
  originalName: string;
  targetSectionCount?: number;
  extractionStyle?: string;
  lastKnownStatus: ExtractionStatus;
  lastKnownProgress: number;
  updatedAt?: string | null;
  notifiedAt?: string | null;
}

const STORAGE_PREFIX = 'teacher-extraction-jobs:';
const MAX_TRACKED_EXTRACTIONS = 30;
const RETENTION_DAYS = 14;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES: ExtractionStatus[] = ['completed', 'failed', 'applied'];

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

function normalizeStatus(value: unknown): ExtractionStatus | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'pending' ||
    normalized === 'processing' ||
    normalized === 'completed' ||
    normalized === 'failed' ||
    normalized === 'applied'
  ) {
    return normalized;
  }
  return null;
}

function toTrackedEntry(value: unknown): TrackedExtractionNotificationEntry | null {
  if (!isRecord(value)) return null;
  if (typeof value.extractionId !== 'string' || value.extractionId.trim().length === 0) return null;
  if (typeof value.classId !== 'string' || value.classId.trim().length === 0) return null;
  if (!isValidIsoLike(value.createdAt)) return null;
  if (typeof value.originalName !== 'string') return null;

  const status = normalizeStatus(value.lastKnownStatus);
  if (!status) return null;

  return {
    extractionId: value.extractionId,
    classId: value.classId,
    createdAt: value.createdAt,
    originalName: value.originalName,
    targetSectionCount: typeof value.targetSectionCount === 'number' ? value.targetSectionCount : undefined,
    extractionStyle: typeof value.extractionStyle === 'string' ? value.extractionStyle : undefined,
    lastKnownStatus: status,
    lastKnownProgress: clampProgress(value.lastKnownProgress),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    notifiedAt: typeof value.notifiedAt === 'string' ? value.notifiedAt : null,
  };
}

function byMostRecent(a: TrackedExtractionNotificationEntry, b: TrackedExtractionNotificationEntry) {
  const aUpdated = Date.parse(a.updatedAt || a.createdAt);
  const bUpdated = Date.parse(b.updatedAt || b.createdAt);
  return bUpdated - aUpdated;
}

function dedupeByExtractionId(entries: TrackedExtractionNotificationEntry[]): TrackedExtractionNotificationEntry[] {
  const map = new Map<string, TrackedExtractionNotificationEntry>();
  for (const entry of [...entries].sort(byMostRecent)) {
    if (!map.has(entry.extractionId)) map.set(entry.extractionId, entry);
  }
  return Array.from(map.values()).sort(byMostRecent);
}

export function getTrackedExtractionNotificationStorageKey(classId: string) {
  return `${STORAGE_PREFIX}${classId}`;
}

export function isTrackedExtractionTerminalStatus(status: ExtractionStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function pruneTrackedExtractionNotifications(
  entries: TrackedExtractionNotificationEntry[],
): TrackedExtractionNotificationEntry[] {
  const now = Date.now();
  const deduped = dedupeByExtractionId(entries);
  const retained = deduped.filter((entry) => {
    if (!isTrackedExtractionTerminalStatus(entry.lastKnownStatus)) return true;
    const pivot = Date.parse(entry.updatedAt || entry.notifiedAt || entry.createdAt);
    if (!Number.isFinite(pivot)) return false;
    return now - pivot <= RETENTION_MS;
  });
  return retained.slice(0, MAX_TRACKED_EXTRACTIONS);
}

export function readTrackedExtractionNotifications(classId: string): TrackedExtractionNotificationEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getTrackedExtractionNotificationStorageKey(classId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map((entry) => toTrackedEntry(entry))
      .filter((entry): entry is TrackedExtractionNotificationEntry => Boolean(entry));
    return pruneTrackedExtractionNotifications(normalized);
  } catch {
    return [];
  }
}

export function readAllTrackedExtractionNotifications(): TrackedExtractionNotificationEntry[] {
  if (typeof window === 'undefined') return [];
  const entries: TrackedExtractionNotificationEntry[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const classId = key.slice(STORAGE_PREFIX.length);
      entries.push(...readTrackedExtractionNotifications(classId));
    }
  } catch {
    return [];
  }
  return pruneTrackedExtractionNotifications(entries);
}

export function writeTrackedExtractionNotifications(
  classId: string,
  entries: TrackedExtractionNotificationEntry[],
) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = pruneTrackedExtractionNotifications(entries);
    window.localStorage.setItem(
      getTrackedExtractionNotificationStorageKey(classId),
      JSON.stringify(normalized),
    );
  } catch {
    // Ignore localStorage failures.
  }
}

export function upsertTrackedExtractionNotification(
  classId: string,
  entry: TrackedExtractionNotificationEntry,
) {
  const current = readTrackedExtractionNotifications(classId);
  const merged = pruneTrackedExtractionNotifications([
    entry,
    ...current.filter((item) => item.extractionId !== entry.extractionId),
  ]);
  writeTrackedExtractionNotifications(classId, merged);
  return merged;
}
