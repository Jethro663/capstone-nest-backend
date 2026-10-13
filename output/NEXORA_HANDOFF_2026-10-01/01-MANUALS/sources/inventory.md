# Nexora Current Source Inventory

Application snapshot: `211483f07b901299b48ae42eda318c7448f1cbfd`

## Summary

| Item | Count |
| --- | ---: |
| Database tables | 116 |
| Database enums | 55 |
| SQL migrations | 37 |
| Backend controllers | 45 |
| Backend HTTP handlers | 485 |
| AI HTTP handlers | 63 |
| Web pages | 114 |
| Web components | 138 |
| Mobile TSX screen files | 100 |
| Mobile component files | 53 |
| Mobile JSX screen registrations | 138 |
| BullMQ processors | 9 |
| Unique example environment keys | 98 |

## Web Pages

- `/` - `next-frontend/app/page.tsx`
- `/complete-profile` - `next-frontend/app/(auth)/complete-profile/page.tsx`
- `/dashboard` - `next-frontend/app/(dashboard)/dashboard/page.tsx`
- `/dashboard/admin` - `next-frontend/app/(dashboard)/dashboard/admin/page.tsx`
- `/dashboard/admin/academic-records/[classId]` - `next-frontend/app/(dashboard)/dashboard/admin/academic-records/[classId]/page.tsx`
- `/dashboard/admin/access-students` - `next-frontend/app/(dashboard)/dashboard/admin/access-students/page.tsx`
- `/dashboard/admin/announcements` - `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.tsx`
- `/dashboard/admin/audit` - `next-frontend/app/(dashboard)/dashboard/admin/audit/page.tsx`
- `/dashboard/admin/calendar` - `next-frontend/app/(dashboard)/dashboard/admin/calendar/page.tsx`
- `/dashboard/admin/chatbot` - `next-frontend/app/(dashboard)/dashboard/admin/chatbot/page.tsx`
- `/dashboard/admin/class-record` - `next-frontend/app/(dashboard)/dashboard/admin/class-record/page.tsx`
- `/dashboard/admin/class-templates` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/page.tsx`
- `/dashboard/admin/class-templates/[id]` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/page.tsx`
- `/dashboard/admin/class-templates/[id]/announcements/[announcementKey]/edit` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/announcements/[announcementKey]/edit/page.tsx`
- `/dashboard/admin/class-templates/[id]/announcements/new` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/announcements/new/page.tsx`
- `/dashboard/admin/class-templates/[id]/assessments/[assessmentKey]/edit` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/assessments/[assessmentKey]/edit/page.tsx`
- `/dashboard/admin/class-templates/[id]/lessons/[lessonKey]/edit` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/lessons/[lessonKey]/edit/page.tsx`
- `/dashboard/admin/class-templates/[id]/modules/[moduleKey]` - `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/modules/[moduleKey]/page.tsx`
- `/dashboard/admin/classes` - `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx`
- `/dashboard/admin/classes/[id]` - `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/page.tsx`
- `/dashboard/admin/classes/[id]/edit` - `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/edit/page.tsx`
- `/dashboard/admin/classes/[id]/students/add` - `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/students/add/page.tsx`
- `/dashboard/admin/classes/new` - `next-frontend/app/(dashboard)/dashboard/admin/classes/new/page.tsx`
- `/dashboard/admin/diagnostics` - `next-frontend/app/(dashboard)/dashboard/admin/diagnostics/page.tsx`
- `/dashboard/admin/evaluations` - `next-frontend/app/(dashboard)/dashboard/admin/evaluations/page.tsx`
- `/dashboard/admin/library` - `next-frontend/app/(dashboard)/dashboard/admin/library/page.tsx`
- `/dashboard/admin/profile` - `next-frontend/app/(dashboard)/dashboard/admin/profile/page.tsx`
- `/dashboard/admin/reports` - `next-frontend/app/(dashboard)/dashboard/admin/reports/page.tsx`
- `/dashboard/admin/roster-import` - `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx`
- `/dashboard/admin/sections` - `next-frontend/app/(dashboard)/dashboard/admin/sections/page.tsx`
- `/dashboard/admin/sections/[id]/edit` - `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx`
- `/dashboard/admin/sections/[id]/roster` - `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx`
- `/dashboard/admin/sections/[id]/students` - `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/students/page.tsx`
- `/dashboard/admin/sections/[id]/students/add` - `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/students/add/page.tsx`
- `/dashboard/admin/sections/new` - `next-frontend/app/(dashboard)/dashboard/admin/sections/new/page.tsx`
- `/dashboard/admin/system-settings` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx`
- `/dashboard/admin/system-settings/academic-year` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/academic-year/page.tsx`
- `/dashboard/admin/system-settings/assessments-grading` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/assessments-grading/page.tsx`
- `/dashboard/admin/system-settings/audit-recovery` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/audit-recovery/page.tsx`
- `/dashboard/admin/system-settings/demo-mode` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/demo-mode/page.tsx`
- `/dashboard/admin/system-settings/learner-completion` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/learner-completion/page.tsx`
- `/dashboard/admin/system-settings/maintenance-access` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/maintenance-access/page.tsx`
- `/dashboard/admin/system-settings/reset-school-data` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/reset-school-data/page.tsx`
- `/dashboard/admin/system-settings/year-transition` - `next-frontend/app/(dashboard)/dashboard/admin/system-settings/year-transition/page.tsx`
- `/dashboard/admin/user-reports` - `next-frontend/app/(dashboard)/dashboard/admin/user-reports/page.tsx`
- `/dashboard/admin/users` - `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx`
- `/dashboard/admin/users/[id]` - `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx`
- `/dashboard/admin/users/create` - `next-frontend/app/(dashboard)/dashboard/admin/users/create/page.tsx`
- `/dashboard/library` - `next-frontend/app/(dashboard)/dashboard/library/page.tsx`
- `/dashboard/notifications` - `next-frontend/app/(dashboard)/dashboard/notifications/page.tsx`
- `/dashboard/profile` - `next-frontend/app/(dashboard)/dashboard/profile/page.tsx`
- `/dashboard/student` - `next-frontend/app/(dashboard)/dashboard/student/page.tsx`
- `/dashboard/student/announcements` - `next-frontend/app/(dashboard)/dashboard/student/announcements/page.tsx`
- `/dashboard/student/assessment-history` - `next-frontend/app/(dashboard)/dashboard/student/assessment-history/page.tsx`
- `/dashboard/student/assessments` - `next-frontend/app/(dashboard)/dashboard/student/assessments/page.tsx`
- `/dashboard/student/assessments/[id]` - `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/page.tsx`
- `/dashboard/student/assessments/[id]/results/[attemptId]` - `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx`
- `/dashboard/student/assessments/[id]/take` - `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/take/page.tsx`
- `/dashboard/student/calendar` - `next-frontend/app/(dashboard)/dashboard/student/calendar/page.tsx`
- `/dashboard/student/chatbot` - `next-frontend/app/(dashboard)/dashboard/student/chatbot/page.tsx`
- `/dashboard/student/classes` - `next-frontend/app/(dashboard)/dashboard/student/classes/page.tsx`
- `/dashboard/student/classes/[id]` - `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx`
- `/dashboard/student/classes/[id]/modules/[moduleId]` - `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx`
- `/dashboard/student/courses` - `next-frontend/app/(dashboard)/dashboard/student/courses/page.tsx`
- `/dashboard/student/evaluations` - `next-frontend/app/(dashboard)/dashboard/student/evaluations/page.tsx`
- `/dashboard/student/ja` - `next-frontend/app/(dashboard)/dashboard/student/ja/page.tsx`
- `/dashboard/student/lessons` - `next-frontend/app/(dashboard)/dashboard/student/lessons/page.tsx`
- `/dashboard/student/lessons/[id]` - `next-frontend/app/(dashboard)/dashboard/student/lessons/[id]/page.tsx`
- `/dashboard/student/lxp` - `next-frontend/app/(dashboard)/dashboard/student/lxp/page.tsx`
- `/dashboard/student/lxp/[classId]` - `next-frontend/app/(dashboard)/dashboard/student/lxp/[classId]/page.tsx`
- `/dashboard/student/lxp/[classId]/generated-lessons/[assignmentId]` - `next-frontend/app/(dashboard)/dashboard/student/lxp/[classId]/generated-lessons/[assignmentId]/page.tsx`
- `/dashboard/student/lxp/[classId]/guided-assessment/[assignmentId]` - `next-frontend/app/(dashboard)/dashboard/student/lxp/[classId]/guided-assessment/[assignmentId]/page.tsx`
- `/dashboard/student/performance` - `next-frontend/app/(dashboard)/dashboard/student/performance/page.tsx`
- `/dashboard/student/profile` - `next-frontend/app/(dashboard)/dashboard/student/profile/page.tsx`
- `/dashboard/student/transcript` - `next-frontend/app/(dashboard)/dashboard/student/transcript/page.tsx`
- `/dashboard/teacher` - `next-frontend/app/(dashboard)/dashboard/teacher/page.tsx`
- `/dashboard/teacher/announcements` - `next-frontend/app/(dashboard)/dashboard/teacher/announcements/page.tsx`
- `/dashboard/teacher/assessments` - `next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx`
- `/dashboard/teacher/assessments/[id]` - `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/page.tsx`
- `/dashboard/teacher/assessments/[id]/edit` - `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx`
- `/dashboard/teacher/assessments/[id]/results/[attemptId]` - `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/results/[attemptId]/page.tsx`
- `/dashboard/teacher/calendar` - `next-frontend/app/(dashboard)/dashboard/teacher/calendar/page.tsx`
- `/dashboard/teacher/class-record` - `next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx`
- `/dashboard/teacher/classes` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/page.tsx`
- `/dashboard/teacher/classes/[id]` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- `/dashboard/teacher/classes/[id]/ai-draft` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx`
- `/dashboard/teacher/classes/[id]/modules/[moduleId]` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx`
- `/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]/page.tsx`
- `/dashboard/teacher/classes/[id]/students/[studentId]` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/students/[studentId]/page.tsx`
- `/dashboard/teacher/classes/[id]/students/add` - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/students/add/page.tsx`
- `/dashboard/teacher/dashboard` - `next-frontend/app/(dashboard)/dashboard/teacher/dashboard/page.tsx`
- `/dashboard/teacher/evaluations` - `next-frontend/app/(dashboard)/dashboard/teacher/evaluations/page.tsx`
- `/dashboard/teacher/extractions/[id]` - `next-frontend/app/(dashboard)/dashboard/teacher/extractions/[id]/page.tsx`
- `/dashboard/teacher/interventions` - `next-frontend/app/(dashboard)/dashboard/teacher/interventions/page.tsx`
- `/dashboard/teacher/interventions/[caseId]` - `next-frontend/app/(dashboard)/dashboard/teacher/interventions/[caseId]/page.tsx`
- `/dashboard/teacher/lessons` - `next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx`
- `/dashboard/teacher/lessons/[id]/edit` - `next-frontend/app/(dashboard)/dashboard/teacher/lessons/[id]/edit/page.tsx`
- `/dashboard/teacher/lessons/[id]/view` - `next-frontend/app/(dashboard)/dashboard/teacher/lessons/[id]/view/page.tsx`
- `/dashboard/teacher/library` - `next-frontend/app/(dashboard)/dashboard/teacher/library/page.tsx`
- `/dashboard/teacher/modules` - `next-frontend/app/(dashboard)/dashboard/teacher/modules/page.tsx`
- `/dashboard/teacher/performance` - `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`
- `/dashboard/teacher/profile` - `next-frontend/app/(dashboard)/dashboard/teacher/profile/page.tsx`
- `/dashboard/teacher/reports` - `next-frontend/app/(dashboard)/dashboard/teacher/reports/page.tsx`
- `/dashboard/teacher/sections` - `next-frontend/app/(dashboard)/dashboard/teacher/sections/page.tsx`
- `/dashboard/teacher/sections/[id]/roster` - `next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/roster/page.tsx`
- `/dashboard/teacher/sections/[id]/students/[studentId]` - `next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/students/[studentId]/page.tsx`
- `/dashboard/teacher/sections/[id]/students/add` - `next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/students/add/page.tsx`
- `/forgot-password` - `next-frontend/app/(auth)/forgot-password/page.tsx`
- `/lesson-preview/[token]` - `next-frontend/app/lesson-preview/[token]/page.tsx`
- `/login` - `next-frontend/app/(auth)/login/page.tsx`
- `/reset-password` - `next-frontend/app/(auth)/reset-password/page.tsx`
- `/set-initial-password` - `next-frontend/app/(auth)/set-initial-password/page.tsx`
- `/system-maintenance` - `next-frontend/app/system-maintenance/page.tsx`
- `/verify-email` - `next-frontend/app/(auth)/verify-email/page.tsx`

## Mobile Screen Files

- `mobile/src/screens/AdminAcademicScreen.tsx`
- `mobile/src/screens/AdminAcademicYearSettingsScreen.tsx`
- `mobile/src/screens/AdminAnnouncementsScreen.tsx`
- `mobile/src/screens/AdminAssessmentsGradingSettingsScreen.tsx`
- `mobile/src/screens/AdminAssessmentsScreen.tsx`
- `mobile/src/screens/AdminAuditRecoverySettingsScreen.tsx`
- `mobile/src/screens/AdminAuditScreen.tsx`
- `mobile/src/screens/AdminCalendarScreen.tsx`
- `mobile/src/screens/AdminChatbotScreen.tsx`
- `mobile/src/screens/AdminClassRecordScreen.tsx`
- `mobile/src/screens/AdminClassesScreen.tsx`
- `mobile/src/screens/AdminClassesWorkspaceScreen.tsx`
- `mobile/src/screens/AdminCreateUserScreen.tsx`
- `mobile/src/screens/AdminDiagnosticsScreen.tsx`
- `mobile/src/screens/AdminEvaluationsScreen.tsx`
- `mobile/src/screens/AdminHomeScreen.tsx`
- `mobile/src/screens/AdminLearnerCompletionSettingsScreen.tsx`
- `mobile/src/screens/AdminLibraryScreen.tsx`
- `mobile/src/screens/AdminLifecycleReviewScreen.tsx`
- `mobile/src/screens/AdminMaintenanceSettingsScreen.tsx`
- `mobile/src/screens/AdminProfileScreen.tsx`
- `mobile/src/screens/AdminReportsScreen.tsx`
- `mobile/src/screens/AdminRosterScreen.tsx`
- `mobile/src/screens/AdminSectionDetailScreen.tsx`
- `mobile/src/screens/AdminSectionsScreen.tsx`
- `mobile/src/screens/AdminSettingsOverviewScreen.tsx`
- `mobile/src/screens/AdminStudentReadinessScreen.tsx`
- `mobile/src/screens/AdminSystemResetScreen.tsx`
- `mobile/src/screens/AdminTemplateDetailScreen.tsx`
- `mobile/src/screens/AdminTemplatesScreen.tsx`
- `mobile/src/screens/AdminToolsScreen.tsx`
- `mobile/src/screens/AdminUserDetailScreen.tsx`
- `mobile/src/screens/AdminUserReportsScreen.tsx`
- `mobile/src/screens/AdminUsersScreen.tsx`
- `mobile/src/screens/AdminYearTransitionSettingsScreen.tsx`
- `mobile/src/screens/AnnouncementsScreen.tsx`
- `mobile/src/screens/AssessmentDetailScreen.tsx`
- `mobile/src/screens/AssessmentHistoryScreen.tsx`
- `mobile/src/screens/AssessmentResultsScreen.tsx`
- `mobile/src/screens/AssessmentTakeScreen.tsx`
- `mobile/src/screens/AssessmentsScreen.tsx`
- `mobile/src/screens/CalendarScreen.tsx`
- `mobile/src/screens/ClassDetailScreen.tsx`
- `mobile/src/screens/CompleteProfileScreen.tsx`
- `mobile/src/screens/CoursesScreen.tsx`
- `mobile/src/screens/DashboardScreen.tsx`
- `mobile/src/screens/ForgotPasswordScreen.tsx`
- `mobile/src/screens/JaScreen.tsx`
- `mobile/src/screens/LessonDetailScreen.tsx`
- `mobile/src/screens/LessonsScreen.tsx`
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/screens/ModuleDetailScreen.tsx`
- `mobile/src/screens/NotificationsInboxScreen.tsx`
- `mobile/src/screens/PerformanceScreen.tsx`
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/screens/ResetPasswordScreen.tsx`
- `mobile/src/screens/SetInitialPasswordScreen.tsx`
- `mobile/src/screens/StudentEvaluationsScreen.tsx`
- `mobile/src/screens/StudentGeneratedLessonScreen.tsx`
- `mobile/src/screens/StudentGuidedAssessmentScreen.tsx`
- `mobile/src/screens/StudentJaReviewAssessmentScreen.tsx`
- `mobile/src/screens/SubjectLessonsScreen.tsx`
- `mobile/src/screens/SystemResetProgressGate.tsx`
- `mobile/src/screens/TeacherAiDraftScreen.tsx`
- `mobile/src/screens/TeacherAnnouncementsScreen.tsx`
- `mobile/src/screens/TeacherAssessmentDetailScreen.tsx`
- `mobile/src/screens/TeacherAssessmentEditorScreen.tsx`
- `mobile/src/screens/TeacherAssessmentReviewScreen.tsx`
- `mobile/src/screens/TeacherAssessmentsScreen.tsx`
- `mobile/src/screens/TeacherCalendarScreen.tsx`
- `mobile/src/screens/TeacherClassDetailScreen.tsx`
- `mobile/src/screens/TeacherClassRecordScreen.tsx`
- `mobile/src/screens/TeacherClassesScreen.tsx`
- `mobile/src/screens/TeacherCreateAssessmentScreen.tsx`
- `mobile/src/screens/TeacherCreateModuleScreen.tsx`
- `mobile/src/screens/TeacherDeepParityScreens.tsx`
- `mobile/src/screens/TeacherEvaluationsScreen.tsx`
- `mobile/src/screens/TeacherExtractionDetailScreen.tsx`
- `mobile/src/screens/TeacherHomeScreen.tsx`
- `mobile/src/screens/TeacherInterventionsScreen.tsx`
- `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- `mobile/src/screens/TeacherLessonEditorScreen.tsx`
- `mobile/src/screens/TeacherLessonsScreen.tsx`
- `mobile/src/screens/TeacherLibraryScreen.tsx`
- `mobile/src/screens/TeacherModuleDetailScreen.tsx`
- `mobile/src/screens/TeacherMoreScreen.tsx`
- `mobile/src/screens/TeacherPerformanceScreen.tsx`
- `mobile/src/screens/TeacherProfileScreen.tsx`
- `mobile/src/screens/TeacherReportsScreen.tsx`
- `mobile/src/screens/TeacherSectionDetailScreen.tsx`
- `mobile/src/screens/TeacherSectionsScreen.tsx`
- `mobile/src/screens/TranscriptScreen.tsx`
- `mobile/src/screens/VerifyEmailScreen.tsx`
- `mobile/src/screens/student-announcements/StudentAnnouncementsView.tsx`
- `mobile/src/screens/student-assessments/StudentAssessmentsView.tsx`
- `mobile/src/screens/student-classes/StudentClassCard.tsx`
- `mobile/src/screens/student-classes/StudentClassesView.tsx`
- `mobile/src/screens/student-home/StudentHomeView.tsx`
- `mobile/src/screens/teacher-ai-draft/TeacherAiDraftReviewPanel.tsx`
- `mobile/src/screens/teacher-assessments/TeacherAiJobsPanel.tsx`

