import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import { loginAs, missingRoleCredentials, persistSession } from './helpers/auth';
import {
  resolveStudentLessonUrl,
  resolveTeacherAssessmentEditUrl,
} from './helpers/seeded-routes';

type RoleKey = 'admin' | 'teacher' | 'student';

type RuntimeEvidence = {
  allowedConsoleErrors: string[];
  allowedFailedResponses: string[];
  unexpectedConsoleErrors: string[];
  unexpectedFailedResponses: string[];
  pageErrors: string[];
};

const API_ORIGIN = process.env.PLAYWRIGHT_API_ORIGIN || 'http://127.0.0.1:3000';
const ROLE_MISMATCH_NOTICE = 'That page is not available for your account.';
const PERFORMANCE_DIAGNOSTICS_PATH =
  /\/api\/performance\/classes\/[^/]+\/diagnostics(?:\?|$)/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function roleCredentials(role: RoleKey) {
  const prefix = `PLAYWRIGHT_${role.toUpperCase()}`;
  return {
    email: process.env[`${prefix}_EMAIL`],
    password: process.env[`${prefix}_PASSWORD`],
  };
}

function isAllowedFailedResponse(response: Response) {
  return (
    response.status() === 500 &&
    PERFORMANCE_DIAGNOSTICS_PATH.test(response.url())
  );
}

function isAllowedConsoleError(page: Page, text: string, locationUrl: string) {
  const isGenericResourceFailure =
    /failed to load resource/i.test(text) && /status of 500|500 \(internal server error\)/i.test(text);

  return (
    PERFORMANCE_DIAGNOSTICS_PATH.test(locationUrl) ||
    (page.url().includes('/dashboard/teacher/performance') && isGenericResourceFailure)
  );
}

function attachRuntimeEvidence(page: Page): RuntimeEvidence {
  const evidence: RuntimeEvidence = {
    allowedConsoleErrors: [],
    allowedFailedResponses: [],
    unexpectedConsoleErrors: [],
    unexpectedFailedResponses: [],
    pageErrors: [],
  };

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const locationUrl = message.location().url || '';
    const rendered = `${text}${locationUrl ? ` @ ${locationUrl}` : ''}`;

    if (isAllowedConsoleError(page, text, locationUrl)) {
      evidence.allowedConsoleErrors.push(rendered);
      return;
    }

    evidence.unexpectedConsoleErrors.push(rendered);
  });

  page.on('pageerror', (error) => {
    evidence.pageErrors.push(error.message);
  });

  page.on('response', (response) => {
    if (response.status() < 400) return;
    const rendered = `${response.status()} ${response.request().method()} ${response.url()}`;

    if (isAllowedFailedResponse(response)) {
      evidence.allowedFailedResponses.push(rendered);
      return;
    }

    evidence.unexpectedFailedResponses.push(rendered);
  });

  return evidence;
}

function expectCleanRuntime(evidence: RuntimeEvidence) {
  expect(evidence.unexpectedConsoleErrors, 'Unexpected browser console errors').toEqual([]);
  expect(evidence.pageErrors, 'Uncaught browser page errors').toEqual([]);
  expect(evidence.unexpectedFailedResponses, 'Unexpected HTTP error responses').toEqual([]);
}

async function dismissLmsReminders(page: Page, waitMs = 0) {
  const dialog = page.getByRole('dialog', { name: 'LMS reminders' });
  const isVisible = waitMs > 0
    ? await dialog
        .waitFor({ state: 'visible', timeout: waitMs })
        .then(() => true)
        .catch(() => false)
    : await dialog.isVisible();
  if (!isVisible) return false;

  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toBeHidden();
  return true;
}

