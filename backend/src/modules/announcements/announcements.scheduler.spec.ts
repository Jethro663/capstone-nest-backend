import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsScheduler } from './announcements.scheduler';
import { AnnouncementsService } from './announcements.service';
import { SystemResetParticipant } from '../system-reset/system-reset.participant';

describe('AnnouncementsScheduler', () => {
  let scheduler: AnnouncementsScheduler;

  const mockService = {
    publishDueAnnouncements: jest.fn(),
  };
  const participant = {
    run: jest.fn((work: () => Promise<unknown>) => work()),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsScheduler,
        { provide: AnnouncementsService, useValue: mockService },
        { provide: SystemResetParticipant, useValue: participant },
      ],
    }).compile();

    scheduler = module.get<AnnouncementsScheduler>(AnnouncementsScheduler);
  });

  it('calls publishDueAnnouncements when cron fires', async () => {
    mockService.publishDueAnnouncements.mockResolvedValue(undefined);

    await scheduler.handleScheduledAnnouncements();

    expect(mockService.publishDueAnnouncements).toHaveBeenCalledTimes(1);
  });

  it('does NOT throw when publishDueAnnouncements rejects — scheduler must not crash', async () => {
    mockService.publishDueAnnouncements.mockRejectedValue(
      new Error('DB connection lost'),
    );

    // Should resolve without re-throwing (error is caught and logged)
    await expect(
      scheduler.handleScheduledAnnouncements(),
    ).resolves.toBeUndefined();
  });

  it('does not publish when maintenance rejects admission', async () => {
    participant.run.mockRejectedValueOnce(new Error('Maintenance'));
    await scheduler.handleScheduledAnnouncements();
    expect(mockService.publishDueAnnouncements).not.toHaveBeenCalled();
  });
});
