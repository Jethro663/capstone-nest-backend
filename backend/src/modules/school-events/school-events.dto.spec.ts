import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSchoolEventDto } from './DTO/create-school-event.dto';
import { QuerySchoolEventsDto } from './DTO/query-school-events.dto';
import { UpdateSchoolEventDto } from './DTO/update-school-event.dto';

async function errorsFor(
  dtoClass: new () => unknown,
  plain: object,
): Promise<string[]> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object);
  return errors.flatMap((entry) => Object.values(entry.constraints ?? {}));
}

describe('SchoolEvents DTOs', () => {
  describe('CreateSchoolEventDto', () => {
    it('accepts a valid payload', async () => {
      const errors = await errorsFor(CreateSchoolEventDto, {
        eventType: 'school_event',
        schoolYear: '2026-2027',
        title: 'Foundation Day',
        startsAt: '2026-11-10T00:00:00.000Z',
        endsAt: '2026-11-10T23:59:59.999Z',
        allDay: true,
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects invalid school year', async () => {
      const errors = await errorsFor(CreateSchoolEventDto, {
        eventType: 'school_event',
        schoolYear: '2026-2028',
        title: 'Invalid',
        startsAt: '2026-11-10T00:00:00.000Z',
        endsAt: '2026-11-10T23:59:59.999Z',
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects empty title', async () => {
      const errors = await errorsFor(CreateSchoolEventDto, {
        eventType: 'school_event',
        schoolYear: '2026-2027',
        title: '',
        startsAt: '2026-11-10T00:00:00.000Z',
        endsAt: '2026-11-10T23:59:59.999Z',
      });

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateSchoolEventDto', () => {
    it('accepts an empty payload', async () => {
      const errors = await errorsFor(UpdateSchoolEventDto, {});
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid event type when provided', async () => {
      const errors = await errorsFor(UpdateSchoolEventDto, {
        eventType: 'announcement',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('QuerySchoolEventsDto', () => {
    it('accepts valid filters', async () => {
      const errors = await errorsFor(QuerySchoolEventsDto, {
        schoolYear: '2026-2027',
        from: '2026-06-01T00:00:00.000Z',
        to: '2027-03-31T23:59:59.999Z',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid date strings', async () => {
      const errors = await errorsFor(QuerySchoolEventsDto, {
        from: 'yesterday',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
