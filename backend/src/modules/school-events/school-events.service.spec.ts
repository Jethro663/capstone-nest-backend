import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { SchoolEventsService } from './school-events.service';

const EVENT_ID = 'school-event-1';

const makeEvent = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: EVENT_ID,
  eventType: 'school_event',
  schoolYear: '2026-2027',
  title: 'Foundation Day',
  description: 'Activity day',
  location: 'Quadrangle',
  startsAt: new Date('2026-11-10T00:00:00.000Z'),
  endsAt: new Date('2026-11-10T23:59:59.999Z'),
  allDay: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
  ...overrides,
});

describe('SchoolEventsService', () => {
  let service: SchoolEventsService;
  let mockDb: {
    query: {
      schoolEvents: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
      };
    };
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockAuditService: { log: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

    mockDb = {
      query: {
        schoolEvents: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolEventsService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SchoolEventsService>(SchoolEventsService);
  });

  it('creates a school event and writes an audit log', async () => {
    const created = makeEvent();
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([created]),
      }),
    });

    const result = await service.create(
      {
        eventType: 'school_event',
        schoolYear: '2026-2027',
        title: ' Foundation Day ',
        startsAt: '2026-11-10T00:00:00.000Z',
        endsAt: '2026-11-10T23:59:59.999Z',
        allDay: true,
      },
      'admin-1',
    );

    expect(result).toEqual(created);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'school_event.created',
        targetId: EVENT_ID,
      }),
    );
  });

  it('rejects create when endsAt is before startsAt', async () => {
    await expect(
      service.create(
        {
          eventType: 'school_event',
          schoolYear: '2026-2027',
          title: 'Invalid Date Range',
          startsAt: '2026-11-11T00:00:00.000Z',
          endsAt: '2026-11-10T23:59:59.999Z',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns filtered school events', async () => {
    const rows = [makeEvent(), makeEvent({ id: 'school-event-2' })];
    mockDb.query.schoolEvents.findMany.mockResolvedValue(rows);

    const result = await service.findAll({
      schoolYear: '2026-2027',
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-30T23:59:59.999Z',
    });

    expect(result).toEqual(rows);
    expect(mockDb.query.schoolEvents.findMany).toHaveBeenCalled();
  });

  it('rejects findAll when from is later than to', async () => {
    await expect(
      service.findAll({
        from: '2026-12-01T00:00:00.000Z',
        to: '2026-11-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('soft-deletes an event and logs audit metadata', async () => {
    mockDb.query.schoolEvents.findFirst.mockResolvedValue(makeEvent());
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });

    const result = await service.remove(EVENT_ID, 'admin-1');

    expect(result.message).toContain('archived');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'school_event.deleted',
        targetId: EVENT_ID,
      }),
    );
  });

  it('throws NotFoundException when removing a missing event', async () => {
    mockDb.query.schoolEvents.findFirst.mockResolvedValue(null);

    await expect(service.remove(EVENT_ID, 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
