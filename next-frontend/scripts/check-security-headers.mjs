import assert from 'node:assert/strict';

const origin = process.env.SECURITY_CHECK_ORIGIN || 'http://127.0.0.1:3101';
const reportOnly = process.env.CSP_REPORT_ONLY === 'true';
const policyHeader = reportOnly ? 'content-security-policy-report-only' : 'content-security-policy';
const noncePattern = /'nonce-([^']+)'/;
let previousNonce;

for (const path of ['/', '/', '/login', '/forgot-password', '/reset-password', '/set-initial-password', '/verify-email', '/complete-profile', '/dashboard/teacher', '/security-header-missing-page', '/security-header-missing-page.html']) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', headers: { accept: 'text/html' } });
  assert([200, 307, 308, 404].includes(response.status), `${path}: unexpected status ${response.status}`);
  for (const name of ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', policyHeader]) {
    assert(response.headers.get(name), `${path}: missing ${name}`);
  }
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert(!response.headers.has('x-powered-by'));
  const policy = response.headers.get(policyHeader);
  const nonce = policy.match(noncePattern)?.[1];
  assert(nonce && nonce !== previousNonce, `${path}: missing/reused nonce`);
  previousNonce = nonce;
  assert(policy.includes("'strict-dynamic'"));
  assert(!policy.includes('unsafe-eval'));
  assert(!policy.split(';').find((part) => part.trim().startsWith('script-src ')).includes('unsafe-inline'));
  assert(response.headers.get('cache-control')?.includes('no-store'), `${path}: nonce HTML can be cached`);
  if (response.status === 200) {
    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
    assert(scripts.length, `${path}: no scripts to validate`);
    for (const [, attributes] of scripts) {
      assert(attributes.includes(`nonce="${nonce}"`), `${path}: script does not match response nonce`);
    }
  }
  console.log(`PASS ${path}: headers, fresh nonce, script authorization, cache policy`);
}

if (process.env.SECURITY_CHECK_API === 'true') {
  const response = await fetch(new URL('/api/health/live', origin));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert(response.headers.has('permissions-policy'));
  assert(!response.headers.get('content-security-policy')?.includes('nonce-'), 'Frontend CSP overwrote API Helmet');
  console.log('PASS API retains Helmet and explicit Permissions Policy');
}
