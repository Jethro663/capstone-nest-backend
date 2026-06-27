const { chromium } = require('@playwright/test');

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3001';
const LOGIN_PATH = '/login';
const WORKSPACE_PATH =
  process.env.ENGINE_TEMPLATE_WORKSPACE_URL ||
  '/dashboard/admin/class-templates';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lms.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Test@123';
const WORKSPACE_EXPECTED_ACTIONS = [
  'save-draft-button',
  'workspace-tab-modules',
  'add-module-button',
];

function toRoutePrefixRegex(routePrefix) {
  return new RegExp(
    `${routePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/.*)?(?:\\?.*)?$`,
  );
}

async function waitForRoutePrefix(page, routePrefix) {
  await page.waitForURL(toRoutePrefixRegex(routePrefix), { timeout: 120000 });
}

async function measure(fn) {
  const startedAt = Date.now();
  await fn();
  return Date.now() - startedAt;
}

async function loginAsAdmin(page) {
  await page.goto(`${FRONTEND_ORIGIN}${LOGIN_PATH}`, {
    waitUntil: 'load',
    timeout: 120000,
  });
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await Promise.all([
    waitForRoutePrefix(page, '/dashboard/admin'),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  await page.waitForLoadState('load');
}

async function resolveWorkspaceUrl(page) {
  if (WORKSPACE_PATH.includes('/dashboard/admin/class-templates/') && WORKSPACE_PATH !== '/dashboard/admin/class-templates') {
    return WORKSPACE_PATH;
  }

  await page.goto(`${FRONTEND_ORIGIN}/dashboard/admin/class-templates`, {
    waitUntil: 'load',
    timeout: 120000,
  });
  const links = await page
    .locator('a[href*="/dashboard/admin/class-templates/"]')
    .all();
  if (links.length === 0) {
    const nameInput = page.getByTestId('create-template-name-input');
    const createButton = page.getByTestId('create-template-button');
    await nameInput.fill(`Engine Smoke ${Date.now()}`);
    await Promise.all([
      page.waitForURL(
        /\/dashboard\/admin\/class-templates\/[0-9a-f-]{36}(?:\?.*)?$/i,
        {
          timeout: 60000,
        },
      ),
      createButton.click(),
    ]);
    const createdUrl = new URL(page.url());
    return `${createdUrl.pathname}${createdUrl.search}`;
  }
  const href = (await links[0].getAttribute('href')) || '';
  if (!href) {
    throw new Error('Template workspace link did not include href.');
  }
  return href;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const metrics = {};
    metrics.loginMs = await measure(() => loginAsAdmin(page));

    const workspaceUrl = await resolveWorkspaceUrl(page);
    metrics.workspaceUrl = workspaceUrl;
    metrics.workspaceOpenColdMs = await measure(() =>
      page.goto(`${FRONTEND_ORIGIN}${workspaceUrl}`, {
        waitUntil: 'load',
        timeout: 120000,
      }),
    );
    metrics.workspaceOpenWarmMs = await measure(() =>
      page.goto(`${FRONTEND_ORIGIN}${workspaceUrl}`, {
        waitUntil: 'load',
        timeout: 120000,
      }),
    );

    metrics.workspaceControlsReadyMs = await measure(async () => {
      await page.getByTestId('save-draft-button').waitFor({
        state: 'visible',
        timeout: 15000,
      });
      await page
        .locator(
          '[data-testid="publish-template-button"], [data-testid="unpublish-template-button"]',
        )
        .first()
        .waitFor({ state: 'visible', timeout: 15000 });
      await page.getByTestId('workspace-tab-modules').click();
      await page.getByTestId('add-module-button').waitFor({
        state: 'visible',
        timeout: 15000,
      });
    });

    metrics.workspaceActionsChecked = WORKSPACE_EXPECTED_ACTIONS;

    console.log(
      JSON.stringify(
        {
          frontendOrigin: FRONTEND_ORIGIN,
          generatedAt: new Date().toISOString(),
          metrics,
        },
        null,
        2,
      ),
    );
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[engine-perf-smoke] ${message}`);
  process.exit(1);
});
