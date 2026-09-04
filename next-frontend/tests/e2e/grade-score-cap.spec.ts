import { expect, test, type Page } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';

const IDS = {
  class: 'a3000000-0000-0000-0000-000000000001',
  assessment: 'a4000000-0000-0000-0000-000000000001',
  attempt: 'a7000000-0000-0000-0000-000000000001',
};

async function expectNoOverflowingPercentages(page: Page) {
  const percentages = await page.locator('body').evaluate((body) => {
    const matches = (body.textContent ?? '').match(/-?\d+(?:\.\d+)?\s*%/g) ?? [];
    return matches.map((value) => Number.parseFloat(value));
  });

  expect(percentages.length, 'the page should expose percentage evidence').toBeGreaterThan(0);
  for (const percentage of percentages) {
    expect(percentage, `displayed percentage ${percentage}% must be non-negative`).toBeGreaterThanOrEqual(0);
    expect(percentage, `displayed percentage ${percentage}% must be capped`).toBeLessThanOrEqual(100);
  }

  await expect(page.getByText(/(?:200|331)%/)).toHaveCount(0);
}

test('teacher sees separate bonus evidence and capped full credit', async ({ page }) => {
  test.skip(
    missingRoleCredentials('teacher'),
    'Set PLAYWRIGHT_TEACHER_EMAIL and PLAYWRIGHT_TEACHER_PASSWORD.',
  );

  await loginAs(page, 'teacher');
  await page.goto(`/dashboard/teacher/assessments/${IDS.assessment}`);
  await expect(page.getByRole('heading', { name: 'Ten-point cap check' })).toBeVisible();
  await page.getByRole('tab', { name: 'Review & grade' }).click();

  await expect(page.getByText('10/10 pts', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      '+15 bonus (capped at full credit) — Teacher correction after review',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
  await expectNoOverflowingPercentages(page);
});

test('student sees capped percentage, effective points, and bonus reason', async ({ page }) => {
  test.skip(
    missingRoleCredentials('student'),
    'Set PLAYWRIGHT_STUDENT_EMAIL and PLAYWRIGHT_STUDENT_PASSWORD.',
  );

  await loginAs(page, 'student');
  await page.goto(
    `/dashboard/student/assessments/${IDS.assessment}/results/${IDS.attempt}`,
  );

  await expect(page.getByRole('heading', { name: 'Ten-point cap check' })).toBeVisible();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await expect(page.getByText('10/10 pts', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      '+15 bonus (capped at full credit) — Teacher correction after review',
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoOverflowingPercentages(page);
});

test('admin workbook uses capped effective points and a bounded final grade', async ({ page }) => {
  test.skip(
    missingRoleCredentials('admin'),
    'Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD.',
  );

  await loginAs(page, 'admin');
  await page.goto(`/dashboard/admin/academic-records/${IDS.class}`);

  await expect(page.getByRole('heading', { name: 'Academic records' })).toBeVisible();
  const gradeGrid = page.getByTestId('class-record-grade-grid');
  await expect(gradeGrid).toBeVisible();
  await expect(
    gradeGrid.getByRole('button', {
      name: 'Ana Fixture, Ten-point cap check: 10 (+15)',
    }),
  ).toBeVisible();
  await expect(gradeGrid.getByText('100', { exact: true }).last()).toBeVisible();
  await expectNoOverflowingPercentages(page);
});
