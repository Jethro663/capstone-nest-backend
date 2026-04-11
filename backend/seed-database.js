/**
 * Database Seeding Script
 *
 * Initializes the LMS database with baseline demo data:
 * - Roles
 * - Admin, teacher, and student users
 * - Teacher and student profiles
 * - Sections and classes
 * - Class schedules
 * - Student enrollments
 *
 * Usage: node seed-database.js
 */

import { Client } from 'pg';
import { genSalt, hash } from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { config } from 'dotenv';

config();

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:200411@postgres:5432/capstone';

const ROLES = [
  { name: 'admin', description: 'System administrator with full access' },
  {
    name: 'teacher',
    description: 'Teacher who can create and manage classes and lessons',
  },
  {
    name: 'student',
    description: 'Student who can enroll in classes and complete lessons',
  },
];

const SCHOOL_YEAR = '2024-2025';
const DEFAULT_TEACHER_PASSWORD = 'Teacher123!';
const DEFAULT_STUDENT_PASSWORD = 'Student123!';

const ADMIN_USER = {
  email: 'admin@lms.local',
  password: 'Test@123',
  firstName: 'System',
  lastName: 'Admin',
};

const TEACHERS = [
  {
    email: 'teacher1@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Ana',
    lastName: 'Reyes',
    dateOfBirth: '1988-02-14',
    gender: 'Female',
    address: 'Blk 1 Lot 8, Rizal Street, Taguig City',
    department: 'Mathematics',
    specialization: 'Mathematics 7',
    contactNumber: '09171234567',
    employeeId: 'TCHR-001',
  },
  {
    email: 'teacher2@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Ben',
    lastName: 'Santos',
    dateOfBirth: '1987-07-21',
    gender: 'Male',
    address: '27 Sampaguita Street, Taguig City',
    department: 'Science',
    specialization: 'Science 7',
    contactNumber: '09181234567',
    employeeId: 'TCHR-002',
  },
  {
    email: 'teacher3@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Carla',
    lastName: 'Garcia',
    dateOfBirth: '1989-11-03',
    gender: 'Female',
    address: '15 Acacia Avenue, Taguig City',
    department: 'Languages',
    specialization: 'English 8',
    contactNumber: '09191234567',
    employeeId: 'TCHR-003',
  },
  {
    email: 'teacher4@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Daniel',
    lastName: 'Flores',
    dateOfBirth: '1986-05-29',
    gender: 'Male',
    address: '88 Bonifacio Road, Taguig City',
    department: 'Languages',
    specialization: 'Filipino 8',
    contactNumber: '09201234567',
    employeeId: 'TCHR-004',
  },
  {
    email: 'teacher5@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Elena',
    lastName: 'Cruz',
    dateOfBirth: '1985-09-17',
    gender: 'Female',
    address: '12 Mabini Extension, Taguig City',
    department: 'Social Studies',
    specialization: 'Araling Panlipunan 9',
    contactNumber: '09211234567',
    employeeId: 'TCHR-005',
  },
  {
    email: 'teacher6@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Felix',
    lastName: 'Mendoza',
    dateOfBirth: '1984-01-12',
    gender: 'Male',
    address: '46 Kalayaan Street, Taguig City',
    department: 'Technology and Livelihood Education',
    specialization: 'TLE 9',
    contactNumber: '09221234567',
    employeeId: 'TCHR-006',
  },
  {
    email: 'teacher7@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Grace',
    lastName: 'Torres',
    dateOfBirth: '1990-04-08',
    gender: 'Female',
    address: '9 Bayani Road, Taguig City',
    department: 'MAPEH',
    specialization: 'MAPEH 10',
    contactNumber: '09231234567',
    employeeId: 'TCHR-007',
  },
  {
    email: 'teacher8@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Henry',
    lastName: 'Aquino',
    dateOfBirth: '1983-12-01',
    gender: 'Male',
    address: '101 Lakandula Street, Taguig City',
    department: 'Values Education',
    specialization: 'ESP 10',
    contactNumber: '09241234567',
    employeeId: 'TCHR-008',
  },
];

