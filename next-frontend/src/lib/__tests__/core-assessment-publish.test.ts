import type { Assessment } from '@/types/assessment';
import {
  hasCoreAssessmentPlacementForPublish,
  resolveAssessmentForPublishValidation,
} from '@/lib/core-assessment-publish';

function createAssessment(
  overrides: Partial<Assessment> = {},
): Assessment {
  return {
    id: 'assessment-1',
    title: 'Core Quiz',
    classId: 'class-1',
    type: 'quiz' as Assessment['type'],
    isPublished: false,
    questions: [],
    ...overrides,
  };
}

describe('hasCoreAssessmentPlacementForPublish', () => {
  it('accepts saved top-level placement fields', () => {
    expect(
      hasCoreAssessmentPlacementForPublish(
        createAssessment({
          classRecordCategory: 'written_work',
          quarter: 'Q1',
          classRecordItemId: 'slot-1',
        }),
      ),
    ).toBe(true);
  });

  it('accepts nested class record placement data when the list payload omits top-level fields', () => {
    expect(
      hasCoreAssessmentPlacementForPublish(
        createAssessment({
          classRecordPlacement: {
            placementMode: 'manual',
            classRecordId: 'record-1',
            gradingPeriod: 'Q1',
            itemId: 'slot-1',
            category: 'written_work',
            order: 1,
            title: 'WW1',
            maxScore: 10,
            scoreCount: 0,
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects placement when the slot id is still missing', () => {
    expect(
      hasCoreAssessmentPlacementForPublish(
        createAssessment({
          classRecordCategory: 'written_work',
          quarter: 'Q1',
          classRecordPlacement: {
            placementMode: 'automatic',
            classRecordId: 'record-1',
            gradingPeriod: 'Q1',
            itemId: null,
            category: 'written_work',
            order: null,
            title: null,
            maxScore: null,
            scoreCount: 0,
          },
        }),
      ),
    ).toBe(false);
  });

  it('prefers refreshed detail data when the list payload omits placement state', () => {
    const listAssessment = createAssessment({
      classRecordCategory: 'written_work',
      quarter: 'Q1',
      classRecordItemId: null,
      classRecordPlacement: null,
    });
    const detailedAssessment = createAssessment({
      classRecordCategory: 'written_work',
      quarter: 'Q1',
      classRecordPlacement: {
        placementMode: 'automatic',
        classRecordId: 'record-1',
        gradingPeriod: 'Q1',
        itemId: 'slot-1',
        category: 'written_work',
        order: 1,
        title: 'WW1',
        maxScore: 10,
        scoreCount: 0,
      },
    });

    expect(
      resolveAssessmentForPublishValidation(listAssessment, detailedAssessment),
    ).toBe(detailedAssessment);
  });
});
