import { test, expect } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';
import { resolveTeacherLessonEditUrl } from './helpers/seeded-routes';

test('opens the teacher lesson editor and captures the structured authoring surface', async ({ page }) => {
  const lessonEditorUrl = await resolveTeacherLessonEditUrl();
  test.skip(
    missingRoleCredentials('teacher') || !lessonEditorUrl,
    'Set PLAYWRIGHT_TEACHER_EMAIL and PLAYWRIGHT_TEACHER_PASSWORD. Optionally set PLAYWRIGHT_TEACHER_LESSON_EDIT_URL.',
  );

  await loginAs(page, 'teacher');
  await page.goto(lessonEditorUrl!);

  await expect(page.getByText(/body paragraph/i)).toBeVisible();
  await expect(page.getByText(/learning objectives/i)).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath('teacher-lesson-editor.png'),
    fullPage: true,
  });
});
