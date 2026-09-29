import { Inject, Injectable } from '@nestjs/common';
import { RoleName } from '../../common/constants/role.constants';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { AdminMaintenanceService } from '../admin-maintenance/admin-maintenance.service';
import { HealthService } from '../health/health.service';
import { WorkflowDiagnosticsService } from '../health/workflow-diagnostics.service';
import type {
  SystemCapabilitiesActor,
  SystemCapabilitiesSnapshot,
  SystemCapabilityEntry,
} from './system-capabilities.types';

export const SYSTEM_CAPABILITIES_CLOCK = Symbol('SYSTEM_CAPABILITIES_CLOCK');

@Injectable()
export class SystemCapabilitiesService {
  constructor(
    private readonly academicPolicy: AcademicPolicyService,
    private readonly maintenance: AdminMaintenanceService,
    private readonly health: HealthService,
    private readonly workflowDiagnostics: WorkflowDiagnosticsService,
    @Inject(SYSTEM_CAPABILITIES_CLOCK)
    private readonly clock: () => Date,
  ) {}

  async getSnapshot(
    actor: SystemCapabilitiesActor,
  ): Promise<SystemCapabilitiesSnapshot> {
    const observedAt = this.clock().toISOString();
    const roleScope = [
      ...new Set(actor.roles.map((role) => role.toLowerCase())),
    ].sort();
    const isAdmin = roleScope.includes(RoleName.Admin);
    const canOperateAcademics = isAdmin || roleScope.includes(RoleName.Teacher);

    const [academic, readiness, maintenance, workflow] =
      await Promise.allSettled([
        this.academicPolicy.currentState(),
        this.health.getReadiness(),
        isAdmin
          ? this.maintenance.getStatus(actor.userId, actor.roles)
          : Promise.resolve(null),
        isAdmin
          ? this.workflowDiagnostics.getSnapshot()
          : Promise.resolve(null),
      ]);

    const blocked = (
      source: SystemCapabilityEntry['source'],
    ): SystemCapabilityEntry => ({
      available: true,
      allowed: false,
      state: 'blocked',
      reasonCode: 'role_not_allowed',
      source,
      observedAt,
    });

    const academicOperations: SystemCapabilityEntry = !canOperateAcademics
      ? blocked('academic-state')
      : academic.status === 'fulfilled'
        ? {
            available: true,
            allowed: true,
            state: 'active',
            reasonCode: null,
            source: 'academic-state',
            observedAt,
          }
        : {
            available: false,
            allowed: true,
            state: 'unknown',
            reasonCode: 'academic_state_unavailable',
            source: 'academic-state',
            observedAt,
          };

    let maintenanceAccess: SystemCapabilityEntry;
    if (!isAdmin) {
      maintenanceAccess = blocked('admin-maintenance');
    } else if (maintenance.status === 'rejected') {
      maintenanceAccess = {
        available: false,
        allowed: true,
        state: 'unknown',
        reasonCode: 'maintenance_status_unavailable',
        source: 'admin-maintenance',
        observedAt,
      };
    } else if (!maintenance.value?.available) {
      maintenanceAccess = {
        available: false,
        allowed: false,
        state: 'blocked',
        reasonCode: 'maintenance_unavailable',
        source: 'admin-maintenance',
        observedAt,
      };
    } else {
      maintenanceAccess = {
        available: true,
        allowed: true,
        state: maintenance.value.active ? 'active' : 'inactive',
        reasonCode:
          maintenance.value.state === 'expired' ? 'maintenance_expired' : null,
        source: 'admin-maintenance',
        observedAt,
      };
    }

    const systemReadiness: SystemCapabilityEntry =
      readiness.status === 'fulfilled'
        ? {
            available: true,
            allowed: true,
            state: readiness.value.ready ? 'ready' : 'degraded',
            reasonCode: readiness.value.ready ? null : 'dependencies_not_ready',
            source: 'health-readiness',
            observedAt,
          }
        : {
            available: false,
            allowed: true,
            state: 'unknown',
            reasonCode: 'readiness_unavailable',
            source: 'health-readiness',
            observedAt,
          };

    let workflowDiagnostics: SystemCapabilityEntry;
    if (!isAdmin) {
      workflowDiagnostics = blocked('workflow-diagnostics');
    } else if (workflow.status === 'rejected') {
      workflowDiagnostics = {
        available: false,
        allowed: true,
        state: 'unknown',
        reasonCode: 'workflow_diagnostics_unavailable',
        source: 'workflow-diagnostics',
        observedAt,
      };
    } else {
      workflowDiagnostics = {
        available: true,
        allowed: true,
        state: workflow.value?.healthy ? 'ready' : 'degraded',
        reasonCode:
          workflow.value?.alerts[0]?.code ??
          (workflow.value?.healthy ? null : 'workflow_degraded'),
        source: 'workflow-diagnostics',
        observedAt,
      };
    }

    return {
      version: 1,
      observedAt,
      roleScope,
      capabilities: {
        academicOperations,
        maintenanceAccess,
        systemReadiness,
        workflowDiagnostics,
      },
    };
  }
}
