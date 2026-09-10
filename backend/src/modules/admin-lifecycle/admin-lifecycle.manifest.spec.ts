import {
  buildAdminLifecycleManifest,
  hashAdminLifecycleRequest,
} from './admin-lifecycle.manifest';

const base = {
  action: 'STUDENT_RESOLUTION' as const,
  targetType: 'student',
  targetId: '00000000-0000-4000-8000-000000000001',
  request: {
    resolution: 'WITHDRAW',
    studentId: '00000000-0000-4000-8000-000000000001',
    sectionId: '00000000-0000-4000-8000-000000000002',
  },
  academicState: { schoolYear: '2026-2027', period: 'Q3', version: 4 },
  dependencyVersions: [
    {
      entityType: 'enrollment',
      entityId: 'b',
      version: '2026-09-11T01:00:00Z',
    },
    {
      entityType: 'enrollment',
      entityId: 'a',
      version: '2026-09-11T01:00:00Z',
    },
  ],
  effects: [
    {
      kind: 'update',
      entityType: 'enrollment',
      entityId: 'b',
      summary: 'Drop class membership',
    },
    {
      kind: 'update',
      entityType: 'enrollment',
      entityId: 'a',
      summary: 'Drop section membership',
    },
  ],
  preserved: ['Finalized Q1 class record', 'Finalized Q2 class record'],
  evidence: { attempts: 1, scores: 2 },
  blockers: [],
  warnings: [
    {
      code: 'EVIDENCE_PRESERVED',
      message: 'Earlier results remain unchanged.',
    },
  ],
  requiredConfirmations: ['PRESERVE_ACADEMIC_HISTORY', 'WITHDRAW_STUDENT'],
};

describe('admin lifecycle manifest', () => {
  it('is deterministic across object and array ordering for one expiry', () => {
    const first = buildAdminLifecycleManifest(
      base,
      new Date('2026-09-11T01:00:00Z'),
    );
    const second = buildAdminLifecycleManifest(
      {
        ...base,
        dependencyVersions: [...base.dependencyVersions].reverse(),
        effects: [...base.effects].reverse(),
        preserved: [...base.preserved].reverse(),
        evidence: { scores: 2, attempts: 1 },
        requiredConfirmations: [...base.requiredConfirmations].reverse(),
      },
      new Date('2026-09-11T01:00:00Z'),
    );

    expect(first.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.manifestHash).toBe(first.manifestHash);
    expect(first.schemaVersion).toBe(1);
    expect(first.expiresAt).toBe('2026-09-11T01:05:00.000Z');
    expect(second.expiresAt).toBe('2026-09-11T01:05:00.000Z');
  });

  it('signs the expiry so a client cannot extend a stale review', () => {
    const first = buildAdminLifecycleManifest(
      base,
      new Date('2026-09-11T01:00:00Z'),
    );
    const later = buildAdminLifecycleManifest(
      base,
      new Date('2026-09-11T01:01:00Z'),
    );

    expect(later.manifestHash).not.toBe(first.manifestHash);
  });

  it('changes the hash when a dependency changes', () => {
    const first = buildAdminLifecycleManifest(base);
    const changed = buildAdminLifecycleManifest({
      ...base,
      dependencyVersions: base.dependencyVersions.map((entry, index) =>
        index === 0 ? { ...entry, version: '2026-09-11T02:00:00Z' } : entry,
      ),
    });

    expect(changed.manifestHash).not.toBe(first.manifestHash);
  });

  it('marks absolute blockers as unsafe while retaining resolution options', () => {
    const manifest = buildAdminLifecycleManifest({
      ...base,
      blockers: [
        {
          code: 'FINALIZED_EVIDENCE',
          message: 'Finalized evidence cannot be corrected.',
          resolvable: false,
          resolutionOptions: ['WITHDRAW', 'TRANSFER_SECTION'],
        },
      ],
    });

    expect(manifest.safeToExecute).toBe(false);
    expect(manifest.blockers[0]).toEqual(
      expect.objectContaining({ resolvable: false }),
    );
  });

  it('hashes idempotency requests without execution secrets', () => {
    const first = hashAdminLifecycleRequest({
      ...base.request,
      currentPassword: 'first-secret',
      idempotencyKey: '00000000-0000-4000-8000-000000000099',
      manifestHash: 'a'.repeat(64),
    });
    const second = hashAdminLifecycleRequest({
      ...base.request,
      currentPassword: 'second-secret',
      idempotencyKey: '00000000-0000-4000-8000-000000000099',
      manifestHash: 'a'.repeat(64),
    });

    expect(second).toBe(first);
  });
});
