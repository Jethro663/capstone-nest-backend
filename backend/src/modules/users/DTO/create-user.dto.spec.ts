import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

function studentDto(overrides: Partial<CreateUserDto> = {}) {
  return Object.assign(new CreateUserDto(), {
    email: 'student@gmail.com',
    password: 'ValidPass1!',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    role: 'student',
    lrn: '123456789012',
    ...overrides,
  });
}

describe('CreateUserDto student grade level', () => {
  it('requires a supported grade level for student accounts', async () => {
    const missing = await validate(studentDto());
    const unsupported = await validate(studentDto({ gradeLevel: '6' }));

    expect(missing.some((error) => error.property === 'gradeLevel')).toBe(true);
    expect(unsupported.some((error) => error.property === 'gradeLevel')).toBe(
      true,
    );
  });

  it('accepts grade levels 7 through 10 for student accounts', async () => {
    for (const gradeLevel of ['7', '8', '9', '10']) {
      const errors = await validate(studentDto({ gradeLevel }));
      expect(
        errors.find((error) => error.property === 'gradeLevel'),
      ).toBeUndefined();
    }
  });
});
