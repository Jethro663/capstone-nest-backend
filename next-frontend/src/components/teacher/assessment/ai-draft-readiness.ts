export type AiDraftPolicyStatus = 'loading' | 'error' | 'ready';
export type AiDraftIndexStatus = 'unavailable' | 'stale' | 'empty' | 'ready';

export interface AiDraftReadinessInput {
  policyStatus: AiDraftPolicyStatus;
  classActive: boolean;
  historicalClass: boolean;
  validQuarter: boolean;
  hasRunningJob: boolean;
  validQuestionCount: boolean;
  indexStatus: AiDraftIndexStatus;
  hasReadySource: boolean;
  hasSelectedSource: boolean;
  submitting: boolean;
}

export interface AiDraftReadinessBlocker {
  code: string;
  message: string;
  canReindex: boolean;
}

export function getAiDraftReadinessBlockers(
  input: AiDraftReadinessInput,
): AiDraftReadinessBlocker[] {
  const blockers: AiDraftReadinessBlocker[] = [];
  if (input.policyStatus === 'loading')
    blockers.push({
      code: 'policy_loading',
      message: 'Wait for the class academic policy to finish loading.',
      canReindex: false,
    });
  else if (input.policyStatus === 'error')
    blockers.push({
      code: 'policy_error',
      message: 'Reload the academic policy before generating an assessment.',
      canReindex: false,
    });
  if (!input.classActive)
    blockers.push({
      code: 'inactive_class',
      message: 'AI Draft is unavailable because this class is inactive.',
      canReindex: false,
    });
  if (input.historicalClass)
    blockers.push({
      code: 'historical_class',
      message: 'AI Draft cannot prepare assessments for a historical class.',
      canReindex: false,
    });
  if (!input.validQuarter)
    blockers.push({
      code: 'invalid_quarter',
      message: 'Choose a valid quarter from the class policy.',
      canReindex: false,
    });
  if (input.hasRunningJob)
    blockers.push({
      code: 'running_job',
      message: 'Wait for the current AI generation job to finish.',
      canReindex: false,
    });
  if (!input.validQuestionCount)
    blockers.push({
      code: 'invalid_question_count',
      message: 'Enter a whole-number question count from 1 to 15.',
      canReindex: false,
    });
  if (input.indexStatus !== 'ready')
    blockers.push({
      code: `index_${input.indexStatus}`,
      message:
        input.indexStatus === 'unavailable'
          ? 'AI source readiness is unavailable. Retry or reindex when the service is ready.'
          : input.indexStatus === 'stale'
            ? 'The class source index is stale. Reindex before generating.'
            : 'The class source index is empty. Reindex ready class sources.',
      canReindex: true,
    });
  if (!input.hasReadySource)
    blockers.push({
      code: 'no_ready_source',
      message: 'No indexed lesson, extraction, or assessment source is ready.',
      canReindex: false,
    });
  if (!input.hasSelectedSource)
    blockers.push({
      code: 'no_source_selected',
      message: 'Select a ready source or enable the all-ready-sources option.',
      canReindex: false,
    });
  if (input.submitting)
    blockers.push({
      code: 'submitting',
      message: 'The generation request is already being submitted.',
      canReindex: false,
    });
  return blockers;
}
