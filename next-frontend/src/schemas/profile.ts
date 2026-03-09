import { z } from 'zod';

const phPhone = z
  .string()
  .regex(/^(09\d{9}|\+639\d{9})$/, 'Enter a valid Philippine mobile number');

export const completeProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.union([phPhone, z.literal('')]).optional(),
  gradeLevel: z.string().optional(),
});
export type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;
