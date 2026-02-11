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

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');

// ============================================
// CONFIGURATION
// ============================================
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:200411@localhost:5432/capstone';

// Sample data - customize these as needed
const ROLES = [
  { name: 'admin', description: 'System administrator with full access' },
  { name: 'teacher', description: 'Teacher who can create and manage classes and lessons' },
  { name: 'student', description: 'Student who can enroll in classes and complete lessons' },
];

// Users to create
const ADMIN_USER = {
  email: 'admin@lms.local',
  password: 'Admin123!', // Change this in production
  firstName: 'System',
  lastName: 'Admin',
};

const TEACHER_USER = {
  email: 'teacher@lms.local',
  password: 'Teacher123!', // Change this in production
  firstName: 'John',
  lastName: 'Doe',
};

const STUDENT_USER = {
  email: 'student@lms.local',
  password: 'Student123!', // Change this in production
  firstName: 'Jane',
  lastName: 'Smith',
};

// Section configuration
const SECTION = {
  name: 'Grade 7 - Section A',
  gradeLevel: '7',
  schoolYear: '2024-2025',
  capacity: 40,
  roomNumber: '101',
};

// Class configuration
const CLASS = {
  subjectName: 'Mathematics',
  subjectCode: 'MATH-7',
  subjectGradeLevel: '7',
  schedule: 'MWF 9:00 AM - 10:00 AM',
  room: '101',
  schoolYear: '2024-2025',
};

