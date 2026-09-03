type RoleKey = 'admin' | 'teacher' | 'student';

type Credentials = {
  email: string;
  password: string;
};

const API_ORIGIN = process.env.PLAYWRIGHT_API_ORIGIN || 'http://127.0.0.1:3000';
const LOGIN_RETRIES = Number(process.env.PLAYWRIGHT_SEEDED_LOGIN_RETRIES || 3);
const LOGIN_RETRY_DELAY_MS = Number(
  process.env.PLAYWRIGHT_SEEDED_LOGIN_RETRY_DELAY_MS || 750,
);
const SESSION_CACHE = new Map<RoleKey, { token: string; userId: string }>();
let cachedAdminTemplateWorkspaceUrl: string | null | undefined;
let cachedTeacherLessonEditUrl: string | null | undefined;
let cachedTeacherAssessmentEditUrl: string | null | undefined;
let cachedTeacherAssessmentDetailUrl: string | null | undefined;
let cachedTeacherClassRecordUrl: string | null | undefined;
let cachedStudentLessonUrl: string | null | undefined;

function getCredentials(role: RoleKey): Credentials | null {
  const upper = role.toUpperCase();
  const email = process.env[`PLAYWRIGHT_${upper}_EMAIL`];
  const password = process.env[`PLAYWRIGHT_${upper}_PASSWORD`];
  if (!email || !password) {
    return null;
  }
  return { email, password };
}

