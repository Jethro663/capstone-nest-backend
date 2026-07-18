import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials, persistSession } from './helpers/auth';
import { resolveStudentLessonUrl } from './helpers/seeded-routes';

test('opens the student lesson reader and captures the structured reading view', async ({ page }) => {
  const lessonReaderUrl = await resolveStudentLessonUrl();
  test.skip(
    missingRoleCredentials('student') || !lessonReaderUrl,
    'Set PLAYWRIGHT_STUDENT_EMAIL and PLAYWRIGHT_STUDENT_PASSWORD. Optionally set PLAYWRIGHT_STUDENT_LESSON_URL.',
  );

  await loginAs(page, 'student');
  await page.goto(lessonReaderUrl!);

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /back to (module|path)/i })).toBeVisible();
  await expect(page.getByLabel('Lesson details')).toBeVisible();
  await expect(page.locator('.student-module-view__reader')).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath('student-lesson-reader.png'),
    fullPage: true,
  });
  await persistSession(page, 'student');
});
