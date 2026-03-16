/**
 * Database Seeding Script
 * 
 * This script initializes the LMS database with essential data:
 * - Roles (teacher, student, admin)
 * - Default users (1 teacher, 1 admin, 1 student)
 * - 1 section (Grade level class grouping)
 * - 1 class (Subject + Section + Teacher)
 * - Student enrollment in the class
 * 
 * Usage: node seed-database.js
 */

import { Client } from 'pg';
import { genSalt, hash } from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { config } from 'dotenv';
config(); 

// ============================================
// CONFIGURATION
// ============================================
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:200411@postgres:5432/capstone';

// Sample data - customize these as needed
const ROLES = [
  { name: 'admin', description: 'System administrator with full access' },
  { name: 'teacher', description: 'Teacher who can create and manage classes and lessons' },
  { name: 'student', description: 'Student who can enroll in classes and complete lessons' },
];

const SCHOOL_YEAR = '2024-2025';
const DEFAULT_TEACHER_PASSWORD = 'Teacher123!';
const DEFAULT_STUDENT_PASSWORD = 'Student123!';

// Users to create
const ADMIN_USER = {
  email: 'admin@lms.local',
  password: 'Test@123', // Change this in production
  firstName: 'System',
  lastName: 'Admin',
};

const TEACHERS = [
  {
    email: 'teacher1@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Ana',
    lastName: 'Reyes',
    department: 'Mathematics',
    specialization: 'Mathematics 7',
    employeeId: 'TCHR-001',
  },
  {
    email: 'teacher2@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Ben',
    lastName: 'Santos',
    department: 'Science',
    specialization: 'Science 7',
    employeeId: 'TCHR-002',
  },
  {
    email: 'teacher3@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Carla',
    lastName: 'Garcia',
    department: 'Languages',
    specialization: 'English 8',
    employeeId: 'TCHR-003',
  },
  {
    email: 'teacher4@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Daniel',
    lastName: 'Flores',
    department: 'Languages',
    specialization: 'Filipino 8',
    employeeId: 'TCHR-004',
  },
  {
    email: 'teacher5@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Elena',
    lastName: 'Cruz',
    department: 'Social Studies',
    specialization: 'Araling Panlipunan 9',
    employeeId: 'TCHR-005',
  },
  {
    email: 'teacher6@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Felix',
    lastName: 'Mendoza',
    department: 'Technology and Livelihood Education',
    specialization: 'TLE 9',
    employeeId: 'TCHR-006',
  },
  {
    email: 'teacher7@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Grace',
    lastName: 'Torres',
    department: 'MAPEH',
    specialization: 'MAPEH 10',
    employeeId: 'TCHR-007',
  },
  {
    email: 'teacher8@lms.local',
    password: DEFAULT_TEACHER_PASSWORD,
    firstName: 'Henry',
    lastName: 'Aquino',
    department: 'Values Education',
    specialization: 'ESP 10',
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

// ============================================
// UTILITIES
// ============================================

async function hashPassword(plainPassword) {
  const salt = await genSalt(10);
  return hash(plainPassword, salt);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildLrn(gradeLevel, sequence) {
  const suffixLength = 12 - 4 - gradeLevel.length;
  return `2024${gradeLevel}${String(sequence).padStart(suffixLength, '0')}`;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: `ℹ️  [${timestamp}]`,
    success: `✅ [${timestamp}]`,
    error: `❌ [${timestamp}]`,
    warning: `⚠️  [${timestamp}]`,
  }[type] || `[${timestamp}]`;

  console.log(`${prefix} ${message}`);
}

// ============================================
// MAIN SEEDING FUNCTION
// ============================================

async function seedDatabase() {
  const client = new Client({ connectionString: DB_URL });

  try {
    await client.connect();
    log('Connected to database');

    // Start transaction
    await client.query('BEGIN');

    // ========== STEP 1: CREATE ROLES ==========
    log('Creating roles...');
    const createdRoles = {};

    for (const role of ROLES) {
      const roleId = uuid();
      try {
        const result = await client.query(
          'INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id',
          [roleId, role.name, role.description]
        );
        createdRoles[role.name] = result.rows[0].id;
        log(`  ✓ Role '${role.name}' created/verified`, 'success');
      } catch (err) {
        if (err.code === '23505') { // unique_violation
          // Role already exists, fetch the existing ID
          const result = await client.query(
            'SELECT id FROM roles WHERE name = $1',
            [role.name]
          );
          if (result.rows.length > 0) {
            createdRoles[role.name] = result.rows[0].id;
            log(`  ℹ️  Role '${role.name}' already exists`, 'info');
          }
        } else {
          throw err;
        }
      }
    }

    // ========== STEP 2: CREATE USERS ==========
    log('Creating users...');
    const users = {};

    // Create Admin
    const adminId = uuid();
    const adminPasswordHash = await hashPassword(ADMIN_USER.password);
    {
      const result = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [adminId, ADMIN_USER.email, adminPasswordHash, ADMIN_USER.firstName, ADMIN_USER.lastName, 'ACTIVE', true]
      );
      users.admin = result.rows[0].id;
      log(`  ✓ Admin user created (${ADMIN_USER.email})`, 'success');
    }

    for (const teacher of TEACHERS) {
      const teacherId = uuid();
      const teacherPasswordHash = await hashPassword(teacher.password);
      const result = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [teacherId, teacher.email, teacherPasswordHash, teacher.firstName, teacher.lastName, 'ACTIVE', true]
      );
      users[teacher.email] = result.rows[0].id;
      log(`  ✓ Teacher user created (${teacher.email})`, 'success');
    }

    for (const student of STUDENTS) {
      const studentUserId = uuid();
      const studentPasswordHash = await hashPassword(student.password);
      const result = await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [studentUserId, student.email, studentPasswordHash, student.firstName, student.lastName, 'ACTIVE', true]
      );
      users[student.email] = result.rows[0].id;
      log(`  ✓ Student user created (${student.email})`, 'success');
    }

    // ========== STEP 3: ASSIGN ROLES ==========
    log('Assigning roles to users...');

    // Assign admin role
    await client.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [users.admin, createdRoles.admin, 'SYSTEM']
    );
    log(`  ✓ Admin role assigned`, 'success');

    for (const teacher of TEACHERS) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [users[teacher.email], createdRoles.teacher, 'SYSTEM']
      );
      log(`  ✓ Teacher role assigned (${teacher.email})`, 'success');
    }

    for (const student of STUDENTS) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [users[student.email], createdRoles.student, 'SYSTEM']
      );
      log(`  ✓ Student role assigned (${student.email})`, 'success');
    }

    // ========== STEP 4: CREATE STUDENT PROFILE ==========
    log('Creating teacher profiles...');
    for (const teacher of TEACHERS) {
      await client.query(
        `INSERT INTO teacher_profiles (user_id, department, specialization, employee_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET department = EXCLUDED.department,
             specialization = EXCLUDED.specialization,
             employee_id = EXCLUDED.employee_id`,
        [
          users[teacher.email],
          teacher.department,
          teacher.specialization,
          teacher.employeeId,
        ]
      );
      log(`  ✓ Teacher profile created (${teacher.email})`, 'success');
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
          [users[student.email], student.gradeLevel, buildLrn(student.gradeLevel, index + 1)]
        );
        log(`  ✓ Student profile created (${student.email})`, 'success');
      } catch (err) {
        if (err.code !== '23505') throw err;
        log(`  ℹ️  Student profile already exists or LRN conflicts with another user (${student.email})`, 'info');
      }
    }

    // ========== STEP 5: CREATE SECTION ==========
    log('Creating sections...');
    const sectionIdsByGrade = {};
    for (const section of SECTIONS) {
      const sectionId = uuid();
      try {
        await client.query(
          `INSERT INTO sections (id, name, grade_level, school_year, capacity, room_number, adviser_id, is_active)
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
          ]
        );
        log(`  ✓ Section created: ${section.name}`, 'success');
      } catch (err) {
        if (err.code !== '23505') throw err;
        const result = await client.query(
          'SELECT id FROM sections WHERE name = $1 AND grade_level = $2 AND school_year = $3',
          [section.name, section.gradeLevel, section.schoolYear]
        );
        if (result.rows.length > 0) {
          log(`  ℹ️  Section already exists (${section.name})`, 'info');
        } else {
          throw err;
        }
      }

      const sectionQuery = await client.query(
        'SELECT id FROM sections WHERE name = $1 AND grade_level = $2 AND school_year = $3',
        [section.name, section.gradeLevel, section.schoolYear]
      );
      sectionIdsByGrade[section.gradeLevel] = sectionQuery.rows[0].id;
    }

    // ========== STEP 6: CREATE CLASS ==========
    log('Creating classes...');
    const classesByGradeLevel = {};
    for (const [index, classConfig] of CLASSES.entries()) {
      const classId = uuid();
      const sectionId = sectionIdsByGrade[classConfig.sectionGradeLevel];

      try {
        await client.query(
          `INSERT INTO classes (id, subject_name, subject_code, subject_grade_level, section_id, teacher_id, room, school_year, is_active)
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
          ]
        );
        log(`  ✓ Class created: ${classConfig.subjectName} (${classConfig.subjectCode})`, 'success');
      } catch (err) {
        if (err.code !== '23505') throw err;
        const result = await client.query(
          'SELECT id FROM classes WHERE subject_code = $1 AND section_id = $2 AND school_year = $3',
          [classConfig.subjectCode, sectionId, classConfig.schoolYear]
        );
        if (result.rows.length > 0) {
          log(`  ℹ️  Class already exists (${classConfig.subjectCode})`, 'info');
        } else {
          throw err;
        }
      }

      const classQuery = await client.query(
        'SELECT id FROM classes WHERE subject_code = $1 AND section_id = $2 AND school_year = $3',
        [classConfig.subjectCode, sectionId, classConfig.schoolYear]
      );
      const finalClassId = classQuery.rows[0].id;
      if (!classesByGradeLevel[classConfig.sectionGradeLevel]) {
        classesByGradeLevel[classConfig.sectionGradeLevel] = [];
      }
      classesByGradeLevel[classConfig.sectionGradeLevel].push(finalClassId);

      const schedulePattern = CLASS_SCHEDULE_PATTERNS[index % CLASS_SCHEDULE_PATTERNS.length];
      for (const slot of schedulePattern) {
        const existingSlot = await client.query(
          `SELECT id FROM class_schedules
           WHERE class_id = $1 AND days = $2::text[] AND start_time = $3 AND end_time = $4`,
          [finalClassId, slot.days, slot.startTime, slot.endTime]
        );

        if (existingSlot.rows.length === 0) {
          await client.query(
            `INSERT INTO class_schedules (id, class_id, days, start_time, end_time)
             VALUES ($1, $2, $3::text[], $4, $5)`,
            [uuid(), finalClassId, slot.days, slot.startTime, slot.endTime]
          );
          log(`  ✓ Schedule slot: ${classConfig.subjectCode} days=[${slot.days.join(',')}] ${slot.startTime}-${slot.endTime}`, 'success');
        } else {
          log(`  ℹ️  Schedule slot already exists for ${classConfig.subjectCode}`, 'info');
        }
      }
    }

    // ========== STEP 7: CREATE ENROLLMENT ==========
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
            [users[student.email], classId, sectionId, 'enrolled']
          );
          log(`  ✓ ${student.email} enrolled`, 'success');
        } catch (err) {
          if (err.code !== '23505') throw err;
          log(`  ℹ️  ${student.email} already enrolled`, 'info');
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    // ========== SUCCESS SUMMARY ==========
    log('\n' + '='.repeat(60), 'success');
    log('DATABASE SEEDING COMPLETED SUCCESSFULLY!', 'success');
    log('='.repeat(60), 'success');
    log('\nCreated Users:');
    log(`  📌 Admin: ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
    log(`  📌 Teachers: ${TEACHERS.length} accounts / shared password: ${DEFAULT_TEACHER_PASSWORD}`);
    log(`  📌 Students: ${STUDENTS.length} accounts / shared password: ${DEFAULT_STUDENT_PASSWORD}`);
    log('\nCreated Resources:');
    log(`  📌 Sections: ${SECTIONS.length} total (Grades 7-10)`);
    log(`  📌 Classes: ${CLASSES.length} total across 8 subjects`);
    log(`  📌 Student Enrollments: ${STUDENTS.length * 2} simulated enrollments`);
    log('\n⚠️  IMPORTANT: Change these passwords in production!');
    log('='.repeat(60) + '\n');

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    log(`Database seeding failed: ${error.message}`, 'error');
    log(`Stack: ${error.stack}`, 'error');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// ============================================
// RUN SEEDING
// ============================================
seedDatabase();
