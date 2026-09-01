import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ExecuteAcademicStateAlignmentDto,
  PreviewAcademicStateAlignmentDto,
} from './academic-maintenance.dto';

const classId = '00000000-0000-4000-8000-000000000002';

describe('academic state alignment DTOs', () => {
  it('accepts a valid preview and rejects non-consecutive years', async () => {
    const valid = plainToInstance(PreviewAcademicStateAlignmentDto, {
      sourceSchoolYear: '2027-2028',
      targetSchoolYear: '2026-2027',
      targetQuarter: 'Q1',
      classIds: [classId],
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(PreviewAcademicStateAlignmentDto, {
      ...valid,
      targetSchoolYear: '2026-2028',
    });
    expect((await validate(invalid)).map((error) => error.property)).toContain(
      'targetSchoolYear',
    );
  });

  it('requires a hash, confirmations, reason, and password for execution', async () => {
    const invalid = plainToInstance(ExecuteAcademicStateAlignmentDto, {
      sourceSchoolYear: '2027-2028',
      targetSchoolYear: '2026-2027',
      targetQuarter: 'Q1',
      classIds: [classId],
    });
    const properties = (await validate(invalid)).map((error) => error.property);
    expect(properties).toEqual(
      expect.arrayContaining([
        'manifestHash',
        'confirmations',
        'reason',
        'currentPassword',
      ]),
    );
  });
});
