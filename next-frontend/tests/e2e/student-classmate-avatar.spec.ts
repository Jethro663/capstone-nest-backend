import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Root as Avatar, Fallback as AvatarFallback } from '@radix-ui/react-avatar';
import { loginAs, missingRoleCredentials } from './helpers/auth';

const globalCss = fs.readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');
const classCss = fs.readFileSync(path.resolve(process.cwd(), 'app/(dashboard)/dashboard/student/classes/[id]/student-class-detail.css'), 'utf8');

for (const width of [390, 1280]) {
  test(`classmate initials remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const avatar = renderToStaticMarkup(createElement(Avatar, {
      className: 'student-class-student-cell__avatar',
    }, createElement(AvatarFallback, {
      className: 'student-class-student-cell__avatar-fallback',
      // Equivalent to the AvatarFallback wrapper's h-full/w-full utilities.
      style: { width: '100%', height: '100%' },
    }, 'JC')));
    await page.setContent(`<style>${globalCss}${classCss}</style><div class="student-class-student-cell">${avatar}<strong>Jamie Cruz</strong></div>`);
    const initials = page.locator('.student-class-student-cell__avatar-fallback');
    await expect(initials).toHaveText('JC');
    const style = await initials.evaluate(element => {
      const computed = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return { color: computed.color, background: computed.backgroundColor, width: bounds.width, height: bounds.height };
    });
    expect(style.color).not.toBe(style.background);
    expect(style.color).toBe('rgb(255, 255, 255)');
    expect(style.background).toBe('rgb(23, 41, 68)');
    expect(style.width).toBeGreaterThanOrEqual(32);
    expect(style.height).toBeGreaterThanOrEqual(32);
  });
}

test('classmates page shows initials for missing and broken photos and keeps loaded photos', async ({ page }) => {
  test.skip(missingRoleCredentials('student'), 'Set the disposable student fixture credentials.');
  await loginAs(page, 'student');
  const classId = 'a3000000-0000-0000-0000-000000000001';
  await page.route(`**/api/classes/${classId}`, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.enrollments = [
      { id: 'no-photo', student: { firstName: 'Jamie', lastName: 'Cruz', email: 'jamie@example.invalid' } },
      { id: 'broken-photo', student: { firstName: 'Sam', lastName: 'Reyes', email: 'sam@example.invalid', profile: { profilePicture: '/test-broken-avatar.png' } } },
      { id: 'single-name', student: { firstName: 'Noor', lastName: '', email: 'noor@example.invalid' } },
      { id: 'photo', student: { firstName: 'Ana', lastName: 'Fixture', email: 'ana@example.invalid', profile: { profilePicture: '/test-loaded-avatar.svg' } } },
    ];
    await route.fulfill({ response, json: body });
  });
  await page.route('**/test-broken-avatar.png', route => route.fulfill({ status: 404, body: '' }));
  await page.route('**/test-loaded-avatar.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#172944"/></svg>' }));
  await page.goto(`/dashboard/student/classes/${classId}?view=classmates`);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const initials of ['JC', 'SR', 'N']) {
      const avatar = page.locator('.student-class-student-cell__avatar-fallback').filter({ hasText: new RegExp(`^${initials}$`) });
      await expect(avatar).toBeVisible();
      await expect(avatar).toHaveCSS('background-color', 'rgb(23, 41, 68)');
      await expect(avatar).toHaveCSS('color', 'rgb(255, 255, 255)');
    }
    await expect(page.getByRole('img', { name: 'Ana Fixture', exact: true })).toBeVisible();
  }
});
