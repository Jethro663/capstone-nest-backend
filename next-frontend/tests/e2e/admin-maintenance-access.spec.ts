import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "compact", width: 390, height: 844 },
] as const;

async function mockMaintenance(page: Page) {
  const state: { active: boolean; openedWith?: Record<string, unknown> } = {
    active: false,
  };
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: "mock-session",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    let data: unknown = {};
    let status = 200;
    if (path === "/auth/refresh") data = { accessToken: "mock-token" };
    else if (path === "/auth/me")
      data = {
        user: {
          id: "admin-id",
          email: "admin@school.test",
          firstName: "School",
          lastName: "Administrator",
          roles: ["admin"],
        },
      };
    else if (path === "/academic-state/current") status = 503;
    else if (path === "/admin/maintenance/session") {
      if (request.method() === "POST") {
        state.active = true;
        state.openedWith = request.postDataJSON();
        status = 201;
      } else if (request.method() === "DELETE") {
        state.active = false;
      }
      const now = new Date();
      data = {
        available: true,
        active: state.active,
        state: state.active ? "active" : "inactive",
        mode: state.active ? "manual" : null,
        sessionId: state.active ? "maintenance-session" : null,
        serverTime: now.toISOString(),
        startedAt: state.active ? now.toISOString() : null,
        expiresAt: null,
        reason: state.active ? "Prepare evaluator walkthrough." : null,
        scopeCodes: state.active
          ? ["ACADEMIC_STRUCTURE", "ROSTER", "ACCOUNT_LIFECYCLE"]
          : [],
        rules: [
          {
            code: "schedule_collision",
            label: "Schedule collision warning",
            description: "Save an overlapping schedule after review.",
          },
        ],
        protectedRules: [
          {
            code: "finalized_and_locked_workbooks",
            label: "Finalized and locked workbooks",
            description: "Finalized evidence stays protected.",
          },
        ],
      };
    } else if (path.includes("notifications")) {
      data = { notifications: [], items: [], unreadCount: 0, total: 0 };
    }
    await route.fulfill({
      status,
      json: {
        success: status < 400,
        message: status < 400 ? "" : "Unavailable in browser fixture",
        data,
      },
    });
  });
  await page.route("**/socket.io/**", (route) => route.abort());
  return state;
}

for (const viewport of viewports) {
  test(`opens and closes actor-bound Maintenance Access at ${viewport.name} width`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const state = await mockMaintenance(page);
    await page.setViewportSize(viewport);
    await page.goto("/dashboard/admin/system-settings/maintenance-access");

    const openButton = page.getByRole("switch", {
      name: "Turn on Maintenance Access",
    });
    await expect(openButton).toBeDisabled();
    await page.getByLabel("Reason").fill("Prepare evaluator walkthrough.");
    await page.getByLabel("Current password").fill("mock-password");
    await page
      .getByLabel("Type OPEN MAINTENANCE ACCESS")
      .fill("OPEN MAINTENANCE ACCESS");
    const acknowledgements = page.getByRole("checkbox");
    await expect(acknowledgements).toHaveCount(2);
    await acknowledgements.nth(0).check();
    await acknowledgements.nth(1).check();
    await expect(openButton).toBeEnabled();
    await openButton.click();

    await expect(
      page.getByRole("heading", { name: "Maintenance Access is ON" }),
    ).toBeVisible();
    expect(state.openedWith).toEqual({
      currentPassword: "mock-password",
      confirmation: "OPEN MAINTENANCE ACCESS",
      reason: "Prepare evaluator walkthrough.",
      acknowledgements: [
        "LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE",
        "FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED",
      ],
    });
    await expect(page.getByLabel("Current password")).toHaveCount(0);

    await page
      .getByRole("switch", { name: "Turn off Maintenance Access" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Maintenance Access is OFF" }),
    ).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("retired Demo Mode URL redirects to Maintenance Access", async ({
  page,
}) => {
  await mockMaintenance(page);
  await page.goto("/dashboard/admin/system-settings/demo-mode");
  await expect(page).toHaveURL(
    /\/dashboard\/admin\/system-settings\/maintenance-access$/,
  );
});
