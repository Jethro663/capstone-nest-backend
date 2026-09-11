import fs from "node:fs";
import path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("administrator adaptive and accessibility contract", () => {
  it("uses 48dp as the shared interactive target floor", () => {
    const source = read("AdminMobilePrimitives.tsx");
    const targetFloors = source.match(/minHeight: 48/g) ?? [];
    expect(targetFloors.length).toBeGreaterThanOrEqual(5);
    expect(source).not.toContain("minHeight: 44");
  });

  it("keeps forms reachable above the keyboard and dismisses list keyboards naturally", () => {
    expect(read("AdminMobilePrimitives.tsx")).toContain("KeyboardAvoidingView");
    expect(read("AdminPaginatedList.tsx")).toContain(
      'keyboardDismissMode="on-drag"',
    );
  });

  it("provides an expanded-width two-pane primitive without changing route identity", () => {
    const source = read("AdminMobilePrimitives.tsx");
    expect(source).toContain("useWindowDimensions");
    expect(source).toContain("AdminAdaptiveColumns");
    expect(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../../screens/AdminSettingsOverviewScreen.tsx",
        ),
        "utf8",
      ),
    ).toContain("AdminAdaptiveColumns");
  });

  it("allows administrator row text to reflow under large text settings", () => {
    const source = read("AdminMobilePrimitives.tsx");
    expect(source).toContain("maxFontSizeMultiplier={1.6}");
    expect(source).toContain("numberOfLines={2}");
  });
});
