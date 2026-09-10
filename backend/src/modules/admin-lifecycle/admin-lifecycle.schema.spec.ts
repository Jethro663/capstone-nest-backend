import { getTableName } from 'drizzle-orm';
import {
  adminLifecycleOperations,
  enrollmentLifecycleEvents,
} from '../../drizzle/schema/admin-lifecycle.schema';
import { auditLogs } from '../../drizzle/schema/base.schema';

describe('admin lifecycle schema', () => {
  it('defines durable operation and append-only enrollment event tables', () => {
    expect(getTableName(adminLifecycleOperations)).toBe(
      'admin_lifecycle_operations',
    );
    expect(getTableName(enrollmentLifecycleEvents)).toBe(
      'enrollment_lifecycle_events',
    );

    expect(adminLifecycleOperations.idempotencyKey.isUnique).toBe(true);
    expect(adminLifecycleOperations.actorId.notNull).toBe(false);
    expect(enrollmentLifecycleEvents.operationId.notNull).toBe(true);
    expect(enrollmentLifecycleEvents.actorId.notNull).toBe(false);
  });

  it('retains audit rows after their actor is purged', () => {
    expect(auditLogs.actorId.notNull).toBe(false);
  });
});
