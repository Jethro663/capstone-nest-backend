import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parsePackageVersion,
  selectMobileCaptureOwner,
  toNumberedAnnotations,
} from '../capture/capture-mobile.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.resolve(
  here,
  '../capture/mobile-capture-matrix.json',
);

const expectedRoutes = {
  public: [
    'Login',
    'VerifyEmail',
    'ForgotPassword',
    'ResetPassword',
    'SetInitialPassword',
  ],
  student: [
    'CompleteProfile', 'Notifications',
    'Dashboard', 'Classes', 'Assessments', 'StudentCalendar', 'JA',
    'Announcements', 'StudentEvaluations', 'Profile',
    'ClassWorkspace', 'ClassDetail', 'ModuleDetail', 'Calendar', 'Courses',
    'Lessons', 'LessonDetail', 'AssessmentDetail', 'AssessmentTake',
    'AssessmentResults', 'AssessmentHistory', 'LXP', 'StudentGuidedAssessment',
    'StudentGeneratedLesson', 'StudentJaReviewAssessment', 'Chatbot',
    'Performance', 'Transcript', 'AiTutor',
  ],
  teacher: [
    'CompleteProfile', 'Notifications',
    'Home', 'Classes', 'Sections', 'Assessments', 'TeacherCalendar',
    'TeacherLessons', 'TeacherLibrary', 'TeacherClassRecord',
    'TeacherAnnouncements', 'TeacherReports', 'TeacherInterventions',
    'TeacherPerformance', 'TeacherEvaluations', 'Profile',
    'TeacherClassDetail', 'TeacherModuleDetail', 'TeacherModuleFileDetail',
    'TeacherLessonDetail', 'TeacherLessonEditor', 'TeacherAssessmentDetail',
    'TeacherAssessmentEditor', 'TeacherAssessmentReview',
    'TeacherAssessmentAttemptResult', 'TeacherCreateModule',
    'TeacherCreateAssessment', 'TeacherClassAddStudents',
    'TeacherClassStudentOverview', 'TeacherSectionDetail',
    'TeacherSectionAddStudents', 'TeacherSectionStudentProfile',
    'TeacherExtractionDetail', 'TeacherAiDraft', 'TeacherInterventionDetail',
    'TeacherMore',
  ],
  admin: [
    'CompleteProfile', 'Notifications',
    'Home', 'AdminDiagnostics', 'AdminUsers', 'AdminSections', 'AdminClasses',
    'AdminCalendar', 'AdminRoster', 'AdminClassRecord', 'AdminUserReports',
    'AdminLibrary', 'AdminAnnouncements', 'AdminReports', 'AdminEvaluations',
    'AdminChatbot', 'AdminAudit', 'AdminSettings', 'Profile', 'Classes',
    'Assessments', 'Academic', 'AdminTemplates', 'AdminTools', 'AdminAcademic',
    'AdminSettingsAcademicYear', 'AdminSettingsAssessmentsGrading',
    'AdminSettingsYearTransition', 'AdminSettingsLearnerCompletion',
    'AdminSettingsAuditRecovery', 'AdminSettingsMaintenance',
    'AdminSettingsResetSchoolData', 'AdminStudentReadiness',
    'AdminLifecycleReview', 'AdminCreateUser', 'AdminUserDetail',
    'AdminSectionDetail', 'AdminTemplateDetail', 'TeacherClassDetail',
    'TeacherSectionDetail', 'TeacherSectionAddStudents',
    'TeacherSectionStudentProfile', 'TeacherClassAddStudents',
    'TeacherClassStudentOverview', 'TeacherAssessmentDetail',
    'TeacherAssessmentEditor', 'TeacherAssessmentReview',
    'TeacherAssessmentAttemptResult', 'TeacherModuleDetail',
    'TeacherLessonDetail', 'TeacherLessonEditor', 'TeacherLessons',
    'TeacherCreateModule', 'TeacherCreateAssessment', 'TeacherModuleFileDetail',
    'TeacherCalendar', 'TeacherExtractionDetail', 'TeacherAiDraft',
    'TeacherInterventionDetail', 'TeacherLibrary', 'TeacherClassRecord',
    'TeacherReports', 'TeacherInterventions', 'TeacherPerformance',
    'TeacherEvaluations', 'TeacherAnnouncements',
  ],
};

async function loadMatrix() {
  return JSON.parse(await readFile(matrixPath, 'utf8'));
}

test('every active mobile route maps to one capture owner', async () => {
  const matrix = await loadMatrix();
  for (const [role, expected] of Object.entries(expectedRoutes)) {
    const actual = matrix
      .filter((owner) => owner.role === role)
      .flatMap((owner) => owner.routes)
      .filter((route) => !route.startsWith('ComponentGallery:'));
    assert.deepEqual([...new Set(actual)].sort(), [...expected].sort(), role);
    assert.equal(actual.length, new Set(actual).size, `${role} has duplicate route mappings`);
  }
});

test('capture owners are safe, traceable, and beginner-facing', async () => {
  const matrix = await loadMatrix();
  assert.ok(matrix.length >= 18);
  assert.equal(new Set(matrix.map((owner) => owner.id)).size, matrix.length);
  for (const owner of matrix) {
    assert.match(owner.id, /^[a-z0-9-]+$/);
    assert.ok(['live_emulator', 'component_state'].includes(owner.captureMode));
    assert.ok(owner.routes.length > 0);
    assert.ok(owner.title.length >= 4);
    assert.ok(owner.caption.length >= 20);
    assert.ok(owner.waitFor.length >= 2);
    assert.ok(owner.annotations.length >= 1);
  }
});

test('rare states come from the dev-only component gallery', async () => {
  const matrix = await loadMatrix();
  const galleryStates = matrix
    .filter((owner) => owner.captureMode === 'component_state')
    .flatMap((owner) => owner.routes);
  assert.deepEqual(galleryStates.sort(), [
    'ComponentGallery:confirmation',
    'ComponentGallery:empty',
    'ComponentGallery:error',
    'ComponentGallery:loading',
    'ComponentGallery:offline',
    'ComponentGallery:success',
  ]);
});

test('mobile capture helpers keep version and annotation evidence deterministic', async () => {
  const matrix = await loadMatrix();
  assert.equal(selectMobileCaptureOwner(matrix, 'mobile-auth-entry').role, 'public');
  assert.deepEqual(
    parsePackageVersion('versionCode=57 minSdk=24 targetSdk=36\nversionName=0.1.56'),
    { versionName: '0.1.56', versionCode: 57 },
  );
  assert.deepEqual(
    toNumberedAnnotations([
      { x: 0, y: 0, width: 108, height: 240, label: 'Top-left area' },
    ]),
    [{ number: 1, label: 'Top-left area', xPercent: 5, yPercent: 5 }],
  );
});
