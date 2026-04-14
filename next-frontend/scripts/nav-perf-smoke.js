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
    role: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@lms.local',
    password: process.env.ADMIN_PASSWORD || 'Test@123',
    firstRoute: '/dashboard/admin',
    routes: ['/dashboard/admin/users', '/dashboard/admin/diagnostics'],
  },
  {
    role: 'teacher',
    email: process.env.TEACHER_EMAIL || 'teacher1@lms.local',
    password: process.env.TEACHER_PASSWORD || 'Teacher123!',
    firstRoute: '/dashboard/teacher',
    routes: ['/dashboard/teacher/classes'],
  },
  {
    role: 'student',
    email: process.env.STUDENT_EMAIL || 'student71@lms.local',
    password: process.env.STUDENT_PASSWORD || 'Student123!',
    firstRoute: '/dashboard/student',
    routes: ['/dashboard/student/courses', '/dashboard/student/ja'],
  },
];

async function waitForRoute(page, route) {
  const routeRegex = new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`);
  await page.waitForURL(routeRegex, { timeout: 120000 });
}

async function measureNavigation(page, route) {
  const startedAt = Date.now();
  await page.goto(`${FRONTEND_ORIGIN}${route}`, {
    waitUntil: 'load',
    timeout: 120000,
  });
  return Date.now() - startedAt;
}

async function runRoleProfile(browser, profile) {
  const page = await browser.newPage();
  const metrics = { role: profile.role };

  let startedAt = Date.now();
  await page.goto(`${FRONTEND_ORIGIN}${LOGIN_PATH}`, {
    waitUntil: 'load',
    timeout: 120000,
  });
  metrics.loginPageMs = Date.now() - startedAt;

  await page.getByLabel(/email/i).fill(profile.email);
  await page.getByLabel(/password/i).fill(profile.password);

  startedAt = Date.now();
  await Promise.all([
    waitForRoute(page, profile.firstRoute),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  await page.waitForLoadState('load');
  metrics.loginToDashboardMs = Date.now() - startedAt;

  for (const route of profile.routes) {
    const routeKey = route.replace(/^\/dashboard\//, '').replace(/[\/-]+/g, '_');
    metrics[`${routeKey}_coldMs`] = await measureNavigation(page, route);
    metrics[`${routeKey}_warmMs`] = await measureNavigation(page, route);
  }

  await page.close();
  return metrics;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const results = [];
    const selectedProfiles = ROLE_FILTER
      ? ROLE_PROFILES.filter((profile) => ROLE_FILTER.has(profile.role))
      : ROLE_PROFILES;

    for (const profile of selectedProfiles) {
      results.push(await runRoleProfile(browser, profile));
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
  console.error(`[nav-perf-smoke] ${message}`);
  process.exit(1);
});
