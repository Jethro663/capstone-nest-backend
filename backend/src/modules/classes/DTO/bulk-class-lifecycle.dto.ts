import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
} from 'class-validator';

export const BULK_CLASS_LIFECYCLE_ACTIONS = [
  'archive',
  'restore',
  'purge',
] as const;

export type BulkClassLifecycleAction =
  (typeof BULK_CLASS_LIFECYCLE_ACTIONS)[number];

export interface BulkClassLifecycleFailure {
  classId: string;
  reason: string;
}

export interface BulkClassLifecycleResult {
  message: string;
  data: {
    action: BulkClassLifecycleAction;
    requested: number;
    succeeded: string[];
    failed: BulkClassLifecycleFailure[];
  };
}

export class BulkClassLifecycleDto {
  @IsIn(BULK_CLASS_LIFECYCLE_ACTIONS)
  action!: BulkClassLifecycleAction;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  classIds!: string[];
}
