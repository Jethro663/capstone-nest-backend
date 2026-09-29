export type CapabilityState =
  | 'active'
  | 'inactive'
  | 'ready'
  | 'degraded'
  | 'blocked'
  | 'unknown';

export type SystemCapabilitySource =
  | 'academic-state'
  | 'admin-maintenance'
  | 'health-readiness'
  | 'workflow-diagnostics';

export type SystemCapabilityEntry = {
  available: boolean;
  allowed: boolean;
  state: CapabilityState;
  reasonCode: string | null;
  source: SystemCapabilitySource;
  observedAt: string;
};

export type SystemCapabilitiesSnapshot = {
  version: 1;
  observedAt: string;
  roleScope: string[];
  capabilities: {
    academicOperations: SystemCapabilityEntry;
    maintenanceAccess: SystemCapabilityEntry;
    systemReadiness: SystemCapabilityEntry;
    workflowDiagnostics: SystemCapabilityEntry;
  };
};

export type WorkflowJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'approved'
  | 'cancelled'
  | 'rejected'
  | 'failed';

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
