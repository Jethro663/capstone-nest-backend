import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';
import { resolveTeacherAssessmentEditUrl } from './helpers/seeded-routes';

test('opens the teacher assessment editor and captures the composer surface', async ({ page }) => {
  const assessmentEditorUrl = await resolveTeacherAssessmentEditUrl();
  test.skip(
    missingRoleCredentials('teacher') || !assessmentEditorUrl,
    'Set PLAYWRIGHT_TEACHER_EMAIL and PLAYWRIGHT_TEACHER_PASSWORD. Optionally set PLAYWRIGHT_TEACHER_ASSESSMENT_EDIT_URL.',
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
