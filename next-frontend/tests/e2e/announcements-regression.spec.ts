import { expect, test } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';

test('teacher All Classes loads the aggregate announcement feed', async ({ page }) => {
  test.skip(missingRoleCredentials('teacher'), 'Set teacher Playwright credentials.');

  await loginAs(page, 'teacher');
  const feedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      /\/api\/teacher\/announcements(?:\?|$)/.test(response.url()),
  );
  await page.goto('/dashboard/teacher/announcements');

  await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveValue('');
  expect((await feedResponse).ok()).toBe(true);
  await expect(page.getByRole('button', { name: /create announcement/i })).toBeDisabled();
});

test('admin Create button keeps visible computed colors through the modal flow', async ({ page }) => {
  test.skip(missingRoleCredentials('admin'), 'Set admin Playwright credentials.');

  await loginAs(page, 'admin');
  await page.goto('/dashboard/admin/announcements');

  const classSelect = page.getByRole('combobox');
  const optionCount = await classSelect.locator('option').count();
  test.skip(optionCount < 2, 'The admin account has no class available for this smoke test.');
  await classSelect.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'New Announcement' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveClass(/admin-dialog/);
  const create = dialog.getByRole('button', { name: 'Create' });
  await expect(create).toBeDisabled();

  await dialog.locator('input').first().fill('Contrast smoke test');
  await dialog.locator('[contenteditable="true"]').first().fill('Do not submit this announcement.');
  await expect(create).toBeEnabled();

  const colors = await create.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, color: style.color };
  });
  expect(colors.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(colors.backgroundColor).not.toBe(colors.color);
});
