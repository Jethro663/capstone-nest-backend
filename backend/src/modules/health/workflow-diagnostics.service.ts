import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { aiGenerationJobs } from '../../drizzle/schema';

export const WORKFLOW_DIAGNOSTICS_CLOCK = Symbol('WORKFLOW_DIAGNOSTICS_CLOCK');

export const WORKFLOW_JOB_STATUSES = [
  'pending',
  'processing',
  'completed',
  'approved',
  'cancelled',
  'rejected',
  'failed',
] as const;

export type WorkflowJobStatus = (typeof WORKFLOW_JOB_STATUSES)[number];

export type WorkflowStatusAggregate = {
  status: WorkflowJobStatus;
  count: number;
  oldestAgeSeconds: number | null;
};

export type WorkflowDiagnosticsAlert = {
  code: 'oldest_nonterminal_exceeded' | 'failed_jobs_present';
  severity: 'warning' | 'critical';
  message: string;
};

export type WorkflowDiagnosticsSnapshot = {
  observedAt: string;
  healthy: boolean;
  staleAfterSeconds: number;
  totals: WorkflowStatusAggregate[];
  alerts: WorkflowDiagnosticsAlert[];
};

type AggregateRow = {
  status: WorkflowJobStatus;
  count: number | string;
  oldestAt: Date | string | null;
};

@Injectable()
export class WorkflowDiagnosticsService {
  private readonly cacheTtlMs = 5_000;
  private readonly staleAfterSeconds = 900;
  private cache: {
    expiresAt: number;
    value: WorkflowDiagnosticsSnapshot;
  } | null = null;
  private pending: Promise<WorkflowDiagnosticsSnapshot> | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(WORKFLOW_DIAGNOSTICS_CLOCK)
    private readonly clock: () => Date,
  ) {}

  async getSnapshot(): Promise<WorkflowDiagnosticsSnapshot> {
    const now = this.clock();
    if (this.cache && this.cache.expiresAt > now.getTime()) {
      return this.cache.value;
    }

    if (!this.pending) {
      this.pending = this.readSnapshot(now)
        .then((value) => {
          this.cache = {
            value,
            expiresAt: this.clock().getTime() + this.cacheTtlMs,
          };
          return value;
        })
        .finally(() => {
          this.pending = null;
        });
    }

    return this.pending;
  }

  private async readSnapshot(now: Date): Promise<WorkflowDiagnosticsSnapshot> {
    const rows = (await this.databaseService.db
      .select({
        status: aiGenerationJobs.status,
        count: sql<number>`count(*)::int`,
        oldestAt: sql<Date | null>`min(${aiGenerationJobs.createdAt})`,
      })
      .from(aiGenerationJobs)
      .groupBy(aiGenerationJobs.status)) as AggregateRow[];

    const rowByStatus = new Map(rows.map((row) => [row.status, row]));
    const totals = WORKFLOW_JOB_STATUSES.map((status) => {
      const row = rowByStatus.get(status);
      const nonterminal = status === 'pending' || status === 'processing';
      return {
        status,
        count: Number(row?.count ?? 0),
        oldestAgeSeconds:
          nonterminal && row?.oldestAt
            ? Math.max(
                0,
                Math.floor(
                  (now.getTime() - new Date(row.oldestAt).getTime()) / 1_000,
                ),
              )
            : null,
      } satisfies WorkflowStatusAggregate;
    });

    const alerts: WorkflowDiagnosticsAlert[] = [];
    const oldestNonterminalAge = Math.max(
      0,
      ...totals
        .filter(
          (entry) =>
            entry.status === 'pending' || entry.status === 'processing',
        )
        .map((entry) => entry.oldestAgeSeconds ?? 0),
    );
    if (oldestNonterminalAge > this.staleAfterSeconds) {
      alerts.push({
        code: 'oldest_nonterminal_exceeded',
        severity: oldestNonterminalAge > 3_600 ? 'critical' : 'warning',
        message: `Oldest nonterminal workflow is ${oldestNonterminalAge} seconds old.`,
      });
    }

    const failed =
      totals.find((entry) => entry.status === 'failed')?.count ?? 0;
    if (failed > 0) {
      alerts.push({
        code: 'failed_jobs_present',
        severity: 'warning',
        message: `${failed} failed workflow${failed === 1 ? '' : 's'} recorded.`,
      });
    }

    return {
      observedAt: now.toISOString(),
      healthy: alerts.length === 0,
      staleAfterSeconds: this.staleAfterSeconds,
      totals,
      alerts,
    };
  }
}
