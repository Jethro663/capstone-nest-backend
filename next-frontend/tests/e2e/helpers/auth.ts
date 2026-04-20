import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

type RoleKey = 'admin' | 'teacher' | 'student';

function requiredEnv(role: RoleKey) {
  const upper = role.toUpperCase();
  return {
    email: process.env[`PLAYWRIGHT_${upper}_EMAIL`],
    password: process.env[`PLAYWRIGHT_${upper}_PASSWORD`],
  };
}

export function missingRoleCredentials(role: RoleKey) {
  const credentials = requiredEnv(role);
  return !credentials.email || !credentials.password;
}

const ROLE_DASHBOARD_PREFIX: Record<RoleKey, string> = {
  admin: '/dashboard/admin',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
};
const MAX_LOGIN_RETRIES = Number(process.env.PLAYWRIGHT_MAX_LOGIN_RETRIES || 3);
const RETRY_BASE_DELAY_MS = Number(
  process.env.PLAYWRIGHT_LOGIN_RETRY_DELAY_MS || 750,
);

const SESSION_DIR = path.resolve(process.cwd(), 'tests/e2e/.sessions');

function ensureSessionDir() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function sessionPath(role: RoleKey) {
  return path.join(SESSION_DIR, `${role}.json`);
}

async function waitForRoutePrefix(
  page: Page,
  routePrefix: string,
  timeoutMs = 120_000,
) {
  const routeRegex = new RegExp(
    `${routePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/.*)?(?:\\?.*)?$`,
  );
  await page.waitForURL(routeRegex, { timeout: timeoutMs });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function performLoginAttempt(page: Page, role: RoleKey, credentials: {
  email: string;
  password: string;
}) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);

  const loginResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    )
    .catch(() => null);

  await page.getByRole('button', { name: /sign in/i }).click();
  const loginResponse = await loginResponsePromise;

  if (!loginResponse) {
    return 'failed' as const;
  }

  if (loginResponse.status() === 429) {
    return 'throttled' as const;
  }

  if (!loginResponse.ok()) {
    return 'failed' as const;
  }

  const routeRegex = new RegExp(
    `${ROLE_DASHBOARD_PREFIX[role].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/.*)?(?:\\?.*)?$`,
  );

  const routeReached = await page
    .waitForURL(routeRegex, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (routeReached) {
    return 'ok' as const;
  }

  return 'failed' as const;
}

async function tryRestoreSession(page: Page, role: RoleKey) {
  const statePath = sessionPath(role);
  if (!fs.existsSync(statePath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw) as { cookies?: Array<Record<string, unknown>> };
    if (Array.isArray(parsed.cookies) && parsed.cookies.length > 0) {
      await page.context().addCookies(parsed.cookies as any);
    }
    await page.goto('/dashboard');
    await waitForRoutePrefix(page, ROLE_DASHBOARD_PREFIX[role], 15_000);
    return true;
  } catch {
    return false;
  }
}

export async function loginAs(page: Page, role: RoleKey) {
  const credentials = requiredEnv(role);
  if (!credentials.email || !credentials.password) {
    throw new Error(`Missing Playwright credentials for ${role}.`);
  }
  const loginCredentials = {
    email: credentials.email,
    password: credentials.password,
  };

  ensureSessionDir();
  const restored = await tryRestoreSession(page, role);
  if (restored) {
    await expect(page).toHaveURL(/dashboard/i);
    return;
  }

  let loginSucceeded = false;
  for (let attempt = 1; attempt <= MAX_LOGIN_RETRIES; attempt += 1) {
    const outcome = await performLoginAttempt(page, role, loginCredentials);
    if (outcome === 'ok') {
      loginSucceeded = true;
      break;
    }
    if (outcome !== 'throttled') {
      break;
    }
    await sleep(RETRY_BASE_DELAY_MS * attempt);
  }

  if (!loginSucceeded) {
    throw new Error(`Unable to complete ${role} login (route transition failed).`);
  }

  await page.waitForLoadState('load');
  await page.context().storageState({ path: sessionPath(role) });
  await expect(page).toHaveURL(/dashboard/i);
}
