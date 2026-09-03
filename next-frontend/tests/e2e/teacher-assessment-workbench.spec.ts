import { expect, test } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';
import { resolveTeacherAssessmentDetailUrl } from './helpers/seeded-routes';

test('teacher assessment workbench stays clear, readable, and keyboard accessible', async ({ page }) => {
  test.skip(
    missingRoleCredentials('teacher'),
    'Set PLAYWRIGHT_TEACHER_EMAIL and PLAYWRIGHT_TEACHER_PASSWORD.',
  );

  const detailUrl = await resolveTeacherAssessmentDetailUrl();
  expect(
    detailUrl,
    'Seeded teacher data must include an assessment.',
  ).toBeTruthy();
  await loginAs(page, 'teacher');

  for (const viewport of [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 768, height: 1024, label: 'tablet' },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(detailUrl!);

    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Review & grade' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Scores' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to assignments' })).toHaveCount(1);

    for (const tabName of ['Overview', 'Review & grade', 'Scores']) {
      await page.getByRole('tab', { name: tabName, exact: true }).click();
      const layout = await page.evaluate(() => {
        const readableElements = Array.from(document.querySelectorAll<HTMLElement>(
          '.teacher-assessment-detail h1, .teacher-assessment-detail h2, .teacher-assessment-detail h3, .teacher-assessment-detail p, .teacher-assessment-detail th, .teacher-assessment-detail td, .teacher-assessment-detail button, .teacher-assessment-detail a, .teacher-assessment-detail label, .teacher-assessment-detail summary',
        )).filter((element) => {
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && element.textContent?.trim();
        });
        return {
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          minimumTextSize: Math.min(
            ...readableElements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
          ),
        };
      });

      expect(layout.documentOverflow, `${viewport.label} ${tabName} document overflow`).toBeLessThanOrEqual(1);
      expect(layout.minimumTextSize, `${viewport.label} ${tabName} readable text size`).toBeGreaterThanOrEqual(14);
    }
  }

  const reviewTab = page.getByRole('tab', { name: 'Review & grade' });
  await reviewTab.focus();
  await expect(reviewTab).toBeFocused();
  await reviewTab.press('Enter');
  await expect(reviewTab).toHaveAttribute('aria-selected', 'true');
});
