import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';

const assessmentEditorUrl = process.env.PLAYWRIGHT_TEACHER_ASSESSMENT_EDIT_URL;

test('opens the teacher assessment editor and captures the composer surface', async ({ page }) => {
  test.skip(
    missingRoleCredentials('teacher') || !assessmentEditorUrl,
    'Set PLAYWRIGHT_TEACHER_EMAIL, PLAYWRIGHT_TEACHER_PASSWORD, and PLAYWRIGHT_TEACHER_ASSESSMENT_EDIT_URL.',
  );

  await loginAs(page, 'teacher');
  await page.goto(assessmentEditorUrl!);

  await expect(page.getByText(/questions/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /save/i })).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath('teacher-assessment-editor.png'),
    fullPage: true,
  });
});
