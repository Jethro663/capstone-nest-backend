import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertDisposableTarget } from './assert-disposable-target.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const handoffRoot = path.resolve(path.dirname(scriptPath), '..');
const repoRoot = path.resolve(handoffRoot, '../..');
const fixturePath = path.join(path.dirname(scriptPath), 'documentation-fixture.json');

function visitIdentities(value, identities) {
  if (Array.isArray(value)) {
    for (const item of value) visitIdentities(item, identities);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.id === 'string') identities.add(value.id);
  for (const child of Object.values(value)) visitIdentities(child, identities);
}

export function collectFixtureIdentities(fixture) {
  const identities = new Set();
  visitIdentities(fixture, identities);
  for (const key of ['responseId', 'assignmentId', 'campaignId']) {
    const visitNamed = (value) => {
      if (Array.isArray(value)) return value.forEach(visitNamed);
      if (!value || typeof value !== 'object') return;
      if (typeof value[key] === 'string') identities.add(value[key]);
      Object.values(value).forEach(visitNamed);
    };
    visitNamed(fixture);
  }
  return identities;
}

export function applyFixtureToIdentityMap(store, fixture) {
  for (const id of collectFixtureIdentities(fixture)) store.set(id, id);
  return store;
}

export async function loadDatabaseRuntime() {
  const requireFromBackend = createRequire(path.join(repoRoot, 'backend/package.json'));
  try {
    return {
      Client: requireFromBackend('pg').Client,
      hash: requireFromBackend('bcrypt').hash,
    };
  } catch (error) {
    throw new Error(
      `Backend dependencies are required. Run npm ci in backend first. (${error.message})`,
    );
  }
}

export async function assertMigrations(client) {
  const result = await client.query(
    'SELECT filename FROM _applied_migrations ORDER BY id',
  );
  const files = result.rows.map((row) => row.filename);
  if (files.length !== 37 || files.at(-1) !== '0036_mobile_release_reset_compatibility.sql') {
    throw new Error(
      `Expected all 37 migrations through 0036_mobile_release_reset_compatibility.sql; found ${files.length} ending at ${files.at(-1) ?? 'none'}.`,
    );
  }
}

