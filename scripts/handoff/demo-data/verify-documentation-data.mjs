import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertDisposableTarget } from './assert-disposable-target.mjs';
import {
  assertMigrations,
  loadDatabaseRuntime,
} from './seed-documentation-data.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const fixturePath = path.join(path.dirname(scriptPath), 'documentation-fixture.json');

function expectedRows(fixture) {
  return new Map([
    ['roles', fixture.roles.map((row) => row.id)],
    ['users', fixture.accounts.map((row) => row.id)],
    ['academic_system_states', [fixture.academicState.id]],
    ['sections', [fixture.classroom.section.id]],
    ['classes', [fixture.classroom.class.id]],
    ['class_schedules', [fixture.classroom.schedule.id]],
    ['enrollments', fixture.classroom.enrollments.map((row) => row.id)],
    ['lessons', [fixture.content.id]],
    ['lesson_content_blocks', [fixture.content.blockId]],
    ['class_modules', [fixture.content.module.id]],
    ['module_sections', [fixture.content.module.section.id]],
    ['module_items', [fixture.content.module.section.item.id, fixture.fileArtifact.moduleItem.id]],
    ['uploaded_files', [fixture.fileArtifact.file.id]],
    ['extracted_modules', [fixture.fileArtifact.extraction.id]],
    ['assessments', [fixture.assessment.id]],
    ['assessment_questions', [fixture.assessment.question.id]],
    ['assessment_question_options', fixture.assessment.options.map((row) => row.id)],
    ['class_templates', [fixture.classTemplate.id]],
    ['class_template_modules', [fixture.classTemplate.module.id]],
    ['class_template_module_sections', [fixture.classTemplate.module.section.id]],
    ['class_template_lessons', [fixture.classTemplate.lesson.id]],
    ['class_template_lesson_blocks', [fixture.classTemplate.lesson.blockId]],
    ['class_template_assessments', [fixture.classTemplate.assessment.id]],
    ['class_template_assessment_questions', [fixture.classTemplate.assessment.questionId]],
    ['class_template_assessment_question_options', fixture.classTemplate.assessment.options.map((row) => row.id)],
    ['class_template_module_items', fixture.classTemplate.module.section.items.map((row) => row.id)],
    ['class_template_announcements', [fixture.classTemplate.announcement.id]],
    ['assessment_attempts', [fixture.returnedAttempt.id]],
    ['assessment_responses', [fixture.returnedAttempt.responseId]],
    ['class_records', [fixture.classRecord.id]],
    ['class_record_categories', fixture.classRecord.categories.map((row) => row.id)],
    ['class_record_items', fixture.classRecord.items.map((row) => row.id)],
    ['class_record_scores', fixture.classRecord.scores.map((row) => row.id)],
    ['performance_snapshots', fixture.performance.snapshots.map((row) => row.id)],
    ['performance_logs', [fixture.performance.log.id]],
    ['intervention_cases', [fixture.intervention.id]],
    ['lxp_generated_remedial_lessons', [fixture.intervention.generatedLesson.id]],
    ['lxp_generated_guided_assessments', [fixture.intervention.guidedAssessment.id]],
    ['intervention_assignments', [
      fixture.intervention.assignmentId,
      fixture.intervention.generatedLesson.assignmentId,
      fixture.intervention.guidedAssessment.assignmentId,
    ]],
    ['system_evaluation_campaigns', [fixture.evaluation.campaignId]],
    ['system_evaluations', [fixture.evaluation.id]],
    ['system_evaluation_assignments', [fixture.evaluation.assignmentId]],
    ['announcements', [fixture.announcement.id]],
    ['school_events', [fixture.calendarEvent.id]],
    ['notifications', [fixture.notification.id]],
    ['audit_logs', [fixture.auditRecord.id]],
    ['admin_demo_mode_states', [fixture.systemSettings.id]],
  ]);
}

export async function verifyDocumentationData(connectionString) {
  assertDisposableTarget(connectionString);
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const { Client } = await loadDatabaseRuntime();
  const client = new Client({ connectionString });
  const report = [];
  await client.connect();
  try {
    await assertMigrations(client);
    for (const [table, ids] of expectedRows(fixture)) {
      const result = await client.query(
        `SELECT id::text FROM ${table} WHERE id = ANY($1::uuid[]) ORDER BY id`,
        [ids],
      );
      const found = new Set(result.rows.map((row) => row.id));
      const missing = ids.filter((id) => !found.has(id));
      report.push({ table, expected: ids.length, found: found.size, missing });
    }
  } finally {
    await client.end();
  }

  const failures = report.filter((entry) => entry.missing.length > 0);
  if (failures.length > 0) {
    throw new Error(
      `Documentation fixture verification failed: ${failures
        .map((entry) => `${entry.table} missing ${entry.missing.join(', ')}`)
        .join('; ')}`,
    );
  }
  return report;
}

async function main() {
  const report = await verifyDocumentationData(process.env.NEXORA_DOC_DATABASE_URL);
  console.log(
    `Documentation fixture verified: ${report.length} tables, ${report.reduce((sum, row) => sum + row.found, 0)} stable synthetic rows.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
