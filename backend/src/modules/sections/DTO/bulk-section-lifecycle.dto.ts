import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
} from 'class-validator';

export const BULK_SECTION_LIFECYCLE_ACTIONS = [
  'archive',
  'restore',
  'purge',
] as const;

export type BulkSectionLifecycleAction =
  (typeof BULK_SECTION_LIFECYCLE_ACTIONS)[number];

export interface BulkSectionLifecycleFailure {
  sectionId: string;
  reason: string;
}

export interface BulkSectionLifecycleResult {
  message: string;
  data: {
    action: BulkSectionLifecycleAction;
    requested: number;
    succeeded: string[];
    failed: BulkSectionLifecycleFailure[];
  };
}

export class BulkSectionLifecycleDto {
  @IsIn(BULK_SECTION_LIFECYCLE_ACTIONS)
  action!: BulkSectionLifecycleAction;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  sectionIds!: string[];
}
