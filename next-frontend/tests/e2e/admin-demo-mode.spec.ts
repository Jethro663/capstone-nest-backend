import { expect, test } from "@playwright/test";
import { loginAs, missingRoleCredentials } from "./helpers/auth";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "compact", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`gates, activates, navigates, and deactivates Demo mode at ${viewport.name} width`, async ({
    page,
  }) => {
    test.skip(
      missingRoleCredentials("admin"),
      "Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD.",
    );
    await page.setViewportSize(viewport);
    await loginAs(page, "admin");
    await page.goto("/dashboard/admin/system-settings/demo-mode");

    const activeHeading = page.getByRole("heading", {
      name: "Demo mode is active",
    });
    if (await activeHeading.isVisible().catch(() => false)) {
      await page.getByLabel("Type DISABLE DEMO MODE").fill("DISABLE DEMO MODE");
      await page.getByRole("button", { name: "Deactivate Demo mode" }).click();
      await expect(
        page.getByRole("heading", { name: "Demo mode is off" }),
      ).toBeVisible();
    }

    const activate = page.getByRole("button", { name: "Activate Demo mode" });
    await expect(activate).toBeDisabled();
    await page.getByLabel("Window length").selectOption("15");
    await page
      .getByLabel("Reason for Demo mode")
      .fill("Verify the governed presentation workflow.");
    await page.getByLabel("Current password").fill("wrong-password");
    await page.getByLabel("Type ENABLE DEMO MODE").fill("ENABLE DEMO MODE");

    const acknowledgements = page.getByRole("checkbox");
    await expect(acknowledgements).toHaveCount(3);
    await acknowledgements.nth(0).check();
    await acknowledgements.nth(1).check();
    await expect(activate).toBeDisabled();
    await acknowledgements.nth(2).check();
    await expect(activate).toBeEnabled();

    await activate.click();
    await expect(
      page.getByText(/current password is incorrect/i),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Demo mode is off" }),
    ).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveValue("");

    await page
      .getByLabel("Current password")
      .fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!);
    await activate.click();
    await expect(activeHeading).toBeVisible();
    await expect(
      page.getByText(/Demo mode is active for the selected window/i),
    ).toBeVisible();

    await page.goto("/dashboard/admin/users");
    await expect(page.getByText("Demo mode is active.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Manage Demo mode" }),
    ).toBeVisible();
    await page.goto("/dashboard/admin/classes");
    await expect(page.getByText("Demo mode is active.")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\/admin\/users/);
    await expect(page.getByText("Demo mode is active.")).toBeVisible();

    await page.getByRole("link", { name: "Manage Demo mode" }).click();
    await expect(activeHeading).toBeVisible();
    await page.getByLabel("Type DISABLE DEMO MODE").fill("DISABLE DEMO MODE");
    await page.getByRole("button", { name: "Deactivate Demo mode" }).click();
    await expect(
      page.getByRole("heading", { name: "Demo mode is off" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Normal workflow safeguards are active/i),
    ).toBeVisible();
    await expect(page.getByText("Demo mode is active.")).toHaveCount(0);

    if (viewport.name === "compact") {
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
    }
  });
}
