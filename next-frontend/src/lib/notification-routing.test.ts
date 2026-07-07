import * as notificationRouting from './notification-routing';
import type { Notification } from '@/types/notification';

const sampleNotification: Notification = {
  id: 'notification-1',
  userId: 'student-1',
  type: 'assessment_assigned',
  title: 'New assessment',
  message: 'Algebra Quiz is ready.',
  isRead: false,
  referenceId: 'assessment-1',
  createdAt: '2026-06-17T00:00:00.000Z',
};

describe('notification-routing compatibility exports', () => {
  it('exposes a canonical action label helper for callers', () => {
    expect(notificationRouting.getNotificationActionLabel(sampleNotification)).toBe(
      'Open assessment',
    );
  });

  it('resolves destinations with the canonical destination helper', () => {
    expect(notificationRouting.resolveNotificationDestination(sampleNotification, 'student')).toBe(
      '/dashboard/student/assessments/assessment-1',
    );
  });
});
