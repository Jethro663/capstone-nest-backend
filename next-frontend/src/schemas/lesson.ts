import { z } from 'zod';

export const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classId: z.string().min(1, 'Class is required'),
  order: z.coerce.number().int().optional(),
});
export type CreateLessonFormValues = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.coerce.number().int().optional(),
  isDraft: z.boolean().optional(),
});
export type UpdateLessonFormValues = z.infer<typeof updateLessonSchema>;
