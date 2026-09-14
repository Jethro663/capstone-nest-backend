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

  it('classifies deterministic dependent effects as auto-resolvable', () => {
    const manifest = buildAdminLifecycleManifest(base);
    expect(manifest.decision).toEqual(
      expect.objectContaining({
        state: 'AUTO_RESOLVABLE',
        disposition: 'EXECUTABLE',
        code: 'DEPENDENCIES_AUTO_RESOLVED',
        nextActions: [],
      }),
    );
  });

  it('turns supported resolution options into typed next actions', () => {
    const manifest = buildAdminLifecycleManifest({
      ...base,
      blockers: [
        {
          code: 'CORRECTION_HAS_EVIDENCE',
          message: 'Choose a history-preserving outcome.',
          resolvable: true,
          resolutionOptions: [
            'WITHDRAW',
            'TRANSFER_SECTION',
            'ACADEMIC_REPAIR',
          ],
        },
      ],
    });

    expect(manifest.decision.state).toBe('NEEDS_CHOICE');
    expect(manifest.decision.disposition).toBe('CHOICE_REQUIRED');
    expect(manifest.decision.nextActions).toEqual([
      expect.objectContaining({
        id: 'WITHDRAW',
        kind: 'REPREVIEW',
        intent: 'WITHDRAW',
      }),
      expect.objectContaining({
        id: 'TRANSFER_SECTION',
        requiredFields: ['destinationSectionId'],
      }),
      expect.objectContaining({
        id: 'ACADEMIC_REPAIR',
        kind: 'NAVIGATE_REPAIR',
      }),
    ]);
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
    expect(manifest.decision.state).toBe('IMMUTABLE');
    expect(manifest.decision.disposition).toBe('REPAIR_REQUIRED');
    expect(manifest.decision.nextActions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'CONTINUE' })]),
    );
  });

  it('classifies retained evidence as a terminal keep-record outcome', () => {
    const manifest = buildAdminLifecycleManifest({
      ...base,
      blockers: [
        {
          code: 'RETAINED_EVIDENCE',
          message: 'Official history must be retained.',
          resolvable: false,
          resolutionOptions: ['KEEP_RECORD'],
        },
      ],
    });

    expect(manifest.decision).toEqual(
      expect.objectContaining({
        state: 'IMMUTABLE',
        disposition: 'RETAIN_REQUIRED',
        nextActions: [
          expect.objectContaining({ id: 'KEEP_RECORD', kind: 'CANCEL' }),
        ],
      }),
    );
  });

  it('turns retained evidence into executable deletion impact only in cascade-erasure mode', () => {
    const manifest = buildAdminLifecycleManifest({
      ...base,
      action: 'PURGE_CLASS',
      request: {
        targetType: 'CLASS',
        targetIds: [base.targetId],
        purgeMode: 'CASCADE_ERASE',
      },
      blockers: [
        {
          code: 'RETAINED_EVIDENCE',
          message: 'Official history will be permanently erased.',
          resolvable: false,
          resolutionOptions: ['KEEP_RECORD'],
        },
      ],
      warnings: [],
      requiredConfirmations: ['ERASE 1 CLASS'],
    });

    expect(manifest.safeToExecute).toBe(true);
    expect(manifest.blockers).toEqual([]);
    expect(manifest.warnings).toContainEqual(
      expect.objectContaining({ code: 'DATA_WILL_BE_ERASED' }),
    );
    expect(manifest.decision).toEqual(
      expect.objectContaining({
        state: 'OVERRIDABLE_WARNING',
        disposition: 'EXECUTABLE',
        code: 'DATA_WILL_BE_ERASED',
      }),
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
