import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['student', 'teacher', 'admin']),
  lrn: z.string().optional(),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial();
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
