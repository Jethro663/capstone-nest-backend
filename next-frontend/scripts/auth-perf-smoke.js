const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3001';
const USER_EMAIL = process.env.USER_EMAIL || 'admin@lms.local';
const USER_PASSWORD = process.env.USER_PASSWORD || 'Test@123';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const MAX_LOGIN_RETRIES = Number(process.env.MAX_LOGIN_RETRIES || 3);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowMs() {
  return Number(process.hrtime.bigint() / BigInt(1_000_000));
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener(
      'abort',
      () => controller.abort(signal.reason),
      { once: true },
    );
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function timedFetch(url, options = {}) {
  const { signal, clear } = withTimeout(options.signal, REQUEST_TIMEOUT_MS);
  const startedAt = nowMs();

  try {
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        accept: 'application/json, text/html;q=0.9,*/*;q=0.8',
        ...(options.headers || {}),
      },
    });

    return {
      response,
      durationMs: nowMs() - startedAt,
    };
  } finally {
    clear();
  }
}

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers
      .getSetCookie()
      .map((value) => value.split(';', 1)[0])
      .join('; ');
  }

  const cookie = response.headers.get('set-cookie');
  return cookie ? cookie.split(';', 1)[0] : '';
}

async function main() {
  const loginPage = await timedFetch(`${FRONTEND_ORIGIN}/login`);
  let loginResponse = null;

  for (let attempt = 1; attempt <= MAX_LOGIN_RETRIES; attempt += 1) {
    const nextResponse = await timedFetch(`${FRONTEND_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      }),
    });

    loginResponse = nextResponse;
    if (nextResponse.response.ok) {
      break;
    }

    if (nextResponse.response.status !== 429 || attempt === MAX_LOGIN_RETRIES) {
      break;
    }

    await sleep(750 * attempt);
  }

  if (!loginResponse) {
    throw new Error('Login request did not execute.');
  }

  if (!loginResponse.response.ok) {
    throw new Error(`Login failed with status ${loginResponse.response.status}`);
  }

  const loginJson = await loginResponse.response.json();
  const accessToken =
    loginJson?.data?.accessToken ?? loginJson?.accessToken ?? null;
  const role = loginJson?.data?.user?.roles?.[0] ?? 'student';
  const cookies = extractCookies(loginResponse.response);
  const dashboardTarget =
    role === 'admin'
      ? '/dashboard/admin'
      : role === 'teacher'
        ? '/dashboard/teacher'
        : '/dashboard/student';

  const dashboardResponse = await timedFetch(
    `${FRONTEND_ORIGIN}${dashboardTarget}`,
    {
      headers: {
        ...(cookies ? { cookie: cookies } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  );

  console.log(
    JSON.stringify(
      {
        frontendOrigin: FRONTEND_ORIGIN,
        loginPageMs: loginPage.durationMs,
        loginRequestMs: loginResponse.durationMs,
        dashboardTarget,
        dashboardRequestMs: dashboardResponse.durationMs,
        dashboardStatus: dashboardResponse.response.status,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[auth-perf-smoke] ${message}`);
  process.exit(1);
});
