import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAnnouncementDto } from './DTO/create-announcement.dto';
import { UpdateAnnouncementDto } from './DTO/update-announcement.dto';
import { QueryAnnouncementsDto } from './DTO/query-announcements.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function errorsFor(DtoClass: any, plain: object): Promise<string[]> {
  const instance = plainToInstance(DtoClass, plain);
  const errors = await validate(instance);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

// ══════════════════════════════════════════════════════════════════════════
// CreateAnnouncementDto
// ══════════════════════════════════════════════════════════════════════════

describe('CreateAnnouncementDto', () => {
  it('passes for fully valid payload', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'Math Reminder',
      content: '<p>Submit your project by Friday.</p>',
      isPinned: false,
      scheduledAt: '2026-04-01T08:00:00.000Z',
      fileIds: ['550e8400-e29b-41d4-a716-446655440000'],
    });

    expect(errors).toHaveLength(0);
  });

  it('passes with only required fields', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'Hello',
      content: 'World',
    });

    expect(errors).toHaveLength(0);
  });

  it('fails when title is missing', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, { content: 'Test' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when title is empty string', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: '',
      content: 'Test',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when title exceeds 255 characters', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'A'.repeat(256),
      content: 'Test',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when content is missing', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, { title: 'Test' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when scheduledAt is not a valid ISO-8601 string', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'Test',
      content: 'Content',
      scheduledAt: 'March 1st',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when fileIds contains a non-UUID string', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'Test',
      content: 'Content',
      fileIds: ['not-a-uuid'],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when fileIds is not an array', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'Test',
      content: 'Content',
      fileIds: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('allows fileIds to be omitted entirely', async () => {
    const errors = await errorsFor(CreateAnnouncementDto, {
      title: 'Test',
      content: 'Content',
    });
    expect(errors.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// UpdateAnnouncementDto — all fields optional
// ══════════════════════════════════════════════════════════════════════════

describe('UpdateAnnouncementDto', () => {
  it('passes for empty object (no fields required on update)', async () => {
    const errors = await errorsFor(UpdateAnnouncementDto, {});
    expect(errors).toHaveLength(0);
  });

  it('passes for updating only title', async () => {
    const errors = await errorsFor(UpdateAnnouncementDto, {
      title: 'New title',
    });
    expect(errors).toHaveLength(0);
  });

  it('fails when provided title is empty string', async () => {
    const errors = await errorsFor(UpdateAnnouncementDto, { title: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when provided title exceeds 255 characters', async () => {
    const errors = await errorsFor(UpdateAnnouncementDto, {
      title: 'X'.repeat(256),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when provided scheduledAt is not ISO-8601', async () => {
    const errors = await errorsFor(UpdateAnnouncementDto, {
      scheduledAt: 'invalid',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes for valid partial update with multiple fields', async () => {
    const errors = await errorsFor(UpdateAnnouncementDto, {
      title: 'Updated Title',
      isPinned: true,
      scheduledAt: '2026-05-01T10:00:00.000Z',
    });
    expect(errors).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// QueryAnnouncementsDto — pagination
// ══════════════════════════════════════════════════════════════════════════

describe('QueryAnnouncementsDto', () => {
  it('passes with valid page and limit', async () => {
    const errors = await errorsFor(QueryAnnouncementsDto, {
      page: 2,
      limit: 50,
    });
    expect(errors).toHaveLength(0);
  });

  it('passes with no query params (uses defaults)', async () => {
    const errors = await errorsFor(QueryAnnouncementsDto, {});
    expect(errors).toHaveLength(0);
  });

  it('fails when page is 0', async () => {
    const errors = await errorsFor(QueryAnnouncementsDto, { page: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when limit exceeds 100', async () => {
    const errors = await errorsFor(QueryAnnouncementsDto, { limit: 101 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when page is negative', async () => {
    const errors = await errorsFor(QueryAnnouncementsDto, { page: -1 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('coerces string "5" to number 5 via @Type(() => Number)', async () => {
    const instance = plainToInstance(QueryAnnouncementsDto, {
      page: '5',
      limit: '10',
    });
    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
    expect(instance.page).toBe(5);
    expect(instance.limit).toBe(10);
  });
});
