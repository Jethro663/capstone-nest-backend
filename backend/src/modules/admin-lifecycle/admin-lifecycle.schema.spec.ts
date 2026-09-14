import { getTableName } from 'drizzle-orm';
import {
  adminLifecycleOperations,
  adminErasureItems,
  adminErasureOperations,
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
    expect(getTableName(adminErasureOperations)).toBe(
      'admin_erasure_operations',
    );
    expect(getTableName(adminErasureItems)).toBe('admin_erasure_items');

    expect(adminLifecycleOperations.idempotencyKey.isUnique).toBe(true);
    expect(adminLifecycleOperations.actorId.notNull).toBe(false);
    expect(enrollmentLifecycleEvents.operationId.notNull).toBe(true);
    expect(enrollmentLifecycleEvents.actorId.notNull).toBe(false);
    expect(adminErasureOperations.idempotencyKey.isUnique).toBe(true);
    expect(adminErasureOperations.actorId.notNull).toBe(false);
    expect(adminErasureItems.operationId.notNull).toBe(true);
    expect(adminErasureItems.targetId.notNull).toBe(true);
  });

  it('retains audit rows after their actor is purged', () => {
    expect(auditLogs.actorId.notNull).toBe(false);
  });
});
