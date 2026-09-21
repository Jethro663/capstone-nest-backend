import fs from "node:fs";
import path from "node:path";

const read = (name: string) => fs.readFileSync(path.resolve(__dirname, `../${name}`), "utf8");

describe("teacher home and notification modernization", () => {
  it("makes Next Up the teacher home hero and removes duplicate page identity", () => {
    const source = read("TeacherHomeScreen.tsx");
    expect(source).toContain('testID="teacher-next-up"');
    expect(source).toContain("mobileBrand.navy");
    expect(source).not.toContain("<TeacherContextStrip");
  });

  it("uses one app bar, compact facts, search, and the shared filter sheet", () => {
    const source = read("NotificationsInboxScreen.tsx");
    expect(source).toContain("<MobileAppBar");
    expect(source).toContain('testID="notification-count-facts"');
    expect(source).toContain('accessibilityLabel="Search notifications"');
    expect(source).toContain("<MobileFilterSheet");
    expect(source).not.toContain("FILTERS.map");
    expect(source).not.toContain("All notifications appear here");
    expect(source).not.toContain("CountPill");
  });
});