const SECTIONS = [
  {
    name: 'Grade 7 - Section A',
    gradeLevel: '7',
    schoolYear: SCHOOL_YEAR,
    capacity: 40,
    roomNumber: '701',
    adviserEmail: 'teacher1@lms.local',
  },
  {
    name: 'Grade 8 - Section A',
    gradeLevel: '8',
    schoolYear: SCHOOL_YEAR,
    capacity: 40,
    roomNumber: '801',
    adviserEmail: 'teacher3@lms.local',
  },
  {
    name: 'Grade 9 - Section A',
    gradeLevel: '9',
    schoolYear: SCHOOL_YEAR,
    capacity: 40,
    roomNumber: '901',
    adviserEmail: 'teacher5@lms.local',
  },
  {
    name: 'Grade 10 - Section A',
    gradeLevel: '10',
    schoolYear: SCHOOL_YEAR,
    capacity: 40,
    roomNumber: '1001',
    adviserEmail: 'teacher7@lms.local',
  },
];

const CLASSES = [
  {
    subjectName: 'Mathematics 7',
    subjectCode: 'MATH-7',
    subjectGradeLevel: '7',
    room: '701',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher1@lms.local',
    sectionGradeLevel: '7',
  },
  {
    subjectName: 'Science 7',
    subjectCode: 'SCI-7',
    subjectGradeLevel: '7',
    room: '702',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher2@lms.local',
    sectionGradeLevel: '7',
  },
  {
    subjectName: 'English 8',
    subjectCode: 'ENG-8',
    subjectGradeLevel: '8',
    room: '801',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher3@lms.local',
    sectionGradeLevel: '8',
  },
  {
    subjectName: 'Filipino 8',
    subjectCode: 'FIL-8',
    subjectGradeLevel: '8',
    room: '802',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher4@lms.local',
    sectionGradeLevel: '8',
  },
  {
    subjectName: 'Araling Panlipunan 9',
    subjectCode: 'AP-9',
    subjectGradeLevel: '9',
    room: '901',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher5@lms.local',
    sectionGradeLevel: '9',
  },
  {
    subjectName: 'TLE 9',
    subjectCode: 'TLE-9',
    subjectGradeLevel: '9',
    room: '902',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher6@lms.local',
    sectionGradeLevel: '9',
  },
  {
    subjectName: 'MAPEH 10',
    subjectCode: 'MAPEH-10',
    subjectGradeLevel: '10',
    room: '1001',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher7@lms.local',
    sectionGradeLevel: '10',
  },
  {
    subjectName: 'ESP 10',
    subjectCode: 'ESP-10',
    subjectGradeLevel: '10',
    room: '1002',
    schoolYear: SCHOOL_YEAR,
    teacherEmail: 'teacher8@lms.local',
    sectionGradeLevel: '10',
  },
];

const CLASS_SCHEDULE_PATTERNS = [
  [
    { days: ['M', 'W', 'F'], startTime: '07:30', endTime: '08:30' },
    { days: ['Th'], startTime: '13:00', endTime: '15:00' },
  ],
  [
    { days: ['T', 'Th'], startTime: '08:30', endTime: '10:00' },
    { days: ['F'], startTime: '10:00', endTime: '11:00' },
  ],
  [
    { days: ['M', 'W'], startTime: '10:00', endTime: '11:30' },
    { days: ['F'], startTime: '13:00', endTime: '14:00' },
  ],
  [
    { days: ['T', 'Th'], startTime: '13:00', endTime: '14:30' },
    { days: ['Sa'], startTime: '08:00', endTime: '09:00' },
  ],
];

const STUDENTS = [
  {
    email: 'student71@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Liam',
    lastName: 'Navarro',
    gradeLevel: '7',
  },
  {
    email: 'student72@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Mia',
    lastName: 'Villanueva',
    gradeLevel: '7',
  },
  {
    email: 'student81@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Noah',
    lastName: 'Ramirez',
    gradeLevel: '8',
  },
  {
    email: 'student82@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Olivia',
    lastName: 'Diaz',
    gradeLevel: '8',
  },
  {
    email: 'student91@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Paolo',
    lastName: 'Castro',
    gradeLevel: '9',
  },
  {
    email: 'student92@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Queenie',
    lastName: 'Ramos',
    gradeLevel: '9',
  },
  {
    email: 'student101@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Rafael',
    lastName: 'Lopez',
    gradeLevel: '10',
  },
  {
    email: 'student102@lms.local',
    password: DEFAULT_STUDENT_PASSWORD,
    firstName: 'Sofia',
    lastName: 'Hernandez',
    gradeLevel: '10',
  },
];