async function openRoute(page: Page, path: string) {
  await dismissLmsReminders(page);
  const currentPath = new URL(page.url()).pathname;
  if (currentPath === path) {
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}(?:\\?.*)?$`));
    return;
  }

  const routeLink = () => page.locator(`a[href="${path}"]`).filter({ visible: true }).first();
  let link = routeLink();

  if (!(await link.isVisible())) {
    const openSidebar = page.getByRole('button', { name: 'Open sidebar' }).first();
    if (await openSidebar.isVisible()) await openSidebar.click();

    const expandSidebar = page.getByRole('button', { name: 'Expand sidebar' }).first();
    if (await expandSidebar.isVisible()) await expandSidebar.click();
    await dismissLmsReminders(page, 1_500);

    const closedCategories = page.locator('aside button[aria-expanded="false"]');
    for (let attempts = 0; (await closedCategories.count()) > 0; attempts += 1) {
      expect(attempts, 'Sidebar category expansion must settle').toBeLessThan(12);
      await dismissLmsReminders(page);
      try {
        await closedCategories.first().click({ timeout: 2_000 });
      } catch (error) {
        if (!(await dismissLmsReminders(page, 500))) throw error;
      }
    }

    link = routeLink();
  }

  if (await link.isVisible()) {
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}(?:\\?.*)?$`));
    return;
  }

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `Expected a document response for ${path}`).not.toBeNull();
  expect(response!.status(), `Expected ${path} to return a successful document`).toBeLessThan(400);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}(?:\\?.*)?$`));
}

async function expectHeading(page: Page, name: string | RegExp) {
  await expect(page.getByRole('heading', { name }).first()).toBeVisible();
}

async function openSidebarRoute(
  page: Page,
  groupLabel: string,
  label: string,
  path: string,
) {
  await dismissLmsReminders(page, 1_500);
  const navigation = page.getByRole('navigation');
  const target = navigation.getByRole('button', { name: label, exact: true });
  if (!(await target.isVisible())) {
    await navigation
      .getByRole('button', { name: groupLabel, exact: true })
      .click();
  }
  await target.click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(path)}(?:\\?.*)?$`));
}

async function firstVisibleClassDetailHref(page: Page) {
  const links = page.locator('a[href^="/dashboard/student/classes/"]');
  const count = await links.count();

  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    if (await link.isVisible()) {
      return link.getAttribute('href');
    }
  }

  return null;
}

async function expectNoDocumentOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    dimensions.scrollWidth,
    `${label} must not overflow the document viewport`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function tabTo(page: Page, target: Locator, label: string) {
  await expect(target, `${label} must be visible before keyboard navigation`).toBeVisible();
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });

  let reached = false;
  for (let index = 0; index < 120; index += 1) {
    await page.keyboard.press('Tab');
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }

  expect(reached, `${label} must be reachable with the Tab key`).toBe(true);
  await expect(target).toBeFocused();

  const focusEvidence = await target.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      hasVisualIndicator:
        (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') ||
        (style.boxShadow !== 'none' && style.boxShadow !== ''),
    };
  });

  expect(focusEvidence.focusVisible, `${label} must match :focus-visible`).toBe(true);
  expect(focusEvidence.hasVisualIndicator, `${label} must render a visible focus indicator`).toBe(
    true,
  );
}

async function loginThroughApi(
  request: APIRequestContext,
  role: RoleKey,
) {
  const credentials = roleCredentials(role);
  expect(credentials.email, `Missing ${role} API-login email`).toBeTruthy();
  expect(credentials.password, `Missing ${role} API-login password`).toBeTruthy();

  const response = await request.post(`${API_ORIGIN}/api/auth/login`, {
    data: credentials,
  });
  expect(response.status(), `${role} API login must succeed`).toBe(200);
  const payload = await response.json();
  const token = payload?.data?.accessToken as string | undefined;
  expect(token, `${role} API login must return an access token`).toBeTruthy();
  return token!;
}

test.describe.configure({ mode: 'serial' });

test('admin baseline routes retain the Admin shell and controlled diagnostics state', async ({
  page,
}) => {
  test.skip(missingRoleCredentials('admin'), 'Admin browser credentials are required.');
  await loginAs(page, 'admin');
  const runtime = attachRuntimeEvidence(page);

  const routes: Array<[string, string | RegExp]> = [
    ['/dashboard/admin', 'Admin Dashboard'],
    ['/dashboard/admin/users', 'Users'],
    ['/dashboard/admin/classes', 'Classes'],
    ['/dashboard/admin/class-templates', 'Class Templates'],
    ['/dashboard/admin/diagnostics', 'Diagnostics'],
    ['/dashboard/admin/system-settings', 'System Settings'],
  ];

  for (const [path, heading] of routes) {
    await openRoute(page, path);
    await expectHeading(page, heading);
    if (path === '/dashboard/admin/diagnostics') {
      await expect(page.getByText('AI Service').first()).toBeVisible();
      await expect(page.getByText(/degraded|offline|healthy/i).first()).toBeVisible();
    }
  }

  expectCleanRuntime(runtime);
  await persistSession(page, 'admin');
});

