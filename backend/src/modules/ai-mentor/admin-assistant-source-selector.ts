export type AdminAssistantSourceKey =
  | 'overview'
  | 'audit'
  | 'studentPerformance'
  | 'assessmentSummary'
  | 'interventionParticipation'
  | 'systemUsage'
  | 'analytics'
  | 'performance'
  | 'evaluations';

const SOURCE_RULES: ReadonlyArray<{
  source: AdminAssistantSourceKey;
  pattern: RegExp;
}> = [
  {
    source: 'audit',
    pattern: /\b(audit|logs?|changed?|anomal(?:y|ies|ous)?|suspicious)\b/i,
  },
  {
    source: 'systemUsage',
    pattern:
      /\b(usage|activity|logins?|completions?|submissions?|today|daily|week|weekly|month|monthly)\b/i,
  },
  {
    source: 'studentPerformance',
    pattern: /\b(risk|at-risk|learners?|students?|grades?|scores?)\b/i,
  },
  {
    source: 'assessmentSummary',
    pattern: /\b(assessments?|quizzes?|exams?|assignments?|subjects?)\b/i,
  },
  {
    source: 'interventionParticipation',
    pattern: /\b(interventions?|remedial|cases?|checkpoints?)\b/i,
  },
  {
    source: 'evaluations',
    pattern: /\b(evaluations?|feedback|satisfaction|usability)\b/i,
  },
  {
    source: 'performance',
    pattern:
      /\b(mastery|recommendations?|transitions?|performance|progress|recover(?:y|ies|ed)?)\b/i,
  },
  {
    source: 'analytics',
    pattern: /\b(analytics?|insights?|trend|trends)\b/i,
  },
  {
    source: 'overview',
    pattern:
      /\b(overview|dashboard|totals?|counts?|school|system|readiness)\b/i,
  },
];

export function selectAdminAssistantSources(
  message: string,
): AdminAssistantSourceKey[] {
  const selected = SOURCE_RULES.filter(({ pattern }) =>
    pattern.test(message),
  ).map(({ source }) => source);

  return selected.length > 0 ? selected : ['overview'];
}
