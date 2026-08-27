import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { ListTeacherAiJobsQueryDto } from './DTO/list-teacher-ai-jobs-query.dto';

export type AiGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'approved'
  | 'cancelled'
  | 'rejected'
  | 'failed';

export interface TeacherAiJobSummary {
  jobId: string;
  jobType: string;
  classId: string | null;
  title: string;
  status: AiGenerationStatus;
  progressPercent: number;
  statusMessage: string | null;
  errorMessage: string | null;
  outputId: string | null;
  assessmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeacherAiJobRow {
  job_id: string;
  job_type: string;
  class_id: string | null;
  status: string;
  source_filters: unknown;
  error_message: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  output_id: string | null;
  structured_output: unknown;
  assessment_id: string | null;
}

const AI_JOB_STATUSES = new Set<AiGenerationStatus>([
  'pending',
  'processing',
  'completed',
  'approved',
  'cancelled',
  'rejected',
  'failed',
]);

const TERMINAL_STATUSES = new Set<AiGenerationStatus>([
  'completed',
  'approved',
  'cancelled',
  'rejected',
  'failed',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStatus(value: string): AiGenerationStatus {
  return AI_JOB_STATUSES.has(value as AiGenerationStatus)
    ? (value as AiGenerationStatus)
    : 'processing';
}

function normalizeProgress(
  status: AiGenerationStatus,
  runtime: Record<string, unknown>,
): number {
  if (TERMINAL_STATUSES.has(status)) {
    return 100;
  }

  const rawProgress = runtime.progressPercent;
  const parsed =
    typeof rawProgress === 'number'
      ? rawProgress
      : typeof rawProgress === 'string'
        ? Number(rawProgress)
        : Number.NaN;

  if (Number.isFinite(parsed)) {
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  return status === 'pending' ? 5 : 60;
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

@Injectable()
export class TeacherAiJobQueryService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listTeacherJobs(
    userId: string,
    query: Partial<ListTeacherAiJobsQueryDto>,
  ): Promise<TeacherAiJobSummary[]> {
    const classId = query.classId ?? null;
    const jobType = query.jobType ?? 'quiz_generation';
    const limit = query.limit ?? 20;

    const result = await this.databaseService.db.execute(sql`
      SELECT
        j.id AS job_id,
        j.job_type,
        j.class_id,
        j.status,
        j.source_filters,
        j.error_message,
        j.created_at,
        j.updated_at,
        o.id AS output_id,
        o.structured_output,
        a.id AS assessment_id
      FROM ai_generation_jobs j
      LEFT JOIN LATERAL (
        SELECT output.id, output.structured_output
        FROM ai_generation_outputs output
        WHERE output.job_id = j.id
        ORDER BY output.created_at DESC
        LIMIT 1
      ) o ON TRUE
      LEFT JOIN LATERAL (
        SELECT assessment.id
        FROM assessments assessment
        WHERE assessment.ai_generation_output_id = o.id
        ORDER BY assessment.created_at DESC
        LIMIT 1
      ) a ON TRUE
      WHERE j.teacher_id = ${userId}::uuid
        AND j.job_type = ${jobType}::ai_generation_job_type
        AND j.status <> 'cancelled'
        AND (${classId}::uuid IS NULL OR j.class_id = ${classId}::uuid)
      ORDER BY j.updated_at DESC, j.created_at DESC
      LIMIT ${limit}
    `);

    return (result.rows as unknown as TeacherAiJobRow[]).map((row) => {
      const sourceFilters = asRecord(row.source_filters);
      const runtime = asRecord(sourceFilters.runtime);
      const structuredOutput = asRecord(row.structured_output);
      const status = normalizeStatus(row.status);

      return {
        jobId: String(row.job_id),
        jobType: String(row.job_type),
        classId: row.class_id ? String(row.class_id) : null,
        title:
          nonEmptyString(structuredOutput.title) ??
          nonEmptyString(sourceFilters.title) ??
          'AI Draft Quiz',
        status,
        progressPercent: normalizeProgress(status, runtime),
        statusMessage: nonEmptyString(runtime.statusMessage),
        errorMessage:
          nonEmptyString(row.error_message) ??
          nonEmptyString(runtime.errorMessage),
        outputId: row.output_id ? String(row.output_id) : null,
        assessmentId: row.assessment_id
          ? String(row.assessment_id)
          : null,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      };
    });
  }
}
