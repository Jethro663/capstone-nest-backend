const { chromium } = require('@playwright/test');

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3001';
const LOGIN_PATH = '/login';
const ROLE_FILTER = process.env.ROLE_FILTER
  ? new Set(
      process.env.ROLE_FILTER.split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;

const ROLE_PROFILES = [
  {
    role: 'teacher',
    email: process.env.TEACHER_EMAIL || 'teacher1@lms.local',
    password: process.env.TEACHER_PASSWORD || 'Teacher123!',
    firstRoute: '/dashboard/teacher',
    classesRoute: '/dashboard/teacher/classes',
    classId:
      process.env.TEACHER_CLASS_ID ||
      'f71bebea-e122-4cd4-9d01-10d543ff1bf1',
    classHrefPrefix: '/dashboard/teacher/classes/',
  },
  {
    role: 'student',
    email: process.env.STUDENT_EMAIL || 'student71@lms.local',
    password: process.env.STUDENT_PASSWORD || 'Student123!',
    firstRoute: '/dashboard/student',
    classesRoute: '/dashboard/student/courses',
    classId:
      process.env.STUDENT_CLASS_ID ||
      'f71bebea-e122-4cd4-9d01-10d543ff1bf1',
    classHrefPrefix: '/dashboard/student/classes/',
  },
];

function toRoutePrefixRegex(routePrefix) {
  return new RegExp(
    `${routePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/.*)?(?:\\?.*)?$`,
  );
}

async function waitForRoutePrefix(page, routePrefix) {
  await page.waitForURL(toRoutePrefixRegex(routePrefix), { timeout: 120000 });
}

async function measureNavigation(page, route) {
  const startedAt = Date.now();
  await page.goto(`${FRONTEND_ORIGIN}${route}`, {
    waitUntil: 'load',
    timeout: 120000,
  });
  return Date.now() - startedAt;
}

async function login(page, profile) {
  await page.goto(`${FRONTEND_ORIGIN}${LOGIN_PATH}`, {
    waitUntil: 'load',
    timeout: 120000,
  });
  await page.getByLabel(/email/i).fill(profile.email);
  await page.getByLabel(/password/i).fill(profile.password);
  await Promise.all([
    waitForRoutePrefix(page, profile.firstRoute),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
}

async function getFirstClassHref(page, profile) {
  if (profile.classId) {
    return `${profile.classHrefPrefix}${profile.classId}`;
  }

  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((anchor) => anchor.getAttribute('href') || '')
      .filter(Boolean),
  );

  for (const href of hrefs) {
    const classMatch = href.match(/\/dashboard\/(?:teacher|student)\/classes\/([0-9a-f-]{36})/i);
    if (classMatch?.[1]) {
      return `${profile.classHrefPrefix}${classMatch[1]}`;
    }

    const queryMatch = href.match(/[?&]classId=([0-9a-f-]{36})/i);
    if (queryMatch?.[1]) {
      return `${profile.classHrefPrefix}${queryMatch[1]}`;
    }
  }

  return null;
}

async function measureThreadOpen(page) {
  const openButtons = page.getByRole('button', { name: /^(Open|Open Thread)$/i });
  await openButtons
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => null);
  const buttonCount = await openButtons.count();
  if (buttonCount === 0) {
    return null;
  }

  const startedAt = Date.now();
  const responsePromise = page
    .waitForResponse(
      (response) => {
        if (response.request().method() !== 'GET') return false;
        try {
          const url = new URL(response.url());
          return /\/api\/classes\/[^/]+\/discussion-threads\/[^/?]+$/.test(url.pathname);
        } catch {
          return false;
        }
      },
      { timeout: 15000 },
    )
    .catch(() => null);

  await openButtons.first().click();
  await responsePromise;
  return Date.now() - startedAt;
}

async function runRoleProfile(browser, profile) {
  const page = await browser.newPage();
  const metrics = { role: profile.role };

  try {
    const loginStartedAt = Date.now();
    await login(page, profile);
    metrics.loginMs = Date.now() - loginStartedAt;

    metrics.classesColdMs = await measureNavigation(page, profile.classesRoute);
    metrics.classesWarmMs = await measureNavigation(page, profile.classesRoute);

    const classHref = await getFirstClassHref(page, profile);
    metrics.classHref = classHref;

    if (!classHref) {
      metrics.classDetailColdMs = null;
      metrics.classDetailWarmMs = null;
      metrics.discussionColdMs = null;
      metrics.discussionWarmMs = null;
      metrics.threadOpenMs = null;
      return metrics;
    }

    metrics.classDetailColdMs = await measureNavigation(page, classHref);
    metrics.classDetailWarmMs = await measureNavigation(page, classHref);
    metrics.discussionColdMs = await measureNavigation(page, `${classHref}?view=discussion`);
    metrics.discussionWarmMs = await measureNavigation(page, `${classHref}?view=discussion`);
    metrics.threadOpenMs = await measureThreadOpen(page);
    return metrics;
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    const selectedProfiles = ROLE_FILTER
      ? ROLE_PROFILES.filter((profile) => ROLE_FILTER.has(profile.role))
      : ROLE_PROFILES;

    for (const profile of selectedProfiles) {
      try {
        results.push(await runRoleProfile(browser, profile));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          role: profile.role,
          error: message,
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          frontendOrigin: FRONTEND_ORIGIN,
          generatedAt: new Date().toISOString(),
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[discussion-perf-smoke] ${message}`);
  process.exit(1);
});
