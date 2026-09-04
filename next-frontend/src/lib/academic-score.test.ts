import { presentAcademicScore } from "./academic-score";

describe("presentAcademicScore", () => {
  it("renders raw points from breakdown and does not divide a percentage again", () => {
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
      }),
    ).toEqual(
      expect.objectContaining({
        scorePercent: 50,
        pointsLabel: "5/10",
        percentageLabel: "50%",
        compactLabel: "5/10 · 50%",
      }),
    );
  });

  it("discloses a capped bonus and bounds malformed legacy percentages", () => {
    expect(
      presentAcademicScore({
        score: 331,
        scoreBreakdown: {
          basePoints: 5,
          bonusPoints: 15,
          awardedPoints: 20,
          possiblePoints: 10,
          effectivePoints: 10,
          scorePercent: 100,
          wasCapped: true,
          bonusReason: "Correction",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        scorePercent: 100,
        compactLabel: "10/10 · 100%",
        bonusLabel: "+15 bonus (capped at full credit) — Correction",
      }),
    );
  });
});
