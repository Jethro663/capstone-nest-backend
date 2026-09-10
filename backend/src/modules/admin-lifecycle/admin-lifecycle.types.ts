import type { AdminLifecycleAction } from '../../drizzle/schema';

export interface AdminLifecycleBlocker {
  code: string;
  message: string;
  resolvable: boolean;
  resolutionOptions?: string[];
}

export interface AdminLifecycleWarning {
  code: string;
  message: string;
}

export interface AdminLifecycleEffect {
  kind: 'insert' | 'update' | 'archive' | 'purge' | 'preserve';
  entityType: string;
  entityId: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AdminLifecycleDependencyVersion {
  entityType: string;
  entityId: string;
  version: string | number | null;
}

export interface AdminLifecycleManifestInput {
  action: AdminLifecycleAction;
  targetType: string;
  targetId: string;
  request: Record<string, unknown>;
  academicState: {
    schoolYear: string;
    period: string;
    version: number;
  };
  dependencyVersions: AdminLifecycleDependencyVersion[];
  effects: AdminLifecycleEffect[];
  preserved: string[];
  evidence: Record<string, number>;
  blockers: AdminLifecycleBlocker[];
  warnings: AdminLifecycleWarning[];
  requiredConfirmations: string[];
}

export interface AdminLifecycleManifest extends AdminLifecycleManifestInput {
  schemaVersion: 1;
  generatedAt: string;
  expiresAt: string;
  safeToExecute: boolean;
  manifestHash: string;
}

export interface AdminLifecycleExecutionResult {
  operationId: string;
  action: AdminLifecycleAction;
  targetType: string;
  targetId: string;
  replayed: boolean;
  changed: Array<{
    entityType: string;
    entityId: string;
    outcome: string;
  }>;
  preserved: string[];
  auditLogId?: string;
}
