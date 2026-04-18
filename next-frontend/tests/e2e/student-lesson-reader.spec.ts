import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';

const lessonReaderUrl = process.env.PLAYWRIGHT_STUDENT_LESSON_URL;

test('opens the student lesson reader and captures the structured reading view', async ({ page }) => {
  test.skip(
    missingRoleCredentials('student') || !lessonReaderUrl,
    'Set PLAYWRIGHT_STUDENT_EMAIL, PLAYWRIGHT_STUDENT_PASSWORD, and PLAYWRIGHT_STUDENT_LESSON_URL.',
  );

  await loginAs(page, 'student');
  await page.goto(lessonReaderUrl!);

  await expect(page.getByText(/lesson outline/i)).toBeVisible();
  await expect(page.getByText(/checkpoint/i)).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath('student-lesson-reader.png'),
    fullPage: true,
  });
});