async function hashPassword(plainPassword) {
  const salt = await genSalt(10);
  return hash(plainPassword, salt);
}

function buildLrn(gradeLevel, sequence) {
  const suffixLength = 12 - 4 - gradeLevel.length;
  return `2024${gradeLevel}${String(sequence).padStart(suffixLength, '0')}`;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: `[INFO ${timestamp}]`,
    success: `[OK ${timestamp}]`,
    error: `[ERROR ${timestamp}]`,
    warning: `[WARN ${timestamp}]`,
  }[type];

  console.log(`${prefix ?? `[${timestamp}]`} ${message}`);
}

async function seedDatabase() {
  const client = new Client({ connectionString: DB_URL });

  try {
    await client.connect();
    log('Connected to database');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'intervention_case_status'
            AND e.enumlabel = 'pending'
        ) THEN
          ALTER TYPE intervention_case_status ADD VALUE 'pending';
        END IF;
      END $$;
    `);
    await client.query('BEGIN');

    log('Creating roles...');
    const createdRoles = {};

    for (const role of ROLES) {
      const roleId = uuid();
      try {
        const result = await client.query(
          `INSERT INTO roles (id, name, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE
           SET description = EXCLUDED.description
           RETURNING id`,
          [roleId, role.name, role.description],
        );
        createdRoles[role.name] = result.rows[0].id;
        log(`  - Role '${role.name}' created/verified`, 'success');
      } catch (err) {
        if (err.code !== '23505') {
          throw err;
        }

        const result = await client.query(
          'SELECT id FROM roles WHERE name = $1',
          [role.name],
        );
        if (result.rows.length > 0) {
          createdRoles[role.name] = result.rows[0].id;
          log(`  - Role '${role.name}' already exists`, 'info');
        }
      }
    }

    log('Creating users...');
    const users = {};

    {
      const adminId = uuid();
      const adminPasswordHash = await hashPassword(ADMIN_USER.password);
      const result = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [
          adminId,
          ADMIN_USER.email,
          adminPasswordHash,
          ADMIN_USER.firstName,
          ADMIN_USER.lastName,
          'ACTIVE',
          true,
        ],
      );
      users.admin = result.rows[0].id;
      log(`  - Admin user created (${ADMIN_USER.email})`, 'success');
    }

    for (const teacher of TEACHERS) {
      const teacherId = uuid();
      const teacherPasswordHash = await hashPassword(teacher.password);
      const result = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [
          teacherId,
          teacher.email,
          teacherPasswordHash,
          teacher.firstName,
          teacher.lastName,
          'ACTIVE',
          true,
        ],
      );
      users[teacher.email] = result.rows[0].id;
      log(`  - Teacher user created (${teacher.email})`, 'success');
    }

    for (const student of STUDENTS) {
      const studentUserId = uuid();
      const studentPasswordHash = await hashPassword(student.password);
      const result = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [
          studentUserId,
          student.email,
          studentPasswordHash,
          student.firstName,
          student.lastName,
          'ACTIVE',
          true,
        ],
      );
      users[student.email] = result.rows[0].id;
      log(`  - Student user created (${student.email})`, 'success');
    }

    log('Assigning roles to users...');

    await client.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [users.admin, createdRoles.admin, 'SYSTEM'],
    );
    log('  - Admin role assigned', 'success');

    for (const teacher of TEACHERS) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [users[teacher.email], createdRoles.teacher, 'SYSTEM'],
      );
      log(`  - Teacher role assigned (${teacher.email})`, 'success');
    }

    for (const student of STUDENTS) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [users[student.email], createdRoles.student, 'SYSTEM'],
      );
      log(`  - Student role assigned (${student.email})`, 'success');
    }

    log('Creating teacher profiles...');
    for (const teacher of TEACHERS) {
      await client.query(
        `INSERT INTO teacher_profiles (
           user_id,
           department,
           specialization,
           employee_id,
           date_of_birth,
           gender,
           address,
           contact_number
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE
         SET department = EXCLUDED.department,
             specialization = EXCLUDED.specialization,
             employee_id = EXCLUDED.employee_id,
             date_of_birth = EXCLUDED.date_of_birth,
             gender = EXCLUDED.gender,
             address = EXCLUDED.address,
             contact_number = EXCLUDED.contact_number`,
        [
          users[teacher.email],
          teacher.department,
          teacher.specialization,
          teacher.employeeId,
          teacher.dateOfBirth,
          teacher.gender,
          teacher.address,
          teacher.contactNumber,
        ],
      );
      log(`  - Teacher profile created (${teacher.email})`, 'success');
    }

    log('Creating student profiles...');
    for (const [index, student] of STUDENTS.entries()) {
      try {
        await client.query(
          `INSERT INTO student_profiles (user_id, grade_level, lrn)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE
           SET grade_level = EXCLUDED.grade_level,
               lrn = EXCLUDED.lrn`,
          [
            users[student.email],
            student.gradeLevel,
            buildLrn(student.gradeLevel, index + 1),
          ],
        );
        log(`  - Student profile created (${student.email})`, 'success');
      } catch (err) {
        if (err.code !== '23505') {
          throw err;
        }
        log(
          `  - Student profile already exists or LRN conflicts with another user (${student.email})`,
          'info',
        );
      }
    }

    log('Creating sections...');
    const sectionIdsByGrade = {};
    for (const section of SECTIONS) {
      const sectionId = uuid();

      try {
        await client.query(
          `INSERT INTO sections (
             id,
             name,
             grade_level,
             school_year,
             capacity,
             room_number,
             adviser_id,
             is_active
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (name, grade_level, school_year) DO NOTHING
           RETURNING id`,
          [
            sectionId,
            section.name,
            section.gradeLevel,
            section.schoolYear,
            section.capacity,
            section.roomNumber,
            users[section.adviserEmail],
            true,
          ],
        );
        log(`  - Section created: ${section.name}`, 'success');
      } catch (err) {
        if (err.code !== '23505') {
          throw err;
        }

        const result = await client.query(
          'SELECT id FROM sections WHERE name = $1 AND grade_level = $2 AND school_year = $3',
          [section.name, section.gradeLevel, section.schoolYear],
        );
        if (result.rows.length > 0) {
          log(`  - Section already exists (${section.name})`, 'info');
        } else {
          throw err;
        }
      }

      const sectionQuery = await client.query(
        'SELECT id FROM sections WHERE name = $1 AND grade_level = $2 AND school_year = $3',
        [section.name, section.gradeLevel, section.schoolYear],
      );
      sectionIdsByGrade[section.gradeLevel] = sectionQuery.rows[0].id;
    }

    log('Creating classes...');
    const classesByGradeLevel = {};
    for (const [index, classConfig] of CLASSES.entries()) {
      const classId = uuid();
      const sectionId = sectionIdsByGrade[classConfig.sectionGradeLevel];

      try {
        await client.query(
          `INSERT INTO classes (
             id,
             subject_name,
             subject_code,
             subject_grade_level,
             section_id,
             teacher_id,
             room,
             school_year,
             is_active
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (subject_code, section_id, school_year) DO NOTHING
           RETURNING id`,
          [
            classId,
            classConfig.subjectName,
            classConfig.subjectCode,
            classConfig.subjectGradeLevel,
            sectionId,
            users[classConfig.teacherEmail],
            classConfig.room,
            classConfig.schoolYear,
            true,
          ],
        );
        log(
          `  - Class created: ${classConfig.subjectName} (${classConfig.subjectCode})`,
          'success',
        );
      } catch (err) {
        if (err.code !== '23505') {
          throw err;
        }

        const result = await client.query(
          'SELECT id FROM classes WHERE subject_code = $1 AND section_id = $2 AND school_year = $3',
          [classConfig.subjectCode, sectionId, classConfig.schoolYear],
        );
        if (result.rows.length > 0) {
          log(`  - Class already exists (${classConfig.subjectCode})`, 'info');
        } else {
          throw err;
        }
      }

      const classQuery = await client.query(
        'SELECT id FROM classes WHERE subject_code = $1 AND section_id = $2 AND school_year = $3',
        [classConfig.subjectCode, sectionId, classConfig.schoolYear],
      );
      const finalClassId = classQuery.rows[0].id;

      if (!classesByGradeLevel[classConfig.sectionGradeLevel]) {
        classesByGradeLevel[classConfig.sectionGradeLevel] = [];
      }
      classesByGradeLevel[classConfig.sectionGradeLevel].push(finalClassId);

      const schedulePattern =
        CLASS_SCHEDULE_PATTERNS[index % CLASS_SCHEDULE_PATTERNS.length];
      for (const slot of schedulePattern) {
        const existingSlot = await client.query(
          `SELECT id FROM class_schedules
           WHERE class_id = $1
             AND days = $2::text[]
             AND start_time = $3
             AND end_time = $4`,
          [finalClassId, slot.days, slot.startTime, slot.endTime],
        );

        if (existingSlot.rows.length === 0) {
          await client.query(
            `INSERT INTO class_schedules (id, class_id, days, start_time, end_time)
             VALUES ($1, $2, $3::text[], $4, $5)`,
            [uuid(), finalClassId, slot.days, slot.startTime, slot.endTime],
          );
          log(
            `  - Schedule slot: ${classConfig.subjectCode} days=[${slot.days.join(',')}] ${slot.startTime}-${slot.endTime}`,
            'success',
          );
        } else {
          log(
            `  - Schedule slot already exists for ${classConfig.subjectCode}`,
            'info',
          );
        }
      }
    }

    log('Creating student enrollments...');
    for (const student of STUDENTS) {
      const sectionId = sectionIdsByGrade[student.gradeLevel];
      const classIds = classesByGradeLevel[student.gradeLevel] || [];

      for (const classId of classIds) {
        try {
          await client.query(
            `INSERT INTO enrollments (student_id, class_id, section_id, status)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (student_id, class_id) DO NOTHING`,
            [users[student.email], classId, sectionId, 'enrolled'],
          );
          log(`  - ${student.email} enrolled`, 'success');
        } catch (err) {
          if (err.code !== '23505') {
            throw err;
          }
          log(`  - ${student.email} already enrolled`, 'info');
        }
      }
    }

    log('Seeding deterministic performance + AI fixtures...');
    const targetClassId = classesByGradeLevel['7']?.[0] || null;
    const grade7Students = STUDENTS.filter((student) => student.gradeLevel === '7')
      .slice(0, 2)
      .map((student) => users[student.email])
      .filter(Boolean);

    if (targetClassId && grade7Students.length >= 2) {
      const [studentA, studentB] = grade7Students;

      const lessonTitle = 'Quadratic Expressions Refresher';
      const existingLesson = await client.query(
        `SELECT id FROM lessons WHERE class_id = $1 AND title = $2 LIMIT 1`,
        [targetClassId, lessonTitle],
      );
      const lessonId = existingLesson.rows[0]?.id || uuid();
      if (!existingLesson.rows[0]) {
        await client.query(
          `INSERT INTO lessons (id, title, description, class_id, "order", is_draft)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            lessonId,
            lessonTitle,
            'Focus on factoring and standard form transformations.',
            targetClassId,
            1,
            false,
          ],
        );
      }

      const assessmentTitle = 'Quadratic Formula Checkpoint';
      const existingAssessment = await client.query(
        `SELECT id FROM assessments WHERE class_id = $1 AND title = $2 LIMIT 1`,
        [targetClassId, assessmentTitle],
      );
      const assessmentId = existingAssessment.rows[0]?.id || uuid();
      if (!existingAssessment.rows[0]) {
        await client.query(
          `INSERT INTO assessments (
             id, title, description, class_id, type, total_points, passing_score, max_attempts, is_published
           )
           VALUES ($1, $2, $3, $4, 'quiz', 20, 75, 2, true)`,
          [
            assessmentId,
            assessmentTitle,
            'Deterministic seed checkpoint for performance analytics demo.',
            targetClassId,
          ],
        );
      }

      const existingQuestion = await client.query(
        `SELECT id FROM assessment_questions WHERE assessment_id = $1 LIMIT 1`,
        [assessmentId],
      );
      const questionId = existingQuestion.rows[0]?.id || uuid();
      if (!existingQuestion.rows[0]) {
        await client.query(
          `INSERT INTO assessment_questions (
             id, assessment_id, type, content, points, "order", concept_tags
           )
           VALUES ($1, $2, 'multiple_choice', $3, 10, 1, $4::jsonb)`,
          [
            questionId,
            assessmentId,
            'Solve x^2 + 5x + 6 = 0 using factoring.',
            JSON.stringify(['quadratic formulas', 'factoring', 'roots']),
          ],
        );
      }

      const existingChunk = await client.query(
        `SELECT id FROM content_chunks WHERE class_id = $1 AND lesson_id = $2 LIMIT 1`,
        [targetClassId, lessonId],
      );
      const chunkId = existingChunk.rows[0]?.id || uuid();
      if (!existingChunk.rows[0]) {
        await client.query(
          `INSERT INTO content_chunks (
             id, source_type, source_id, class_id, lesson_id, chunk_text, chunk_order, token_count, content_hash, metadata_json
           )
           VALUES ($1, 'lesson_block', $2, $3, $2, $4, 1, 120, $5, $6::jsonb)`,
          [
            chunkId,
            lessonId,
            targetClassId,
            'Quadratic formulas connect roots and coefficients. Use factoring when b and c allow clean integer roots.',
            `seed-hash-${targetClassId}-quadratic-1`,
            JSON.stringify({ lessonTitle, concept: 'quadratic formulas' }),
          ],
        );
      }

      const existingEmbedding = await client.query(
        `SELECT chunk_id FROM content_chunk_embeddings WHERE chunk_id = $1`,
        [chunkId],
      );
      if (!existingEmbedding.rows[0]) {
        const vectorLiteral = `[${new Array(768).fill('0.001').join(',')}]`;
        await client.query(
          `INSERT INTO content_chunk_embeddings (chunk_id, embedding, embedding_model)
           VALUES ($1, $2::vector, 'seed-deterministic-v1')`,
          [chunkId, vectorLiteral],
        );
      }

      const now = new Date();
      for (const [index, studentId] of [studentA, studentB].entries()) {
        const attemptId = uuid();
        const score = index === 0 ? 45 : 82;
        await client.query(
          `INSERT INTO assessment_attempts (
             id, student_id, assessment_id, attempt_number, is_submitted, submitted_at, score, passed
           )
           VALUES ($1, $2, $3, 1, true, NOW() - INTERVAL '${index + 1} day', $4, $5)
           ON CONFLICT (student_id, assessment_id, attempt_number) DO NOTHING`,
          [attemptId, studentId, assessmentId, score, score >= 75],
        );

        const latestAttempt = await client.query(
          `SELECT id FROM assessment_attempts
           WHERE student_id = $1 AND assessment_id = $2
           ORDER BY submitted_at DESC NULLS LAST, created_at DESC
           LIMIT 1`,
          [studentId, assessmentId],
        );
        const resolvedAttemptId = latestAttempt.rows[0]?.id;
        if (resolvedAttemptId) {
          await client.query(
            `DELETE FROM assessment_responses WHERE attempt_id = $1 AND question_id = $2`,
            [resolvedAttemptId, questionId],
          );
          await client.query(
            `INSERT INTO assessment_responses (
               id, attempt_id, question_id, student_answer, is_correct, points_earned
             )
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              uuid(),
              resolvedAttemptId,
              questionId,
              index === 0 ? 'x = 1 and x = 6' : 'x = -2 and x = -3',
              index !== 0,
              index === 0 ? 0 : 10,
            ],
          );
        }

        await client.query(
          `INSERT INTO performance_snapshots (
             id, class_id, student_id, assessment_average, class_record_average, blended_score,
             assessment_sample_size, class_record_sample_size, has_data, is_at_risk, threshold_applied,
             last_computed_at, created_at, updated_at
           )
           VALUES (
             $1, $2, $3, $4, $5, $6, 1, 1, true, $7, 74, NOW(), NOW(), NOW()
           )
           ON CONFLICT (class_id, student_id)
           DO UPDATE SET
             assessment_average = EXCLUDED.assessment_average,
             class_record_average = EXCLUDED.class_record_average,
             blended_score = EXCLUDED.blended_score,
             has_data = EXCLUDED.has_data,
             is_at_risk = EXCLUDED.is_at_risk,
             threshold_applied = EXCLUDED.threshold_applied,
             last_computed_at = EXCLUDED.last_computed_at,
             updated_at = NOW()`,
          [
            uuid(),
            targetClassId,
            studentId,
            score,
            index === 0 ? 55 : 80,
            index === 0 ? 50 : 81,
            index === 0,
          ],
        );
      }

      await client.query(
        `INSERT INTO performance_logs (
           id, class_id, student_id, previous_is_at_risk, current_is_at_risk, assessment_average,
           class_record_average, blended_score, threshold_applied, trigger_source, created_at
         )
         VALUES ($1, $2, $3, false, true, 45, 55, 50, 74, 'seed_transition', NOW() - INTERVAL '2 hour')
         ON CONFLICT DO NOTHING`,
        [uuid(), targetClassId, studentA],
      );

      const pendingCaseId = uuid();
      const completedCaseId = uuid();
      await client.query(
        `INSERT INTO intervention_cases (
           id, class_id, student_id, status, trigger_source, trigger_score, threshold_applied, note, opened_at, created_at, updated_at
         )
         VALUES
           ($1, $2, $3, 'pending', 'seed_fixture', 50, 74, 'Pending approval demo case', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()),
           ($4, $2, $5, 'completed', 'seed_fixture', 68, 74, 'Completed intervention demo case', NOW() - INTERVAL '10 day', NOW() - INTERVAL '10 day', NOW())
         ON CONFLICT DO NOTHING`,
        [pendingCaseId, targetClassId, studentA, completedCaseId, studentB],
      );
      await client.query(
        `UPDATE intervention_cases
         SET closed_at = NOW() - INTERVAL '3 day'
         WHERE id = $1 AND status = 'completed'`,
        [completedCaseId],
      );

      await client.query(
        `INSERT INTO student_concept_mastery (
           id, student_id, class_id, concept_key, evidence_count, error_count, mastery_score, last_seen_at, created_at, updated_at
         )
         VALUES
           ($1, $2, $3, 'quadratic formulas', 4, 3, 52, NOW(), NOW(), NOW()),
           ($4, $5, $3, 'factoring', 3, 2, 61, NOW(), NOW(), NOW())
         ON CONFLICT (student_id, class_id, concept_key)
         DO UPDATE SET
           evidence_count = EXCLUDED.evidence_count,
           error_count = EXCLUDED.error_count,
           mastery_score = EXCLUDED.mastery_score,
           last_seen_at = NOW(),
           updated_at = NOW()`,
        [uuid(), studentA, targetClassId, uuid(), studentB],
      );

      log('  - Seeded attempts, incorrect responses, chunks/embeddings, snapshots/logs, and intervention cases', 'success');
    } else {
      log('  - Skipped performance fixtures: missing deterministic class/student prerequisites', 'warning');
    }

    await client.query('COMMIT');

    log(`\n${'='.repeat(60)}`, 'success');
    log('DATABASE SEEDING COMPLETED SUCCESSFULLY!', 'success');
    log('='.repeat(60), 'success');
    log('\nCreated Users:');
    log(`  - Admin: ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
    log(
      `  - Teachers: ${TEACHERS.length} accounts / shared password: ${DEFAULT_TEACHER_PASSWORD}`,
    );
    log(
      `  - Students: ${STUDENTS.length} accounts / shared password: ${DEFAULT_STUDENT_PASSWORD}`,
    );
    log('\nCreated Resources:');
    log(`  - Sections: ${SECTIONS.length} total (Grades 7-10)`);
    log(`  - Classes: ${CLASSES.length} total across 8 subjects`);
    log(`  - Student Enrollments: ${STUDENTS.length * 2} simulated enrollments`);
    log('\nIMPORTANT: Change these passwords in production!', 'warning');
    log(`${'='.repeat(60)}\n`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    log(`Database seeding failed: ${error.message}`, 'error');
    log(`Stack: ${error.stack}`, 'error');
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();
