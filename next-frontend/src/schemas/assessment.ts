import { z } from 'zod';

export const createAssessmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classId: z.string().min(1, 'Class is required'),
  type: z.enum(['quiz', 'exam', 'assignment']).optional(),
  dueDate: z.string().optional(),
  passingScore: z.coerce.number().positive().optional(),
  maxAttempts: z.coerce.number().int().min(1).optional(),
  timeLimitMinutes: z.coerce.number().int().min(1).optional(),
  feedbackLevel: z.enum(['immediate', 'standard', 'detailed']).optional(),
  feedbackDelayHours: z.coerce.number().int().min(0).optional(),
});
export type CreateAssessmentFormValues = z.infer<typeof createAssessmentSchema>;

export const updateAssessmentSchema = createAssessmentSchema.partial().extend({
  isPublished: z.boolean().optional(),
});
export type UpdateAssessmentFormValues = z.infer<typeof updateAssessmentSchema>;
