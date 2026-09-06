import { readFileSync } from "node:fs";
import path from "node:path";

const providerSource = readFileSync(path.resolve(__dirname, "../LiveNotificationProvider.tsx"), "utf8");

describe("LiveNotificationProvider quiet presentation wiring", () => {
  it("uses one reducer-backed summary instead of a serial notification queue", () => {
    expect(providerSource).toContain("QuietNotificationBanner");
    expect(providerSource).toContain("addQuietNotifications");
    expect(providerSource).not.toContain("queueRef");
    expect(providerSource).not.toContain("tryShowNext");
  });

  it("removes individual content, mascot, and intervention pulse from the in-app banner", () => {
    expect(providerSource).not.toContain("View now");
    expect(providerSource).not.toContain("Nexora push");
    expect(providerSource).not.toContain("notificationCharacterSource");
    expect(providerSource).not.toContain("pulseTranslate");
  });

  it("opens the notification center from the quiet summary", () => {
    expect(providerSource).toContain('rootNavigationRef.navigate("Notifications")');
  });

  it("uses the authoritative unread count even when unread rows fall outside the first page", () => {
    expect(providerSource).toContain("const hydrationCount = Math.max(nextUnreadCount, unreadRows.length)");
    expect(providerSource).toContain("if (hydrationCount > 0)");
    expect(providerSource).toContain("addQuietNotifications(current, hydrationCount)");
  });

  it("does not under-report a burst while the unread count update is reconciling", () => {
    expect(providerSource).toContain("Math.max(unreadCount, quietPresentation.count)");
  });
});
