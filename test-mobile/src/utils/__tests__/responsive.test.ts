import { resolveResponsiveLayout } from "../responsive";

describe("responsive layout utilities", () => {
  it("keeps phones compact and tablets scaled", () => {
    expect(resolveResponsiveLayout(390)).toMatchObject({ isTablet: false, horizontalPadding: 16, contentMaxWidth: 390 });
    expect(resolveResponsiveLayout(900)).toMatchObject({ isTablet: true, horizontalPadding: 28, contentMaxWidth: 760 });
  });
});
