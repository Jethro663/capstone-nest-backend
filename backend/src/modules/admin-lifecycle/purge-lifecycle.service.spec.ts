import {
  planPurgeLifecycle,
  type PurgeLifecycleSnapshot,
} from './purge-lifecycle.service';

const targetId = '00000000-0000-4000-8000-000000000301';

function snapshot(
  overrides: Partial<PurgeLifecycleSnapshot> = {},
): PurgeLifecycleSnapshot {
  return {
    targetType: 'USER',
    targetId,
    targetName: 'student account',
    isActive: false,
    evidence: {},
    version: 'archived:1',
    ...overrides,
  };
}

describe('purge lifecycle planning', () => {
  it('presents retained evidence as a keep-record outcome without deletion ceremony', () => {
    const result = planPurgeLifecycle(
      snapshot({ evidence: { enrollmentHistory: 2, scores: 4 } }),
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RETAINED_EVIDENCE',
        resolutionOptions: ['KEEP_RECORD'],
      }),
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.effects).toEqual([]);
    expect(result.requiredConfirmations).toEqual([]);
    expect(result.preserved).toEqual(
      expect.arrayContaining([
        'Enrollment history: 2 record(s)',
        'Scores: 4 record(s)',
      ]),
    );
  });

  it('keeps the irreversible ceremony for an evidence-free archived target', () => {
    const result = planPurgeLifecycle(snapshot());

    expect(result.blockers).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'PERMANENT_ACTION' }),
    ]);
    expect(result.effects).toEqual([
      expect.objectContaining({ kind: 'purge', entityId: targetId }),
    ]);
    expect(result.requiredConfirmations).toEqual([
      'PERMANENT_DELETE',
      'NO_RETAINED_ACADEMIC_EVIDENCE',
    ]);
  });
});
