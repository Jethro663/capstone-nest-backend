import {
  buildAcademicScoreContract,
  calculateBoundedScore,
} from './academic-score';

describe('calculateBoundedScore', () => {
  it('caps awarded points at the item maximum while preserving bonus evidence', () => {
    expect(
      calculateBoundedScore({
        basePoints: 5,
        bonusPoints: 15,
        bonusReason: 'Teacher-approved correction',
        possiblePoints: 10,
      }),
    ).toEqual({
      basePoints: 5,
      bonusPoints: 15,
      awardedPoints: 20,
      possiblePoints: 10,
      effectivePoints: 10,
      scorePercent: 100,
      wasCapped: true,
      bonusReason: 'Teacher-approved correction',
    });
  });

  it('rejects a base score above HPS instead of inferring an accidental bonus', () => {
    expect(() =>
      calculateBoundedScore({ basePoints: 11, possiblePoints: 10 }),
    ).toThrow('Base points must be between 0 and 10');
  });

  it('requires a reason for positive bonus points', () => {
    expect(() =>
      calculateBoundedScore({
        basePoints: 5,
        bonusPoints: 1,
        possiblePoints: 10,
      }),
    ).toThrow('Bonus points require a reason');
  });

  it.each([
    { basePoints: Number.NaN, possiblePoints: 10 },
    {
      basePoints: 1,
      bonusPoints: Number.POSITIVE_INFINITY,
      possiblePoints: 10,
    },
    { basePoints: 1, possiblePoints: 0 },
  ])('rejects non-finite or non-positive inputs: %p', (input) => {
    expect(() => calculateBoundedScore(input)).toThrow();
  });
});

describe('buildAcademicScoreContract', () => {
  it('keeps the compatibility score as a bounded percentage and exposes points', () => {
    expect(
      buildAcademicScoreContract({
        score: 50,
        basePointsEarned: '5',
        possiblePointsSnapshot: '10',
        bonusPoints: '0',
        bonusReason: null,
      }),
    ).toEqual({
      score: 50,
      scorePercent: 50,
      scoreBreakdown: {
        basePoints: 5,
        bonusPoints: 0,
        awardedPoints: 5,
        possiblePoints: 10,
        effectivePoints: 5,
        scorePercent: 50,
        wasCapped: false,
        bonusReason: null,
      },
    });
  });

  it('defensively bounds malformed legacy percentages', () => {
    expect(buildAcademicScoreContract({ score: 331 })).toEqual({
      score: 100,
      scorePercent: 100,
      scoreBreakdown: null,
    });
  });

  it('does not invent zero points when legacy point evidence is missing', () => {
    expect(
      buildAcademicScoreContract({
        score: 50,
        basePointsEarned: null,
        possiblePointsSnapshot: '10',
      }),
    ).toEqual({
      score: 50,
      scorePercent: 50,
      scoreBreakdown: null,
    });
  });

  it('can hide an unreleased score without leaking the breakdown', () => {
    expect(
      buildAcademicScoreContract(
        {
          score: 80,
          basePointsEarned: '8',
          possiblePointsSnapshot: '10',
        },
        { visible: false },
      ),
    ).toEqual({ score: null, scorePercent: null, scoreBreakdown: null });
  });
});
