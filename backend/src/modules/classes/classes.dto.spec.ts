import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';

function flattenValidationMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    if (error.children?.length) {
      messages.push(...flattenValidationMessages(error.children));
    }
  }

  return messages;
}

async function messagesFor(dtoClass: new () => unknown, plain: object) {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object);
  return flattenValidationMessages(errors);
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

  it('rejects unsupported characters in class identifiers and room labels', async () => {
    const createMessages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics🙂',
      subjectCode: 'MATH-7/ROOM',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: 'Room <201>',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
    });

    expect(createMessages).toContain(
      'subjectName may only contain letters, numbers, spaces, hyphens, and apostrophes',
    );
    expect(createMessages).toContain(
      'subjectCode may only contain uppercase letters, numbers, and hyphens',
    );
    expect(createMessages).toContain(
      'room may only contain letters, numbers, spaces, number signs, hyphens, and slashes',
    );
  });

  it('requires a complete grading profile when it is provided', async () => {
    const messages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: 'Room 201',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
      gradingProfile: {},
    });

    expect(messages).toContain('writtenWork is required');
    expect(messages).toContain('performanceTask is required');
    expect(messages).toContain('quarterlyAssessment is required');
  });

  it('rejects grading profile values that are zero', async () => {
    const messages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: 'Room 201',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
      gradingProfile: {
        writtenWork: 0,
        performanceTask: 0,
        quarterlyAssessment: 0,
      },
    });

    expect(messages).toContain('writtenWork must be greater than 0');
    expect(messages).toContain('performanceTask must be greater than 0');
    expect(messages).toContain('quarterlyAssessment must be greater than 0');
  });

  it('rejects negative or fractional grading profile values', async () => {
    const messages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: 'Room 201',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
      gradingProfile: {
        writtenWork: -10,
        performanceTask: 50.5,
        quarterlyAssessment: 50,
      },
    });

    expect(messages).toContain('writtenWork must be greater than 0');
    expect(messages).toContain('performanceTask must be a whole number');
  });

  it('rejects grading profiles that do not sum to 100', async () => {
    const messages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: 'Room 201',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
      gradingProfile: {
        writtenWork: 10,
        performanceTask: 20,
        quarterlyAssessment: 30,
      },
    });

    expect(messages).toContain('gradingProfile must sum to exactly 100');
  });

  it('accepts omitted grading profile for backward compatibility', async () => {
    const messages = await messagesFor(CreateClassDto, {
      subjectName: 'Mathematics',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      sectionId: '11111111-1111-4111-8111-111111111111',
      teacherId: '22222222-2222-4222-8222-222222222222',
      schoolYear: '2026-2027',
      room: 'Room 201',
      schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
    });

    expect(messages).toHaveLength(0);
  });
});
