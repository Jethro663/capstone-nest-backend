import {
  ArrayUnique,
  Equals,
  IsArray,
  IsIn,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import type { AdminMaintenanceScopeCode } from '../../../drizzle/schema';
import type { AdminMaintenanceRule } from '../admin-maintenance.policy';

export const REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS = [
  'LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE',
  'FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED',
] as const;

export type AdminMaintenanceAcknowledgement =
  (typeof REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS)[number];

export class OpenAdminMaintenanceSessionDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @Equals('OPEN MAINTENANCE ACCESS')
  confirmation!: 'OPEN MAINTENANCE ACCESS';

  @IsString()
  @Length(10, 240)
  reason!: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(REQUIRED_MAINTENANCE_ACKNOWLEDGEMENTS, { each: true })
  acknowledgements!: AdminMaintenanceAcknowledgement[];
}

export type AdminMaintenanceState =
  | 'unavailable'
  | 'inactive'
  | 'active'
  | 'expired';

export interface AdminMaintenanceStatusDto {
  available: boolean;
  active: boolean;
  state: AdminMaintenanceState;
  sessionId: string | null;
  serverTime: string;
  startedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  scopeCodes: AdminMaintenanceScopeCode[];
  rules: ReadonlyArray<Readonly<AdminMaintenanceRule>>;
  protectedRules: ReadonlyArray<Readonly<AdminMaintenanceRule>>;
}
