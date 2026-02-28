import { z } from 'zod';

const scheduleSlotSchema = z.object({
  days: z.array(z.enum(['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'])).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
});

export const createClassSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required'),
  subjectCode: z.string().min(1, 'Subject code is required'),
  subjectGradeLevel: z.string().optional(),
  sectionId: z.string().min(1, 'Section is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format: YYYY-YYYY'),
  room: z.string().optional(),
  schedules: z.array(scheduleSlotSchema).optional(),
});
export type CreateClassFormValues = z.infer<typeof createClassSchema>;

export const updateClassSchema = createClassSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateClassFormValues = z.infer<typeof updateClassSchema>;
