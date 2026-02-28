import type { GradingPeriod } from '@/utils/constants';

export interface Gradebook {
  id: string;
  classId: string;
  gradingPeriod: GradingPeriod;
  status: 'draft' | 'finalized' | 'locked';
  categories?: GradebookCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GradebookCategory {
  id: string;
  gradebookId: string;
  name: string;
  weightPercentage: number;
  items?: GradebookItem[];
}

export interface GradebookItem {
  id: string;
  categoryId: string;
  assessmentId?: string;
  title: string;
  maxScore: number;
  dateGiven?: string;
  scores?: GradebookScore[];
}

export interface GradebookScore {
  id: string;
  itemId: string;
  studentId: string;
  score: number;
}

export interface FinalGrade {
  studentId: string;
  student?: { firstName?: string; lastName?: string; lrn?: string };
  finalPercentage: number;
  remarks: 'Passed' | 'For Intervention';
}

export interface CreateGradebookDto {
  classId: string;
  gradingPeriod: GradingPeriod;
}

export interface CreateCategoryDto {
  name: string;
  weightPercentage: number;
}

export interface UpdateCategoryDto {
  name?: string;
  weightPercentage?: number;
}

export interface CreateItemDto {
  categoryId: string;
  assessmentId?: string;
  title: string;
  maxScore: number;
  dateGiven?: string;
}

export interface UpdateItemDto {
  title?: string;
  maxScore?: number;
  dateGiven?: string;
}

export interface RecordScoreDto {
  studentId: string;
  score: number;
}

export interface BulkRecordScoresDto {
  scores: RecordScoreDto[];
}
