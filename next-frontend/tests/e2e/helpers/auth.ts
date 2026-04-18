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

export async function loginAs(page: Page, role: RoleKey) {
  const credentials = requiredEnv(role);
  if (!credentials.email || !credentials.password) {
    throw new Error(`Missing Playwright credentials for ${role}.`);
  }

  await page.goto('/login');
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/dashboard/i, { timeout: 30_000 });
  await expect(page).toHaveURL(/dashboard/i);
}
