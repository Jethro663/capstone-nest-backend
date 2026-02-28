import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  isPinned: z.boolean().optional(),
  scheduledAt: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
});
export type CreateAnnouncementFormValues = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
export type UpdateAnnouncementFormValues = z.infer<typeof updateAnnouncementSchema>;