## Backend Feature Modules

- `backend/src/modules/academic-state/academic-grading.module.ts`
- `backend/src/modules/academic-state/academic-policy.module.ts`
- `backend/src/modules/academic-state/academic-readiness.module.ts`
- `backend/src/modules/academic-state/academic-state.module.ts`
- `backend/src/modules/admin-demo-mode/admin-demo-mode.module.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.module.ts`
- `backend/src/modules/admin-maintenance/admin-maintenance.module.ts`
- `backend/src/modules/admin/admin.module.ts`
- `backend/src/modules/ai-mentor/ai-mentor.module.ts`
- `backend/src/modules/analytics/analytics.module.ts`
- `backend/src/modules/announcements/announcements.module.ts`
- `backend/src/modules/app-version/app-version.module.ts`
- `backend/src/modules/assessments/assessments.module.ts`
- `backend/src/modules/audit/audit.module.ts`
- `backend/src/modules/auth/auth.module.ts`
- `backend/src/modules/class-record/class-record.module.ts`
- `backend/src/modules/class-templates/class-templates.module.ts`
- `backend/src/modules/classes/classes.module.ts`
- `backend/src/modules/content-modules/content-modules.module.ts`
- `backend/src/modules/discussion-board/discussion-board.module.ts`
- `backend/src/modules/file-upload/file-upload.module.ts`
- `backend/src/modules/file-upload/storage/storage.module.ts`
- `backend/src/modules/health/health.module.ts`
- `backend/src/modules/ja/ja.module.ts`
- `backend/src/modules/lessons/lessons.module.ts`
- `backend/src/modules/lxp/lxp.module.ts`
- `backend/src/modules/mail/mail.module.ts`
- `backend/src/modules/mobile-workspace/mobile-workspace.module.ts`
- `backend/src/modules/notifications/notifications.module.ts`
- `backend/src/modules/otp/otp.module.ts`
- `backend/src/modules/performance/performance.module.ts`
- `backend/src/modules/profiles/profiles.module.ts`
- `backend/src/modules/rag/rag.module.ts`
- `backend/src/modules/reports/reports.module.ts`
- `backend/src/modules/roles/roles.module.ts`
- `backend/src/modules/roster-import/roster-import.module.ts`
- `backend/src/modules/school-events/school-events.module.ts`
- `backend/src/modules/sections/sections.module.ts`
- `backend/src/modules/system-capabilities/system-capabilities.module.ts`
- `backend/src/modules/system-reset/system-reset.module.ts`
- `backend/src/modules/teacher-profiles/teacher-profiles.module.ts`
- `backend/src/modules/teacher/teacher.module.ts`
- `backend/src/modules/users/users.module.ts`

