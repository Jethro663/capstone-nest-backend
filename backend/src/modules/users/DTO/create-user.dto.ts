import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsIn,
  IsOptional,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Custom email domain validator
function IsPopularEmailProvider(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPopularEmailProvider',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;

          const popularDomains = [
            'gmail.com',
            'yahoo.com',
            'outlook.com',
            'hotmail.com',
            'icloud.com',
            'live.com',
            'msn.com',
            'aol.com',
            'protonmail.com',
            'zoho.com',
            'nu-moa.edu.ph',
          ];

          const domain = value.split('@')[1]?.toLowerCase();
          return popularDomains.includes(domain);
        },
        defaultMessage() {
          return `Email must be from a Known provider (Gmail, Yahoo, Outlook, etc.)`;
        },
      },
    });
  };
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsPopularEmailProvider()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[@$!%*?&#]/, {
    message: 'Password must contain at least one special character',
  })
  password?: string;

  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  firstName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  middleName?: string;

  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  lastName: string;

  @IsIn(['student', 'teacher', 'admin'], {
    message: 'Role must be student, teacher, or admin',
  })
  role: string;

  @ValidateIf((o: { role: string }) => o.role === 'teacher')
  @IsString({ message: 'Employee ID is required for teacher accounts' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @Matches(/^[A-Za-z0-9-]{1,20}$/, {
    message:
      'Employee ID must be 1-20 characters using letters, numbers, or hyphens',
  })
  employeeId?: string;

  @ValidateIf((o: { role: string }) => o.role === 'teacher')
  @IsString({ message: 'Contact number is required for teacher accounts' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  @Matches(/^(?:\+63|0)9\d{9}$/, {
    message:
      'Contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  contactNumber?: string;

  @ValidateIf((o: { role: string }) => o.role === 'student')
  @IsString({ message: 'LRN must be a string' })
  @Matches(/^[0-9]{12}$/, {
    message: 'LRN must be exactly 12 digits (e.g., 202401230001)',
  })
  lrn?: string;
}
