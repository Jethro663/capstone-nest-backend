import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';

const editorUrl = process.env.PLAYWRIGHT_ADMIN_ASSESSMENT_EDIT_URL;

test('opens the admin assessment composer and captures a screenshot', async ({ page }) => {
  test.skip(
    missingRoleCredentials('admin') || !editorUrl,
    'Set PLAYWRIGHT_ADMIN_EMAIL, PLAYWRIGHT_ADMIN_PASSWORD, and PLAYWRIGHT_ADMIN_ASSESSMENT_EDIT_URL.',
  );

  await loginAs(page, 'admin');
  await page.goto(editorUrl!);

  await expect(page.getByText(/template assessment studio/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /preview/i })).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath('admin-assessment-composer.png'),
    fullPage: true,
  });
});
