import {
  ArrayUnique,
  Equals,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';
import type { AdminDemoModeRule } from '../admin-demo-mode.policy';

export const REQUIRED_DEMO_ACKNOWLEDGEMENTS = [
  'SHARED_DATA_CAN_CHANGE',
  'ACTIONS_REMAIN_AUDITED',
  'HARD_SAFEGUARDS_REMAIN',
] as const;

export type AdminDemoAcknowledgement =
  (typeof REQUIRED_DEMO_ACKNOWLEDGEMENTS)[number];

export class ActivateAdminDemoModeDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @Equals('ENABLE DEMO MODE')
  confirmation!: 'ENABLE DEMO MODE';

  @IsString()
  @Length(10, 240)
  reason!: string;

  @IsInt()
  @IsIn([15, 30, 60, 120])
  durationMinutes!: 15 | 30 | 60 | 120;

  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsArray()
  @ArrayUnique()
  @IsIn(REQUIRED_DEMO_ACKNOWLEDGEMENTS, { each: true })
  acknowledgements!: AdminDemoAcknowledgement[];
}

export class DeactivateAdminDemoModeDto {
  @Equals('DISABLE DEMO MODE')
  confirmation!: 'DISABLE DEMO MODE';

  @IsInt()
  @Min(0)
  expectedVersion!: number;
}

export type AdminDemoModeState =
  | 'unavailable'
  | 'disabled'
  | 'active'
  | 'expired';

export interface AdminDemoModeStatusDto {
  available: boolean;
  active: boolean;
  state: AdminDemoModeState;
  version: number;
  serverTime: string;
  activatedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  activatedBy: { id: string; displayName: string } | null;
  relaxedRules: ReadonlyArray<Readonly<AdminDemoModeRule>>;
  protectedRules: ReadonlyArray<Readonly<AdminDemoModeRule>>;
}