// ============================================
// UTILITIES
// ============================================

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        await client.query(
          'INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = $3 RETURNING id',
          [roleId, role.name, role.description]
        );
        createdRoles[role.name] = roleId;
        log(`  ✓ Role '${role.name}' created`, 'success');
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
    try {
      await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [adminId, ADMIN_USER.email, adminPasswordHash, ADMIN_USER.firstName, ADMIN_USER.lastName, 'ACTIVE', true]
      );
      users.admin = adminId;
      log(`  ✓ Admin user created (${ADMIN_USER.email})`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      const result = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_USER.email]);
      if (result.rows.length > 0) {
        users.admin = result.rows[0].id;
        log(`  ℹ️  Admin user already exists`, 'info');
      }
    }

    // Create Teacher
    const teacherId = uuid();
    const teacherPasswordHash = await hashPassword(TEACHER_USER.password);
    try {
      await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [teacherId, TEACHER_USER.email, teacherPasswordHash, TEACHER_USER.firstName, TEACHER_USER.lastName, 'ACTIVE', true]
      );
      users.teacher = teacherId;
      log(`  ✓ Teacher user created (${TEACHER_USER.email})`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      const result = await client.query('SELECT id FROM users WHERE email = $1', [TEACHER_USER.email]);
      if (result.rows.length > 0) {
        users.teacher = result.rows[0].id;
        log(`  ℹ️  Teacher user already exists`, 'info');
      }
    }

    // Create Student
    const studentUserId = uuid();
    const studentPasswordHash = await hashPassword(STUDENT_USER.password);
    try {
      await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [studentUserId, STUDENT_USER.email, studentPasswordHash, STUDENT_USER.firstName, STUDENT_USER.lastName, 'ACTIVE', true]
      );
      users.student = studentUserId;
      log(`  ✓ Student user created (${STUDENT_USER.email})`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      const result = await client.query('SELECT id FROM users WHERE email = $1', [STUDENT_USER.email]);
      if (result.rows.length > 0) {
        users.student = result.rows[0].id;
        log(`  ℹ️  Student user already exists`, 'info');
      }
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

    // Assign teacher role
    await client.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [users.teacher, createdRoles.teacher, 'SYSTEM']
    );
    log(`  ✓ Teacher role assigned`, 'success');

    // Assign student role
    await client.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [users.student, createdRoles.student, 'SYSTEM']
    );
    log(`  ✓ Student role assigned`, 'success');

    // ========== STEP 4: CREATE STUDENT PROFILE ==========
    log('Creating student profile...');
    try {
      await client.query(
        `INSERT INTO student_profiles (user_id, grade_level)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [users.student, SECTION.gradeLevel]
      );
      log(`  ✓ Student profile created`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      log(`  ℹ️  Student profile already exists`, 'info');
    }

    // ========== STEP 5: CREATE SECTION ==========
    log('Creating section...');
    const sectionId = uuid();
    try {
      await client.query(
        `INSERT INTO sections (id, name, grade_level, school_year, capacity, room_number, adviser_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (name, grade_level, school_year) DO NOTHING
         RETURNING id`,
        [sectionId, SECTION.name, SECTION.gradeLevel, SECTION.schoolYear, SECTION.capacity, SECTION.roomNumber, users.teacher, true]
      );
      log(`  ✓ Section created: ${SECTION.name}`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      const result = await client.query(
        'SELECT id FROM sections WHERE name = $1 AND grade_level = $2 AND school_year = $3',
        [SECTION.name, SECTION.gradeLevel, SECTION.schoolYear]
      );
      if (result.rows.length > 0) {
        log(`  ℹ️  Section already exists`, 'info');
      } else {
        throw err;
      }
    }

    // Fetch section ID if it was already created
    const sectionQuery = await client.query(
      'SELECT id FROM sections WHERE name = $1 AND grade_level = $2 AND school_year = $3',
      [SECTION.name, SECTION.gradeLevel, SECTION.schoolYear]
    );
    const finalSectionId = sectionQuery.rows[0].id;

    // ========== STEP 6: CREATE CLASS ==========
    log('Creating class...');
    const classId = uuid();
    try {
      await client.query(
        `INSERT INTO classes (id, subject_name, subject_code, subject_grade_level, section_id, teacher_id, schedule, room, school_year, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (subject_code, section_id, school_year) DO NOTHING
         RETURNING id`,
        [classId, CLASS.subjectName, CLASS.subjectCode, CLASS.subjectGradeLevel, finalSectionId, users.teacher, CLASS.schedule, CLASS.room, CLASS.schoolYear, true]
      );
      log(`  ✓ Class created: ${CLASS.subjectName} (${CLASS.subjectCode})`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      const result = await client.query(
        'SELECT id FROM classes WHERE subject_code = $1 AND section_id = $2 AND school_year = $3',
        [CLASS.subjectCode, finalSectionId, CLASS.schoolYear]
      );
      if (result.rows.length > 0) {
        log(`  ℹ️  Class already exists`, 'info');
      } else {
        throw err;
      }
    }

    // Fetch class ID if it was already created
    const classQuery = await client.query(
      'SELECT id FROM classes WHERE subject_code = $1 AND section_id = $2 AND school_year = $3',
      [CLASS.subjectCode, finalSectionId, CLASS.schoolYear]
    );
    const finalClassId = classQuery.rows[0].id;

    // ========== STEP 7: CREATE ENROLLMENT ==========
    log('Creating student enrollment...');
    try {
      await client.query(
        `INSERT INTO enrollments (student_id, class_id, section_id, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, class_id) DO NOTHING`,
        [users.student, finalClassId, finalSectionId, 'enrolled']
      );
      log(`  ✓ Student enrolled in class`, 'success');
    } catch (err) {
      if (err.code !== '23505') throw err;
      log(`  ℹ️  Student already enrolled in class`, 'info');
    }

    // Commit transaction
    await client.query('COMMIT');

    // ========== SUCCESS SUMMARY ==========
    log('\n' + '='.repeat(60), 'success');
    log('DATABASE SEEDING COMPLETED SUCCESSFULLY!', 'success');
    log('='.repeat(60), 'success');
    log('\nCreated Users:');
    log(`  📌 Admin: ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
    log(`  📌 Teacher: ${TEACHER_USER.email} / ${TEACHER_USER.password}`);
    log(`  📌 Student: ${STUDENT_USER.email} / ${STUDENT_USER.password}`);
    log('\nCreated Resources:');
    log(`  📌 Section: ${SECTION.name}`);
    log(`  📌 Class: ${CLASS.subjectName} (${CLASS.subjectCode})`);
    log(`  📌 Student Enrollment: Completed`);
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
