import { test, expect, type Page } from "@playwright/test";

const settings = "/dashboard/admin/system-settings";
const actor = {
  id: "admin-id",
  email: "admin@school.test",
  displayName: "School administrator",
};
const acknowledgements = [
  {
    code: "OTHER_ACCOUNTS_REMOVED",
    label: "All other accounts will be removed.",
  },
  {
    code: "SCHOOL_CONTENT_REMOVED",
    label: "All school content, including my own, will be removed.",
  },
  {
    code: "FILES_AND_INDEXES_REMOVED",
    label: "Uploaded files, indexes and jobs will be cleared.",
  },
  {
    code: "AUDIT_AND_SETTINGS_RETAINED",
    label: "Audit history and system settings will remain.",
  },
  { code: "SIGN_IN_AGAIN", label: "I must sign in again after the reset." },
];
const policy = {
  id: "test-policy",
  schoolYear: "2026-2027",
  periods: [{ key: "T1", label: "Term 1" }],
};

async function mockReset(page: Page) {
  const state = {
    operationId: "",
    completed: false,
    refreshAfterAcceptance: 0,
    executeCount: 0,
  };
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: "mock-session",
      domain: "localhost",
      path: "/",
    },
  ]);
  // Every API call is intercepted; these tests never send a reset to any backend.
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    let data: unknown = {};
    let status = 200;
    if (path === "/auth/refresh") {
      if (state.operationId) {
        state.refreshAfterAcceptance++;
        status = 401;
      }
      data = { accessToken: "mock-access-token" };
    } else if (path === "/auth/me")
      data = {
        user: {
          ...actor,
          firstName: "School",
          lastName: "Administrator",
          roles: ["admin"],
        },
      };
    else if (path === "/academic-state/current") {
      await route.fulfill({
        status: 503,
        json: { success: false, message: "Academic state unavailable" },
      });
      return;
    } else if (path === "/admin/system-reset")
      data = {
        available: true,
        active: false,
        operationId: null,
        phase: null,
        environment: "isolated test",
        blockers: [],
        retainedAdmin: actor,
        acknowledgements,
      };
    else if (path === "/admin/system-reset/policy") data = { policy };
    else if (path === "/admin/system-reset/preview")
      data = {
        actor,
        environment: "isolated test",
        schoolYear: "2026-2027",
        period: "T1",
        policy,
        counts: { users: 12 },
        confirmation: "RESET SCHOOL DATA 2026-2027",
        previewToken: "mock-preview-token",
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        tables: [
          {
            name: "users",
            action: "administrator",
            count: 12,
            group: "accounts",
          },
        ],
      };
    else if (path === "/admin/system-reset/execute") {
      state.operationId = route.request().postDataJSON().idempotencyKey;
      state.executeCount++;
      status = 202;
      data = {
        operationId: state.operationId,
        phase: "draining",
        status: "running",
        acceptedAt: new Date().toISOString(),
      };
    } else if (path === "/system-maintenance")
      data = {
        active: !!state.operationId && !state.completed,
        operationId: state.operationId || null,
        phase: state.completed ? "complete" : "cleanup",
        status: state.completed
          ? "completed"
          : state.operationId
            ? "running"
            : "idle",
        retrying: false,
      };
    else if (path.includes("demo-mode"))
      data = {
        active: false,
        available: false,
        serverTime: new Date().toISOString(),
      };
    else if (path.includes("notifications"))
      data = { notifications: [], items: [], unreadCount: 0, total: 0 };
    await route.fulfill({
      status,
      json: { success: status < 400, message: "", data },
    });
  });
  await page.route("**/socket.io/**", (route) => route.abort());
  return state;
}

