import { existsSync } from "node:fs";
import path from "node:path";

const modulePath = path.resolve(__dirname, "../quiet-notification-presentation.ts");

function loadPresentationModule() {
  expect(existsSync(modulePath)).toBe(true);
  return require("../quiet-notification-presentation") as {
    EMPTY_QUIET_NOTIFICATION_PRESENTATION: { visible: boolean; count: number };
    addQuietNotifications: (
      state: { visible: boolean; count: number },
      incoming: number,
    ) => { visible: boolean; count: number };
    dismissQuietNotifications: () => { visible: boolean; count: number };
  };
}

describe("quiet notification presentation", () => {
  it("aggregates every incoming event into one visible summary", () => {
    const { EMPTY_QUIET_NOTIFICATION_PRESENTATION, addQuietNotifications } = loadPresentationModule();

    const firstBurst = addQuietNotifications(EMPTY_QUIET_NOTIFICATION_PRESENTATION, 3);
    const secondBurst = addQuietNotifications(firstBurst, 2);

    expect(secondBurst).toEqual({ visible: true, count: 5 });
  });

  it("resets the one summary when it is dismissed", () => {
    const { addQuietNotifications, dismissQuietNotifications } = loadPresentationModule();

    expect(addQuietNotifications({ visible: false, count: 0 }, 4)).toEqual({ visible: true, count: 4 });
    expect(dismissQuietNotifications()).toEqual({
      visible: false,
      count: 0,
    });
  });

  it("ignores empty and invalid incoming counts", () => {
    const { addQuietNotifications } = loadPresentationModule();
    const current = { visible: true, count: 2 };

    expect(addQuietNotifications(current, 0)).toBe(current);
    expect(addQuietNotifications(current, -3)).toBe(current);
    expect(addQuietNotifications(current, Number.NaN)).toBe(current);
  });
});
