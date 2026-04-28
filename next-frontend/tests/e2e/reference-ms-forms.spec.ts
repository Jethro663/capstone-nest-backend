import { test, expect } from '@playwright/test';

test('captures microsoft forms reference surface', async ({ page }) => {
  await page.goto(
    'https://support.microsoft.com/en-us/office/create-a-form-with-microsoft-forms-4ffb64cc-7d5d-402f-b82e-b1d49418fd9d',
  );

  await expect(
    page.getByRole('heading', { name: /create a form with microsoft forms/i }),
  ).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath('ms-forms-reference.png'),
    fullPage: true,
  });
});
