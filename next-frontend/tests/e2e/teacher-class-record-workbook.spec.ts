import { expect, test, type Page } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';
import { resolveTeacherClassRecordUrl } from './helpers/seeded-routes';

async function expectResponsiveGradeGrid(page: Page, viewportLabel: string) {
  const gradeGrid = page.getByTestId('class-record-grade-grid');
  const gridScroll = page.getByTestId('class-record-grid-scroll');
  await expect(gradeGrid).toBeVisible();
  await expect(gridScroll).toBeVisible();

  const layout = await page.evaluate(() => {
    const scroll = document.querySelector<HTMLElement>(
      '[data-testid="class-record-grid-scroll"]',
    );
    const table = scroll?.querySelector('table');
    const learner = table?.querySelector<HTMLElement>('thead th:first-child');
    const finalGrade = table?.querySelector<HTMLElement>(
      'thead tr:first-child th:last-child',
    );
    if (!scroll || !table || !learner || !finalGrade) return null;
    const textSizes = Array.from(
      table.querySelectorAll<HTMLElement>('th, td, button, small'),
    ).map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    return {
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      gridOverflow: getComputedStyle(scroll).overflowX,
      gridCanScroll: scroll.scrollWidth > scroll.clientWidth,
      learnerPosition: getComputedStyle(learner).position,
      learnerLeft: getComputedStyle(learner).left,
      finalGradePosition: getComputedStyle(finalGrade).position,
      minimumTextSize: Math.min(...textSizes),
    };
  });

  expect(layout, `${viewportLabel} grade grid must be measurable`).not.toBeNull();
  expect(layout!.documentOverflow, `${viewportLabel} document overflow`).toBeLessThanOrEqual(1);
  expect(layout!.gridOverflow).toBe('auto');
  expect(layout!.learnerPosition).toBe('sticky');
  expect(layout!.learnerLeft).toBe('0px');
  expect(layout!.minimumTextSize).toBeGreaterThanOrEqual(14);
  expect(layout!.finalGradePosition).toBe(
    viewportLabel === 'desktop' ? 'sticky' : 'static',
  );

  if (layout!.gridCanScroll) {
    const moved = await gridScroll.evaluate((element) => {
      element.scrollLeft = 120;
      return element.scrollLeft;
    });
    expect(moved, `${viewportLabel} grid owns horizontal scrolling`).toBeGreaterThan(0);
  }
}

test('teacher class-detail gradebook stays readable, scroll-contained and keyboard accessible', async ({
  page,
}) => {
  test.skip(
    missingRoleCredentials('teacher'),
    'Set PLAYWRIGHT_TEACHER_EMAIL and PLAYWRIGHT_TEACHER_PASSWORD.',
  );

  const classRecordUrl = await resolveTeacherClassRecordUrl();
  expect(
    classRecordUrl,
    'Seeded teacher data must include a class with a class record.',
  ).toBeTruthy();
  await loginAs(page, 'teacher');

  for (const viewport of [
    { width: 1440, height: 900, label: 'desktop' },
    { width: 768, height: 1024, label: 'tablet' },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(classRecordUrl!);
    await expect(page.getByRole('tab', { name: 'Grades' })).toBeVisible();
    await expectResponsiveGradeGrid(page, viewport.label);
  }

  const search = page.getByRole('searchbox', { name: 'Search learners' });
  await search.focus();
  await expect(search).toBeFocused();

  const filter = page.getByLabel('Filter learners');
  await filter.focus();
  await expect(filter).toBeFocused();

  const density = page.getByRole('button', { name: 'Use compact rows' });
  await density.focus();
  await expect(density).toBeFocused();
  await density.press('Enter');
  await expect(page.getByTestId('class-record-grade-grid')).toHaveAttribute(
    'data-density',
    'compact',
  );

  const scoreEntry = page
    .locator('[data-testid="class-record-grade-grid"] tbody button:not([disabled])')
    .first();
  expect(
    await scoreEntry.count(),
    'Seeded class record must expose an editable score cell.',
  ).toBeGreaterThan(0);
  await scoreEntry.focus();
  await expect(scoreEntry).toBeFocused();
  await scoreEntry.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
});
