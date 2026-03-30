import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsString } from 'class-validator';

export const BULK_USER_LIFECYCLE_ACTIONS = [
  'suspend',
  'reactivate',
  'archive',
  'purge',
] as const;

export type BulkUserLifecycleAction = (typeof BULK_USER_LIFECYCLE_ACTIONS)[number];

export interface BulkLifecycleFailure {
  userId: string;
  reason: string;
}

export interface BulkUserLifecycleResult {
  message: string;
  data: {
    action: BulkUserLifecycleAction;
    requested: number;
    succeeded: string[];
    failed: BulkLifecycleFailure[];
  };
}

export class BulkUserLifecycleDto {
  @IsIn(BULK_USER_LIFECYCLE_ACTIONS)
  action!: BulkUserLifecycleAction;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  userIds!: string[];
}