test('teacher baseline and state-surface routes remain usable', async ({ page }) => {
  test.skip(missingRoleCredentials('teacher'), 'Teacher browser credentials are required.');
  const assessmentEditorUrl = await resolveTeacherAssessmentEditUrl();
  expect(
    assessmentEditorUrl,
    'Seed fixture must expose at least one assessment for the Teacher editor.',
  ).toBeTruthy();

  await loginAs(page, 'teacher');
  const runtime = attachRuntimeEvidence(page);

  await openRoute(page, '/dashboard/teacher/classes');
  await expectHeading(page, 'My Classes');

  await openRoute(page, '/dashboard/teacher/class-record');
  await expectHeading(page, 'Class Record');

  await openRoute(page, '/dashboard/teacher/assessments');
  await expectHeading(page, 'Assessments Across Your Active Classes');

  await openRoute(page, assessmentEditorUrl!);
  await expect(page.locator('.assessment-editor')).toBeVisible();
  await expect(page.getByRole('button', { name: /question details/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /save/i }).first()).toBeVisible();

  await openRoute(page, '/dashboard/teacher/interventions');
  await expectHeading(page, 'Interventions');

  await openRoute(page, '/dashboard/teacher/performance');
  await expectHeading(page, 'Performance Insights');
  if (runtime.allowedFailedResponses.some((entry) => entry.includes('/diagnostics'))) {
    await expect(page.getByText('Diagnostics temporarily unavailable')).toBeVisible();
    await expect(page.getByRole('button', { name: /retry diagnostics/i })).toBeVisible();
  }

  await openRoute(page, '/dashboard/teacher/calendar');
  await expectHeading(page, 'Calendar, events, announcements');

  await openRoute(page, '/dashboard/teacher/lessons');
  await expectHeading(page, 'Lessons Across Your Teaching Space');

  expectCleanRuntime(runtime);
  await persistSession(page, 'teacher');
});

test('student baseline and state-surface routes retain seeded class content', async ({ page }) => {
  test.skip(missingRoleCredentials('student'), 'Student browser credentials are required.');
  const lessonUrl = await resolveStudentLessonUrl();
  expect(lessonUrl, 'Seed fixture must expose at least one Student-visible lesson.').toBeTruthy();

  await loginAs(page, 'student');
  const runtime = attachRuntimeEvidence(page);

  await openRoute(page, '/dashboard/student');
  await expectHeading(page, 'Your Learning Hub');

  await openRoute(page, '/dashboard/student/courses');
  await expect(page.getByPlaceholder('Search class, section, or subject code')).toBeVisible();
  const classDetailHref = await firstVisibleClassDetailHref(page);
  expect(
    classDetailHref,
    'Seed fixture must expose a visible /dashboard/student/classes/ link from Courses.',
  ).toBeTruthy();

  await openRoute(page, '/dashboard/student/lxp');
  await expectHeading(page, 'My Paths');

  await openRoute(page, '/dashboard/student/performance');
  await expectHeading(page, 'Performance');

  await openRoute(page, lessonUrl!);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /back to (class|module|path)|back/i }).first()).toBeVisible();

  await openRoute(page, '/dashboard/student/announcements');
  await expectHeading(page, 'Announcements');

  await openRoute(page, '/dashboard/student/calendar');
  await expectHeading(page, 'Calendar');

  await openRoute(page, classDetailHref!);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /back to courses/i })).toBeVisible();

  expectCleanRuntime(runtime);
  await persistSession(page, 'student');
});

