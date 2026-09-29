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

export type SystemCapabilitiesActor = {
  userId: string;
  roles: string[];
};
