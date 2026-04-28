import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';
import { resolveAdminTemplateWorkspaceUrl } from './helpers/seeded-routes';

test('runs admin template export -> validate -> import from template workspace', async ({
  page,
}) => {
  const templateWorkspaceUrl = await resolveAdminTemplateWorkspaceUrl();
  test.skip(
    missingRoleCredentials('admin') || !templateWorkspaceUrl,
    'Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD. Optionally set PLAYWRIGHT_ADMIN_TEMPLATE_WORKSPACE_URL.',
  );

  await loginAs(page, 'admin');
  await page.goto(templateWorkspaceUrl!);
  await page.getByTestId('workspace-tab-template').click();

  await expect(
    page.getByRole('button', { name: /export template yaml/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /export template yaml/i }).click();

  const manifestArea = page.locator('textarea').first();
  await expect(manifestArea).toBeVisible();
  await expect(manifestArea).not.toHaveValue('');

  await page.getByRole('button', { name: /validate import/i }).click();
  await expect(page.getByText(/Validation:\s+(Valid|Invalid)/i)).toBeVisible();

  await page.getByRole('button', { name: /import template/i }).click();
  await expect(
    page.getByText(/Template manifest imported|Template engine imported/i),
  ).toBeVisible();
});
