import { z } from 'zod';

const phPhone = z.string().regex(/^09\d{9}$/, 'Enter a valid 11-digit Philippine number');

export const completeProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  lrn: z.string().min(1, 'LRN / Student ID is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other'], { message: 'Gender is required' }),
  phone: phPhone,
  address: z.string().min(1, 'Address is required'),
  gradeLevel: z.string().optional(),
  familyName: z.string().min(1, 'Emergency contact name is required'),
  familyRelationship: z.enum(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message: 'Relationship is required',
  }),
  familyContact: phPhone,
});
export type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;