async function apiLogin(role: RoleKey) {
  const cached = SESSION_CACHE.get(role);
  if (cached) {
    return cached;
  }

  const credentials = getCredentials(role);
  if (!credentials) {
    return null;
  }

  for (let attempt = 1; attempt <= LOGIN_RETRIES; attempt += 1) {
    const response = await fetch(`${API_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (response.status === 429 && attempt < LOGIN_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, LOGIN_RETRY_DELAY_MS * attempt),
      );
      continue;
    }

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as any;
    const token = payload?.data?.accessToken as string | undefined;
    const userId = payload?.data?.user?.id as string | undefined;
    if (!token || !userId) {
      return null;
    }

    const session = { token, userId };
    SESSION_CACHE.set(role, session);
    return session;
  }

  return null;
}

async function apiGet(path: string, token: string) {
  const response = await fetch(`${API_ORIGIN}/api${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as any;
}

export async function resolveAdminTemplateWorkspaceUrl() {
  if (process.env.PLAYWRIGHT_ADMIN_TEMPLATE_WORKSPACE_URL) {
    return process.env.PLAYWRIGHT_ADMIN_TEMPLATE_WORKSPACE_URL;
  }
  if (cachedAdminTemplateWorkspaceUrl !== undefined) {
    return cachedAdminTemplateWorkspaceUrl;
  }

  const session = await apiLogin('admin');
  if (!session) {
    cachedAdminTemplateWorkspaceUrl = null;
    return cachedAdminTemplateWorkspaceUrl;
  }

  const templates = await apiGet('/class-templates', session.token);
  const templateId = templates?.data?.[0]?.id as string | undefined;
  if (!templateId) {
    cachedAdminTemplateWorkspaceUrl = null;
    return cachedAdminTemplateWorkspaceUrl;
  }
  cachedAdminTemplateWorkspaceUrl = `/dashboard/admin/class-templates/${templateId}`;
  return cachedAdminTemplateWorkspaceUrl;
}

export async function resolveTeacherLessonEditUrl() {
  if (process.env.PLAYWRIGHT_TEACHER_LESSON_EDIT_URL) {
    return process.env.PLAYWRIGHT_TEACHER_LESSON_EDIT_URL;
  }
  if (cachedTeacherLessonEditUrl !== undefined) {
    return cachedTeacherLessonEditUrl;
  }

  const session = (await apiLogin('admin')) ?? (await apiLogin('teacher'));
  if (!session) {
    cachedTeacherLessonEditUrl = null;
    return cachedTeacherLessonEditUrl;
  }

  const classes = await apiGet('/classes/all', session.token);
  const classRows = (classes?.data?.data ?? []) as Array<{ id: string }>;
  for (const row of classRows) {
    const lessons = await apiGet(`/lessons/class/${row.id}`, session.token);
    const lessonRows = (lessons?.data ?? []) as Array<{
      id: string;
      isDraft?: boolean;
    }>;
    const selected = lessonRows.find((entry) => entry.isDraft === false) ?? lessonRows[0];
    if (selected?.id) {
      cachedTeacherLessonEditUrl = `/dashboard/teacher/lessons/${selected.id}/edit`;
      return cachedTeacherLessonEditUrl;
    }
  }

  cachedTeacherLessonEditUrl = null;
  return cachedTeacherLessonEditUrl;
}

export async function resolveTeacherAssessmentEditUrl() {
  if (process.env.PLAYWRIGHT_TEACHER_ASSESSMENT_EDIT_URL) {
    return process.env.PLAYWRIGHT_TEACHER_ASSESSMENT_EDIT_URL;
  }
  if (cachedTeacherAssessmentEditUrl !== undefined) {
    return cachedTeacherAssessmentEditUrl;
  }

  const session = (await apiLogin('admin')) ?? (await apiLogin('teacher'));
  if (!session) {
    cachedTeacherAssessmentEditUrl = null;
    return cachedTeacherAssessmentEditUrl;
  }

  const classes = await apiGet('/classes/all', session.token);
  const classRows = (classes?.data?.data ?? []) as Array<{ id: string }>;
  for (const row of classRows) {
    const assessments = await apiGet(`/assessments/class/${row.id}`, session.token);
    const assessmentRows = (assessments?.data ?? []) as Array<{ id: string }>;
    if (assessmentRows[0]?.id) {
      cachedTeacherAssessmentEditUrl = `/dashboard/teacher/assessments/${assessmentRows[0].id}/edit`;
      return cachedTeacherAssessmentEditUrl;
    }
  }

  cachedTeacherAssessmentEditUrl = null;
  return cachedTeacherAssessmentEditUrl;
}

export async function resolveTeacherAssessmentDetailUrl() {
  if (process.env.PLAYWRIGHT_TEACHER_ASSESSMENT_DETAIL_URL) {
    return process.env.PLAYWRIGHT_TEACHER_ASSESSMENT_DETAIL_URL;
  }
  if (cachedTeacherAssessmentDetailUrl !== undefined) {
    return cachedTeacherAssessmentDetailUrl;
  }

  const editUrl = await resolveTeacherAssessmentEditUrl();
  cachedTeacherAssessmentDetailUrl = editUrl?.replace(/\/edit$/, '') ?? null;
  return cachedTeacherAssessmentDetailUrl;
}

export async function resolveTeacherClassRecordUrl() {
  if (process.env.PLAYWRIGHT_TEACHER_CLASS_RECORD_URL) {
    return process.env.PLAYWRIGHT_TEACHER_CLASS_RECORD_URL;
  }
  if (cachedTeacherClassRecordUrl !== undefined) {
    return cachedTeacherClassRecordUrl;
  }

  const session = await apiLogin('teacher');
  if (!session) {
    cachedTeacherClassRecordUrl = null;
    return cachedTeacherClassRecordUrl;
  }

  const classes = await apiGet(`/classes/teacher/${session.userId}`, session.token);
  const classRows = (classes?.data ?? []) as Array<{ id: string }>;
  for (const row of classRows) {
    const records = await apiGet(`/class-record/by-class/${row.id}`, session.token);
    const recordRows = (records?.data ?? []) as Array<{ id: string }>;
    if (recordRows.length > 0) {
      cachedTeacherClassRecordUrl =
        `/dashboard/teacher/classes/${row.id}?view=class-record`;
      return cachedTeacherClassRecordUrl;
    }
  }

  cachedTeacherClassRecordUrl = null;
  return cachedTeacherClassRecordUrl;
}

export async function resolveStudentLessonUrl() {
  if (process.env.PLAYWRIGHT_STUDENT_LESSON_URL) {
    return process.env.PLAYWRIGHT_STUDENT_LESSON_URL;
  }
  if (cachedStudentLessonUrl !== undefined) {
    return cachedStudentLessonUrl;
  }

  const adminSession = await apiLogin('admin');
  if (adminSession) {
    const classes = await apiGet('/classes/all', adminSession.token);
    const classRows = (classes?.data?.data ?? []) as Array<{ id: string }>;
    for (const row of classRows) {
      const lessons = await apiGet(`/lessons/class/${row.id}`, adminSession.token);
      const lessonRows = (lessons?.data ?? []) as Array<{
        id: string;
        isDraft?: boolean;
      }>;
      const selected =
        lessonRows.find((entry) => entry.isDraft === false) ?? lessonRows[0];
      if (selected?.id) {
        cachedStudentLessonUrl = `/dashboard/student/lessons/${selected.id}`;
        return cachedStudentLessonUrl;
      }
    }
  }

  const studentSession = await apiLogin('student');
  if (studentSession) {
    const classes = await apiGet(
      `/classes/student/${studentSession.userId}`,
      studentSession.token,
    );
    const classRows = (classes?.data ?? []) as Array<{ id: string }>;
    for (const row of classRows) {
      const lessons = await apiGet(`/lessons/class/${row.id}`, studentSession.token);
      const lessonRows = (lessons?.data ?? []) as Array<{ id: string }>;
      if (lessonRows[0]?.id) {
        cachedStudentLessonUrl = `/dashboard/student/lessons/${lessonRows[0].id}`;
        return cachedStudentLessonUrl;
      }
    }
  }

  cachedStudentLessonUrl = null;
  return cachedStudentLessonUrl;
}
