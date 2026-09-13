import { planPurgeLifecycle } from './purge-lifecycle.service';

describe('purge lifecycle planning', () => {
  it.each([
    'enrollmentHistory',
    'lifecycleEvents',
    'classRecords',
    'finalizedParticipants',
    'scores',
    'attempts',
    'assessments',
    'lessons',
    'linkedClasses',
  ])('blocks permanent deletion when %s exists', (category) => {
    const result = planPurgeLifecycle({
      targetType: 'CLASS',
      targetId: '00000000-0000-4000-8000-000000000301',
      targetName: 'Mathematics 7',
      isActive: false,
      version: '2026-09-11T00:00:00.000Z',
      evidence: { [category]: 1 },
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'RETAINED_EVIDENCE' }),
    );
  });

  it('allows a truly empty archived target', () => {
    const result = planPurgeLifecycle({
      targetType: 'SECTION',
      targetId: '00000000-0000-4000-8000-000000000302',
      targetName: 'Empty Section',
      isActive: false,
      version: '2026-09-11T00:00:00.000Z',
      evidence: {},
    });

    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual([
      expect.objectContaining({ entityType: 'section', kind: 'purge' }),
    ]);
  });

  it('blocks purge of an active target without an override', () => {
    const result = planPurgeLifecycle({
      targetType: 'CLASS',
      targetId: '00000000-0000-4000-8000-000000000303',
      targetName: 'Active Class',
      isActive: true,
      version: '2026-09-11T00:00:00.000Z',
      evidence: {},
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'TARGET_NOT_ARCHIVED' }),
    );
  });

  it('blocks archived-account deletion when finalized grades or attempts exist', () => {
    const result = planPurgeLifecycle({
      targetType: 'USER',
      targetId: '00000000-0000-4000-8000-000000000304',
      targetName: 'Archived Learner',
      isActive: false,
      version: '2026-09-11T00:00:00.000Z',
      evidence: { finalizedParticipants: 1, attempts: 1 },
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'RETAINED_EVIDENCE' }),
    );
    expect(result.effects).toContainEqual(
      expect.objectContaining({ entityType: 'user', kind: 'purge' }),
    );
  });
});
