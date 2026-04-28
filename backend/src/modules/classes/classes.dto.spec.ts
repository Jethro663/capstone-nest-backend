import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';

async function messagesFor(dtoClass: new () => unknown, plain: object) {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object);
  return errors.flatMap((entry) => Object.values(entry.constraints ?? {}));
}

describe('Classes DTOs', () => {
  it('requires room and at least one schedule when creating a class', async () => {
    const messages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: '',
      schedules: [],
    });

    expect(messages).toContain('room is required');
    expect(messages).toContain('At least one schedule slot is required');
  });

  it('rejects empty room and empty schedule replacements when updating a class', async () => {
    const messages = await messagesFor(UpdateClassDto, {
      room: '',
      schedules: [],
    });

    expect(messages).toContain('room cannot be empty');
    expect(messages).toContain('At least one schedule slot is required');
  });
});
