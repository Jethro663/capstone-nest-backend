import {
  assertResetParticipants,
  resetContentCounts,
  resetPublicStatus,
  resetRetryMatches,
} from './system-reset.coordination';

describe('reset coordination invariants', () => {
  it('never forgets a previously live participant when its heartbeat expires', () => {
    expect(() =>
      assertResetParticipants(
        ['ai:original'],
        [{ id: 'ai:new', cache_epoch: 2 }],
        2,
      ),
    ).toThrow();
    expect(() =>
      assertResetParticipants(
        ['ai:original'],
        [{ id: 'ai:original', cache_epoch: 1 }],
        2,
      ),
    ).toThrow();
    expect(() =>
      assertResetParticipants(
        ['ai:original'],
        [{ id: 'ai:original', cache_epoch: 2, retired: false }],
        2,
      ),
    ).not.toThrow();
    expect(() =>
      assertResetParticipants(
        ['ai:original'],
        [{ id: 'ai:original', cache_epoch: 1, retired: true }],
        2,
      ),
    ).not.toThrow();
  });
  it('requires acknowledgement from newly live participants as well', () => {
    expect(() =>
      assertResetParticipants(
        ['old'],
        [
          { id: 'old', cache_epoch: 3 },
          { id: 'new', cache_epoch: 2 },
        ],
        3,
      ),
    ).toThrow();
  });
  it('compares content counts but excludes changing operational receipts and sessions', () => {
    expect(
      resetContentCounts({
        users: 4,
        refresh_tokens: 3,
        audit_logs: 7,
        system_reset_instances: 3,
        file_chunks: 9,
      }),
    ).toEqual({ users: 4, file_chunks: 9 });
  });
  it('does not disclose identity, reason, counts or internal failures in public status', () => {
    expect(
      resetPublicStatus({
        active: true,
        operation_id: 'id',
        phase: 'cleanup',
        failure_code: 'STORAGE_SECRET',
        actor_email: 'private',
        reason: 'private',
      }),
    ).toEqual({
      active: true,
      operationId: 'id',
      phase: 'cleanup',
      status: 'running',
      retrying: true,
    });
    expect(
      resetPublicStatus({
        active: false,
        operation_id: 'id',
        phase: 'complete',
      }).status,
    ).toBe('completed');
    expect(
      resetPublicStatus({ active: false, operation_id: 'id', phase: 'aborted' })
        .status,
    ).toBe('aborted');
  });
  it('only replays the same actor and request without revalidating expired preview', () => {
    expect(
      resetRetryMatches({ actor_id: 'a', request_hash: 'h' }, 'a', 'h'),
    ).toBe(true);
    expect(() =>
      resetRetryMatches({ actor_id: 'b', request_hash: 'h' }, 'a', 'h'),
    ).toThrow();
    expect(() =>
      resetRetryMatches({ actor_id: 'a', request_hash: 'x' }, 'a', 'h'),
    ).toThrow();
    expect(resetRetryMatches(undefined, 'a', 'h')).toBe(false);
  });
});
