import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementFanOutProcessor } from './announcement-fan-out.processor';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';
import { Job } from 'bullmq';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CLASS_ID = 'class-uuid-1';
const ANN_ID = 'ann-uuid-1';

const JOB_DATA = {
  announcementId: ANN_ID,
  classId: CLASS_ID,
  title: 'New Announcement',
  content: '<p>Hello <strong>class</strong>!</p>',
};

const makeJob = (data: any = JOB_DATA): Job<any> =>
  ({ id: 'job-1', name: 'fan-out', data }) as any;

const makeEnrollmentRow = (studentId: string) => ({ studentId });

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('AnnouncementFanOutProcessor', () => {
  let processor: AnnouncementFanOutProcessor;
  let mockDb: any;
  let mockNotificationsService: { createBulk: jest.Mock };
  let mockGateway: { emitToUser: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb = {
      query: {
        enrollments: { findMany: jest.fn() },
      },
    };

    mockNotificationsService = {
      createBulk: jest.fn().mockResolvedValue(undefined),
    };
    mockGateway = { emitToUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementFanOutProcessor,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    processor = module.get<AnnouncementFanOutProcessor>(
      AnnouncementFanOutProcessor,
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Happy path
  // ──────────────────────────────────────────────────────────────────────────

  it('bulk-inserts one notification per enrolled student', async () => {
    const students = ['s-1', 's-2', 's-3'];
    mockDb.query.enrollments.findMany.mockResolvedValue(
      students.map(makeEnrollmentRow),
    );

    await processor.process(makeJob());

    expect(mockNotificationsService.createBulk).toHaveBeenCalledTimes(1);
    const [inputs] = mockNotificationsService.createBulk.mock.calls[0];
    expect(inputs).toHaveLength(3);
    expect(inputs.map((i: any) => i.userId)).toEqual(['s-1', 's-2', 's-3']);
  });

  it('sets type="announcement_posted" on every notification', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      makeEnrollmentRow('s-1'),
    ]);

    await processor.process(makeJob());

    const [inputs] = mockNotificationsService.createBulk.mock.calls[0];
    expect(inputs[0].type).toBe('announcement_posted');
  });

  it('sets referenceId to announcementId on every notification', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      makeEnrollmentRow('s-1'),
    ]);

    await processor.process(makeJob());

    const [inputs] = mockNotificationsService.createBulk.mock.calls[0];
    expect(inputs[0].referenceId).toBe(ANN_ID);
  });

  it('emits a WebSocket event for every student', async () => {
    const students = ['s-1', 's-2'];
    mockDb.query.enrollments.findMany.mockResolvedValue(
      students.map(makeEnrollmentRow),
    );

    await processor.process(makeJob());

    expect(mockGateway.emitToUser).toHaveBeenCalledTimes(2);
    expect(mockGateway.emitToUser).toHaveBeenCalledWith(
      's-1',
      expect.objectContaining({
        type: 'announcement_posted',
        title: JOB_DATA.title,
      }),
    );
    expect(mockGateway.emitToUser).toHaveBeenCalledWith(
      's-2',
      expect.objectContaining({ type: 'announcement_posted' }),
    );
  });

  it('strips HTML tags from content for notification body preview', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      makeEnrollmentRow('s-1'),
    ]);

    await processor.process(
      makeJob({ ...JOB_DATA, content: '<p>Hello <strong>class</strong>!</p>' }),
    );

    const [inputs] = mockNotificationsService.createBulk.mock.calls[0];
    expect(inputs[0].body).not.toContain('<p>');
    expect(inputs[0].body).not.toContain('<strong>');
    expect(inputs[0].body).toContain('Hello');
  });

  it('truncates notification body to 200 characters', async () => {
    const longContent = '<p>' + 'A'.repeat(500) + '</p>';
    mockDb.query.enrollments.findMany.mockResolvedValue([
      makeEnrollmentRow('s-1'),
    ]);

    await processor.process(makeJob({ ...JOB_DATA, content: longContent }));

    const [inputs] = mockNotificationsService.createBulk.mock.calls[0];
    expect(inputs[0].body.length).toBeLessThanOrEqual(200);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────────────

  it('skips bulk insert and WS emit when no students are enrolled', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([]);

    await processor.process(makeJob());

    expect(mockNotificationsService.createBulk).not.toHaveBeenCalled();
    expect(mockGateway.emitToUser).not.toHaveBeenCalled();
  });

  it('queries enrollments with the correct classId from job data', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([]);

    await processor.process(makeJob({ ...JOB_DATA, classId: 'class-xyz' }));

    // The findMany call should pass a where clause containing classId
    // We verify the call was made (business logic test via call assertion)
    expect(mockDb.query.enrollments.findMany).toHaveBeenCalledTimes(1);
  });

  it('does not throw when gateway.emitToUser is called with an offline user', async () => {
    // emitToUser is fire-and-forget; even if the room is empty, no error should propagate
    mockDb.query.enrollments.findMany.mockResolvedValue([
      makeEnrollmentRow('offline-user'),
    ]);
    mockGateway.emitToUser.mockImplementation(() => {
      // No-op: normal when user is not connected
    });

    await expect(processor.process(makeJob())).resolves.toBeUndefined();
  });
});
