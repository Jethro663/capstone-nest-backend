import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '../../common/constants/role.constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { SchoolEventsController } from './school-events.controller';
import { SchoolEventsService } from './school-events.service';

const makeEvent = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'event-1',
  eventType: 'school_event',
  schoolYear: '2026-2027',
  title: 'Foundation Day',
  startsAt: '2026-11-10T00:00:00.000Z',
  endsAt: '2026-11-10T23:59:59.999Z',
  allDay: true,
  ...overrides,
});

function getDecoratedMethod(target: object, methodName: string): object {
  const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new Error(
      `Method ${methodName} is not decorated on controller prototype`,
    );
  }
  return descriptor.value as object;
}

describe('SchoolEventsController', () => {
  let controller: SchoolEventsController;

  const mockService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolEventsController],
      providers: [{ provide: SchoolEventsService, useValue: mockService }],
    }).compile();

    controller = module.get<SchoolEventsController>(SchoolEventsController);
  });

  it('returns the standard envelope for GET /school-events', async () => {
    const rows = [makeEvent()];
    mockService.findAll.mockResolvedValue(rows);

    const result = await controller.findAll({ schoolYear: '2026-2027' });

    expect(result).toEqual({
      success: true,
      message: 'School events retrieved.',
      data: rows,
    });
  });

  it('returns the standard envelope for POST /school-events', async () => {
    const event = makeEvent();
    mockService.create.mockResolvedValue(event);

    const payload = {
      eventType: 'school_event' as const,
      schoolYear: '2026-2027',
      title: 'Foundation Day',
      startsAt: '2026-11-10T00:00:00.000Z',
      endsAt: '2026-11-10T23:59:59.999Z',
    };

    const result = await controller.create(payload, { userId: 'admin-1' });

    expect(result).toEqual({
      success: true,
      message: 'School event created.',
      data: event,
    });
    expect(mockService.create).toHaveBeenCalledWith(payload, 'admin-1');
  });

  it('assigns correct role metadata: admin mutates, teacher/student read', () => {
    const findAllMethod = getDecoratedMethod(
      SchoolEventsController.prototype,
      'findAll',
    );
    const createMethod = getDecoratedMethod(
      SchoolEventsController.prototype,
      'create',
    );
    const updateMethod = getDecoratedMethod(
      SchoolEventsController.prototype,
      'update',
    );
    const removeMethod = getDecoratedMethod(
      SchoolEventsController.prototype,
      'remove',
    );

    const listRoles = Reflect.getMetadata(ROLES_KEY, findAllMethod) as
      | RoleName[]
      | undefined;
    const createRoles = Reflect.getMetadata(ROLES_KEY, createMethod) as
      | RoleName[]
      | undefined;
    const updateRoles = Reflect.getMetadata(ROLES_KEY, updateMethod) as
      | RoleName[]
      | undefined;
    const deleteRoles = Reflect.getMetadata(ROLES_KEY, removeMethod) as
      | RoleName[]
      | undefined;

    expect(listRoles).toEqual([
      RoleName.Admin,
      RoleName.Teacher,
      RoleName.Student,
    ]);
    expect(createRoles).toEqual([RoleName.Admin]);
    expect(updateRoles).toEqual([RoleName.Admin]);
    expect(deleteRoles).toEqual([RoleName.Admin]);
  });
});
