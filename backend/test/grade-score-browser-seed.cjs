// Disposable localhost-only fixtures for authenticated grade-cap browser checks.
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const ids = {
  admin: 'a1000000-0000-0000-0000-000000000001',
  teacher: 'a1000000-0000-0000-0000-000000000002',
  student: 'a1000000-0000-0000-0000-000000000003',
  section: 'a2000000-0000-0000-0000-000000000001',
  class: 'a3000000-0000-0000-0000-000000000001',
  assessment: 'a4000000-0000-0000-0000-000000000001',
  question: 'a5000000-0000-0000-0000-000000000001',
  option: 'a6000000-0000-0000-0000-000000000001',
  attempt: 'a7000000-0000-0000-0000-000000000001',
  response: 'a8000000-0000-0000-0000-000000000001',
  record: 'a9000000-0000-0000-0000-000000000001',
  participant: 'a9000000-0000-0000-0000-000000000002',
  category: 'aa000000-0000-0000-0000-000000000001',
  item: 'ab000000-0000-0000-0000-000000000001',
  score: 'ac000000-0000-0000-0000-000000000001',
  finalGrade: 'ad000000-0000-0000-0000-000000000001',
  performance: 'ae000000-0000-0000-0000-000000000001',
};

async function main() {
  const connectionString = process.env.ACADEMIC_TEST_DATABASE_URL;
  assert(connectionString, 'Provide ACADEMIC_TEST_DATABASE_URL');
  const url = new URL(connectionString);
  assert(
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      url.pathname.startsWith('/nexora_academic_test_'),
    'Only disposable local Nexora academic test databases are permitted',
  );

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const [{ count }] = (
      await client.query('SELECT count(*)::int AS count FROM users')
    ).rows;
    assert.equal(count, 0, 'Grade browser fixture requires an empty database');

    const password = 'NexoraGradeCap!2026';
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    const roleIds = {};
    for (const role of ['admin', 'teacher', 'student']) {
      const roleId = `${role === 'admin' ? 'b1' : role === 'teacher' ? 'b2' : 'b3'}000000-0000-0000-0000-000000000001`;
      roleIds[role] = roleId;
      await client.query('INSERT INTO roles (id, name) VALUES ($1, $2)', [
        roleId,
        role,
      ]);
    }

    for (const [role, userId] of [
      ['admin', ids.admin],
      ['teacher', ids.teacher],
      ['student', ids.student],
    ]) {
      await client.query(
        `INSERT INTO users
          (id, email, password, first_name, last_name, is_email_verified)
         VALUES ($1, $2, $3, $4, 'Fixture', true)`,
        [
          userId,
          `grade-cap-${role}@example.invalid`,
          passwordHash,
          role === 'admin' ? 'Alex' : role === 'teacher' ? 'Tessa' : 'Ana',
        ],
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, 'LOCAL_TEST')`,
        [userId, roleIds[role]],
      );
    }

    await client.query(
      `INSERT INTO student_profiles (user_id, grade_level, lrn)
       VALUES ($1, '8', '000000260101')`,
      [ids.student],
    );
    await client.query(
      `INSERT INTO teacher_profiles (user_id, department, specialization)
       VALUES ($1, 'Mathematics', 'Mathematics')`,
      [ids.teacher],
    );
    await client.query(
      `INSERT INTO sections
        (id, name, grade_level, school_year, room_number, adviser_id)
       VALUES ($1, 'Grade Cap Fixture', '8', '2026-2027', '101', $2)`,
      [ids.section, ids.teacher],
    );
    await client.query(
      `INSERT INTO classes
        (id, subject_name, subject_code, subject_grade_level, section_id,
         teacher_id, school_year, room)
       VALUES ($1, 'Mathematics 8', 'MATH-CAP', '8', $2, $3,
         '2026-2027', '101')`,
      [ids.class, ids.section, ids.teacher],
    );
    await client.query(
      `INSERT INTO enrollments (student_id, class_id, section_id)
       VALUES ($1, $2, $3)`,
      [ids.student, ids.class, ids.section],
    );
    await client.query(
      `INSERT INTO academic_system_states
        (id, school_year, quarter, version, updated_by)
       VALUES ('b4000000-0000-0000-0000-000000000001',
         '2026-2027', 'Q1', 1, $1)`,
      [ids.admin],
    );

    await client.query(
      `INSERT INTO assessments
        (id, title, description, class_id, type, total_points, passing_score,
         max_attempts, is_published, class_record_category, quarter)
       VALUES ($1, 'Ten-point cap check', 'Five base points plus fifteen bonus points.',
         $2, 'quiz', 10, 75, 1, true, 'written_work', 'Q1')`,
      [ids.assessment, ids.class],
    );
    await client.query(
      `INSERT INTO assessment_questions
        (id, assessment_id, type, content, points, "order")
       VALUES ($1, $2, 'multiple_choice', 'What is five plus five?', 10, 1)`,
      [ids.question, ids.assessment],
    );
    await client.query(
      `INSERT INTO assessment_question_options
        (id, question_id, text, is_correct, "order")
       VALUES ($1, $2, '10', true, 1)`,
      [ids.option, ids.question],
    );
    await client.query(
      `INSERT INTO assessment_attempts
        (id, student_id, assessment_id, attempt_number, submitted_at, score,
         base_points_earned, possible_points_snapshot, bonus_points,
         bonus_reason, passed, is_submitted, is_returned, returned_at,
         teacher_feedback, direct_score)
       VALUES ($1, $2, $3, 1, now(), 100, 5, 10, 15,
         'Teacher correction after review', true, true, true, now(),
         'Full credit after a documented correction.', 100)`,
      [ids.attempt, ids.student, ids.assessment],
    );
    await client.query(
      `INSERT INTO assessment_responses
        (id, attempt_id, question_id, selected_option_id, is_correct,
         points_earned)
       VALUES ($1, $2, $3, $4, false, 5)`,
      [ids.response, ids.attempt, ids.question, ids.option],
    );

    await client.query(
      `INSERT INTO class_records
        (id, class_id, teacher_id, grading_period, status, revision,
         roster_confirmed_at, roster_confirmed_by)
       VALUES ($1, $2, $3, 'Q1', 'finalized', 1, now(), $3)`,
      [ids.record, ids.class, ids.teacher],
    );
    await client.query(
      `INSERT INTO class_record_participants
        (id, class_record_id, student_id, eligibility, source, updated_by)
       VALUES ($1, $2, $3, 'eligible', 'local_grade_cap_fixture', $4)`,
      [ids.participant, ids.record, ids.student, ids.teacher],
    );
    await client.query(
      `INSERT INTO class_record_categories
        (id, gradebook_id, name, weight_percentage)
       VALUES ($1, $2, 'Written Works', 100)`,
      [ids.category, ids.record],
    );
    await client.query(
      `INSERT INTO class_record_items
        (id, gradebook_id, category_id, assessment_id, title, max_score,
         item_order, date_given)
       VALUES ($1, $2, $3, $4, 'Ten-point cap check', 10, 1, current_date)`,
      [ids.item, ids.record, ids.category, ids.assessment],
    );
    await client.query(
      `INSERT INTO class_record_scores
        (id, gradebook_item_id, student_id, score, bonus_points, bonus_reason,
         status, source_attempt_id)
       VALUES ($1, $2, $3, 5, 15, 'Teacher correction after review',
         'recorded', $4)`,
      [ids.score, ids.item, ids.student, ids.attempt],
    );
    await client.query(
      `INSERT INTO class_record_final_grades
        (id, gradebook_id, student_id, revision, final_percentage, remarks)
       VALUES ($1, $2, $3, 1, 100, 'Passed')`,
      [ids.finalGrade, ids.record, ids.student],
    );
    await client.query(
      `INSERT INTO performance_snapshots
        (id, class_id, student_id, assessment_average, class_record_average,
         blended_score, assessment_sample_size, class_record_sample_size,
         has_data, is_at_risk, threshold_applied)
       VALUES ($1, $2, $3, 100, 100, 100, 1, 1, true, false, 74)`,
      [ids.performance, ids.class, ids.student],
    );

    await client.query('COMMIT');
    console.log(
      JSON.stringify({
        ids,
        credentials: {
          admin: 'grade-cap-admin@example.invalid',
          teacher: 'grade-cap-teacher@example.invalid',
          student: 'grade-cap-student@example.invalid',
          password,
        },
      }),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
