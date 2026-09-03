import { expect, test } from '@playwright/test';
import { loginAs, missingRoleCredentials } from './helpers/auth';

const classId = 'overview-class';
const studentId = 'overview-student-current';

function assessment(
  assessmentId: string,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    assessmentId,
    title,
    type: 'quiz',
    dueDate: '2030-09-20T08:00:00.000Z',
    status: 'not_started',
    statusLabel: 'Not Started',
    submittedAt: null,
    returnedAt: null,
    isLate: false,
    lateByMinutes: 0,
    score: null,
    directScore: null,
    totalPoints: 100,
    passed: null,
    isReturned: false,
    ...overrides,
  };
}

const overview = {
  classInfo: {
    id: classId,
    subjectName: 'Mathematics',
    subjectCode: 'MATH-10',
    sectionLabel: 'Grade 10 - Rizal',
  },
  student: {
    id: studentId,
    firstName: 'Jamie',
    middleName: null,
    lastName: 'Cruz',
    email: 'jamie.cruz@nexora.edu',
    status: 'ACTIVE',
    profile: {
      lrn: '123456789012',
      dateOfBirth: null,
      gender: null,
      phone: null,
      address: null,
      gradeLevel: '10',
      familyName: null,
      familyRelationship: null,
      familyContact: null,
      profilePicture: null,
    },
  },
  section: null,
  standing: {
    gradingPeriod: 'q1',
    overallGradePercent: 89.5,
    components: {
      writtenWorkPercent: 87,
      performanceTaskPercent: 91,
      quarterlyExamPercent: 90,
    },
  },
  history: {
    pending: Array.from({ length: 10 }, (_, index) =>
      assessment(`pending-${index + 1}`, `Pending assessment ${index + 1}`, {
        dueDate:
          index < 4
            ? `2020-09-${String(10 + index).padStart(2, '0')}T08:00:00.000Z`
            : index === 9
              ? null
              : `2030-09-${String(20 + index).padStart(2, '0')}T08:00:00.000Z`,
      }),
    ),
    late: [
      assessment('late-1', 'Late submission 1', {
        dueDate: '2020-08-10T08:00:00.000Z',
        status: 'late',
        statusLabel: 'Submitted Late',
        submittedAt: '2020-08-11T08:00:00.000Z',
        isLate: true,
        lateByMinutes: 1_440,
      }),
      assessment('late-2', 'Late submission 2', {
        dueDate: '2020-08-09T08:00:00.000Z',
        status: 'late',
        statusLabel: 'Submitted Late',
        submittedAt: '2020-08-10T08:00:00.000Z',
        isLate: true,
        lateByMinutes: 1_440,
      }),
    ],
    finished: [
      assessment('finished-1', 'Finished assessment 1', {
        dueDate: '2026-08-20T08:00:00.000Z',
        status: 'finished',
        statusLabel: 'Finished',
        submittedAt: '2026-08-19T08:00:00.000Z',
        score: 92,
      }),
      assessment('finished-2', 'Finished assessment 2', {
        dueDate: '2026-08-10T08:00:00.000Z',
        status: 'finished',
        statusLabel: 'Finished',
        submittedAt: '2026-08-09T08:00:00.000Z',
        score: 88,
      }),
    ],
  },
};

test('teacher can navigate the compact student overview on desktop and mobile', async ({
  page,
}) => {
  test.skip(
    missingRoleCredentials('teacher'),
    'Set PLAYWRIGHT_TEACHER_EMAIL and PLAYWRIGHT_TEACHER_PASSWORD.',
  );

  await loginAs(page, 'teacher');

  await page.route(
    `**/api/classes/${classId}/students/${studentId}/overview`,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok', data: overview }),
      }),
  );
  await page.route(`**/api/classes/${classId}/enrollments`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'ok',
        count: 3,
        data: [
          { id: 'enrollment-previous', studentId: 'student-previous', classId },
          { id: 'enrollment-current', studentId, classId },
          { id: 'enrollment-next', studentId: 'student-next', classId },
        ],
      }),
    }),
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/dashboard/teacher/classes/${classId}/students/${studentId}`);

  await expect(page.getByRole('heading', { name: 'Jamie Cruz' })).toBeVisible();
  await expect(page.getByText('Student 2 of 3')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page.getByText('Showing 1–10 of 12')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Previous student' })).toHaveAttribute(
    'href',
    `/dashboard/teacher/classes/${classId}/students/student-previous?history=attention&page=1`,
  );
  await expect(page.getByRole('link', { name: 'Next student' })).toHaveAttribute(
    'href',
    `/dashboard/teacher/classes/${classId}/students/student-next?history=attention&page=1`,
  );

  const railBox = await page.locator('.teacher-student-overview__learner-rail').boundingBox();
  const worklistBox = await page.locator('.teacher-student-overview__history-panel').boundingBox();
  expect(railBox).not.toBeNull();
  expect(worklistBox).not.toBeNull();
  expect(railBox!.height).toBeLessThan(worklistBox!.height);

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/history=attention&page=2/);
  await expect(page.getByText('Showing 11–12 of 12')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);

  await page.getByRole('tab', { name: /Finished/ }).click();
  await expect(page).toHaveURL(/history=finished&page=1/);
  await expect(page.getByText('Finished assessment 1')).toBeVisible();

  await page.getByRole('tab', { name: /Needs attention/ }).click();
  await expect(page).toHaveURL(/history=attention&page=1/);
  await page.setViewportSize({ width: 390, height: 844 });

  await expect(page.locator('tbody tr')).toHaveCount(10);
  const mobileRailBox = await page
    .locator('.teacher-student-overview__learner-rail')
    .boundingBox();
  const mobileWorklistBox = await page
    .locator('.teacher-student-overview__history-panel')
    .boundingBox();
  expect(mobileRailBox).not.toBeNull();
  expect(mobileWorklistBox).not.toBeNull();
  expect(mobileWorklistBox!.y).toBeGreaterThan(
    mobileRailBox!.y + mobileRailBox!.height,
  );
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