## Queue Processors

- `backend/src/modules/admin-lifecycle/admin-erasure-cleanup.processor.ts`
- `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- `backend/src/modules/discussion-board/discussion-board.processor.ts`
- `backend/src/modules/file-upload/processors/library-indexing.processor.ts`
- `backend/src/modules/notifications/processors/announcement-fan-out.processor.ts`
- `backend/src/modules/notifications/processors/assessment-notification.processor.ts`
- `backend/src/modules/notifications/processors/push-notification.processor.ts`
- `backend/src/modules/performance/performance-recompute.processor.ts`
- `backend/src/modules/rag/processors/rag-indexing.processor.ts`

## Database Migrations

- `0000_baseline_nexora.sql`
- `0001_mixed_morgan_stark.sql`
- `0002_small_photon.sql`
- `0003_enable_pgvector.sql`
- `0004_add_notification_metadata.sql`
- `0005_add_transmutation_tables.sql`
- `0006_clammy_micromacro.sql`
- `0007_add_assessment_missing_columns.sql`
- `0008_far_patch.sql`
- `0009_add_student_graduation_status.sql`
- `0010_repair_legacy_assessment_ai_columns.sql`
- `0011_academic_period_lifecycle.sql`
- `0012_academic_back_subject_evidence.sql`
- `0013_academic_back_subject_term_limit.sql`
- `0014_academic_legacy_evidence.sql`
- `0015_academic_grade10_completion.sql`
- `0016_assessment_editor.sql`
- `0017_grade_score_invariants.sql`
- `0018_governed_admin_lifecycle.sql`
- `0019_academic_lifecycle_notification.sql`
- `0020_lifecycle_audit_link.sql`
- `0021_admin_demo_mode.sql`
- `0022_system_reset.sql`
- `0023_system_reset_fences.sql`
- `0024_system_reset_participants.sql`
- `0025_system_reset_storage_generation.sql`
- `0026_system_reset_participant_retirement.sql`
- `0027_admin_maintenance_gateway.sql`
- `0028_admin_authority_cascade_erasure.sql`
- `0029_repair_legacy_class_record_teacher_constraint.sql`
- `0030_admin_maintenance_switch_mode.sql`
- `0031_retire_archived_teacher_notifications.sql`
- `0032_user_notification_dismissal.sql`
- `0033_class_record_excused_with_score.sql`
- `0034_platform_neutral_app_artifacts.sql`
- `0035_notification_devices.sql`
- `0036_mobile_release_reset_compatibility.sql`

## Compose Services

Core: `postgres`, `redis`, `ollama`, `backend`, `ai-service`, `frontend`

Observability: `prometheus`, `blackbox-exporter`, `loki`, `tempo`, `grafana`, `promtail`, `node-exporter`, `cadvisor`

## Environment Keys

- `ADMIN_CASCADE_ERASE_ENABLED` - `.env.compose.example`, `backend/.env.example`
- `ADMIN_LIFECYCLE_ENABLED` - `.env.compose.example`, `backend/.env.example`
- `ADMIN_MAINTENANCE_ENABLED` - `.env.compose.example`, `backend/.env.example`
- `AI_CLOUD_FALLBACK_API_KEY` - `ai-service/.env.example`
- `AI_CLOUD_FALLBACK_BASE_URL` - `ai-service/.env.example`
- `AI_CLOUD_FALLBACK_ENABLED` - `ai-service/.env.example`
- `AI_CLOUD_FALLBACK_MODEL` - `ai-service/.env.example`
- `AI_CLOUD_FALLBACK_PROVIDER` - `ai-service/.env.example`
- `AI_DATABASE_URL` - `.env.compose.example`
- `AI_DEGRADED_ALLOWED` - `ai-service/.env.example`, `backend/.env.example`
- `AI_EXTRACTION_BG_MAX_CONCURRENCY` - `ai-service/.env.example`
- `AI_RUNTIME_MODE` - `ai-service/.env.example`
- `AI_SERVICE_PORT` - `.env.compose.example`
- `AI_SERVICE_SHARED_SECRET` - `.env.compose.example`, `ai-service/.env.example`, `backend/.env.example`
- `AI_SERVICE_TIMEOUT_CHAT_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_EXTRACTION_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_INDEXING_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_INTERNAL_EXTRACTION_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_INTERNAL_INTERVENTION_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_INTERNAL_QUIZ_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_LESSON_PLAN_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_QUIZ_MS` - `backend/.env.example`
- `AI_SERVICE_TIMEOUT_TUTOR_START_MS` - `backend/.env.example`
- `AI_SERVICE_URL` - `backend/.env.example`
- `AI_TEACHER_BG_MAX_CONCURRENCY` - `ai-service/.env.example`
- `AI_TUTOR_MAX_INFLIGHT` - `ai-service/.env.example`
- `AI_TUTOR_REJECT_STATUS` - `ai-service/.env.example`
- `AI_TUTOR_RETRY_AFTER_S` - `ai-service/.env.example`
- `BACKEND_DATABASE_URL` - `.env.compose.example`
- `BACKEND_INTERNAL_URL` - `ai-service/.env.example`
- `BACKEND_PUBLIC_URL` - `backend/.env.example`
- `COOKIE_DOMAIN` - `backend/.env.example`
- `CORS_ALLOWED_ORIGINS` - `backend/.env.example`
- `DATABASE_URL` - `ai-service/.env.example`, `backend/.env.example`
- `DB_CONNECT_TIMEOUT_MS` - `backend/.env.example`
- `DB_IDLE_TIMEOUT_MS` - `backend/.env.example`
- `DB_POOL_MAX` - `backend/.env.example`
- `EMAIL_FROM` - `backend/.env.example`
- `EMAIL_PASSWORD` - `backend/.env.example`
- `EMAIL_SERVICE` - `backend/.env.example`
- `EMAIL_USER` - `backend/.env.example`
- `EXPO_PUBLIC_API_URL` - `mobile/.env.example`
- `FRONTEND_PORT` - `.env.compose.example`
- `FRONTEND_URL` - `backend/.env.example`
- `GF_SMTP_ENABLED` - `.env.compose.example`
- `GF_SMTP_FROM_ADDRESS` - `.env.compose.example`
- `GF_SMTP_HOST` - `.env.compose.example`
- `GF_SMTP_PASSWORD` - `.env.compose.example`
- `GF_SMTP_USER` - `.env.compose.example`
- `GRAFANA_ADMIN_PASSWORD` - `.env.compose.example`
- `GRAFANA_ADMIN_USER` - `.env.compose.example`
- `GRAFANA_ALERT_EMAIL` - `.env.compose.example`
- `GRAFANA_ALERTING_ENABLED` - `.env.compose.example`
- `GRAFANA_PORT` - `.env.compose.example`
- `JWT_ACCESS_EXPIRY` - `backend/.env.example`
- `JWT_REFRESH_EXPIRY` - `backend/.env.example`
- `JWT_REFRESH_SECRET` - `.env.compose.example`, `backend/.env.example`
- `JWT_SECRET` - `.env.compose.example`, `backend/.env.example`
- `LESSON_PREVIEW_SECRET` - `.env.compose.example`, `backend/.env.example`
- `LOG_LEVEL` - `ai-service/.env.example`
- `LOKI_HOST` - `.env.compose.example`, `backend/.env.example`
- `LOKI_PORT` - `.env.compose.example`
- `MAX_RAW_TEXT` - `ai-service/.env.example`
- `MOBILE_URL` - `backend/.env.example`
- `NEXT_FRONTEND_URL` - `backend/.env.example`
- `NODE_ENV` - `backend/.env.example`
- `OLLAMA_BASE_URL` - `ai-service/.env.example`, `backend/.env.example`
- `OLLAMA_EMBED_MODEL` - `.env.compose.example`, `ai-service/.env.example`
- `OLLAMA_KEEP_ALIVE` - `ai-service/.env.example`
- `OLLAMA_TEXT_MODEL` - `.env.compose.example`, `ai-service/.env.example`, `backend/.env.example`
- `OLLAMA_TIMEOUT_CHAT_S` - `ai-service/.env.example`
- `OLLAMA_TIMEOUT_EXTRACTION_S` - `ai-service/.env.example`
- `OLLAMA_VISION_MODEL` - `.env.compose.example`, `ai-service/.env.example`, `backend/.env.example`
- `OPENROUTER_EMBEDDING_MODEL` - `ai-service/.env.example`
- `OPENROUTER_HTTP_REFERER` - `ai-service/.env.example`
- `OPENROUTER_VISION_MODEL` - `ai-service/.env.example`
- `OPENROUTER_X_TITLE` - `ai-service/.env.example`
- `OTEL_EXPORTER_OTLP_ENDPOINT` - `.env.compose.example`, `backend/.env.example`
- `OTP_PEPPER` - `.env.compose.example`, `backend/.env.example`
- `PORT` - `backend/.env.example`
- `POSTGRES_HOST_PORT` - `.env.compose.example`
- `POSTGRES_PASSWORD` - `.env.compose.example`
- `PROMETHEUS_PORT` - `.env.compose.example`
- `REDIS_HOST_PORT` - `.env.compose.example`
- `REDIS_URL` - `backend/.env.example`
- `RETRIEVAL_AGGREGATE_TIMEOUT_SECONDS` - `ai-service/.env.example`
- `RUN_DB_MIGRATIONS` - `.env.compose.example`
- `RUN_DB_SEED` - `.env.compose.example`
- `SYSTEM_RESET_BACKEND_TOPOLOGY` - `.env.compose.example`, `backend/.env.example`
- `SYSTEM_RESET_ENABLED` - `.env.compose.example`, `backend/.env.example`
- `SYSTEM_RESET_ENVIRONMENT` - `.env.compose.example`, `backend/.env.example`
- `SYSTEM_RESET_REDIS_OWNERSHIP` - `.env.compose.example`, `backend/.env.example`
- `SYSTEM_RESET_STORAGE_ID` - `.env.compose.example`, `backend/.env.example`
- `SYSTEM_RESET_STORAGE_OWNERSHIP` - `.env.compose.example`, `backend/.env.example`
- `TEMPO_OTLP_HTTP_PORT` - `.env.compose.example`
- `TEMPO_PORT` - `.env.compose.example`
- `TRUST_PROXY_HOPS` - `backend/.env.example`
- `UPLOAD_DIR` - `ai-service/.env.example`
