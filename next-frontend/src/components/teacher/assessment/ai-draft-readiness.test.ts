import { getAiDraftReadinessBlockers } from './ai-draft-readiness';

const ready = {
  policyStatus: 'ready' as const,
  classActive: true,
  historicalClass: false,
  validQuarter: true,
  hasRunningJob: false,
  validQuestionCount: true,
  indexStatus: 'ready' as const,
  hasReadySource: true,
  hasSelectedSource: true,
  submitting: false,
};

describe('AI draft readiness blockers', () => {
  it('returns every blocker in the required actionable order', () => {
    expect(
      getAiDraftReadinessBlockers({
        ...ready,
        policyStatus: 'error',
        classActive: false,
        historicalClass: true,
        validQuarter: false,
        hasRunningJob: true,
        validQuestionCount: false,
        indexStatus: 'stale',
        hasReadySource: false,
        hasSelectedSource: false,
        submitting: true,
      }).map((blocker) => blocker.code),
    ).toEqual([
      'policy_error',
      'inactive_class',
      'historical_class',
      'invalid_quarter',
      'running_job',
      'invalid_question_count',
      'index_stale',
      'no_ready_source',
      'no_source_selected',
      'submitting',
    ]);
  });

  it('offers reindex only for index availability, stale, or empty blockers', () => {
    const blockers = getAiDraftReadinessBlockers({
      ...ready,
      indexStatus: 'unavailable',
      hasReadySource: false,
    });
    expect(blockers.filter((blocker) => blocker.canReindex).map((b) => b.code)).toEqual([
      'index_unavailable',
    ]);
    expect(blockers.find((blocker) => blocker.code === 'no_ready_source')?.canReindex).toBe(
      false,
    );
  });

  it('allows generation only when no blockers remain', () => {
    expect(getAiDraftReadinessBlockers(ready)).toEqual([]);
  });
});