test('foreign role routes redirect once without ending the authenticated session', async ({
  browser,
}) => {
  const cases: Array<{
    role: RoleKey;
    foreignPath: string;
    targetPath: string;
    foreignHeading: string;
    validPath: string;
    validHeading: string;
  }> = [
    {
      role: 'admin',
      foreignPath: '/dashboard/student',
      targetPath: '/dashboard/admin',
      foreignHeading: 'Your Learning Hub',
      validPath: '/dashboard/admin/users',
      validHeading: 'Users',
    },
    {
      role: 'teacher',
      foreignPath: '/dashboard/admin',
      targetPath: '/dashboard/teacher/classes',
      foreignHeading: 'Admin Dashboard',
      validPath: '/dashboard/teacher/classes',
      validHeading: 'My Classes',
    },
    {
      role: 'student',
      foreignPath: '/dashboard/teacher/classes',
      targetPath: '/dashboard/student',
      foreignHeading: 'My Classes',
      validPath: '/dashboard/student/performance',
      validHeading: 'Performance',
    },
  ];

  for (const scenario of cases) {
    test.skip(
      missingRoleCredentials(scenario.role),
      `${scenario.role} browser credentials are required.`,
    );
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, scenario.role);
    const runtime = attachRuntimeEvidence(page);
    await page.goto(scenario.foreignPath, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(
      new RegExp(`${escapeRegExp(scenario.targetPath)}(?:\\?.*)?$`),
    );
    await expect(page.getByRole('heading', { name: scenario.foreignHeading })).toHaveCount(0);
    await expect(page.getByText(ROLE_MISMATCH_NOTICE)).toHaveCount(1);

    await openRoute(page, scenario.validPath);
    await expectHeading(page, scenario.validHeading);
    await expect(page).toHaveURL(
      new RegExp(`${escapeRegExp(scenario.validPath)}(?:\\?.*)?$`),
    );
    expectCleanRuntime(runtime);
    await persistSession(page, scenario.role);
    await context.close();
  }
});

test('Academic State read access is Teacher 200 and Student 403', async ({ request }) => {
  test.skip(
    missingRoleCredentials('teacher') || missingRoleCredentials('student'),
    'Teacher and Student API credentials are required.',
  );

  const teacherToken = await loginThroughApi(request, 'teacher');
  const teacherResponse = await request.get(`${API_ORIGIN}/api/academic-state/current`, {
    headers: { authorization: `Bearer ${teacherToken}` },
  });
  expect(teacherResponse.status()).toBe(200);

  const studentToken = await loginThroughApi(request, 'student');
  const studentResponse = await request.get(`${API_ORIGIN}/api/academic-state/current`, {
    headers: { authorization: `Bearer ${studentToken}` },
  });
  expect(studentResponse.status()).toBe(403);
});

