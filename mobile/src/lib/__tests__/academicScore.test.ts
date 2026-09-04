import { presentAcademicScore } from "../academicScore";

describe("presentAcademicScore", () => {
  it("keeps a backend 50 percent result at 50 percent", () => {
    expect(
      presentAcademicScore({
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
      }).compactLabel,
    ).toBe("5/10 · 50%");
  });
});
