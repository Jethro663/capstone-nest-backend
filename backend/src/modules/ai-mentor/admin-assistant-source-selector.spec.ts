import { selectAdminAssistantSources } from './admin-assistant-source-selector';

describe('selectAdminAssistantSources', () => {
  it('selects audit and usage sources without unrelated assessment data', () => {
    expect(
      selectAdminAssistantSources('Show unusual audit activity this week'),
    ).toEqual(['audit', 'systemUsage']);
  });

  it('selects the datasets needed for a cross-domain performance question', () => {
    expect(
      selectAdminAssistantSources(
        'Compare at-risk learners with their intervention progress',
      ),
    ).toEqual([
      'studentPerformance',
      'interventionParticipation',
      'performance',
    ]);
  });

  it('keeps overview as the safe fallback for an unsupported question', () => {
    expect(selectAdminAssistantSources('What should I look at?')).toEqual([
      'overview',
    ]);
  });

  it('returns each selected source only once', () => {
    expect(
      selectAdminAssistantSources(
        'Show assessment, quiz, and assignment performance',
      ),
    ).toEqual(['assessmentSummary', 'performance']);
  });
});
