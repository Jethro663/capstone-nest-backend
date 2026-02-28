import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryNotificationsDto } from './DTO/query-notifications.dto';

async function errorsFor(plain: object): Promise<string[]> {
  const instance = plainToInstance(QueryNotificationsDto, plain);
  const errors = await validate(instance);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('QueryNotificationsDto', () => {
  it('passes with valid page and limit', async () => {
    const errors = await errorsFor({ page: 1, limit: 20 });
    expect(errors).toHaveLength(0);
  });

  it('passes when both fields are omitted (uses defaults)', async () => {
    const errors = await errorsFor({});
    expect(errors).toHaveLength(0);
  });

  it('fails when page is 0', async () => {
    const errors = await errorsFor({ page: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when page is negative', async () => {
    const errors = await errorsFor({ page: -5 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when limit exceeds 100', async () => {
    const errors = await errorsFor({ limit: 101 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when limit is 0', async () => {
    const errors = await errorsFor({ limit: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('coerces string query params to numbers', async () => {
    const instance = plainToInstance(QueryNotificationsDto, {
      page: '3',
      limit: '15',
    });
    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
    expect(instance.page).toBe(3);
    expect(instance.limit).toBe(15);
  });

  it('passes with limit at the boundary value of 100', async () => {
    const errors = await errorsFor({ limit: 100 });
    expect(errors).toHaveLength(0);
  });
});
