import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as JaDtos from './ja-practice.dto';

async function errorsFor(DtoClass: new () => object, plain: object) {
  const instance = plainToInstance(DtoClass, plain);
  return validate(instance);
}

describe('JA pagination DTOs', () => {
  it('coerces and validates activity history pagination', async () => {
    const DtoClass = (
      JaDtos as unknown as Record<string, new () => object | undefined>
    ).JaActivityHistoryQueryDto;

    expect(DtoClass).toBeDefined();
    if (!DtoClass) return;

    const valid = plainToInstance(DtoClass, {
      classId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'review',
      page: '2',
      limit: '8',
    }) as { page?: number; limit?: number };

    expect(await validate(valid)).toHaveLength(0);
    expect(valid.page).toBe(2);
    expect(valid.limit).toBe(8);
    expect(await errorsFor(DtoClass, {})).not.toHaveLength(0);
    expect(
      await errorsFor(DtoClass, {
        classId: '550e8400-e29b-41d4-a716-446655440000',
        mode: 'practice',
      }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(DtoClass, {
        classId: '550e8400-e29b-41d4-a716-446655440000',
        page: 0,
      }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(DtoClass, {
        classId: '550e8400-e29b-41d4-a716-446655440000',
        limit: 21,
      }),
    ).not.toHaveLength(0);
  });

  it('validates optional Ask message cursor pagination', async () => {
    const DtoClass = (
      JaDtos as unknown as Record<string, new () => object | undefined>
    ).JaAskThreadQueryDto;

    expect(DtoClass).toBeDefined();
    if (!DtoClass) return;

    const valid = plainToInstance(DtoClass, {
      limit: '20',
      before: 'opaque-cursor',
    }) as { limit?: number };

    expect(await validate(valid)).toHaveLength(0);
    expect(valid.limit).toBe(20);
    expect(await errorsFor(DtoClass, { limit: 0 })).not.toHaveLength(0);
    expect(await errorsFor(DtoClass, { limit: 41 })).not.toHaveLength(0);
  });
});