test('changed core routes avoid document overflow at mobile, tablet, and desktop widths', async ({
  browser,
}) => {
  test.skip(
    missingRoleCredentials('teacher') || missingRoleCredentials('student'),
    'Teacher and Student browser credentials are required.',
  );
  const assessmentEditorUrl = await resolveTeacherAssessmentEditUrl();
  const lessonUrl = await resolveStudentLessonUrl();
  expect(assessmentEditorUrl, 'Seed fixture must expose a Teacher assessment editor.').toBeTruthy();
  expect(lessonUrl, 'Seed fixture must expose a Student lesson.').toBeTruthy();

  const viewports = [
    { width: 390, height: 844, label: 'mobile' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 1280, height: 800, label: 'desktop' },
  ];

  for (const viewport of viewports) {
    const teacherContext = await browser.newContext({ viewport });
    const teacherPage = await teacherContext.newPage();
    await loginAs(teacherPage, 'teacher');
    const teacherRuntime = attachRuntimeEvidence(teacherPage);

    await openRoute(teacherPage, '/dashboard/teacher/class-record');
    await expectHeading(teacherPage, 'Class Record');
    await expectNoDocumentOverflow(teacherPage, `${viewport.label} Class Record`);

    await openRoute(teacherPage, assessmentEditorUrl!);
    await expect(teacherPage.getByRole('button', { name: /save/i }).first()).toBeVisible();
    await expectNoDocumentOverflow(teacherPage, `${viewport.label} Assessment Editor`);
    expectCleanRuntime(teacherRuntime);
    await persistSession(teacherPage, 'teacher');
    await teacherContext.close();

    const studentContext = await browser.newContext({ viewport });
    const studentPage = await studentContext.newPage();
    await loginAs(studentPage, 'student');
    const studentRuntime = attachRuntimeEvidence(studentPage);

    await openRoute(studentPage, '/dashboard/student/lxp');
    await expectHeading(studentPage, 'My Paths');
    await expectNoDocumentOverflow(studentPage, `${viewport.label} Learners Path`);

    await openRoute(studentPage, lessonUrl!);
    await expect(studentPage.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expectNoDocumentOverflow(studentPage, `${viewport.label} lesson detail`);
    expectCleanRuntime(studentRuntime);
    await persistSession(studentPage, 'student');
    await studentContext.close();
  }
});

test('changed primary, filter, segmented, retry, and help controls show keyboard focus', async ({
  browser,
}) => {
  test.skip(
    missingRoleCredentials('teacher') || missingRoleCredentials('student'),
    'Teacher and Student browser credentials are required.',
  );
  const assessmentEditorUrl = await resolveTeacherAssessmentEditUrl();
  expect(assessmentEditorUrl, 'Seed fixture must expose a Teacher assessment editor.').toBeTruthy();

  const teacherContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const teacherPage = await teacherContext.newPage();
  await loginAs(teacherPage, 'teacher');
  const teacherRuntime = attachRuntimeEvidence(teacherPage);

  await openSidebarRoute(
    teacherPage,
    'Content & Records',
    'Class Record',
    '/dashboard/teacher/class-record',
  );
  await expectHeading(teacherPage, 'Class Record');
  await tabTo(
    teacherPage,
    teacherPage.getByLabel('Class', { exact: true }),
    'Class Record class filter',
  );
  await tabTo(
    teacherPage,
    teacherPage.getByRole('button', { name: /^Q[1-4]$/ }).first(),
    'Class Record quarter segmented control',
  );

  await openSidebarRoute(
    teacherPage,
    'Teaching',
    'My Classes',
    '/dashboard/teacher/classes',
  );
  const classLink = teacherPage.locator('a[aria-label^="Open "]').first();
  await expect(classLink).toBeVisible();
  await classLink.click();
  await expect(teacherPage).toHaveURL(/\/dashboard\/teacher\/classes\/[^/?]+(?:\?.*)?$/);

  const assignmentsTab = teacherPage.locator('a[href*="?view=assignments"]').first();
  await expect(assignmentsTab).toBeVisible();
  await assignmentsTab.click();
  await expect(teacherPage).toHaveURL(/\?view=assignments$/);

  const assessmentEditorLink = teacherPage
    .locator(`a[href="${assessmentEditorUrl}"]`)
    .first();
  await expect(assessmentEditorLink).toBeVisible();
  await assessmentEditorLink.click();
  await expect(teacherPage).toHaveURL(
    new RegExp(`${escapeRegExp(assessmentEditorUrl!)}(?:\\?.*)?$`),
  );
  await tabTo(
    teacherPage,
    teacherPage.getByRole('button', { name: /save/i }).first(),
    'Assessment Editor primary save action',
  );
  await tabTo(
    teacherPage,
    teacherPage.getByRole('button', { name: /^Draft$/ }).first(),
    'Assessment availability segmented control',
  );
  await tabTo(
    teacherPage,
    teacherPage.getByRole('button', { name: 'Assessment help' }),
    'Assessment help action',
  );

  await openSidebarRoute(
    teacherPage,
    'Insights & Support',
    'Performance',
    '/dashboard/teacher/performance',
  );
  if (teacherRuntime.allowedFailedResponses.some((entry) => entry.includes('/diagnostics'))) {
    await tabTo(
      teacherPage,
      teacherPage.getByRole('button', { name: /retry diagnostics/i }),
      'Diagnostics retry action',
    );
  }
  expectCleanRuntime(teacherRuntime);
  await persistSession(teacherPage, 'teacher');
  await teacherContext.close();

  const studentContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const studentPage = await studentContext.newPage();
  await loginAs(studentPage, 'student');
  const studentRuntime = attachRuntimeEvidence(studentPage);
  await openSidebarRoute(
    studentPage,
    'Learning',
    'Learners Path',
    '/dashboard/student/lxp',
  );
  await expectHeading(studentPage, 'My Paths');
  await tabTo(
    studentPage,
    studentPage.getByRole('button', { name: 'In Progress' }),
    'Learners Path status filter',
  );
  await tabTo(
    studentPage,
    studentPage.getByRole('button', { name: 'Learners Path help' }),
    'Learners Path help action',
  );
  expectCleanRuntime(studentRuntime);
  await persistSession(studentPage, 'student');
  await studentContext.close();
});
