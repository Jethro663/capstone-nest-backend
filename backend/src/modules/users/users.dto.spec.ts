import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './DTO/update-user.dto';
import { UpdateProfileDto as AuthUpdateProfileDto } from '../auth/DTO/update-profile.dto';
import { UpdateProfileDto as ProfilesUpdateProfileDto } from '../profiles/DTO/update-profile.dto';

async function messagesFor(dtoClass: new () => unknown, plain: object) {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object);
  return errors.flatMap((entry) => Object.values(entry.constraints ?? {}));
}

describe('user/profile DTO validation', () => {
  it('rejects numbers and special characters in admin user names', async () => {
    const messages = await messagesFor(UpdateUserDto, {
      firstName: 'Alex123',
      lastName: 'Rivera!',
    });

    expect(messages).toContain(
      'First name may only contain letters, spaces, hyphens, and apostrophes',
    );
    expect(messages).toContain(
      'Last name may only contain letters, spaces, hyphens, and apostrophes',
    );
  });

  it('rejects invalid names in the auth profile endpoint', async () => {
    const messages = await messagesFor(AuthUpdateProfileDto, {
      firstName: 'System9',
      lastName: 'Admin#',
    });

    expect(messages).toContain(
      'First name may only contain letters, spaces, hyphens, and apostrophes',
    );
    expect(messages).toContain(
      'Last name may only contain letters, spaces, hyphens, and apostrophes',
    );
  });

  it('rejects invalid names in the profiles endpoint', async () => {
    const messages = await messagesFor(ProfilesUpdateProfileDto, {
      firstName: 'System9',
      lastName: 'Admin#',
    });

    expect(messages).toContain(
      'First name may only contain letters, spaces, hyphens, and apostrophes',
    );
    expect(messages).toContain(
      'Last name may only contain letters, spaces, hyphens, and apostrophes',
    );
  });

  it('rejects unsupported characters in email, address, and contact-like profile fields', async () => {
    const messages = await messagesFor(UpdateUserDto, {
      email: 'alex🙂@example.com',
      address: 'Lot <A>',
      familyName: 'Ana🙂',
      familyContact: '0917-123-4567',
    });

    expect(messages).toContain('Must be a valid email address');
    expect(messages).toContain(
      'Address may only contain letters, numbers, spaces, commas, periods, number signs, apostrophes, hyphens, and slashes',
    );
    expect(messages).toContain(
      'Guardian name may only contain letters, spaces, hyphens, and apostrophes',
    );
    expect(messages).toContain(
      'Guardian contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
    );
  });
});