async function upsertFixture(client, fixture, passwordHash) {
  const roleByName = new Map(fixture.roles.map((role) => [role.name, role]));
  const accountByRole = new Map();
  for (const account of fixture.accounts) {
    if (!accountByRole.has(account.role)) accountByRole.set(account.role, account);
  }
  const admin = accountByRole.get('admin');
  const teacher = accountByRole.get('teacher');
  const students = fixture.accounts.filter((account) => account.role === 'student');
  const section = fixture.classroom.section;
  const schoolClass = fixture.classroom.class;

  for (const role of fixture.roles) {
    await client.query(
      `INSERT INTO roles (id, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [role.id, role.name, role.description],
    );
  }

  for (const account of fixture.accounts) {
    await client.query(
      `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password,
         first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
         account_status = 'ACTIVE', is_email_verified = true, updated_at = NOW()`,
      [account.id, account.email, passwordHash, account.firstName, account.lastName],
    );
    await client.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, 'DOCUMENTATION_FIXTURE')
       ON CONFLICT (user_id, role_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by`,
      [account.id, roleByName.get(account.role).id],
    );
  }

  await client.query(
    `INSERT INTO teacher_profiles (user_id, department, specialization, employee_id)
     VALUES ($1, $2, 'Mathematics 7', $3)
     ON CONFLICT (user_id) DO UPDATE SET department = EXCLUDED.department,
       specialization = EXCLUDED.specialization, employee_id = EXCLUDED.employee_id`,
    [teacher.id, teacher.department, teacher.employeeId],
  );
  for (const student of students) {
    await client.query(
      `INSERT INTO student_profiles (user_id, grade_level, lrn, family_name, family_relationship, family_contact)
       VALUES ($1, $2, $3, 'Documentation Guardian', 'Guardian', '09000000000')
       ON CONFLICT (user_id) DO UPDATE SET grade_level = EXCLUDED.grade_level, lrn = EXCLUDED.lrn`,
      [student.id, student.gradeLevel, student.lrn],
    );
  }

  await client.query(
    `INSERT INTO academic_system_states (id, school_year, version, quarter, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET school_year = EXCLUDED.school_year,
       version = EXCLUDED.version, quarter = EXCLUDED.quarter, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [fixture.academicState.id, fixture.schoolYear, fixture.academicState.version, fixture.quarter, admin.id],
  );
  await client.query(
    `INSERT INTO sections (id, name, grade_level, school_year, capacity, room_number, adviser_id, is_active)
     VALUES ($1, $2, $3, $4, 40, $5, $6, true)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, grade_level = EXCLUDED.grade_level,
       school_year = EXCLUDED.school_year, room_number = EXCLUDED.room_number, adviser_id = EXCLUDED.adviser_id, is_active = true`,
    [section.id, section.name, section.gradeLevel, fixture.schoolYear, section.roomNumber, teacher.id],
  );
  await client.query(
    `INSERT INTO classes (id, subject_name, subject_code, subject_grade_level, section_id, teacher_id, room, school_year, academic_weight_profile, is_active)
     VALUES ($1, $2, $3, '7', $4, $5, $6, $7, 'academic', true)
     ON CONFLICT (id) DO UPDATE SET subject_name = EXCLUDED.subject_name, subject_code = EXCLUDED.subject_code,
       section_id = EXCLUDED.section_id, teacher_id = EXCLUDED.teacher_id, school_year = EXCLUDED.school_year, is_active = true`,
    [schoolClass.id, schoolClass.subjectName, schoolClass.subjectCode, section.id, teacher.id, section.roomNumber, fixture.schoolYear],
  );
  await client.query(
    `INSERT INTO class_schedules (id, class_id, days, start_time, end_time)
     VALUES ($1, $2, $3::text[], $4, $5)
     ON CONFLICT (id) DO UPDATE SET days = EXCLUDED.days, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time`,
    [fixture.classroom.schedule.id, schoolClass.id, fixture.classroom.schedule.days, fixture.classroom.schedule.startTime, fixture.classroom.schedule.endTime],
  );
  for (const enrollment of fixture.classroom.enrollments) {
    await client.query(
      `INSERT INTO enrollments (id, student_id, class_id, section_id, status)
       VALUES ($1, $2, $3, $4, 'enrolled')
       ON CONFLICT (id) DO UPDATE SET student_id = EXCLUDED.student_id, class_id = EXCLUDED.class_id,
         section_id = EXCLUDED.section_id, status = 'enrolled'`,
      [enrollment.id, enrollment.studentId, schoolClass.id, section.id],
    );
  }

  await client.query(
    `INSERT INTO lessons (id, title, description, class_id, "order", is_draft)
     VALUES ($1, $2, $3, $4, 1, false)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, class_id = EXCLUDED.class_id, is_draft = false`,
    [fixture.content.id, fixture.content.title, fixture.content.description, schoolClass.id],
  );
  await client.query(
    `INSERT INTO lesson_content_blocks (id, lesson_id, type, "order", content, metadata)
     VALUES ($1, $2, 'text', 1, $3::json, '{"classification":"synthetic-documentation-only"}'::json)
     ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, "order" = 1,
       metadata = EXCLUDED.metadata, updated_at = NOW()`,
    [fixture.content.blockId, fixture.content.id,
      JSON.stringify({ html: '<h2>Balance both sides</h2><p>Apply the same inverse operation to both sides of an equation, then check the solution.</p>' })],
  );
  const contentModule = fixture.content.module;
  await client.query(
    `INSERT INTO class_modules (id, class_id, title, description, "order", is_visible, is_locked)
     VALUES ($1, $2, $3, $4, 1, true, false)
     ON CONFLICT (id) DO UPDATE SET class_id = EXCLUDED.class_id, title = EXCLUDED.title,
       description = EXCLUDED.description, is_visible = true, is_locked = false, updated_at = NOW()`,
    [contentModule.id, schoolClass.id, contentModule.title, contentModule.description],
  );
  await client.query(
    `INSERT INTO module_sections (id, module_id, title, description, "order")
     VALUES ($1, $2, $3, 'Synthetic module section used only for documentation captures.', 1)
     ON CONFLICT (id) DO UPDATE SET module_id = EXCLUDED.module_id, title = EXCLUDED.title,
       description = EXCLUDED.description, "order" = EXCLUDED."order", updated_at = NOW()`,
    [contentModule.section.id, contentModule.id, contentModule.section.title],
  );
  await client.query(
    `INSERT INTO module_items (id, module_section_id, item_type, lesson_id, "order", is_visible, is_required, is_given)
     VALUES ($1, $2, 'lesson', $3, 1, true, true, true)
     ON CONFLICT (id) DO UPDATE SET module_section_id = EXCLUDED.module_section_id,
       item_type = 'lesson', lesson_id = EXCLUDED.lesson_id, "order" = EXCLUDED."order",
       is_visible = true, is_required = true, is_given = true, updated_at = NOW()`,
    [contentModule.section.item.id, contentModule.section.id, contentModule.section.item.lessonId],
  );
  const fileArtifact = fixture.fileArtifact;
  await client.query(
    `INSERT INTO uploaded_files (id, teacher_id, class_id, scope, ai_enabled, teacher_visible,
       index_status, file_kind, original_name, stored_name, mime_type, size_bytes, file_path,
       storage_key, storage_provider)
     VALUES ($1, $2, $3, 'private', true, true, 'completed', 'pdf', $4, $4, $5, $6,
       '/synthetic-documentation-only/linear-equations-reference.pdf',
       'synthetic-documentation-only/linear-equations-reference.pdf', 'local')
     ON CONFLICT (id) DO UPDATE SET original_name = EXCLUDED.original_name,
       stored_name = EXCLUDED.stored_name, mime_type = EXCLUDED.mime_type,
       size_bytes = EXCLUDED.size_bytes, deleted_at = NULL, index_status = 'completed'`,
    [fileArtifact.file.id, teacher.id, schoolClass.id, fileArtifact.file.name,
      fileArtifact.file.mimeType, fileArtifact.file.sizeBytes],
  );
  await client.query(
    `INSERT INTO module_items (id, module_section_id, item_type, file_id, "order", is_visible, is_required, is_given, metadata)
     VALUES ($1, $2, 'file', $3, 2, true, false, true, '{"fileSubtype":"pdf"}'::json)
     ON CONFLICT (id) DO UPDATE SET module_section_id = EXCLUDED.module_section_id,
       item_type = 'file', file_id = EXCLUDED.file_id, "order" = EXCLUDED."order",
       is_visible = true, is_given = true, updated_at = NOW()`,
    [fileArtifact.moduleItem.id, contentModule.section.id, fileArtifact.file.id],
  );
  const extractionContent = {
    title: fileArtifact.extraction.title,
    description: `<p>${fileArtifact.extraction.description}</p>`,
    sections: [{
      title: 'Worked Examples',
      description: 'Teacher review section for the synthetic reference.',
      order: 1,
      reviewState: 'ready',
      lessonBlocks: [{
        type: 'text',
        content: { html: '<p>Keep both sides balanced by applying the same inverse operation.</p>' },
        order: 0,
        metadata: { instructionalRole: 'explanation' },
      }],
      assessmentDraft: {
        title: 'Quick Check',
        description: 'A one-question formative check.',
        type: 'quiz',
        passingScore: 75,
        feedbackLevel: 'standard',
        questions: [{ content: 'Solve x + 3 = 7.', type: 'short_answer', points: 1, order: 1 }],
      },
    }],
    mediaAssets: [],
    audit: {
      coherenceScore: 0.96,
      coherenceWarnings: [],
      repairNotes: [],
      confidenceBreakdown: { overallConfidence: 0.96, warningCount: 0 },
      reviewState: 'ready',
      reviewIssues: [],
      pipelineStages: ['ingest', 'classify', 'segment', 'structure', 'validate', 'persist'],
      requestedSectionCount: 3,
      finalSectionCount: 1,
      sectionCountAdjustmentReason: 'The short synthetic source is intentionally one section.',
    },
  };
  await client.query(
    `INSERT INTO extracted_modules (id, file_id, class_id, teacher_id, raw_text, structured_content,
       extraction_status, model_used, is_applied, progress_percent, total_chunks, processed_chunks)
     VALUES ($1, $2, $3, $4, 'Synthetic documentation extraction text.', $5::json,
       'completed', 'documentation-fixture', false, 100, 1, 1)
     ON CONFLICT (id) DO UPDATE SET structured_content = EXCLUDED.structured_content,
       extraction_status = 'completed', model_used = EXCLUDED.model_used,
       is_applied = false, progress_percent = 100, total_chunks = 1, processed_chunks = 1,
       error_message = NULL, updated_at = NOW()`,
    [fileArtifact.extraction.id, fileArtifact.file.id, schoolClass.id, teacher.id,
      JSON.stringify(extractionContent)],
  );
  await client.query(
    `INSERT INTO assessments (id, title, description, class_id, type, total_points, passing_score, max_attempts, is_published, class_record_category, quarter)
     VALUES ($1, $2, $3, $4, 'quiz', $5, $6, 2, true, 'quarterly_assessment', $7)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
       total_points = EXCLUDED.total_points, passing_score = EXCLUDED.passing_score, is_published = true, quarter = EXCLUDED.quarter`,
    [fixture.assessment.id, fixture.assessment.title, fixture.assessment.description, schoolClass.id, fixture.assessment.totalPoints, fixture.assessment.passingScore, fixture.quarter],
  );
  await client.query(
    `INSERT INTO assessment_questions (id, assessment_id, type, content, points, "order", concept_tags)
     VALUES ($1, $2, 'multiple_choice', $3, $4, 1, '["linear equations"]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, points = EXCLUDED.points, concept_tags = EXCLUDED.concept_tags`,
    [fixture.assessment.question.id, fixture.assessment.id, fixture.assessment.question.content, fixture.assessment.question.points],
  );
  for (const option of fixture.assessment.options) {
    await client.query(
      `INSERT INTO assessment_question_options (id, question_id, text, is_correct, "order")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, is_correct = EXCLUDED.is_correct, "order" = EXCLUDED."order"`,
      [option.id, fixture.assessment.question.id, option.text, option.isCorrect, option.order],
    );
  }
  const template = fixture.classTemplate;
  await client.query(
    `INSERT INTO class_templates (id, name, subject_code, subject_grade_level, status, created_by)
     VALUES ($1, $2, $3, $4, 'draft', $5)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, subject_code = EXCLUDED.subject_code,
       subject_grade_level = EXCLUDED.subject_grade_level, status = 'draft', updated_at = NOW()`,
    [template.id, template.name, template.subjectCode, template.gradeLevel, admin.id],
  );
  await client.query(
    `INSERT INTO class_template_modules (id, template_id, title, description, "order", is_visible, is_locked, teacher_notes)
     VALUES ($1, $2, $3, 'Synthetic template module used only for documentation captures.', 1, true, false,
       'Review the example before publishing the template.')
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
       "order" = 1, is_visible = true, is_locked = false, teacher_notes = EXCLUDED.teacher_notes, updated_at = NOW()`,
    [template.module.id, template.id, template.module.title],
  );
  await client.query(
    `INSERT INTO class_template_module_sections (id, template_module_id, title, description, "order")
     VALUES ($1, $2, $3, 'Synthetic reusable content section.', 1)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
       "order" = 1, updated_at = NOW()`,
    [template.module.section.id, template.module.id, template.module.section.title],
  );
  await client.query(
    `INSERT INTO class_template_lessons (id, template_id, title, summary, "order")
     VALUES ($1, $2, $3, 'A reusable lesson example for documentation.', 1)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
       "order" = 1, updated_at = NOW()`,
    [template.lesson.id, template.id, template.lesson.title],
  );
  await client.query(
    `INSERT INTO class_template_lesson_blocks (id, template_lesson_id, block_type, block_version, payload, "order")
     VALUES ($1, $2, 'text', 1, $3::json, 1)
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, "order" = 1, updated_at = NOW()`,
    [template.lesson.blockId, template.lesson.id,
      JSON.stringify({ html: '<p>Solve an equation by using inverse operations and checking the result.</p>' })],
  );
  await client.query(
    `INSERT INTO class_template_assessments (id, template_id, title, description, type, settings, total_points, "order")
     VALUES ($1, $2, $3, 'Reusable knowledge check for the documentation template.', 'quiz',
       '{"passingScore":75,"maxAttempts":2}'::json, 10, 1)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
       settings = EXCLUDED.settings, total_points = 10, "order" = 1, updated_at = NOW()`,
    [template.assessment.id, template.id, template.assessment.title],
  );
  await client.query(
    `INSERT INTO class_template_assessment_questions
       (id, template_assessment_id, type, content, points, "order", is_required, explanation)
     VALUES ($1, $2, 'multiple_choice', 'Solve 2x + 6 = 14.', 10, 1, true,
       'Subtract 6 from both sides, then divide by 2.')
     ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, points = 10,
       explanation = EXCLUDED.explanation, updated_at = NOW()`,
    [template.assessment.questionId, template.assessment.id],
  );
  for (const [index, option] of template.assessment.options.entries()) {
    await client.query(
      `INSERT INTO class_template_assessment_question_options
         (id, template_assessment_question_id, text, is_correct, "order")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, is_correct = EXCLUDED.is_correct,
         "order" = EXCLUDED."order", updated_at = NOW()`,
      [option.id, template.assessment.questionId, option.text, option.isCorrect, index + 1],
    );
  }
  for (const [index, item] of template.module.section.items.entries()) {
    await client.query(
      `INSERT INTO class_template_module_items
         (id, template_section_id, item_type, template_assessment_id, template_lesson_id, "order", is_required, points)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       ON CONFLICT (id) DO UPDATE SET item_type = EXCLUDED.item_type,
         template_assessment_id = EXCLUDED.template_assessment_id,
         template_lesson_id = EXCLUDED.template_lesson_id, "order" = EXCLUDED."order",
         is_required = true, points = EXCLUDED.points, updated_at = NOW()`,
      [item.id, template.module.section.id, item.type,
        item.assessmentId ?? null, item.lessonId ?? null, index + 1,
        item.type === 'assessment' ? 10 : null],
    );
  }
  await client.query(
    `INSERT INTO class_template_announcements (id, template_id, title, content, is_pinned, "order")
     VALUES ($1, $2, $3, 'Start with the worked examples before answering the knowledge check.', true, 1)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content,
       is_pinned = true, "order" = 1, updated_at = NOW()`,
    [template.announcement.id, template.id, template.announcement.title],
  );
  const correctOption = fixture.assessment.options.find((option) => option.isCorrect);
  const attempt = fixture.returnedAttempt;
  await client.query(
    `INSERT INTO assessment_attempts (id, student_id, assessment_id, attempt_number, submitted_at, score,
       base_points_earned, possible_points_snapshot, passed, is_submitted, is_returned, returned_at, teacher_feedback)
     VALUES ($1, $2, $3, 1, NOW() - INTERVAL '1 day', $4, 13, 20, false, true, true, NOW(), $5)
     ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, base_points_earned = EXCLUDED.base_points_earned,
       possible_points_snapshot = EXCLUDED.possible_points_snapshot, passed = false, is_submitted = true,
       is_returned = true, returned_at = EXCLUDED.returned_at, teacher_feedback = EXCLUDED.teacher_feedback`,
    [attempt.id, attempt.studentId, fixture.assessment.id, attempt.score, attempt.teacherFeedback],
  );
  await client.query(
    `INSERT INTO assessment_responses (id, attempt_id, question_id, student_answer, selected_option_id, is_correct, points_earned)
     VALUES ($1, $2, $3, 'x = 4', $4, true, 13)
     ON CONFLICT (id) DO UPDATE SET student_answer = EXCLUDED.student_answer,
       selected_option_id = EXCLUDED.selected_option_id, is_correct = true, points_earned = 13`,
    [attempt.responseId, attempt.id, fixture.assessment.question.id, correctOption.id],
  );

  const record = fixture.classRecord;
  await client.query(
    `INSERT INTO class_records (id, class_id, teacher_id, grading_period, status, roster_confirmed_at, roster_confirmed_by)
     VALUES ($1, $2, $3, $4, $5, NOW(), $3)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, roster_confirmed_at = EXCLUDED.roster_confirmed_at, roster_confirmed_by = EXCLUDED.roster_confirmed_by`,
    [record.id, schoolClass.id, teacher.id, fixture.quarter, record.status],
  );
  for (const category of record.categories) {
    await client.query(
      `INSERT INTO class_record_categories (id, gradebook_id, name, weight_percentage)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, weight_percentage = EXCLUDED.weight_percentage`,
      [category.id, record.id, category.name, category.weight],
    );
  }
  for (const item of record.items) {
    await client.query(
      `INSERT INTO class_record_items (id, gradebook_id, category_id, assessment_id, title, max_score, item_order, date_given)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
       ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, assessment_id = EXCLUDED.assessment_id,
         title = EXCLUDED.title, max_score = EXCLUDED.max_score, item_order = EXCLUDED.item_order`,
      [item.id, record.id, item.categoryId, item.order === 2 ? fixture.assessment.id : null, item.title, item.maxScore, item.order],
    );
  }
  for (const score of record.scores) {
    await client.query(
      `INSERT INTO class_record_scores (id, gradebook_item_id, student_id, score, status)
       VALUES ($1, $2, $3, $4, 'recorded')
       ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, status = 'recorded', updated_at = NOW()`,
      [score.id, score.itemId, score.studentId, score.score],
    );
  }

  for (const snapshot of fixture.performance.snapshots) {
    await client.query(
      `INSERT INTO performance_snapshots (id, class_id, student_id, assessment_average, class_record_average,
         blended_score, assessment_sample_size, class_record_sample_size, has_data, is_at_risk, threshold_applied)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 2, true, $7, 74)
       ON CONFLICT (id) DO UPDATE SET assessment_average = EXCLUDED.assessment_average,
         class_record_average = EXCLUDED.class_record_average, blended_score = EXCLUDED.blended_score,
         has_data = true, is_at_risk = EXCLUDED.is_at_risk, updated_at = NOW()`,
      [snapshot.id, schoolClass.id, snapshot.studentId, snapshot.assessmentAverage, snapshot.classRecordAverage, snapshot.blendedScore, snapshot.isAtRisk],
    );
  }
  await client.query(
    `INSERT INTO performance_logs (id, class_id, student_id, previous_is_at_risk, current_is_at_risk,
       assessment_average, class_record_average, blended_score, threshold_applied, trigger_source)
     VALUES ($1, $2, $3, false, true, 65, 68, 66.5, 74, 'documentation_fixture')
     ON CONFLICT (id) DO NOTHING`,
    [fixture.performance.log.id, schoolClass.id, fixture.performance.log.studentId],
  );
  await client.query(
    `INSERT INTO intervention_cases (id, class_id, student_id, status, trigger_source, trigger_score, threshold_applied, note)
     VALUES ($1, $2, $3, $4, 'documentation_fixture', 66.5, 74, 'Synthetic case for the user manual.')
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, trigger_score = EXCLUDED.trigger_score, note = EXCLUDED.note, updated_at = NOW()`,
    [fixture.intervention.id, schoolClass.id, fixture.intervention.studentId, fixture.intervention.status],
  );
  await client.query(
    `INSERT INTO intervention_assignments (id, case_id, assignment_type, lesson_id, checkpoint_label, order_index)
     VALUES ($1, $2, 'lesson_review', $3, 'Review the worked example', 1)
     ON CONFLICT (id) DO UPDATE SET lesson_id = EXCLUDED.lesson_id, checkpoint_label = EXCLUDED.checkpoint_label`,
    [fixture.intervention.assignmentId, fixture.intervention.id, fixture.content.id],
  );
  const generatedLesson = fixture.intervention.generatedLesson;
  await client.query(
    `INSERT INTO lxp_generated_remedial_lessons
       (id, case_id, class_id, student_id, approval_status, title, summary, lesson_body,
        weak_concepts, source_lesson_ids, source_references, approved_by, approved_at)
     VALUES ($1, $2, $3, $4, 'approved', 'Linear Equations Step-by-Step',
       'A focused review of inverse operations for the documentation learner.', $5,
       $6::json, $7::json, $8::json, $9, NOW())
     ON CONFLICT (id) DO UPDATE SET approval_status = 'approved', title = EXCLUDED.title,
       summary = EXCLUDED.summary, lesson_body = EXCLUDED.lesson_body,
       weak_concepts = EXCLUDED.weak_concepts, source_lesson_ids = EXCLUDED.source_lesson_ids,
       source_references = EXCLUDED.source_references, approved_by = EXCLUDED.approved_by,
       approved_at = EXCLUDED.approved_at, rejected_at = NULL, updated_at = NOW()`,
    [generatedLesson.id, fixture.intervention.id, schoolClass.id,
      fixture.intervention.studentId,
      '## Balance the equation\n\nSubtract 6 from both sides of `2x + 6 = 14`, then divide both sides by 2.\n\n- Check: `2(4) + 6 = 14`\n- Therefore, `x = 4`.',
      JSON.stringify(['inverse operations', 'checking solutions']),
      JSON.stringify([fixture.content.id]),
      JSON.stringify([{ id: fixture.content.id, title: fixture.content.title }]),
      teacher.id],
  );
  await client.query(
    `INSERT INTO intervention_assignments
       (id, case_id, assignment_type, generated_remedial_lesson_id, checkpoint_label, order_index, xp_awarded)
     VALUES ($1, $2, 'generated_lesson_review', $3, 'Review the step-by-step remedial lesson', 2, 20)
     ON CONFLICT (id) DO UPDATE SET generated_remedial_lesson_id = EXCLUDED.generated_remedial_lesson_id,
       checkpoint_label = EXCLUDED.checkpoint_label, order_index = 2, xp_awarded = 20`,
    [generatedLesson.assignmentId, fixture.intervention.id, generatedLesson.id],
  );
  const guidedAssessment = fixture.intervention.guidedAssessment;
  const guidedQuestions = [{
    id: 'guided-q1',
    type: 'multiple_choice',
    stem: 'What is the first step when solving 2x + 6 = 14?',
    explanation: 'Subtract 6 from both sides to isolate the term containing x.',
    hint: 'Undo addition before undoing multiplication.',
    reviewHint: 'Use the inverse operation for +6.',
    weakConceptTag: 'inverse operations',
    options: [
      { id: 'guided-q1-a', text: 'Subtract 6 from both sides', isCorrect: true },
      { id: 'guided-q1-b', text: 'Add 6 to both sides', isCorrect: false },
      { id: 'guided-q1-c', text: 'Divide by 6', isCorrect: false },
    ],
  }];
  await client.query(
    `INSERT INTO lxp_generated_guided_assessments
       (id, case_id, class_id, student_id, approval_status, source_assessment_id,
        title, description, weak_concepts, source_references, questions,
        formative_summary, approved_by, approved_at)
     VALUES ($1, $2, $3, $4, 'approved', $5, 'Guided Linear Equations Check',
       'A supportive one-question check with hints and explanations.', $6::json, $7::json,
       $8::json, 'This guided check supports remediation and does not directly change the official grade.', $9, NOW())
     ON CONFLICT (id) DO UPDATE SET approval_status = 'approved', source_assessment_id = EXCLUDED.source_assessment_id,
       title = EXCLUDED.title, description = EXCLUDED.description, weak_concepts = EXCLUDED.weak_concepts,
       source_references = EXCLUDED.source_references, questions = EXCLUDED.questions,
       formative_summary = EXCLUDED.formative_summary, approved_by = EXCLUDED.approved_by,
       approved_at = EXCLUDED.approved_at, rejected_at = NULL, updated_at = NOW()`,
    [guidedAssessment.id, fixture.intervention.id, schoolClass.id,
      fixture.intervention.studentId, fixture.assessment.id,
      JSON.stringify(['inverse operations']),
      JSON.stringify([{ id: fixture.assessment.id, title: fixture.assessment.title }]),
      JSON.stringify(guidedQuestions), teacher.id],
  );
  await client.query(
    `INSERT INTO intervention_assignments
       (id, case_id, assignment_type, generated_guided_assessment_id, checkpoint_label, order_index, xp_awarded)
     VALUES ($1, $2, 'guided_assessment', $3, 'Try the guided remedial check', 3, 30)
     ON CONFLICT (id) DO UPDATE SET generated_guided_assessment_id = EXCLUDED.generated_guided_assessment_id,
       checkpoint_label = EXCLUDED.checkpoint_label, order_index = 3, xp_awarded = 30`,
    [guidedAssessment.assignmentId, fixture.intervention.id, guidedAssessment.id],
  );

  await client.query(
    `INSERT INTO system_evaluation_campaigns (id, created_by, form_type, target_module, audience_role, class_id, title, starts_at, ends_at, status)
     VALUES ($1, $2, 'system', 'overall', 'student', $3, 'Nexora Documentation Feedback', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 day', 'active')
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, status = 'active'`,
    [fixture.evaluation.campaignId, admin.id, schoolClass.id],
  );
  await client.query(
    `INSERT INTO system_evaluations (id, campaign_id, submitted_by, target_module, usability_score,
       functionality_score, performance_score, satisfaction_score, overall_score, feedback)
     VALUES ($1, $2, $3, 'overall', 4, 5, 4, 5, 5, 'Synthetic evaluation response for documentation.')
     ON CONFLICT (id) DO UPDATE SET feedback = EXCLUDED.feedback, overall_score = EXCLUDED.overall_score`,
    [fixture.evaluation.id, fixture.evaluation.campaignId, students[1].id],
  );
  await client.query(
    `INSERT INTO system_evaluation_assignments (id, campaign_id, respondent_id, respondent_role, status, submitted_evaluation_id, submitted_at)
     VALUES ($1, $2, $3, 'student', 'submitted', $4, NOW())
     ON CONFLICT (id) DO UPDATE SET status = 'submitted', submitted_evaluation_id = EXCLUDED.submitted_evaluation_id, submitted_at = EXCLUDED.submitted_at`,
    [fixture.evaluation.assignmentId, fixture.evaluation.campaignId, students[1].id, fixture.evaluation.id],
  );

  await client.query(
    `INSERT INTO announcements (id, class_id, author_id, title, content, is_pinned, is_visible, published_at)
     VALUES ($1, $2, $3, $4, 'This is synthetic documentation content.', true, true, NOW())
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, is_visible = true, published_at = EXCLUDED.published_at`,
    [fixture.announcement.id, schoolClass.id, teacher.id, fixture.announcement.title],
  );
  await client.query(
    `INSERT INTO school_events (id, event_type, school_year, title, description, location, starts_at, ends_at, all_day)
     VALUES ($1, 'school_event', $2, $3, 'Synthetic calendar entry for documentation.', 'GABHS Main Hall', NOW() + INTERVAL '7 day', NOW() + INTERVAL '7 day 2 hour', false)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at`,
    [fixture.calendarEvent.id, fixture.schoolYear, fixture.calendarEvent.title],
  );
  await client.query(
    `INSERT INTO notifications (id, user_id, type, reference_id, title, body, metadata, is_read)
     VALUES ($1, $2, 'announcement_posted', $3, $4, 'A synthetic class announcement is ready.', '{"classification":"synthetic"}'::json, false)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, is_read = false`,
    [fixture.notification.id, students[0].id, fixture.announcement.id, fixture.notification.title],
  );
  await client.query(
    `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, 'documentation_fixture', $4, '{"classification":"synthetic"}'::json)
     ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, metadata = EXCLUDED.metadata`,
    [fixture.auditRecord.id, admin.id, fixture.auditRecord.action, schoolClass.id],
  );
  await client.query(
    `INSERT INTO admin_demo_mode_states (id, enabled, reason, version)
     VALUES ($1, false, 'Documentation fixture leaves demo mode disabled', 1)
     ON CONFLICT (id) DO UPDATE SET enabled = false, reason = EXCLUDED.reason, version = EXCLUDED.version, updated_at = NOW()`,
    [fixture.systemSettings.id],
  );
}

export async function seedDocumentationData({ connectionString, password }) {
  assertDisposableTarget(connectionString);
  if (!password || password.length < 12) {
    throw new Error('NEXORA_DOC_ACCOUNT_PASSWORD must contain at least 12 characters.');
  }
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const { Client, hash } = await loadDatabaseRuntime();
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await assertMigrations(client);
    const passwordHash = await hash(password, 10);
    await client.query('BEGIN');
    await upsertFixture(client, fixture, passwordHash);
    await client.query('COMMIT');
    return { fixture, identities: collectFixtureIdentities(fixture) };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const connectionString = process.env.NEXORA_DOC_DATABASE_URL;
  const password = process.env.NEXORA_DOC_ACCOUNT_PASSWORD;
  const result = await seedDocumentationData({ connectionString, password });
  console.log(
    `Documentation fixture applied: ${result.identities.size} stable synthetic identities.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