test("review and accepted progress survive invalidated auth on desktop and narrow layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await mockReset(page);
  await page.goto(settings);
  await expect(
    page.getByRole("link", { name: /Reset school data Review/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Review or change the active period/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Reset school data Review/ }).click();
  await page.getByLabel("School year", { exact: true }).fill("2026-2027");
  await expect(page.getByRole("option", { name: "Term 1" })).toBeAttached();
  await page.getByLabel("Starting grading period").selectOption("T1");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText("11 other accounts")).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("reset-review-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath("reset-review-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Reason for reset")
    .fill("Restart the supervised school testing run");
  await page
    .getByLabel("Current password", { exact: true })
    .fill("mock-password");
  for (const item of acknowledgements)
    await page.getByLabel(item.label, { exact: true }).check();
  await page
    .getByLabel("Type the confirmation phrase")
    .fill("RESET SCHOOL DATA 2026-2027");
  await page
    .getByRole("button", { name: "Reset school data permanently" })
    .click();
  await expect(page).toHaveURL(/\/system-maintenance\?operation=/);
  await expect(
    page.getByText("Clearing school data, files, indexes and jobs"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Clearing school data, files, indexes and jobs"),
  ).toBeVisible();
  const saved = await page.evaluate(() => ({ ...localStorage }));
  expect(saved["nexora.systemReset.operationId"]).toBe(state.operationId);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("nexora.systemReset.operationId"),
    ),
  ).toBeNull();
  expect(JSON.stringify(saved)).not.toMatch(
    /mock-password|mock-preview-token|Restart the supervised/,
  );
  await page.evaluate(() => {
    localStorage.setItem("assignment-creation:v1:teacher:class", "old");
    localStorage.setItem("assessment-create-pending:class", "old");
    localStorage.setItem("class-template-editor:template:draft", "old");
    localStorage.setItem("teacher-ai-draft-jobs:class", "old");
    localStorage.setItem("teacher-extraction-jobs:class", "old");
    localStorage.setItem("nexora:notification-surface:v1:admin", "old");
    localStorage.setItem("nexora.adminSidebarCollapsed", "true");
    sessionStorage.setItem(
      "nexora.teacherPendingInterventionCount:teacher",
      "4",
    );
  });
  state.completed = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(
    page.getByRole("heading", { name: "School data reset complete" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("reset-completed-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => ({
      reset: localStorage.getItem("nexora.systemReset.operationId"),
      assessment: localStorage.getItem(
        "assignment-creation:v1:teacher:class",
      ),
      legacyAssessment: localStorage.getItem(
        "assessment-create-pending:class",
      ),
      template: localStorage.getItem(
        "class-template-editor:template:draft",
      ),
      ai: localStorage.getItem("teacher-ai-draft-jobs:class"),
      extraction: localStorage.getItem("teacher-extraction-jobs:class"),
      notifications: localStorage.getItem(
        "nexora:notification-surface:v1:admin",
      ),
      teacherCount: sessionStorage.getItem(
        "nexora.teacherPendingInterventionCount:teacher",
      ),
      preference: localStorage.getItem("nexora.adminSidebarCollapsed"),
    })),
  ).toEqual({
    reset: null,
    assessment: null,
    legacyAssessment: null,
    template: null,
    ai: null,
    extraction: null,
    notifications: null,
    teacherCount: null,
    preference: "true",
  });
  expect(state.executeCount).toBe(1);
  expect(state.refreshAfterAcceptance).toBe(0);
  expect(errors).toEqual([]);
});

test("direct reset entry returns to settings and public status does not require a cookie", async ({
  page,
}) => {
  await mockReset(page);
  await page.goto(settings);
  await page.goto(`${settings}/academic-year`);
  await page
    .getByRole("link", { name: "Reset school data", exact: true })
    .click();
  await page.getByRole("button", { name: "Back to settings" }).click();
  await expect(page).toHaveURL(new RegExp(`${settings}/academic-year$`));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${settings}$`));
  await page.goto(`${settings}/reset-school-data`);
  await page.getByRole("button", { name: "Back to settings" }).click();
  await expect(page).toHaveURL(new RegExp(`${settings}$`));
  await page.context().clearCookies();
  await page.goto("/system-maintenance");
  await expect(
    page.getByRole("heading", { name: "School data reset status" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No active maintenance is reported/),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/system-maintenance$/);
});
