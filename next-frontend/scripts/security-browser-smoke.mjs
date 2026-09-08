import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.SECURITY_CHECK_ORIGIN || 'http://127.0.0.1:3101';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
    });
  });
  for (const route of ['/', '/login', '/forgot-password', '/reset-password', '/set-initial-password', '/verify-email']) {
    await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], `${route}: CSP blocked application behavior`);
    if (route === '/login') {
      await page.getByLabel('Email address').fill('security-check@example.test');
      assert.equal(await page.getByLabel('Email address').inputValue(), 'security-check@example.test');
    }
    console.log(`PASS browser ${route}: hydration and no CSP violations`);
  }
  if (process.env.SECURITY_CHECK_ROLES === 'true') {
    assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Seeded role checks are local only');
    for (const [role, email, password] of [
      ['admin', 'admin@lms.local', 'Test@123'],
      ['teacher', 'teacher1@lms.local', 'Teacher123!'],
      ['student', 'student71@lms.local', 'Student123!'],
    ]) {
      const context = await browser.newContext();
      const response = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } });
      assert.equal(response.status(), 200, `${role}: seeded login failed`);
      const rolePage = await context.newPage();
      await rolePage.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => window.__cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
      });
      for (const suffix of ['', '/classes', '/profile']) {
        await rolePage.goto(`${origin}/dashboard/${role}${suffix}`, { waitUntil: 'networkidle' });
        await rolePage.waitForTimeout(500);
        assert(new URL(rolePage.url()).pathname.startsWith(`/dashboard/${role}`), `${role}: session did not reach dashboard`);
        assert.deepEqual(await rolePage.evaluate(() => window.__cspViolations), [], `${role}${suffix}: CSP violation`);
      }
      console.log(`PASS browser ${role}: real seeded login, dashboard, classes, profile`);
      await context.close();
    }
  }
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.route('https://www.youtube.com/embed/security-policy-check', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Allowed lesson frame</title>' }));
  await page.evaluate(() => {
    const video = document.createElement('iframe');
    video.src = 'https://www.youtube.com/embed/security-policy-check';
    video.allowFullscreen = true;
    document.body.appendChild(video);
    const preview = document.createElement('iframe');
    preview.src = URL.createObjectURL(new Blob(['%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'], { type: 'application/pdf' }));
    document.body.appendChild(preview);
  });
  await page.waitForTimeout(1000);
  assert(page.frames().some((frame) => frame.url().includes('/embed/security-policy-check')), 'Lesson frame did not load');
  assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], 'Video/PDF preview compatibility failure');
  console.log('PASS browser YouTube frame and blob PDF preview policy (controlled fixtures)');
  // Simulate injected server HTML. A script created by already trusted script is
  // intentionally covered by strict-dynamic, so DOM insertion is not this test.
  await page.route(`${origin}/login`, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({ response, body: html.replace('</head>', '<script>window.__untrustedScriptRan = true</script></head>') });
  });
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);
  const executed = await page.evaluate(() => window.__untrustedScriptRan === true);
  assert.equal(executed, process.env.CSP_REPORT_ONLY === 'true', 'CSP enforcement/report-only mode did not behave as expected');
  assert((await page.evaluate(() => window.__cspViolations)).some((entry) => entry.directive === 'script-src-elem'));
  console.log('PASS browser injected script is reported and blocked in enforcement mode');
} finally {
  await browser.close();
}
