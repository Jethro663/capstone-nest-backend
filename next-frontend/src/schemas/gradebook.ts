import { z } from 'zod';

export const createGradebookSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  gradingPeriod: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
});
export type CreateGradebookFormValues = z.infer<typeof createGradebookSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  weightPercentage: z.coerce.number().min(0.01).max(100),
});
export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;

export const createItemSchema = z.object({
  categoryId: z.string().min(1),
  assessmentId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  maxScore: z.coerce.number().positive('Must be positive'),
  dateGiven: z.string().optional(),
});
export type CreateItemFormValues = z.infer<typeof createItemSchema>;
