import { z } from 'zod';

export const createSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  gradeLevel: z.enum(['7', '8', '9', '10'], { message: 'Grade level is required' }),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format: YYYY-YYYY'),
  capacity: z.coerce.number().int().min(1, 'Must be at least 1'),
  roomNumber: z.string().optional(),
  adviserId: z.string().optional(),
});
export type CreateSectionFormValues = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = createSectionSchema.partial().extend({
  isActive: z.boolean().optional(),
  adviserId: z.string().nullable().optional(),
});
export type UpdateSectionFormValues = z.infer<typeof updateSectionSchema>;
