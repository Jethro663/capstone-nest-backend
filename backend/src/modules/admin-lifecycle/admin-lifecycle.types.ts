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

export type AdminMaintenanceDecisionState =
  | 'READY'
  | 'AUTO_RESOLVABLE'
  | 'NEEDS_CHOICE'
  | 'OVERRIDABLE_WARNING'
  | 'IMMUTABLE';

export type AdminMaintenanceDecisionDisposition =
  | 'EXECUTABLE'
  | 'CHOICE_REQUIRED'
  | 'REPAIR_REQUIRED'
  | 'RETAIN_REQUIRED';

export interface AdminMaintenanceNextAction {
  id: string;
  label: string;
  kind: 'REPREVIEW' | 'NAVIGATE_REPAIR' | 'CANCEL';
  intent?: string;
  requiredFields?: string[];
  href?: string;
}

export interface AdminMaintenanceDecisionSummary {
  state: AdminMaintenanceDecisionState;
  disposition: AdminMaintenanceDecisionDisposition;
  code: string;
  message: string;
  nextActions: AdminMaintenanceNextAction[];
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
  decision: AdminMaintenanceDecisionSummary;
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
