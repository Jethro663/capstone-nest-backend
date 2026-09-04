import { resolveCampusLoginLayout } from "../campus-login-layout";

describe("campus login layout", () => {
  it("uses a shallow stacked hero on a small portrait phone", () => {
    expect(
      resolveCampusLoginLayout({
        width: 320,
        height: 568,
        keyboardVisible: false,
      }),
    ).toEqual({ mode: "stacked", compact: true, heroHeight: 190 });
  });

  it("uses the full stacked entrance on a normal portrait phone", () => {
    expect(
      resolveCampusLoginLayout({
        width: 390,
        height: 844,
        keyboardVisible: false,
      }),
    ).toEqual({ mode: "stacked", compact: false, heroHeight: 320 });
  });

  it("collapses the stacked hero while the keyboard is visible", () => {
    expect(
      resolveCampusLoginLayout({
        width: 390,
        height: 844,
        keyboardVisible: true,
      }),
    ).toEqual({ mode: "stacked", compact: true, heroHeight: 118 });
  });

  it("uses split mode at the tablet threshold", () => {
    expect(
      resolveCampusLoginLayout({
        width: 768,
        height: 1024,
        keyboardVisible: false,
      }),
    ).toEqual({ mode: "split", compact: false, heroHeight: 1024 });
  });
});
