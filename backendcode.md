# PROJECT EXPORT
Generated: 2026-02-10 14:17:31
Source: C:\Users\Marc\Downloads\Capstone_Nest_Initial\capstone-nest-backend\backend
Total Files: 81 | Total Lines: 7,906

## DETECTED STACK
- bcrypt (password hashing)
- Express.js
- Jest
- Mocha
- NestJS
- Passport.js
- PostgreSQL

## PROJECT STRUCTURE
src/                     [72 files]
test/                    [2 files]

## ENTRY POINTS
- src\main.ts

---
# CODE BEGINS BELOW
---

// ================================================================================
// FILE: package.json
// ================================================================================

{
  "name": "capstone-nest-backend",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.3",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/mapped-types": "*",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^11.2.6",
    "bcrypt": "^6.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "cookie-parser": "^1.4.7",
    "drizzle-orm": "^0.45.1",
    "nodemailer": "^8.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "pg": "^8.18.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "swagger-ui-express": "^5.0.1",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^22.10.7",
    "@types/nodemailer": "^7.0.9",
    "@types/passport-jwt": "^4.0.1",
    "@types/pg": "^8.16.0",
    "@types/supertest": "^6.0.2",
    "drizzle-kit": "^0.31.8",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^16.0.0",
    "jest": "^30.0.0",
    "prettier": "^3.4.2",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}



// ================================================================================
// FILE: tsconfig.json
// ================================================================================

{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  }
}



// ================================================================================
// FILE: src\main.ts
// ================================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Nexora LMS + LXP API')
    .setDescription('LMS + LXP API documentation')
    .setVersion('1.0')
    .addTag('LMS')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'token',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // Cookie parser
  app.use(cookieParser());

  // CORS
  // CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:8081',
    ].filter(Boolean), // .filter(Boolean) removes undefined/null values
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(3000, '0.0.0.0');
  console.log('🚀 Application running on http://localhost:3000');
}

bootstrap();



// ================================================================================
// FILE: drizzle.config.ts
// ================================================================================

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/drizzle/schema',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});



// ================================================================================
// FILE: nest-cli.json
// ================================================================================

{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true,
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}



// ================================================================================
// FILE: run-migrations.js
// ================================================================================

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:200411@localhost:5432/capstone';

const client = new Client({
  connectionString,
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'apply-migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      const trimmedStmt = statement.trim();
      if (trimmedStmt) {
        console.log(`Executing: ${trimmedStmt.substring(0, 50)}...`);
        try {
          await client.query(trimmedStmt);
          console.log('✓ Success');
        } catch (err) {
          // If it's an "already exists" error, that's OK - migration may be partial
          if ((err.code === '42710' || err.code === '42P07') && err.message.includes('already exists')) {
            console.log('⚠ Already exists (skipped)');
          } else {
            throw err;
          }
        }
      }
    }

    console.log('\n✅ Migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();



// ================================================================================
// FILE: src\app.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SectionsModule } from './modules/sections/sections.module';
import { ClassesModule } from './modules/classes/classes.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { RolesModule } from './modules/roles/roles.module';
import { OtpModule } from './modules/otp/otp.module';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { AdminModule } from './modules/admin/admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    DatabaseModule, // Drizzle connection
    AuthModule,
    UsersModule,
    RolesModule,
    OtpModule,
    SubjectsModule,
    SectionsModule,
    ClassesModule,
    LessonsModule,
    AssessmentsModule,
    // Profiles module (user profile records)
    ProfilesModule,
    // Admin module (dashboard stats and admin endpoints)
    AdminModule,
    // Teacher module (teacher-specific endpoints)
    TeacherModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global auth guard
    },
  ],
})
export class AppModule {}



// ================================================================================
// FILE: src\config\database.config.ts
// ================================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolMax: 20,
  idleTimeout: 30000,
  connectionTimeout: 5000,
}));



// ================================================================================
// FILE: src\config\jwt.config.ts
// ================================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: '15m', // Access tokens expire quickly
  refreshTokenExpiry: '7d', // Refresh tokens last longer
}));



// ================================================================================
// FILE: src\database\database.module.ts
// ================================================================================

import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // Makes this module available everywhere without importing
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // Other modules can inject DatabaseService
})
export class DatabaseModule {}



// ================================================================================
// FILE: src\database\database.service.ts
// ================================================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(private configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.get('database.url'),
      max: this.configService.get('database.poolMax'),
      idleTimeoutMillis: this.configService.get('database.idleTimeout'),
      connectionTimeoutMillis: this.configService.get(
        'database.connectionTimeout',
      ),
    });

    // Pass the full schema object to drizzle
    this.db = drizzle(this.pool, {
      schema, // ← This now includes otpVerifications, roles, users, etc.
      logger: this.configService.get('NODE_ENV') === 'development',
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    this.pool.on('connect', () => {
      console.log('New database connection established');
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('Database pool closed');
  }
}



// ================================================================================
// FILE: src\drizzle\drizzle.module.ts
// ================================================================================

import { Module, Global } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/base.schema';

export const DRIZZLE = 'DRIZZLE';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      // 1. Removed 'async' because there are no awaited calls
      useFactory: (configService: ConfigService) => {
        // 2. Explicitly cast or handle the potential undefined value
        const connectionString =
          configService.getOrThrow<string>('DATABASE_URL');

        const pool = new Pool({
          connectionString,
        });

        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}



// ================================================================================
// FILE: src\drizzle\schema\base.schema.ts
// ================================================================================

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  unique,
  index,
  primaryKey,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================
export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'PENDING',
  'SUSPENDED',
  'DELETED',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'video',
  'document',
  'quiz',
  'link',
]);

export const assessmentTypeEnum = pgEnum('assessment_type', [
  'quiz',
  'exam',
  'assignment',
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'enrolled',
  'dropped',
  'completed',
]);

export const gradeLevelEnum = pgEnum('grade_level', ['7', '8', '9', '10']);

export const lessonContentTypeEnum = pgEnum('lesson_content_type', [
  'text',
  'image',
  'video',
  'question',
  'file',
  'divider',
]);

export const questionTypeEnum = pgEnum('question_type', [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'fill_blank',
  'dropdown',
]);

export const feedbackLevelEnum = pgEnum('feedback_level', [
  'immediate',
  'standard',
  'detailed',
]);

// ==========================================
// 1. IDENTITY & ACCESS (Roles & Users)
// ==========================================

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(), // e.g., 'student', 'teacher', 'admin'
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('roles_name_idx').on(table.name),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),

    // Frontend Alignment: Split names
    firstName: text('first_name').notNull(),
    middleName: text('middle_name'),
    lastName: text('last_name').notNull(),

    status: accountStatusEnum('account_status').notNull().default('ACTIVE'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),

    // Student specific identifier (nullable for teachers/admins)
    studentId: text('student_id'),

    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
  }),
);

// Junction table for Many-to-Many relationship between Users and Roles
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    assignedBy: text('assigned_by').notNull(), // 'SYSTEM' or User ID
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
    userIdIdx: index('user_roles_user_id_idx').on(table.userId),
    roleIdIdx: index('user_roles_role_id_idx').on(table.roleId),
  }),
);

// ==========================================
// 2. ACADEMIC STRUCTURE
// ==========================================

export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    gradeLevel: text('grade_level').notNull(),
    schoolYear: text('school_year').notNull(), // e.g., "2024-2025"
    capacity: integer('capacity').notNull().default(40),
    roomNumber: text('room_number'),

    adviserId: uuid('adviser_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    adviserIdx: index('sections_adviser_idx').on(table.adviserId),
    gradeLevelIdx: index('sections_grade_level_idx').on(table.gradeLevel),
    schoolYearIdx: index('sections_school_year_idx').on(table.schoolYear),
    uniqueSection: unique().on(table.name, table.gradeLevel, table.schoolYear),
  }),
);

// ==========================================
// 3. CLASS MANAGEMENT
// ==========================================

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Denormalized subject info (moved from subjects table)
    subjectName: text('subject_name').notNull(),
    subjectCode: text('subject_code').notNull(),
    subjectGradeLevel: gradeLevelEnum('subject_grade_level'),

    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    schedule: text('schedule'),
    room: text('room'),
    schoolYear: text('school_year').notNull(),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    teacherIdx: index('classes_teacher_idx').on(table.teacherId),
    sectionIdx: index('classes_section_idx').on(table.sectionId),
    subjectCodeIdx: index('classes_subject_code_idx').on(table.subjectCode),
    subjectNameIdx: index('classes_subject_name_idx').on(table.subjectName),
    schoolYearIdx: index('classes_school_year_idx').on(table.schoolYear),
    uniqueClass: unique().on(
      table.subjectCode,
      table.sectionId,
      table.schoolYear,
    ),
  }),
);

export const studentProfiles = pgTable(
  'student_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateOfBirth: timestamp('date_of_birth'),
    gender: text('gender'),
    phone: text('phone'),
    address: text('address'),
    familyName: text('family_name'),
    familyRelationship: text('family_relationship'),
    familyContact: text('family_contact'),
    // Student-specific fields
    gradeLevel: gradeLevelEnum('grade_level'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('student_profiles_user_id_idx').on(table.userId),
    gradeLevelIdx: index('student_profiles_grade_level_idx').on(table.gradeLevel),
  }),
);

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),

    status: enrollmentStatusEnum('status').notNull().default('enrolled'),
    enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    studentIdx: index('enrollments_student_idx').on(table.studentId),
    classIdx: index('enrollments_class_idx').on(table.classId),
    sectionIdx: index('enrollments_section_idx').on(table.sectionId),
    statusIdx: index('enrollments_status_idx').on(table.status),
    uniqueEnrollment: unique().on(table.studentId, table.classId),
  }),
);

// ==========================================
// 4. CONTENT & ASSESSMENTS
// ==========================================

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    order: integer('order').notNull().default(0),
    isDraft: boolean('is_draft').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdIdx: index('lessons_class_id_idx').on(table.classId),
    classOrderIdx: index('lessons_class_order_idx').on(table.classId, table.order),
  }),
);

export const lessonContentBlocks = pgTable(
  'lesson_content_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    type: lessonContentTypeEnum('type').notNull(),
    order: integer('order').notNull().default(0),
    content: json('content').notNull(), // Stores text, images, questions, etc.
    metadata: json('metadata'), // Additional flexible data (alt text, captions, etc.)
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    lessonIdIdx: index('lesson_content_blocks_lesson_id_idx').on(table.lessonId),
    lessonOrderIdx: index('lesson_content_blocks_lesson_order_idx').on(
      table.lessonId,
      table.order,
    ),
  }),
);

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
    progressPercentage: integer('progress_percentage').notNull().default(0),
  },
  (table) => ({
    studentIdIdx: index('lesson_completions_student_id_idx').on(table.studentId),
    lessonIdIdx: index('lesson_completions_lesson_id_idx').on(table.lessonId),
    uniqueCompletion: unique('lesson_completions_student_lesson_unique').on(
      table.studentId,
      table.lessonId,
    ),
  }),
);

export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  type: assessmentTypeEnum('type').notNull().default('quiz'),
  dueDate: timestamp('due_date'),
  totalPoints: integer('total_points').notNull().default(100),
  passingScore: integer('passing_score').default(60),
  isPublished: boolean('is_published').default(false),
  feedbackLevel: feedbackLevelEnum('feedback_level').default('standard'),
  feedbackDelayHours: integer('feedback_delay_hours').default(24),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const assessmentQuestions = pgTable(
  'assessment_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    type: questionTypeEnum('type').notNull().default('multiple_choice'),
    content: text('content').notNull(),
    points: integer('points').notNull().default(1),
    order: integer('order').notNull().default(0),
    isRequired: boolean('is_required').default(true),
    explanation: text('explanation'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdIdx: index('assessment_questions_assessment_id_idx').on(
      table.assessmentId,
    ),
    orderIdx: index('assessment_questions_order_idx').on(table.order),
  }),
);

export const assessmentQuestionOptions = pgTable(
  'assessment_question_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    isCorrect: boolean('is_correct').default(false),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    questionIdIdx: index('assessment_question_options_question_id_idx').on(
      table.questionId,
    ),
  }),
);

export const assessmentAttempts = pgTable(
  'assessment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    submittedAt: timestamp('submitted_at'),
    score: integer('score'),
    passed: boolean('passed'),
    isSubmitted: boolean('is_submitted').default(false),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentIdIdx: index('assessment_attempts_student_id_idx').on(table.studentId),
    assessmentIdIdx: index('assessment_attempts_assessment_id_idx').on(
      table.assessmentId,
    ),
    submittedIdx: index('assessment_attempts_submitted_idx').on(table.isSubmitted),
    uniqueAttempt: unique('assessment_attempts_student_assessment_unique').on(
      table.studentId,
      table.assessmentId,
    ),
  }),
);

export const assessmentResponses = pgTable(
  'assessment_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
    studentAnswer: text('student_answer'),
    selectedOptionId: uuid('selected_option_id').references(
      () => assessmentQuestionOptions.id,
      { onDelete: 'set null' },
    ),
    isCorrect: boolean('is_correct'),
    pointsEarned: integer('points_earned').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    attemptIdIdx: index('assessment_responses_attempt_id_idx').on(table.attemptId),
    questionIdIdx: index('assessment_responses_question_id_idx').on(
      table.questionId,
    ),
  }),
);

// ==========================================
// 5. RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  userRoles: many(userRoles), // Relationship to Roles
  classesTaught: many(classes, { relationName: 'teacherClasses' }),
  advisedSections: many(sections),
  enrollments: many(enrollments),
  // Keep the property name `profile` for compatibility but point to student_profiles
  profile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));



export const sectionsRelations = relations(sections, ({ many, one }) => ({
  classes: many(classes),
  enrollments: many(enrollments),
  adviser: one(users, {
    fields: [sections.adviserId],
    references: [users.id],
  }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({

  section: one(sections, {
    fields: [classes.sectionId],
    references: [sections.id],
  }),
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
    relationName: 'teacherClasses',
  }),
  enrollments: many(enrollments),
  lessons: many(lessons),
  assessments: many(assessments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
  section: one(sections, {
    fields: [enrollments.sectionId],
    references: [sections.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  class: one(classes, {
    fields: [lessons.classId],
    references: [classes.id],
  }),
  contentBlocks: many(lessonContentBlocks),
  completions: many(lessonCompletions),
}));

export const lessonContentBlocksRelations = relations(
  lessonContentBlocks,
  ({ one }) => ({
    lesson: one(lessons, {
      fields: [lessonContentBlocks.lessonId],
      references: [lessons.id],
    }),
  }),
);

export const lessonCompletionsRelations = relations(
  lessonCompletions,
  ({ one }) => ({
    student: one(users, {
      fields: [lessonCompletions.studentId],
      references: [users.id],
    }),
    lesson: one(lessons, {
      fields: [lessonCompletions.lessonId],
      references: [lessons.id],
    }),
  }),
);

export const assessmentsRelations = relations(
  assessments,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [assessments.classId],
      references: [classes.id],
    }),
    questions: many(assessmentQuestions),
    attempts: many(assessmentAttempts),
  }),
);

export const assessmentQuestionsRelations = relations(
  assessmentQuestions,
  ({ one, many }) => ({
    assessment: one(assessments, {
      fields: [assessmentQuestions.assessmentId],
      references: [assessments.id],
    }),
    options: many(assessmentQuestionOptions),
    responses: many(assessmentResponses),
  }),
);

export const assessmentQuestionOptionsRelations = relations(
  assessmentQuestionOptions,
  ({ one }) => ({
    question: one(assessmentQuestions, {
      fields: [assessmentQuestionOptions.questionId],
      references: [assessmentQuestions.id],
    }),
  }),
);

export const assessmentAttemptsRelations = relations(
  assessmentAttempts,
  ({ one, many }) => ({
    student: one(users, {
      fields: [assessmentAttempts.studentId],
      references: [users.id],
    }),
    assessment: one(assessments, {
      fields: [assessmentAttempts.assessmentId],
      references: [assessments.id],
    }),
    responses: many(assessmentResponses),
  }),
);

export const assessmentResponsesRelations = relations(
  assessmentResponses,
  ({ one }) => ({
    attempt: one(assessmentAttempts, {
      fields: [assessmentResponses.attemptId],
      references: [assessmentAttempts.id],
    }),
    question: one(assessmentQuestions, {
      fields: [assessmentResponses.questionId],
      references: [assessmentQuestions.id],
    }),
    selectedOption: one(assessmentQuestionOptions, {
      fields: [assessmentResponses.selectedOptionId],
      references: [assessmentQuestionOptions.id],
    }),
  }),
);



// ================================================================================
// FILE: src\drizzle\schema\index.ts
// ================================================================================

export * from './base.schema';
export * from './otp.schema';


// ================================================================================
// FILE: src\drizzle\schema\otp.schema.ts
// ================================================================================

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './base.schema';

export const otpPurposeEnum = pgEnum('otp_purpose', [
  'email_verification',
  'password_reset',
  'login_2fa',
]);

export const otpVerifications = pgTable(
  'otp_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    purpose: otpPurposeEnum('purpose').notNull().default('email_verification'),
    expiresAt: timestamp('expires_at').notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    attemptCount: integer('attempt_count').notNull().default(0),
  },
  (table) => ({
    userIdIdx: index('otp_verifications_user_id_idx').on(table.userId),
    expiresAtIdx: index('otp_verifications_expires_at_idx').on(table.expiresAt),
    purposeIdx: index('otp_verifications_purpose_idx').on(table.purpose),
    isUsedIdx: index('otp_verifications_is_used_idx').on(table.isUsed),
  }),
);

export const otpVerificationsRelations = relations(
  otpVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [otpVerifications.userId],
      references: [users.id],
    }),
  }),
);



// ================================================================================
// FILE: src\modules\admin\admin.controller.ts
// ================================================================================

import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard/stats')
  @Roles('admin')
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }
}



// ================================================================================
// FILE: src\modules\admin\admin.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}



// ================================================================================
// FILE: src\modules\admin\admin.service.ts
// ================================================================================

import { Injectable } from '@nestjs/common';
import { eq, count, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users, userRoles, roles, classes } from '../../drizzle/schema';

@Injectable()
export class AdminService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async getDashboardStats() {
    // Get total active users count
    const totalUsersResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE'));
    
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get teachers count (users with teacher role)
    const teachersResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(
        eq(users.status, 'ACTIVE'),
        eq(roles.name, 'teacher')
      ));
    
    const teachers = teachersResult[0]?.count || 0;

    // Get students count (users with student role)
    const studentsResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(
        eq(users.status, 'ACTIVE'),
        eq(roles.name, 'student')
      ));
    
    const students = studentsResult[0]?.count || 0;

    // Get active subjects count (distinct subject names in classes)
    const activeSubjectsResult = await this.db
      .selectDistinct({ subjectName: classes.subjectName })
      .from(classes)
      .where(eq(classes.isActive, true));
    
    const activeSubjects = activeSubjectsResult.length || 0;

    // Get active classes count
    const activeClassesResult = await this.db
      .select({ count: count() })
      .from(classes)
      .where(eq(classes.isActive, true));
    
    const activeClasses = activeClassesResult[0]?.count || 0;

    return {
      totalUsers,
      teachers,
      students,
      activeSubjects,
      activeClasses,
      fetchedAt: new Date().toISOString(),
    };
  }
}



// ================================================================================
// FILE: src\modules\assessments\assessments.controller.ts
// ================================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  StartAssessmentDto,
} from './DTO/assessment.dto';

@ApiTags('Assessments')
@ApiBearerAuth('token')
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  /**
   * Get all assessments for a class
   * Teacher and Admin can access
   */
  @Get('class/:classId')
  @Roles('admin', 'teacher', 'student')
  async getAssessmentsByClass(@Param('classId') classId: string) {
    const assessmentList =
      await this.assessmentsService.getAssessmentsByClass(classId);

    return {
      success: true,
      message: 'Assessments retrieved successfully',
      data: assessmentList,
      count: assessmentList.length,
    };
  }

  /**
   * Get a single assessment by ID with all questions
   * Teacher and Admin can access
   */
  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  async getAssessmentById(@Param('id') id: string) {
    const assessment = await this.assessmentsService.getAssessmentById(id);

    return {
      success: true,
      message: 'Assessment retrieved successfully',
      data: assessment,
    };
  }

  /**
   * Create a new assessment
   * Teacher and Admin can access
   */
  @Post()
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.CREATED)
  async createAssessment(@Body() createAssessmentDto: CreateAssessmentDto) {
    const assessment =
      await this.assessmentsService.createAssessment(createAssessmentDto);

    return {
      success: true,
      message: 'Assessment created successfully',
      data: assessment,
    };
  }

  /**
   * Update an assessment
   * Teacher and Admin can access
   */
  @Put(':id')
  @Roles('admin', 'teacher')
  async updateAssessment(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ) {
    const assessment = await this.assessmentsService.updateAssessment(
      id,
      updateAssessmentDto,
    );

    return {
      success: true,
      message: 'Assessment updated successfully',
      data: assessment,
    };
  }

  /**
   * Delete an assessment
   * Teacher and Admin can access
   */
  @Delete(':id')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.OK)
  async deleteAssessment(@Param('id') id: string) {
    const result = await this.assessmentsService.deleteAssessment(id);

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Create a question for an assessment
   * Teacher and Admin can access
   */
  @Post('questions')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    const question = await this.assessmentsService.createQuestion(
      createQuestionDto,
    );

    return {
      success: true,
      message: 'Question created successfully',
      data: question,
    };
  }

  /**
   * Update a question
   * Teacher and Admin can access
   */
  @Put('questions/:id')
  @Roles('admin', 'teacher')
  async updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.assessmentsService.updateQuestion(
      id,
      updateQuestionDto,
    );

    return {
      success: true,
      message: 'Question updated successfully',
      data: question,
    };
  }

  /**
   * Delete a question
   * Teacher and Admin can access
   */
  @Delete('questions/:id')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(@Param('id') id: string) {
    const result = await this.assessmentsService.deleteQuestion(id);

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Start an assessment attempt
   * Student can access
   */
  @Post(':assessmentId/start')
  @Roles('admin', 'student')
  @HttpCode(HttpStatus.CREATED)
  async startAttempt(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const attempt = await this.assessmentsService.startAttempt(
      user.userId,
      assessmentId,
    );

    return {
      success: true,
      message: 'Assessment attempt started',
      data: attempt,
    };
  }

  /**
   * Submit an assessment with all answers
   * Student can access
   */
  @Post('submit')
  @Roles('admin', 'student')
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Body() submitAssessmentDto: SubmitAssessmentDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.assessmentsService.submitAssessment(
      user.userId,
      submitAssessmentDto,
    );

    return {
      success: true,
      message: 'Assessment submitted successfully',
      data: result,
    };
  }

  /**
   * Get attempt results
   * Student can view own, Teacher can view all
   */
  @Get('attempts/:attemptId/results')
  @Roles('admin', 'teacher', 'student')
  async getAttemptResults(@Param('attemptId') attemptId: string) {
    const results = await this.assessmentsService.getAttemptResults(attemptId);

    return {
      success: true,
      message: 'Attempt results retrieved successfully',
      data: results,
    };
  }

  /**
   * Get student's all attempts for an assessment
   * Student can access for own, Teacher can access any
   */
  @Get(':assessmentId/student-attempts')
  @Roles('admin', 'teacher', 'student')
  async getStudentAttempts(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const attempts = await this.assessmentsService.getStudentAttempts(
      user.userId,
      assessmentId,
    );

    return {
      success: true,
      message: 'Student attempts retrieved successfully',
      data: attempts,
      count: attempts.length,
    };
  }

  /**
   * Get all submission attempts for an assessment
   * Teacher and Admin can access
   */
  @Get(':assessmentId/all-attempts')
  @Roles('admin', 'teacher')
  async getAssessmentAttempts(@Param('assessmentId') assessmentId: string) {
    const attempts = await this.assessmentsService.getAssessmentAttempts(
      assessmentId,
    );

    return {
      success: true,
      message: 'Assessment attempts retrieved successfully',
      data: attempts,
      count: attempts.length,
    };
  }

  /**
   * Get assessment statistics
   * Teacher and Admin can access
   */
  @Get(':assessmentId/stats')
  @Roles('admin', 'teacher')
  async getAssessmentStats(@Param('assessmentId') assessmentId: string) {
    const stats = await this.assessmentsService.getAssessmentStats(
      assessmentId,
    );

    return {
      success: true,
      message: 'Assessment statistics retrieved successfully',
      data: stats,
    };
  }
}



// ================================================================================
// FILE: src\modules\assessments\assessments.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}



// ================================================================================
// FILE: src\modules\assessments\assessments.service.ts
// ================================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  assessmentAttempts,
  assessmentResponses,
  classes,
  users,
} from '../../drizzle/schema';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  QuestionType,
} from './DTO/assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Get all assessments for a class
   */
  async getAssessmentsByClass(classId: string) {
    const assessmentList = await this.db.query.assessments.findMany({
      where: eq(assessments.classId, classId),
      with: {
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
          with: {
            options: {
              orderBy: (o, { asc }) => [asc(o.order)],
            },
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return assessmentList;
  }

  /**
   * Get all assessments for a teacher (across all their classes)
   */
  async getAssessmentsByTeacher(teacherId: string) {
    // Get all classes for this teacher
    const teacherClasses = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      columns: { id: true },
    });

    const classIds = teacherClasses.map((c) => c.id);

    // If teacher has no classes, return empty array
    if (classIds.length === 0) {
      return [];
    }

    // Get all assessments for those classes
    const assessmentList = await this.db
      .select()
      .from(assessments)
      .where(inArray(assessments.classId, classIds));

    return assessmentList;
  }

  /**
   * Get a single assessment by ID with all questions
   */
  async getAssessmentById(assessmentId: string) {
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      with: {
        class: true,
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
          with: {
            options: {
              orderBy: (o, { asc }) => [asc(o.order)],
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID "${assessmentId}" not found`,
      );
    }

    return assessment;
  }

  /**
   * Create a new assessment
   */
  async createAssessment(createAssessmentDto: CreateAssessmentDto) {
    // Verify class exists
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, createAssessmentDto.classId),
    });

    if (!classRecord) {
      throw new BadRequestException(
        `Class with ID "${createAssessmentDto.classId}" not found`,
      );
    }

    const [newAssessment] = await this.db
      .insert(assessments)
      .values({
        title: createAssessmentDto.title,
        description: createAssessmentDto.description,
        classId: createAssessmentDto.classId,
        type: createAssessmentDto.type,
        dueDate: createAssessmentDto.dueDate,
        totalPoints: createAssessmentDto.totalPoints,
        passingScore: createAssessmentDto.passingScore,
        isPublished: false,
      })
      .returning();

    return this.getAssessmentById(newAssessment.id);
  }

  /**
   * Update an assessment
   */
  async updateAssessment(
    assessmentId: string,
    updateAssessmentDto: UpdateAssessmentDto,
  ) {
    // Verify assessment exists
    await this.getAssessmentById(assessmentId);

    const [updated] = await this.db
      .update(assessments)
      .set({
        title: updateAssessmentDto.title,
        description: updateAssessmentDto.description,
        type: updateAssessmentDto.type,
        dueDate: updateAssessmentDto.dueDate,
        totalPoints: updateAssessmentDto.totalPoints,
        passingScore: updateAssessmentDto.passingScore,
        isPublished: updateAssessmentDto.isPublished,
      })
      .where(eq(assessments.id, assessmentId))
      .returning();

    return this.getAssessmentById(updated.id);
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(assessmentId: string) {
    await this.getAssessmentById(assessmentId);

    await this.db.delete(assessments).where(eq(assessments.id, assessmentId));

    return { success: true, message: 'Assessment deleted successfully' };
  }

  /**
   * Create a question for an assessment
   */
  async createQuestion(createQuestionDto: CreateQuestionDto) {
    // Verify assessment exists
    await this.getAssessmentById(createQuestionDto.assessmentId);

    const [newQuestion] = await this.db
      .insert(assessmentQuestions)
      .values({
        assessmentId: createQuestionDto.assessmentId,
        type: createQuestionDto.type,
        content: createQuestionDto.content,
        points: createQuestionDto.points,
        order: createQuestionDto.order,
        isRequired: createQuestionDto.isRequired,
        explanation: createQuestionDto.explanation,
      })
      .returning();

    // Add options if provided
    if (
      createQuestionDto.options &&
      createQuestionDto.options.length > 0
    ) {
      await this.db.insert(assessmentQuestionOptions).values(
        createQuestionDto.options.map((opt) => ({
          questionId: newQuestion.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
      );
    }

    return this.getQuestionById(newQuestion.id);
  }

  /**
   * Get question by ID (helper method)
   */
  private async getQuestionById(questionId: string) {
    const question = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      with: {
        options: {
          orderBy: (o, { asc }) => [asc(o.order)],
        },
      },
    });

    if (!question) {
      throw new NotFoundException(
        `Question with ID "${questionId}" not found`,
      );
    }

    return question;
  }

  /**
   * Update a question
   */
  async updateQuestion(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.getQuestionById(questionId);

    // Update question fields
    if (
      updateQuestionDto.content ||
      updateQuestionDto.points ||
      updateQuestionDto.order ||
      updateQuestionDto.isRequired !== undefined ||
      updateQuestionDto.explanation
    ) {
      await this.db
        .update(assessmentQuestions)
        .set({
          content: updateQuestionDto.content || question.content,
          points: updateQuestionDto.points || question.points,
          order: updateQuestionDto.order || question.order,
          isRequired: updateQuestionDto.isRequired || question.isRequired,
          explanation: updateQuestionDto.explanation,
        })
        .where(eq(assessmentQuestions.id, questionId));
    }

    // Update options if provided
    if (updateQuestionDto.options && updateQuestionDto.options.length > 0) {
      // Delete old options
      await this.db
        .delete(assessmentQuestionOptions)
        .where(eq(assessmentQuestionOptions.questionId, questionId));

      // Insert new options
      await this.db.insert(assessmentQuestionOptions).values(
        updateQuestionDto.options.map((opt) => ({
          questionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
      );
    }

    return this.getQuestionById(questionId);
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string) {
    await this.getQuestionById(questionId);

    await this.db
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, questionId));

    return { success: true, message: 'Question deleted successfully' };
  }

  /**
   * Start an assessment attempt
   */
  async startAttempt(studentId: string, assessmentId: string) {
    // Verify assessment exists
    await this.getAssessmentById(assessmentId);

    // Check if student already has an active attempt
    const existingAttempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
    });

    if (existingAttempt && !existingAttempt.isSubmitted) {
      // Return existing active attempt
      return existingAttempt;
    }

    // Create new attempt
    const [newAttempt] = await this.db
      .insert(assessmentAttempts)
      .values({
        studentId,
        assessmentId,
        isSubmitted: false,
      })
      .returning();

    return newAttempt;
  }

  /**
   * Submit assessment with auto-grading for objective questions
   */
  async submitAssessment(
    studentId: string,
    submitAssessmentDto: SubmitAssessmentDto,
  ) {
    // Get the assessment with questions and options
    const assessment = await this.getAssessmentById(
      submitAssessmentDto.assessmentId,
    );

    // Get or create attempt
    let attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, submitAssessmentDto.assessmentId),
      ),
    });

    if (!attempt) {
      const [newAttempt] = await this.db
        .insert(assessmentAttempts)
        .values({
          studentId,
          assessmentId: submitAssessmentDto.assessmentId,
          isSubmitted: true,
          submittedAt: new Date(),
          timeSpentSeconds: submitAssessmentDto.timeSpentSeconds,
        })
        .returning();

      attempt = newAttempt;
    } else {
      // Update existing attempt
      const [updated] = await this.db
        .update(assessmentAttempts)
        .set({
          isSubmitted: true,
          submittedAt: new Date(),
          timeSpentSeconds: submitAssessmentDto.timeSpentSeconds,
        })
        .where(eq(assessmentAttempts.id, attempt.id))
        .returning();

      attempt = updated;
    }

    // Process responses and auto-grade
    let totalPoints = 0;
    const responses: any[] = [];

    for (const response of submitAssessmentDto.responses) {
      const question = assessment.questions.find(
        (q) => q.id === response.questionId,
      );

      if (!question) {
        throw new BadRequestException(
          `Question ${response.questionId} not found in assessment`,
        );
      }

      let isCorrect = false;
      let pointsEarned = 0;
      let selectedOptionId: string | null = null;

      // Auto-grade objective questions
      if (
        question.type === QuestionType.MULTIPLE_CHOICE ||
        question.type === QuestionType.TRUE_FALSE ||
        question.type === QuestionType.DROPDOWN
      ) {
        if (response.selectedOptionId) {
          const option = question.options.find(
            (o) => o.id === response.selectedOptionId,
          );
          if (option && option.isCorrect) {
            isCorrect = true;
            pointsEarned = question.points;
          }
          selectedOptionId = response.selectedOptionId;
        }
      } else if (question.type === QuestionType.MULTIPLE_SELECT) {
        // For multiple select, all correct options must be selected
        if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
          const correctOptions = question.options.filter((o) => o.isCorrect);
          const selectedCorrectly =
            response.selectedOptionIds.length === correctOptions.length &&
            response.selectedOptionIds.every((id) =>
              correctOptions.some((o) => o.id === id),
            );

          if (selectedCorrectly) {
            isCorrect = true;
            pointsEarned = question.points;
          }
        }
      }
      // Short answer and fill blank are not auto-graded (teacher grades manually)

      totalPoints += pointsEarned;

      // Store response
      const [storedResponse] = await this.db
        .insert(assessmentResponses)
        .values({
          attemptId: attempt.id,
          questionId: response.questionId,
          studentAnswer: response.studentAnswer,
          selectedOptionId: selectedOptionId,
          isCorrect:
            question.type === QuestionType.MULTIPLE_CHOICE ||
            question.type === QuestionType.TRUE_FALSE ||
            question.type === QuestionType.DROPDOWN ||
            question.type === QuestionType.MULTIPLE_SELECT
              ? isCorrect
              : null,
          pointsEarned,
        })
        .returning();

      responses.push(storedResponse);
    }

    // Calculate score and passing status
    const score = Math.round(
      (totalPoints / assessment.totalPoints) * 100,
    );
    const passed = score >= (assessment.passingScore || 60);

    // Update attempt with final score
    const [finalAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        score,
        passed,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    return {
      attempt: finalAttempt,
      responses,
      totalPoints,
      score,
      passed,
    };
  }

  /**
   * Get student's attempt results
   */
  async getAttemptResults(attemptId: string) {
    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.id, attemptId),
      with: {
        assessment: {
          with: {
            questions: {
              with: {
                options: true,
              },
            },
          },
        },
        responses: {
          with: {
            question: {
              with: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
        student: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    // Apply smart feedback filtering based on assessment settings
    return this.applyFeedbackFiltering(attempt);
  }

  /**
   * Apply feedback filtering based on assessment's feedbackLevel and delay
   * Prevents cheating while supporting learning
   */
  private applyFeedbackFiltering(attemptWithData: any) {
    const assessment = attemptWithData.assessment;
    const feedbackLevel = assessment.feedbackLevel || 'standard';
    const feedbackDelayHours = assessment.feedbackDelayHours || 24;
    
    // Check if feedback delay has passed
    const submittedTime = new Date(attemptWithData.submittedAt);
    const now = new Date();
    const hoursElapsed = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);
    const feedbackUnlocked = hoursElapsed >= feedbackDelayHours;

    let filteredAttempt = JSON.parse(JSON.stringify(attemptWithData));

    if (feedbackLevel === 'immediate') {
      // IMMEDIATE: Show ONLY score, pass/fail, and question count
      // Hide all answer information and options
      filteredAttempt.responses = filteredAttempt.responses.map(r => ({
        id: r.id,
        questionId: r.questionId,
        // Strip out all answer details
        studentAnswer: null,
        selectedOptionId: null,
        isCorrect: null,
        pointsEarned: null,
        question: {
          id: r.question.id,
          content: r.question.content,
          type: r.question.type,
          points: r.question.points,
          // No options shown
          options: [],
        },
      }));

      filteredAttempt.assessment.questions = filteredAttempt.assessment.questions.map(q => ({
        id: q.id,
        content: q.content,
        type: q.type,
        points: q.points,
        // No options shown
        options: [],
      }));

      // Add feedback locked message
      filteredAttempt.feedbackStatus = {
        level: 'immediate',
        unlocked: true,
        message: 'You can see your score. Detailed feedback not available for immediate assessments.',
      };

    } else if (feedbackLevel === 'standard') {
      // STANDARD: Show answers ONLY after delay
      if (!feedbackUnlocked) {
        // Hide all answer information until delay passes
        filteredAttempt.responses = filteredAttempt.responses.map(r => ({
          id: r.id,
          questionId: r.questionId,
          // Strip out answers, show only question
          studentAnswer: null,
          selectedOptionId: null,
          isCorrect: null,
          pointsEarned: null,
          question: {
            id: r.question.id,
            content: r.question.content,
            type: r.question.type,
            points: r.question.points,
            // Mark options but don't show which is correct
            options: r.question.options?.map(o => ({
              id: o.id,
              text: o.text,
              order: o.order,
              isCorrect: null, // Hidden
            })) || [],
          },
        }));

        const hoursUntilUnlock = Math.ceil(feedbackDelayHours - hoursElapsed);
        filteredAttempt.feedbackStatus = {
          level: 'standard',
          unlocked: false,
          hoursRemaining: Math.max(0, hoursUntilUnlock),
          message: `Detailed feedback available in ${Math.max(0, hoursUntilUnlock)} hours. Review lessons to learn why answers are correct!`,
        };
      } else {
        // Feedback unlocked - show everything
        filteredAttempt.feedbackStatus = {
          level: 'standard',
          unlocked: true,
          message: 'Detailed feedback is now available. Review your answers and explanations.',
        };
      }

    } else if (feedbackLevel === 'detailed') {
      // DETAILED: Longer delay, more detailed hints
      if (!feedbackUnlocked) {
        const hoursUntilUnlock = Math.ceil(feedbackDelayHours - hoursElapsed);
        
        // Show hints about which questions were wrong, but NOT the answers
        filteredAttempt.responses = filteredAttempt.responses.map(r => ({
          id: r.id,
          questionId: r.questionId,
          // Show if correct/wrong as hint, but not the actual answer
          studentAnswer: null,
          selectedOptionId: null,
          isCorrect: r.isCorrect, // Hint: show if they got it right/wrong
          pointsEarned: null,      // Hide partial credit until unlocked
          questionType: r.question.type,
          hint: this.generateLearningHint(r.question, r.isCorrect),
          question: {
            id: r.question.id,
            content: r.question.content,
            type: r.question.type,
            points: r.question.points,
            // No options shown
            options: [],
          },
        }));

        filteredAttempt.feedbackStatus = {
          level: 'detailed',
          unlocked: false,
          hoursRemaining: Math.max(0, hoursUntilUnlock),
          message: `Full feedback available in ${Math.max(0, hoursUntilUnlock)} hours. Use the hints below to study!`,
        };
      } else {
        // Full feedback available
        filteredAttempt.responses = filteredAttempt.responses.map(r => ({
          ...r,
          hint: this.generateLearningHint(r.question, r.isCorrect),
        }));

        filteredAttempt.feedbackStatus = {
          level: 'detailed',
          unlocked: true,
          message: 'Full feedback with learning hints available. Review to improve!',
        };
      }
    }

    return filteredAttempt;
  }

  /**
   * Generate learning-focused hints rather than just showing answers
   */
  private generateLearningHint(question: any, isCorrect: boolean): string {
    if (isCorrect) {
      return `✓ Correct! You understood the concept in question "${question.content.substring(0, 50)}..."`;
    }

    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.DROPDOWN:
        return `Review the lesson content about this topic. The correct answer involves understanding the key concept.`;
      
      case QuestionType.TRUE_FALSE:
        return `Think about whether the statement is always true or if there are exceptions. Review the lesson.`;
      
      case QuestionType.MULTIPLE_SELECT:
        return `This question requires selecting ALL correct answers. Review which concepts apply.`;
      
      case QuestionType.SHORT_ANSWER:
      case QuestionType.FILL_BLANK:
        return `Compare your answer with the key terms in the lesson. Make sure you used precise language.`;
      
      default:
        return `Review this question and the related lesson content.`;
    }
  }

  /**
   * Get all attempts for a student in an assessment
   */
  async getStudentAttempts(studentId: string, assessmentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts;
  }

  /**
   * Get all student attempts for an assessment (for teacher view)
   */
  async getAssessmentAttempts(assessmentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: eq(assessmentAttempts.assessmentId, assessmentId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts;
  }

  /**
   * Get high-level assessment stats for teacher
   */
  async getAssessmentStats(assessmentId: string) {
    const attempts = await this.getAssessmentAttempts(assessmentId);
    const submittedAttempts = attempts.filter((a) => a.isSubmitted);

    if (submittedAttempts.length === 0) {
      return {
        totalAttempts: 0,
        submittedAttempts: 0,
        averageScore: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const scores = submittedAttempts.map((a) => a.score || 0);
    const passedCount = submittedAttempts.filter((a) => a.passed).length;

    return {
      totalAttempts: attempts.length,
      submittedAttempts: submittedAttempts.length,
      averageScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      ),
      passRate: Math.round((passedCount / submittedAttempts.length) * 100),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
    };
  }
}



// ================================================================================
// FILE: src\modules\assessments\DTO\assessment.dto.ts
// ================================================================================

import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_SELECT = 'multiple_select',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  FILL_BLANK = 'fill_blank',
  DROPDOWN = 'dropdown',
}

export enum AssessmentType {
  QUIZ = 'quiz',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
}

export enum FeedbackLevel {
  IMMEDIATE = 'immediate',       // Score only, no answers
  STANDARD = 'standard',         // Answers + explanations (delayed)
  DETAILED = 'detailed',         // Full feedback with hints (delayed longer)
}

// ==========================================
// Assessment DTOs
// ==========================================

export class CreateAssessmentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType = AssessmentType.QUIZ;

  @IsOptional()
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  totalPoints?: number = 100;

  @IsOptional()
  @IsInt()
  passingScore?: number = 60;

  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel = FeedbackLevel.STANDARD;

  @IsOptional()
  @IsInt()
  feedbackDelayHours?: number = 24; // 24 hours default delay
}

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @IsOptional()
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  totalPoints?: number;

  @IsOptional()
  @IsInt()
  passingScore?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel;

  @IsOptional()
  @IsInt()
  feedbackDelayHours?: number;
}

// ==========================================
// Question DTOs
// ==========================================

export class OptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsInt()
  order: number;
}

export class CreateQuestionDto {
  @IsUUID()
  assessmentId: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  content: string;

  @IsInt()
  points: number = 1;

  @IsInt()
  order: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsArray()
  @Type(() => OptionDto)
  options?: OptionDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  points?: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsArray()
  @Type(() => OptionDto)
  options?: OptionDto[];
}

// ==========================================
// Assessment Attempt DTOs
// ==========================================

export class ResponseAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsString()
  studentAnswer?: string; // For short answer/text questions

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string; // For multiple choice/select

  @IsOptional()
  @IsArray()
  selectedOptionIds?: string[]; // For multiple select
}

export class SubmitAssessmentDto {
  @IsUUID()
  assessmentId: string;

  @IsArray()
  @Type(() => ResponseAnswerDto)
  responses: ResponseAnswerDto[];

  @IsInt()
  timeSpentSeconds: number;
}

export class StartAssessmentDto {
  @IsUUID()
  assessmentId: string;
}



// ================================================================================
// FILE: src\modules\auth\auth.controller.ts
// ================================================================================

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  Req,
  UnauthorizedException,
  InternalServerErrorException,
  Patch,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './DTO/login.dto';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { ChangePasswordDto } from './DTO/change-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';


@ApiBearerAuth('token')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set refresh token in HTTP-only cookie
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Public()
  @Post('refresh')
  // 👇 CHANGE 1: Use 'express.Request' explicitly
  async refresh(@Req() request: express.Request) {
    // 👇 CHANGE 2: Fix ESLint error by treating cookies as an object
    // and ensuring we treat the result as a string
    const refreshToken = request.cookies?.['refreshToken'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    const result = await this.authService.refreshToken(refreshToken);

    return {
      success: true,
      message: 'Token refreshed',
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: express.Response) {
    response.clearCookie('refreshToken');

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    await this.authService.requestPasswordReset(email);
    return { success: true, message: 'Reset code sent if account exists' };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() dto: { email: string; code: string; newPassword: string },
  ) {
    await this.authService.resetPassword(dto);
    return { success: true, message: 'Password reset successful' };
  }

  // Validate credentials endpoint used by frontend to confirm the password
  // when a login attempt fails due to unverified email.
  @Public()
  @Post('validate-credentials')
  @HttpCode(HttpStatus.OK)
  async validateCredentials(@Body() dto: { email: string; password: string }) {
    await this.authService.validateCredentials(dto.email, dto.password);

    return { success: true, message: 'Credentials valid' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      success: true,
      data: { user },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    await this.authService.changePassword(user.userId, dto);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Public()
  @Post('set-initial-password')
  @HttpCode(HttpStatus.OK)
  async setInitialPassword(
    @Body() dto: { email: string; code: string; newPassword: string },
  ) {
    await this.authService.setInitialPassword(dto.email, dto.code, dto.newPassword);

    return {
      success: true,
      message: 'Password set successfully. You can now log in.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    // JwtStrategy.validate() returns { userId, email, roles }
    // so the property is "userId", NOT "id"
    if (!user || !user.userId) {
      console.warn('[AUTH] updateProfile called without authenticated user');
      throw new UnauthorizedException('Not authenticated');
    }

    console.log('[AUTH] PATCH /auth/profile body for user:', user.userId, dto);
    try {
      const updated = await this.authService.updateProfile(user.userId, dto);
      return {
        success: true,
        message: 'Profile updated',
        data: { user: updated },
      };
    } catch (error) {
      console.error('[AUTH] updateProfile failed for user:', user.userId, error);
      throw new InternalServerErrorException(
        error?.message || 'Profile update failed',
      );
    }
  }
}



// ================================================================================
// FILE: src\modules\auth\auth.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { OtpModule } from '../otp/otp.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    UsersModule,
    OtpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTokenExpiry'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}



// ================================================================================
// FILE: src\modules\auth\auth.service.ts
// ================================================================================

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './DTO/login.dto';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please check your inbox.',
      );
    }

    // 3. Check account status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Account is not active. Contact administrator.',
      );
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 5. Update last login timestamp
    await this.usersService.updateLastLogin(user.id);

    // 6. Generate tokens
    const tokens = await this.generateTokens(user);

    // 7. Return sanitized user + tokens
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Validate credentials without enforcing email verification or status.
   * Used by the frontend to determine if a provided password is correct for an email
   * when the login response indicates the account is unverified.
   *
   * Returns true if credentials are valid, otherwise throws UnauthorizedException.
   */
  async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    // If we reach here, credentials are valid
    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email/Account not found');
    }
    await this.otpService.createAndSendOTP(
      user.id,
      user.email,
      'password_reset',
    );
  }

  async resetPassword(dto: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<void> {
    await this.otpService.verifyOTP(dto.email, dto.code);
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.updatePassword(user.id, dto.newPassword);
  }

  async changePassword(userId: string, dto: any): Promise<void> {
    const { oldPassword, newPassword } = dto;

    // 1. Get user by ID
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 2. Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // 3. Update to new password
    await this.usersService.updatePassword(userId, newPassword);
  }

  async setInitialPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
    // 1. Verify the OTP (this also marks email as verified and activates account)
    await this.otpService.verifyOTP(email, otpCode);

    // 2. Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Update password
    await this.usersService.updatePassword(user.id, newPassword);
  }

  async refreshToken(refreshToken: string) {
    try {
      // 1. Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      // 2. Check token type
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // 3. Get fresh user data
      const user = await this.usersService.findById(payload.userId);
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // 4. Generate new access token
      const accessToken = await this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: any) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(user: any): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.accessTokenExpiry'),
    });
  }

  private async generateRefreshToken(user: any): Promise<string> {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshTokenExpiry'),
    });
  }

  private sanitizeUser(user: any) {
    const { password, userRoles, ...result } = user;
    return {
      ...result,
      roles: user.roles.map((role) => role.name),
    };
  }

  // Update profile fields for a user
  async updateProfile(userId: string, dto: any) {
    const updated = await this.usersService.updateUser(userId, dto);
    return this.sanitizeUser(updated);
  }
}



// ================================================================================
// FILE: src\modules\auth\decorators\current-user.decorator.ts
// ================================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);



// ================================================================================
// FILE: src\modules\auth\decorators\public.decorator.ts
// ================================================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);



// ================================================================================
// FILE: src\modules\auth\decorators\roles.decorator.ts
// ================================================================================

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);



// ================================================================================
// FILE: src\modules\auth\DTO\change-password.dto.ts
// ================================================================================

import {
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ChangePasswordDto {
  @IsString({ message: 'Old password must be a string' })
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[@$!%*?&#]/, {
    message: 'Password must contain at least one special character',
  })
  newPassword: string;
}



// ================================================================================
// FILE: src\modules\auth\DTO\login.dto.ts
// ================================================================================

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}



// ================================================================================
// FILE: src\modules\auth\DTO\update-profile.dto.ts
// ================================================================================

import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsIn(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message:
      'Relationship must be one of: Father, Mother, Guardian, Sibling, Other',
  })
  familyRelationship?: string;

  @IsOptional()
  @IsString()
  familyContact?: string;
}



// ================================================================================
// FILE: src\modules\auth\DTO\validate-credentials.dto.ts
// ================================================================================

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidateCredentialsDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}



// ================================================================================
// FILE: src\modules\auth\guards\jwt-auth.guard.ts
// ================================================================================

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request?.headers?.authorization;
    console.log('[AUTH-GUARD] Authorization header:', authHeader);

    if (isPublic) {
      return true; // Skip authentication
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}



// ================================================================================
// FILE: src\modules\auth\guards\roles.guard.ts
// ================================================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. If no roles specified, allow access
    if (!requiredRoles) {
      return true;
    }

    // 3. Get user from request (added by JWT guard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 4. Check if user has required role
    const hasRole = user.roles?.some((role: string) =>
      requiredRoles.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}



// ================================================================================
// FILE: src\modules\auth\strategies\jwt.strategy.ts
// ================================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // jwt.strategy.ts
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('jwt.secret');

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set and at least 32 characters. ' +
          'Current value is insecure or missing.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    console.log('[JWT-STRAT] Validating payload:', payload);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.userId);
    console.log('[JWT-STRAT] lookup user:', payload.userId, 'found:', !!user);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };
  }
}



// ================================================================================
// FILE: src\modules\auth\strategies\jwt-refresh.strategy.ts
// ================================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt'; // ← Import StrategyOptionsWithRequest
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    // Cast options to the correct type
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'), // ← Changed to getOrThrow
      passReqToCallback: true,
    } as StrategyOptionsWithRequest); // ← Type assertion to fix passReqToCallback type mismatch
  }

  async validate(req: Request, payload: any) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const refreshToken = req.body.refreshToken;

    return {
      userId: payload.userId,
      refreshToken,
    };
  }
}



// ================================================================================
// FILE: src\modules\classes\classes.controller.ts
// ================================================================================

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Classes')
@ApiBearerAuth('token')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  /**
   * Get all classes with optional filters
   * Admin and Teacher can access
   */
  @Get('all')
  @Roles('admin', 'teacher')
  async getAllClasses(
    @Query('subjectId') subjectId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('schoolYear') schoolYear?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (subjectId) {
      // Backwards compatible: treat subjectId as subjectCode when subjects were removed
      filters.subjectCode = subjectId;
    }
    if (sectionId) filters.sectionId = sectionId;
    if (teacherId) filters.teacherId = teacherId;
    if (schoolYear) filters.schoolYear = schoolYear;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const classes = await this.classesService.findAll(filters);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by teacher ID
   * Admin and Teacher can access
   */
  @Get('teacher/:teacherId')
  @Roles('admin', 'teacher')
  async getClassesByTeacher(@Param('teacherId') teacherId: string) {
    const classes = await this.classesService.getClassesByTeacher(teacherId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by section ID
   * Admin and Teacher can access
   */
  @Get('section/:sectionId')
  @Roles('admin', 'teacher')
  async getClassesBySection(@Param('sectionId') sectionId: string) {
    const classes = await this.classesService.getClassesBySection(sectionId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by subject ID
   * Admin and Teacher can access
   */
  @Get('subject/:subjectId')
  @Roles('admin', 'teacher')
  async getClassesBySubject(@Param('subjectId') subjectId: string) {
    const classes = await this.classesService.getClassesBySubject(subjectId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes enrolled by a student
   * Students can access their own, teachers/admins can access any student's
   */
  @Get('student/:studentId')
  @Roles('admin', 'teacher', 'student')
  async getClassesByStudent(@Param('studentId') studentId: string) {
    const classes = await this.classesService.getClassesByStudent(studentId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get a specific class by ID
   */
  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  async getClassById(@Param('id') id: string) {
    const classRecord = await this.classesService.findById(id);

    return {
      success: true,
      message: 'Class retrieved successfully',
      data: classRecord,
    };
  }

  /**
   * Create a new class
   * Admin only
   */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createClass(@Body() createClassDto: CreateClassDto) {
    const newClass = await this.classesService.create(createClassDto);

    return {
      success: true,
      message: 'Class created successfully',
      data: newClass,
    };
  }

  /**
   * Update a class
   * Admin only
   */
  @Put(':id')
  @Roles('admin')
  async updateClass(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    const updatedClass = await this.classesService.update(id, updateClassDto);

    return {
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    };
  }

  /**
   * Toggle class active status
   * Admin only
   */
  @Put(':id/toggle-status')
  @Roles('admin')
  async toggleClassStatus(@Param('id') id: string) {
    const updatedClass = await this.classesService.toggleActive(id);

    return {
      success: true,
      message: 'Class status toggled successfully',
      data: updatedClass,
    };
  }

  /**
   * Delete a class
   * Admin only
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string) {
    await this.classesService.delete(id);

    return {
      success: true,
      message: 'Class deleted successfully',
    };
  }

  /**
   * Get all students enrolled in a class
   * Teacher (of the class) and Admin can access
   */
  @Get(':classId/enrollments')
  @Roles('admin', 'teacher')
  async getEnrollments(@Param('classId') classId: string) {
    const enrollments = await this.classesService.getEnrollments(classId);

    return {
      success: true,
      message: 'Enrollments retrieved successfully',
      data: enrollments,
      count: enrollments.length,
    };
  }

  /**
   * Get candidate students for enrollment in a class
   * Returns students from the section who are not yet enrolled in this class
   * Teacher (of the class) and Admin can access
   */
  @Get(':classId/candidates')
  @Roles('admin', 'teacher')
  async getCandidates(@Param('classId') classId: string) {
    const candidates = await this.classesService.getCandidates(classId);

    return {
      success: true,
      message: 'Candidates retrieved successfully',
      data: candidates,
      count: candidates.length,
    };
  }

  /**
   * Enroll a student in a class
   * Teacher (of the class) and Admin can access
   */
  @Post(':classId/enrollments')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.CREATED)
  async enrollStudent(
    @Param('classId') classId: string,
    @Body() body: { studentId: string },
  ) {
    const enrollment = await this.classesService.enrollStudent(
      classId,
      body.studentId,
    );

    return {
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment,
    };
  }

  /**
   * Remove a student from a class
   * Teacher (of the class) and Admin can access
   */
  @Delete(':classId/enrollments/:studentId')
  @Roles('admin', 'teacher')
  async removeStudent(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.classesService.removeStudent(classId, studentId);

    return {
      success: true,
      message: 'Student removed from class successfully',
    };
  }
}


// ================================================================================
// FILE: src\modules\classes\classes.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}



// ================================================================================
// FILE: src\modules\classes\classes.service.ts
// ================================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL, isNull, ne, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { classes, sections, users, enrollments, studentProfiles } from '../../drizzle/schema';

// Normalize grade level into typed union or undefined
const normalizeGradeLevel = (v?: string): '7' | '8' | '9' | '10' | undefined => {
  if (!v) return undefined;
  const s = String(v).trim();
  return s === '7' || s === '8' || s === '9' || s === '10' ? (s as '7' | '8' | '9' | '10') : undefined;
};
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Find all classes with optional filters
   */
  async findAll(filters?: {
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    subjectGradeLevel?: '7'|'8'|'9'|'10';
    sectionId?: string;
    teacherId?: string;
    schoolYear?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    // Support filtering by subject code or subject name
    if (filters?.subjectCode) {
      whereConditions.push(eq(classes.subjectCode, filters.subjectCode));
    }
    if (filters?.subjectName) {
      whereConditions.push(ilike(classes.subjectName, `%${filters.subjectName}%`));
    }

    if (filters?.sectionId) {
      whereConditions.push(eq(classes.sectionId, filters.sectionId));
    }

    if (filters?.teacherId) {
      whereConditions.push(eq(classes.teacherId, filters.teacherId));
    }

    if (filters?.schoolYear) {
      whereConditions.push(eq(classes.schoolYear, filters.schoolYear));
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(classes.isActive, filters.isActive));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(classes.room, searchPattern),
        ilike(classes.schedule, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const classList = await this.db.query.classes.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [
        asc(classes.schoolYear),
        asc(classes.createdAt),
      ],
      limit,
      offset,
    });

    return classList;
  }

  /**
   * Find a class by ID
   */
  async findById(id: string) {
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, id),
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return classRecord;
  }

  /**
   * Create a new class
   */
  async create(createClassDto: CreateClassDto) {
    // Section check
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, createClassDto.sectionId),
    });

    if (!section) {
      throw new BadRequestException(
        `Section with ID "${createClassDto.sectionId}" not found`,
      );
    }

    // Verify that teacher exists
    const teacher = await this.db.query.users.findFirst({
      where: eq(users.id, createClassDto.teacherId),
    });

    if (!teacher) {
      throw new BadRequestException(
        `Teacher with ID "${createClassDto.teacherId}" not found`,
      );
    }

    // Check if class already exists (same subject, section, and school year)
    const existingClass = await this.db.query.classes.findFirst({
      where: and(
        eq(classes.subjectCode, createClassDto.subjectCode),
        eq(classes.sectionId, createClassDto.sectionId),
        eq(classes.schoolYear, createClassDto.schoolYear),
      ),
    });

    if (existingClass) {
      throw new ConflictException(
        `Class already exists for this subject, section, and school year`,
      );
    }

    // Build a typed payload for insertion
    const insertPayload: any = {
      subjectName: createClassDto.subjectName,
      subjectCode: createClassDto.subjectCode?.toUpperCase(),
      subjectGradeLevel: normalizeGradeLevel(createClassDto.subjectGradeLevel),
      sectionId: createClassDto.sectionId,
      teacherId: createClassDto.teacherId,
      schoolYear: createClassDto.schoolYear,
      schedule: (createClassDto as any).schedule,
      room: createClassDto.room,
    };

    const [newClass] = await this.db
      .insert(classes)
      .values(insertPayload)
      .returning();

    return this.findById(newClass.id);
  }

  /**
   * Update a class
   */
  async update(id: string, updateClassDto: UpdateClassDto) {
    // Verify class exists
    await this.findById(id);

    // If updating subject fields, no external lookup required (denormalized fields)
    // We accept subjectName/subjectCode/subjectGradeLevel directly in the DTO.

    // If updating section, verify it exists
    if (updateClassDto.sectionId) {
      const section = await this.db.query.sections.findFirst({
        where: eq(sections.id, updateClassDto.sectionId),
      });

      if (!section) {
        throw new BadRequestException(
          `Section with ID "${updateClassDto.sectionId}" not found`,
        );
      }
    }

    // If updating teacher, verify teacher exists
    if (updateClassDto.teacherId) {
      const teacher = await this.db.query.users.findFirst({
        where: eq(users.id, updateClassDto.teacherId),
      });

      if (!teacher) {
        throw new BadRequestException(
          `Teacher with ID "${updateClassDto.teacherId}" not found`,
        );
      }
    }

    const updatePayload: any = {
      ...updateClassDto,
      updatedAt: new Date(),
    };

    if (updatePayload.subjectGradeLevel) {
      updatePayload.subjectGradeLevel = normalizeGradeLevel(String(updatePayload.subjectGradeLevel));
    }

    await this.db
      .update(classes)
      .set(updatePayload)
      .where(eq(classes.id, id));

    return this.findById(id);
  }

  /**
   * Delete a class
   */
  async delete(id: string) {
    // Verify class exists
    const classRecord = await this.findById(id);

    await this.db.delete(classes).where(eq(classes.id, id));

    return classRecord;
  }

  /**
   * Get classes by teacher ID
   */
  async getClassesByTeacher(teacherId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      with: {
        section: true,
        enrollments: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Get classes by section ID
   */
  async getClassesBySection(sectionId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      with: {
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Get classes by subject ID
   */
  async getClassesBySubject(subjectId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.subjectCode, subjectId),
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Get all classes enrolled by a student
   */
  async getClassesByStudent(studentId: string) {
    // First, get all enrollments for this student
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
      columns: { classId: true },
    });

    if (studentEnrollments.length === 0) {
      return [];
    }

    // Extract unique class IDs
    const classIds = [...new Set(studentEnrollments.map(e => e.classId).filter((id): id is string => Boolean(id)))];

    // Fetch all classes with those IDs, including enrollments and student count
    const classList = await this.db.query.classes.findMany({
      where: (classTable) => inArray(classTable.id, classIds),
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        enrollments: {
          columns: {
            id: true,
            studentId: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Toggle class active status
   */
  async toggleActive(id: string) {
    const classRecord = await this.findById(id);

    await this.db
      .update(classes)
      .set({
        isActive: !classRecord.isActive,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, id));

    return this.findById(id);
  }

  /**
   * Get all students enrolled in a class
   */
  async getEnrollments(classId: string) {
    // First verify the class exists
    await this.findById(classId);

    // Get all enrollments for this class with student details
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
              },
            },
          },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    return classEnrollments;
  }

  /**
   * Get candidate students for enrollment in a class
   * Returns students from the same section who are not yet enrolled in this class
   */
  async getCandidates(classId: string) {
    // Get the class to find its section
    const classRecord = await this.findById(classId);

    // Get all students in the section (enrolled in section with classId NULL)
    const sectionEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.sectionId, classRecord.sectionId),
        isNull(enrollments.classId),
        eq(enrollments.status, 'enrolled'),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    // Get students already enrolled in this class
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        studentId: true,
      },
    });

    const enrolledStudentIds = new Set(classEnrollments.map(e => e.studentId));

    // Filter out already enrolled students
    const candidates = sectionEnrollments.filter(
      e => !enrolledStudentIds.has(e.studentId),
    );

    return candidates;
  }

  /**
   * Enroll a student in a class
   * If the student is already in the section (with classId=NULL), update that enrollment
   * Otherwise, create a new enrollment
   */
  async enrollStudent(classId: string, studentId: string) {
    // Verify class exists
    const classRecord = await this.findById(classId);

    // Verify student exists
    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
    });

    if (!student) {
      throw new BadRequestException(`Student with ID "${studentId}" not found`);
    }

    // Check if student is already enrolled in this class
    const existingEnrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
      ),
    });

    if (existingEnrollment) {
      throw new ConflictException(
        `Student is already enrolled in this class`,
      );
    }

    // Check if student is in the section
    const sectionEnrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.sectionId, classRecord.sectionId),
      ),
    });

    if (!sectionEnrollment) {
      throw new BadRequestException(
        `Student is not enrolled in the section for this class`,
      );
    }

    // If the student has a section-only enrollment (classId=NULL), update it
    if (sectionEnrollment.classId === null) {
      await this.db
        .update(enrollments)
        .set({
          classId: classId,
          enrolledAt: new Date(),
        })
        .where(eq(enrollments.id, sectionEnrollment.id));

      return this.getEnrollmentById(sectionEnrollment.id);
    } else {
      // Student already has a classId, create a new enrollment record
      const [newEnrollment] = await this.db
        .insert(enrollments)
        .values({
          studentId,
          classId,
          sectionId: classRecord.sectionId,
          status: 'enrolled',
        })
        .returning();

      return this.getEnrollmentById(newEnrollment.id);
    }
  }

  /**
   * Remove a student from a class
   * Deletes the enrollment record
   */
  async removeStudent(classId: string, studentId: string) {
    // Verify class exists
    await this.findById(classId);

    // Find and delete the enrollment
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
      ),
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Student is not enrolled in this class`,
      );
    }

    await this.db.delete(enrollments).where(eq(enrollments.id, enrollment.id));

    return { id: enrollment.id };
  }

  /**
   * Get enrollment by ID
   */
  private async getEnrollmentById(enrollmentId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    return enrollment;
  }
}



// ================================================================================
// FILE: src\modules\classes\DTO\create-class.dto.ts
// ================================================================================

import {
  IsString,
  IsUUID,
  IsOptional,
  Validate,
  IsIn,
} from 'class-validator';
import {
  IsValidSchoolYearConstraint,
  IsValidScheduleConstraint,
} from './validators';

export class CreateClassDto {
  @IsString({ message: 'subjectName must be a string' })
  subjectName: string;

  @IsString({ message: 'subjectCode must be a string' })
  subjectCode: string;

  @IsOptional()
  @IsIn(['7','8','9','10'], { message: 'subjectGradeLevel must be 7,8,9 or 10' })
  subjectGradeLevel?: string;

  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId: string;

  @IsUUID('4', { message: 'teacherId must be a valid UUID' })
  teacherId: string;

  @IsString({ message: 'schoolYear must be a string' })
  @Validate(IsValidSchoolYearConstraint)
  schoolYear: string;

  @IsOptional()
  @IsString({ message: 'schedule must be a string' })
  @Validate(IsValidScheduleConstraint)
  schedule?: string;

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  room?: string;
}



// ================================================================================
// FILE: src\modules\classes\DTO\update-class.dto.ts
// ================================================================================

import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  Validate,
  IsIn,
} from 'class-validator';
import {
  IsValidSchoolYearConstraint,
  IsValidScheduleConstraint,
} from './validators';

export class UpdateClassDto {
  @IsOptional()
  @IsString({ message: 'subjectName must be a string' })
  subjectName?: string;

  @IsOptional()
  @IsString({ message: 'subjectCode must be a string' })
  subjectCode?: string;

  @IsOptional()
  @IsIn(['7','8','9','10'], { message: 'subjectGradeLevel must be 7,8,9 or 10' })
  subjectGradeLevel?: string;

  @IsOptional()
  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'teacherId must be a valid UUID' })
  teacherId?: string;

  @IsOptional()
  @IsString({ message: 'schoolYear must be a string' })
  @Validate(IsValidSchoolYearConstraint)
  schoolYear?: string;

  @IsOptional()
  @IsString({ message: 'schedule must be a string' })
  @Validate(IsValidScheduleConstraint)
  schedule?: string;

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  room?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}



// ================================================================================
// FILE: src\modules\classes\DTO\validators.ts
// ================================================================================

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator for school year format (YYYY-YYYY+1)
 * e.g., "2026-2027", "2027-2028"
 * 
 * Requirements:
 * - Format must be YYYY-YYYY+1
 * - Start year must be 2026 or later
 * - End year must be exactly startYear + 1
 */
@ValidatorConstraint({ name: 'isValidSchoolYear', async: false })
export class IsValidSchoolYearConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string): boolean {
    // Check format: YYYY-YYYY
    const regex = /^\d{4}-\d{4}$/;
    if (!regex.test(value)) return false;

    const [startYear, endYear] = value.split('-').map(Number);

    // End year must be exactly startYear + 1
    if (endYear !== startYear + 1) return false;

    // Start year must be 2026 or later
    if (startYear < 2026) return false;

    return true;
  }

  defaultMessage(): string {
    return 'schoolYear must be in format YYYY-YYYY+1 (e.g., 2026-2027) with start year >= 2026';
  }
}

/**
 * Custom validator for schedule format
 * Expected format: days time_range, e.g., "M,W,F 10:00 - 11:00"
 * 
 * Requirements:
 * - Days: comma-separated single or double letters (M, T, W, Th, F, Sa, Su)
 * - Times: HH:MM format in 24-hour time
 * - Separator: dash with optional spaces
 */
@ValidatorConstraint({ name: 'isValidSchedule', async: false })
export class IsValidScheduleConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string | undefined): boolean {
    if (!value) return true; // Schedule is optional

    // Format: "M,W,F 10:00 - 11:00" or "M,T,W 14:30 - 15:30"
    // Days can be M, T, W, Th, F, Sa, Su (comma-separated)
    // Times in HH:MM format
    const regex = /^[A-Za-z,]+\s+\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/;
    if (!regex.test(value)) return false;

    // Additional validation: validate time ranges
    const match = value.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
    if (!match) return false;

    const startHour = parseInt(match[1], 10);
    const startMin = parseInt(match[2], 10);
    const endHour = parseInt(match[3], 10);
    const endMin = parseInt(match[4], 10);

    // Validate hours and minutes
    if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59)
      return false;
    if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59)
      return false;

    // End time must be after start time
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    if (endMinutes <= startMinutes) return false;

    return true;
  }

  defaultMessage(): string {
    return 'schedule must be in format "DAYS TIME_START - TIME_END" (e.g., "M,W,F 10:00 - 11:00") with valid times';
  }
}



// ================================================================================
// FILE: src\modules\lessons\DTO\lesson.dto.ts
// ================================================================================

import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class CreateContentBlockDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsString()
  type: 'text' | 'image' | 'video' | 'question' | 'file' | 'divider';

  @IsNumber()
  order: number;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateContentBlockDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ReorderBlocksDto {
  @IsObject()
  blocks: Array<{ id: string; order: number }>;
}



// ================================================================================
// FILE: src\modules\lessons\lessons.controller.ts
// ================================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ReorderBlocksDto,
} from './DTO/lesson.dto';

@ApiTags('Lessons')
@ApiBearerAuth('token')
@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  /**
   * Get all lessons for a class (ordered)
   * Admin, Teacher, and Student can access
   */
  @Get('class/:classId')
  @Roles('admin', 'teacher', 'student')
  async getLessonsByClass(@Param('classId') classId: string) {
    const lessonList = await this.lessonsService.getLessonsByClass(classId);

    return {
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessonList,
      count: lessonList.length,
    };
  }

  /**
   * Get a single lesson with all content blocks
   * Teacher and Admin can access
   */
  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  async getLessonById(@Param('id') id: string) {
    const lesson = await this.lessonsService.getLessonById(id);

    return {
      success: true,
      message: 'Lesson retrieved successfully',
      data: lesson,
    };
  }

  /**
   * Create a new lesson
   * Teacher and Admin can access
   */
  @Post()
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.CREATED)
  async createLesson(@Body() createLessonDto: CreateLessonDto) {
    const lesson = await this.lessonsService.createLesson(createLessonDto);

    return {
      success: true,
      message: 'Lesson created successfully',
      data: lesson,
    };
  }

  /**
   * Update a lesson
   * Teacher and Admin can access
   */
  @Put(':id')
  @Roles('admin', 'teacher')
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonsService.updateLesson(id, updateLessonDto);

    return {
      success: true,
      message: 'Lesson updated successfully',
      data: lesson,
    };
  }

  /**
   * Publish a lesson
   * Teacher and Admin can access
   */
  @Put(':id/publish')
  @Roles('admin', 'teacher')
  async publishLesson(@Param('id') id: string) {
    const lesson = await this.lessonsService.publishLesson(id);

    return {
      success: true,
      message: 'Lesson published successfully',
      data: lesson,
    };
  }

  /**
   * Delete a lesson
   * Teacher and Admin can access
   */
  @Delete(':id')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLesson(@Param('id') id: string) {
    await this.lessonsService.deleteLesson(id);

    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }

  /**
   * Add a content block to a lesson
   * Teacher and Admin can access
   */
  @Post(':lessonId/blocks')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.CREATED)
  async addContentBlock(
    @Param('lessonId') lessonId: string,
    @Body() createBlockDto: CreateContentBlockDto,
  ) {
    const block = await this.lessonsService.addContentBlock({
      ...createBlockDto,
      lessonId,
    });

    return {
      success: true,
      message: 'Content block added successfully',
      data: block,
    };
  }

  /**
   * Update a content block
   * Teacher and Admin can access
   */
  @Put('blocks/:blockId')
  @Roles('admin', 'teacher')
  async updateContentBlock(
    @Param('blockId') blockId: string,
    @Body() updateBlockDto: UpdateContentBlockDto,
  ) {
    const block = await this.lessonsService.updateContentBlock(
      blockId,
      updateBlockDto,
    );

    return {
      success: true,
      message: 'Content block updated successfully',
      data: block,
    };
  }

  /**
   * Delete a content block
   * Teacher and Admin can access
   */
  @Delete('blocks/:blockId')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContentBlock(@Param('blockId') blockId: string) {
    await this.lessonsService.deleteContentBlock(blockId);

    return {
      success: true,
      message: 'Content block deleted successfully',
    };
  }

  /**
   * Reorder content blocks within a lesson
   * Teacher and Admin can access
   */
  @Put(':lessonId/reorder-blocks')
  @Roles('admin', 'teacher')
  async reorderBlocks(
    @Param('lessonId') lessonId: string,
    @Body() reorderDto: ReorderBlocksDto,
  ) {
    const lesson = await this.lessonsService.reorderBlocks(
      lessonId,
      reorderDto,
    );

    return {
      success: true,
      message: 'Blocks reordered successfully',
      data: lesson,
    };
  }

  /**
   * Mark a lesson as complete for the current student
   * Students can mark their own lessons as complete
   */
  @Post(':lessonId/complete')
  @Roles('student')
  async markLessonComplete(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.lessonsService.markLessonComplete(
      user.userId,
      lessonId,
    );

    return {
      success: true,
      message: 'Lesson marked as complete',
      data: result,
    };
  }

  /**
   * Check if a student has completed a lesson
   * Students can check their own progress
   */
  @Get(':lessonId/completion-status')
  @Roles('student')
  async getCompletionStatus(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.lessonsService.isLessonCompleted(
      user.userId,
      lessonId,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get all completed lessons for a student in a class
   * Students can view their own progress per class
   */
  @Get('class/:classId/completed')
  @Roles('student')
  async getCompletedLessons(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
  ) {
    const completions = await this.lessonsService.getCompletedLessonsForClass(
      user.userId,
      classId,
    );

    return {
      success: true,
      data: completions,
      count: completions.length,
    };
  }
}




// ================================================================================
// FILE: src\modules\lessons\lessons.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}



// ================================================================================
// FILE: src\modules\lessons\lessons.service.ts
// ================================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { lessons, lessonContentBlocks, classes, lessonCompletions, users } from '../../drizzle/schema';
import { CreateLessonDto, UpdateLessonDto, CreateContentBlockDto, UpdateContentBlockDto, ReorderBlocksDto } from './DTO/lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Get all lessons for a class
   */
  async getLessonsByClass(classId: string) {
    const lessonList = await this.db.query.lessons.findMany({
      where: eq(lessons.classId, classId),
      with: {
        contentBlocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.order)],
        },
      },
      orderBy: (lessons, { asc }) => [asc(lessons.order)],
    });

    return lessonList;
  }

  /**
   * Get a single lesson by ID with all content blocks
   */
  async getLessonById(lessonId: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: {
        contentBlocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.order)],
        },
        class: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    return lesson;
  }

  /**
   * Create a new lesson
   */
  async createLesson(createLessonDto: CreateLessonDto) {
    // Verify class exists
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, createLessonDto.classId),
    });

    if (!classRecord) {
      throw new BadRequestException(
        `Class with ID "${createLessonDto.classId}" not found`,
      );
    }

    // Get the highest order number for this class
    const lastLesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.classId, createLessonDto.classId),
      orderBy: (lessons, { desc }) => [desc(lessons.order)],
    });

    const nextOrder = (lastLesson?.order || 0) + 1;

    const [newLesson] = await this.db
      .insert(lessons)
      .values({
        title: createLessonDto.title,
        description: createLessonDto.description,
        classId: createLessonDto.classId,
        order: createLessonDto.order || nextOrder,
        isDraft: true,
      })
      .returning();

    return this.getLessonById(newLesson.id);
  }

  /**
   * Update a lesson
   */
  async updateLesson(lessonId: string, updateLessonDto: UpdateLessonDto) {
    // Verify lesson exists
    await this.getLessonById(lessonId);

    await this.db
      .update(lessons)
      .set({
        ...updateLessonDto,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId));

    return this.getLessonById(lessonId);
  }

  /**
   * Delete a lesson (cascades to content blocks)
   */
  async deleteLesson(lessonId: string) {
    const lesson = await this.getLessonById(lessonId);

    await this.db.delete(lessons).where(eq(lessons.id, lessonId));

    return lesson;
  }

  /**
   * Publish a lesson (toggle isDraft to false)
   */
  async publishLesson(lessonId: string) {
    const lesson = await this.getLessonById(lessonId);

    await this.db
      .update(lessons)
      .set({
        isDraft: false,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId));

    return this.getLessonById(lessonId);
  }

  /**
   * Add a content block to a lesson
   */
  async addContentBlock(createBlockDto: CreateContentBlockDto) {
    // Ensure lessonId was provided (controller should merge lessonId param)
    if (!createBlockDto.lessonId) {
      throw new BadRequestException('lessonId is required');
    }

    // Verify lesson exists
    const lesson = await this.getLessonById(createBlockDto.lessonId);

    const [newBlock] = await this.db
      .insert(lessonContentBlocks)
      .values({
        lessonId: createBlockDto.lessonId,
        type: createBlockDto.type as any,
        order: createBlockDto.order,
        content: createBlockDto.content,
        metadata: createBlockDto.metadata || {},
      })
      .returning();

    return newBlock;
  }

  /**
   * Get a single content block
   */
  async getContentBlockById(blockId: string) {
    const block = await this.db.query.lessonContentBlocks.findFirst({
      where: eq(lessonContentBlocks.id, blockId),
    });

    if (!block) {
      throw new NotFoundException(
        `Content block with ID "${blockId}" not found`,
      );
    }

    return block;
  }

  /**
   * Update a content block
   */
  async updateContentBlock(
    blockId: string,
    updateBlockDto: UpdateContentBlockDto,
  ) {
    // Verify block exists
    await this.getContentBlockById(blockId);

    const updateData: any = { updatedAt: new Date() };
    
    if (updateBlockDto.type !== undefined) updateData.type = updateBlockDto.type as any;
    if (updateBlockDto.order !== undefined) updateData.order = updateBlockDto.order;
    if (updateBlockDto.content !== undefined) updateData.content = updateBlockDto.content;
    if (updateBlockDto.metadata !== undefined) updateData.metadata = updateBlockDto.metadata;

    await this.db
      .update(lessonContentBlocks)
      .set(updateData)
      .where(eq(lessonContentBlocks.id, blockId));

    return this.getContentBlockById(blockId);
  }

  /**
   * Delete a content block
   */
  async deleteContentBlock(blockId: string) {
    const block = await this.getContentBlockById(blockId);

    await this.db
      .delete(lessonContentBlocks)
      .where(eq(lessonContentBlocks.id, blockId));

    return block;
  }

  /**
   * Reorder content blocks within a lesson
   */
  async reorderBlocks(lessonId: string, reorderDto: ReorderBlocksDto) {
    // Verify lesson exists
    await this.getLessonById(lessonId);

    // Update order for each block
    for (const blockUpdate of reorderDto.blocks) {
      await this.db
        .update(lessonContentBlocks)
        .set({
          order: blockUpdate.order,
          updatedAt: new Date(),
        })
        .where(eq(lessonContentBlocks.id, blockUpdate.id));
    }

    // Return updated lesson
    return this.getLessonById(lessonId);
  }

  /**
   * Mark a lesson as complete for a student
   */
  async markLessonComplete(studentId: string, lessonId: string) {
    // Verify lesson exists
    await this.getLessonById(lessonId);

    // Verify student exists
    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    // Try to insert or update completion
    try {
      const result = await this.db
        .insert(lessonCompletions)
        .values({
          studentId,
          lessonId,
          progressPercentage: 100,
        })
        .returning();

      return { isCompleted: true, completedAt: result[0].completedAt };
    } catch (error) {
      // If unique constraint violation, update existing record
      if (error.code === '23505') {
        await this.db
          .update(lessonCompletions)
          .set({
            progressPercentage: 100,
            completedAt: new Date(),
          })
          .where(
            and(
              eq(lessonCompletions.studentId, studentId),
              eq(lessonCompletions.lessonId, lessonId),
            ),
          );

        return { isCompleted: true, message: 'Lesson already marked as complete' };
      }
      throw error;
    }
  }

  /**
   * Check if a student has completed a lesson
   */
  async isLessonCompleted(studentId: string, lessonId: string) {
    const completion = await this.db.query.lessonCompletions.findFirst({
      where: and(
        eq(lessonCompletions.studentId, studentId),
        eq(lessonCompletions.lessonId, lessonId),
      ),
    });

    return {
      isCompleted: !!completion,
      completedAt: completion?.completedAt || null,
    };
  }

  /**
   * Get all completed lessons for a student in a class
   */
  async getCompletedLessonsForClass(studentId: string, classId: string) {
    const completions = await this.db.query.lessonCompletions.findMany({
      where: and(
        eq(lessonCompletions.studentId, studentId),
      ),
      with: {
        lesson: true,
      },
    });

    // Filter completions for lessons in the specified class
    return completions
      .filter(c => c.lesson?.classId === classId)
      .map(c => ({
        lessonId: c.lessonId,
        completedAt: c.completedAt,
      }));
  }
}




// ================================================================================
// FILE: src\modules\mail\mail.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // Export so OtpModule can use it
})
export class MailModule {}



// ================================================================================
// FILE: src\modules\mail\mail.service.ts
// ================================================================================

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Only initialize transporter if credentials exist or we are in dev
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    purpose: string = 'email_verification',
  ) {
    if (!this.transporter) {
      this.logger.warn(`[DEV MODE] OTP for ${email}: ${otp}`);
      return { success: true, mode: 'development' };
    }

    const subject =
      purpose === 'email_verification'
        ? 'Verify Your Nexora Account'
        : 'Reset Your Nexora Password';

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject,
        html: this.getOtpTemplate(otp, purpose),
        text: `Your Nexora verification code is: ${otp}. Expires in 10 minutes.`,
      });
      return { success: true, mode: 'production' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error.stack);
      throw new Error('Email delivery failed'); // Filtered by Global Exception Filter
    }
  }

  /**
   * Send temporary password to new user's email
   * @param email User's email address
   * @param password Temporary password
   */
  async sendPasswordEmail(email: string, password: string) {
    if (!this.transporter) {
      this.logger.warn(`[DEV MODE] Password for ${email}: ${password}`);
      return { success: true, mode: 'development' };
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your Nexora Account Credentials',
        html: this.getPasswordTemplate(password),
        text: `Your temporary Nexora account password is: ${password}. Please log in and change it immediately after verifying your email.`,
      });
      return { success: true, mode: 'production' };
    } catch (error) {
      this.logger.error(`Failed to send password email to ${email}`, error.stack);
      throw new Error('Email delivery failed');
    }
  }

  // Kept your template logic inside the class
  private getOtpTemplate(otp: string, purpose: string) {
    const isVerification = purpose === 'email_verification';
    const color = isVerification ? '#4CAF50' : '#2196F3';
    const title = isVerification
      ? 'Email Verification'
      : 'Password Reset Request';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
            <h1>Nexora LMS</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>${title}</h2>
            <p>Use the code below to complete your request:</p>
            <div style="font-size: 32px; font-weight: bold; color: ${color}; text-align: center; margin: 20px 0;">
                ${otp}
            </div>
            <p><strong>Expires in 10 minutes.</strong></p>
        </div>
      </div>
    `;
  }

  /**
   * Template for temporary password email
   */
  private getPasswordTemplate(password: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
            <h1>Nexora LMS</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Your Account is Ready!</h2>
            <p>Your Nexora account has been created. Here is your temporary password:</p>
            <div style="font-size: 24px; font-weight: bold; color: #2196F3; text-align: center; margin: 20px 0; padding: 15px; background-color: white; border-radius: 8px; font-family: 'Courier New', monospace;">
                ${password}
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <p style="margin: 0; color: #856404;"><strong>⚠️ Important Security Notice:</strong></p>
              <ul style="margin: 10px 0 0 0; color: #856404;">
                <li>This is a temporary password. For your security, please change it after logging in.</li>
                <li>Do not share this password with anyone.</li>
                <li>Verify your email address after logging in to fully activate your account.</li>
              </ul>
            </div>
            <p style="margin-top: 20px; text-align: center;">
              <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 6px;">Go to Nexora</a>
            </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;
  }
}



// ================================================================================
// FILE: src\modules\otp\dto\resend-otp.dto.ts
// ================================================================================

import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;
}



// ================================================================================
// FILE: src\modules\otp\dto\verify-otp.dto.ts
// ================================================================================

import { IsEmail, Length, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsNumberString({}, { message: 'OTP must contain only numbers' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;
}



// ================================================================================
// FILE: src\modules\otp\otp.controller.ts
// ================================================================================

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('OTP')
@ApiBearerAuth('token')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    await this.otpService.verifyOTP(verifyOtpDto.email, verifyOtpDto.code);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  @Public()
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification OTP' })
  @ApiResponse({ status: 200, description: 'New verification code sent' })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    await this.otpService.resendOTP(resendOtpDto.email);

    return {
      success: true,
      message: 'Verification code sent',
    };
  }
}



// ================================================================================
// FILE: src\modules\otp\otp.module.ts
// ================================================================================

import { Module, forwardRef } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [forwardRef(() => UsersModule), MailModule],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}



// ================================================================================
// FILE: src\modules\otp\otp.service.ts
// ================================================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { otpVerifications } from '../../drizzle/schema';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service'; // Imported MailService

@Injectable()
export class OtpService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly mailService: MailService, // Injected MailService
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async createAndSendOTP(
    userId: string,
    email: string,
    purpose: 'email_verification' | 'password_reset' = 'email_verification',
  ): Promise<void> {
    // 1. Delete old unused OTPs for this user/purpose
    await this.db
      .delete(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.purpose, purpose),
          eq(otpVerifications.isUsed, false),
        ),
      );

    // 2. Generate secure 6-digit OTP
    const code = this.generateSecureOTP();

    // 3. Set expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Save to database
    await this.db.insert(otpVerifications).values({
      userId,
      code,
      purpose,
      expiresAt,
      isUsed: false,
      attemptCount: 0,
    });

    // 5. Send email via MailService
    await this.mailService.sendOtpEmail(email, code, purpose);
  }

  async verifyOTP(email: string, code: string): Promise<void> {
    // 1. Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 2. Find the OTP record
    const otp = await this.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, user.id),
        eq(otpVerifications.purpose, 'email_verification'),
        eq(otpVerifications.isUsed, false),
      ),
      orderBy: (otpVerifications, { desc }) => [
        desc(otpVerifications.createdAt),
      ],
    });

    if (!otp) {
      console.error('[OTP] No pending OTP found for user:', email);
      throw new BadRequestException('No pending verification found');
    }

    console.log('[OTP] Verifying OTP for:', email, 'provided:', code.substring(0, 2) + '****', 'stored:', otp.code.substring(0, 2) + '****');

    // 3. Check attempt limit
    // Use atomic increment with WHERE clause
    const [updated] = await this.db
      .update(otpVerifications)
      .set({ attemptCount: sql`${otpVerifications.attemptCount} + 1` })
      .where(
        and(
          eq(otpVerifications.id, otp.id),
          sql`${otpVerifications.attemptCount} < 5`, // Only update if under limit
        ),
      )
      .returning();

    if (!updated) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    if (otp.code !== code) {
      console.warn('[OTP] Invalid code for user:', email, '- provided:', code, 'expected:', otp.code);
      throw new BadRequestException('Invalid verification code');
    }

    // 4. Check expiration
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Verification code has expired');
    }

    // 5. Verify code
    if (otp.code !== code) {
      // Increment attempt count
      await this.db
        .update(otpVerifications)
        .set({ attemptCount: otp.attemptCount + 1 })
        .where(eq(otpVerifications.id, otp.id));

      throw new BadRequestException('Invalid verification code');
    }

    // 6. Mark OTP as used and delete
    // Note: Deleting is fine, but marking isUsed=true is better for audit trails if needed later.
    // For now, sticking to your delete logic to keep it clean.
    await this.db
      .delete(otpVerifications)
      .where(eq(otpVerifications.id, otp.id));

    // 7. Verify user's email
    await this.usersService.verifyEmail(user.id);
  }

  async resendOTP(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.createAndSendOTP(user.id, user.email, 'email_verification');
  }

  private generateSecureOTP(): string {
    const randomBytes = crypto.randomBytes(3);
    const randomNumber = randomBytes.readUIntBE(0, 3);
    const otp = (randomNumber % 900000) + 100000; // Ensures 6 digits
    return otp.toString();
  }
}



// ================================================================================
// FILE: src\modules\profiles\DTO\update-profile.dto.ts
// ================================================================================

import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsIn(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message: 'Relationship must be one of: Father, Mother, Guardian, Sibling, Other',
  })
  familyRelationship?: string;

  @IsOptional()
  @IsString()
  familyContact?: string;

  @IsOptional()
  @IsIn(['7','8','9','10'], {
    message: 'Grade level must be one of: 7, 8, 9, 10',
  })
  gradeLevel?: '7' | '8' | '9' | '10';
}



// ================================================================================
// FILE: src\modules\profiles\profiles.controller.ts
// ================================================================================

import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Put,
  ForbiddenException,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Profiles')
@ApiBearerAuth('token')
@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  // Get current user's profile
  @Get('me')
  @Roles('student', 'teacher', 'admin')
  async getMyProfile(@CurrentUser() user: any) {
    const profile = await this.profilesService.findByUserId(user.id);
    console.log(user.id);
    console.log(profile);
    return {
      success: true,
      data: profile || null,
    };
  }

  // Get profile by userId — admin or owner only
  @Get(':userId')
  @Roles('admin', 'student', 'teacher')
  async getProfileByUserId(@Param('userId') userId: string, @CurrentUser() user: any) {
    const primaryRole = user.roles?.[0];
    console.log('Requested profile for userId:', userId);
    console.log('Current user:', user);
    console.log('userId', user.userId);
    // Allow admins or the owner to view the profile
    if (primaryRole !== 'admin' && user.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this profile');
    }

    const profile = await this.profilesService.findByUserId(userId);
    return {
      success: true,
      data: profile || null,
    };
  }

  // Admin: create profile for a user
  @Post('create')
  @Roles('admin')
  async createProfile(@Body() dto: UpdateProfileDto & { userId: string }) {
    const { userId, ...data } = dto as any;
    const profile = await this.profilesService.createProfile(userId, data);
    return {
      success: true,
      message: 'Profile created successfully',
      data: profile,
    };
  }

  // Update profile - admins can update any; users can update their own
  @Put('update/:userId')
  @Roles('student', 'teacher', 'admin')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: any,
  ) {
    // Allow only admins or the owner to update
    const primaryRole = user.roles?.[0];
    if (primaryRole !== 'admin' && user.id !== userId) {
      throw new ForbiddenException('Not authorized to update this profile');
    }

    const updated = await this.profilesService.updateProfile(userId, dto);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    };
  }
}



// ================================================================================
// FILE: src\modules\profiles\profiles.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}



// ================================================================================
// FILE: src\modules\profiles\profiles.service.ts
// ================================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { studentProfiles } from '../../drizzle/schema';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProfilesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // Find profile by user ID
  async findByUserId(userId: string) {
    const profile = await this.db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, userId),
    });

    return profile;
  }

  // Create profile for a user
  async createProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const [newProfile] = await this.db
      .insert(studentProfiles)
      .values({ userId, ...dto })
      .returning();

    return newProfile;
  }

  // Update (or create if not exists) profile for a user
  async updateProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const existing = await this.findByUserId(userId);

    if (!existing) {
      // Insert new profile
      return this.createProfile(userId, dto);
    }

    const [updated] = await this.db
      .update(studentProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();

    return updated;
  }
}



// ================================================================================
// FILE: src\modules\roles\roles.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';

@Module({
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}



// ================================================================================
// FILE: src\modules\roles\roles.service.ts
// ================================================================================

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { roles } from '../../drizzle/schema';

@Injectable()
export class RolesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async findByName(name: string) {
    return this.db.query.roles.findFirst({
      where: eq(roles.name, name),
    });
  }

  async findAll() {
    return this.db.query.roles.findMany();
  }
}



// ================================================================================
// FILE: src\modules\sections\DTO\create-section.dto.ts
// ================================================================================

import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty({ message: 'Section name is required' })
  @MinLength(1, { message: 'Section name must be at least 1 character' })
  @MaxLength(100, { message: 'Section name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  @Transform(({ value }) => value?.trim())
  gradeLevel: string;

  @IsString()
  @IsNotEmpty({ message: 'School year is required' })
  @Transform(({ value }) => value?.trim())
  schoolYear: string;

  @IsInt({ message: 'Capacity must be an integer' })
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity: number;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Room number must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  @IsUUID('4', { message: 'Adviser ID must be a valid UUID' })
  @IsOptional()
  adviserId?: string;
}



// ================================================================================
// FILE: src\modules\sections\DTO\update-section.dto.ts
// ================================================================================

import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Section name must be at least 1 character' })
  @MaxLength(100, { message: 'Section name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  gradeLevel?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  schoolYear?: string;

  @IsInt({ message: 'Capacity must be an integer' })
  @IsOptional()
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Room number must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  @IsUUID('4', { message: 'Adviser ID must be a valid UUID' })
  @IsOptional()
  adviserId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}



// ================================================================================
// FILE: src\modules\sections\sections.controller.ts
// ================================================================================

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionsController {
  constructor(private sectionsService: SectionsService) {}

  /**
   * Get all sections with optional filters
   * Admin and Teacher can access
   */
  @Get('all')
  @Roles('admin', 'teacher')
  async getAllSections(
    @Query('gradeLevel') gradeLevel?: string,
    @Query('schoolYear') schoolYear?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (schoolYear) filters.schoolYear = schoolYear;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const sections = await this.sectionsService.findAll(filters);

    return {
      success: true,
      data: sections,
      count: sections.length,
    };
  }

  /**
   * Get sections assigned to the current logged-in teacher
   * Teacher only
   */
  @Get('my')
  @Roles('teacher')
  async getMySections(@Req() req: any) {
    const userId = req?.user?.userId;

    // Ensure the request is authenticated and contains the user id
    if (!userId) {
      throw new UnauthorizedException('You must be logged in to access your sections');
    }

    const sections = await this.sectionsService.findAll({ adviserId: userId });

    return {
      success: true,
      data: sections,
      count: sections.length,
    };
  }

  /**
   * Get a single section by ID
   * Admin and Teacher can access
   */
  @Get(':id')
  @Roles('admin', 'teacher')
  async getSectionById(@Param('id') id: string) {
    const section = await this.sectionsService.findById(id);

    return {
      success: true,
      data: section,
    };
  }

  /**
   * Create a new section
   * Admin only
   */
  @Post('create')
  @Roles('admin')
  async createSection(@Body() createSectionDto: CreateSectionDto) {
    const section = await this.sectionsService.createSection(createSectionDto);

    return {
      success: true,
      message: 'Section created successfully',
      data: section,
    };
  }

  /**
   * Update a section
   * Admin only
   */
  @Put('update/:id')
  @Roles('admin')
  async updateSection(
    @Param('id') id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    const updatedSection = await this.sectionsService.updateSection(
      id,
      updateSectionDto,
    );

    return {
      success: true,
      message: 'Section updated successfully',
      data: updatedSection,
    };
  }

  /**
   * Soft delete a section (set isActive to false)
   * Admin only
   */
  @Delete('delete/:id')
  @Roles('admin')
  async deleteSection(@Param('id') id: string) {
    await this.sectionsService.deleteSection(id);

    return {
      success: true,
      message: 'Section deleted successfully (set to inactive)',
    };
  }

  /**
   * Get roster (students) for a section
   * Admin and Teacher can access
   */
  @Get(':id/roster')
  @Roles('admin', 'teacher')
  async getRoster(@Param('id') id: string) {
    const roster = await this.sectionsService.getRoster(id);

    return {
      success: true,
      data: roster,
      count: roster.length,
    };
  }

  /**
   * Get candidate students to add to a section (not currently members)
   * Admin only
   */
  @Get(':id/candidates')
  @Roles('admin')
  async getCandidates(@Param('id') id: string, @Query('gradeLevel') gradeLevel?: string, @Query('search') search?: string) {
    const filters: any = {};
    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (search) filters.search = search;

    const candidates = await this.sectionsService.getCandidates(id, filters);

    return {
      success: true,
      data: candidates,
      count: candidates.length,
    };
  }

  /**
   * Add students to a section
   * Admin only
   */
  @Post(':id/roster')
  @Roles('admin')
  async addStudentsToSection(@Param('id') id: string, @Body('studentIds') studentIds: string[]) {
    const result = await this.sectionsService.addStudentsToSection(id, studentIds);

    return {
      success: true,
      message: `${result.createdCount} students added to section`,
      data: result,
    };
  }

  /**
   * Remove student from a section
   * Admin only
   */
  @Delete(':id/roster/:studentId')
  @Roles('admin')
  async removeStudentFromSection(@Param('id') id: string, @Param('studentId') studentId: string) {
    const result = await this.sectionsService.removeStudentFromSection(id, studentId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Permanently delete a section
   * Admin only - Use with extreme caution
   */
  @Delete('permanent/:id')
  @Roles('admin')
  async permanentlyDeleteSection(@Param('id') id: string) {
    await this.sectionsService.permanentlyDeleteSection(id);

    return {
      success: true,
      message: 'Section permanently deleted',
    };
  }
}



// ================================================================================
// FILE: src\modules\sections\sections.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}



// ================================================================================
// FILE: src\modules\sections\sections.service.ts
// ================================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { sections, users, enrollments, studentProfiles } from '../../drizzle/schema';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Find all sections with optional filters
   */
  async findAll(filters?: {
    gradeLevel?: string;
    schoolYear?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    adviserId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel) {
      whereConditions.push(eq(sections.gradeLevel, filters.gradeLevel));
    }

    if (filters?.schoolYear) {
      whereConditions.push(eq(sections.schoolYear, filters.schoolYear));
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(sections.isActive, filters.isActive));
    }

    if (filters?.adviserId) {
      whereConditions.push(eq(sections.adviserId, filters.adviserId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(sections.name, searchPattern),
        ilike(sections.gradeLevel, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const sectionsList = await this.db.query.sections.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        adviser: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (sections, { asc }) => [
        asc(sections.gradeLevel),
        asc(sections.name),
      ],
      limit,
      offset,
    });

    return sectionsList;
  }

  /**
   * Find a section by ID
   */
  async findById(id: string) {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, id),
      with: {
        adviser: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${id}" not found`);
    }

    return section;
  }

  /**
   * Get the roster (students) for a section
   */
  async getRoster(sectionId: string) {
    // Verify section exists
    await this.findById(sectionId);

    const roster = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.sectionId, sectionId),
        eq(enrollments.status, 'enrolled'),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
              },
            },
          },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    return roster.map(r => ({
      enrollmentId: r.id,
      studentId: r.studentId,
      status: r.status,
      enrolledAt: r.enrolledAt,
      student: r.student,
    }));
  }

  /**
   * Get candidate students who are not yet part of the section
   */
  async getCandidates(sectionId: string, filters?: { gradeLevel?: string; search?: string }) {
    // Verify section exists
    const section = await this.findById(sectionId);

    // Build base query: students who do not have an enrollment for this section
    // We will select users who have a student profile (i.e., are students)
    // We'll fetch users with profiles and apply grade/search filters client-side for simplicity
    // (keeps SQL simple and avoids enum typing issues)

    // Subquery to find students already in this section
    const existing = await this.db.query.enrollments.findMany({
      where: eq(enrollments.sectionId, sectionId),
      columns: { studentId: true },
    });

    const existingStudentIds = existing.map(e => e.studentId);

    // Query users with their student profile (fetch candidates client-side)
    const candidates = await this.db.query.users.findMany({
      with: {
        profile: true,
      },
      orderBy: (users, { asc }) => [asc(users.lastName), asc(users.firstName)],
      limit: 500,
    });

    // Filter out existing students and apply grade/search filters client-side for simplicity
    const filtered = candidates
      .filter(c => c.profile) // only users that have a student profile
      .filter(c => !existingStudentIds.includes(c.id))
      .filter(c => {
        if (filters?.gradeLevel && c.profile?.gradeLevel !== filters.gradeLevel) return false;
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          return (
            c.firstName?.toLowerCase().includes(s) ||
            c.lastName?.toLowerCase().includes(s) ||
            c.email?.toLowerCase().includes(s)
          );
        }
        return true;
      });

    return filtered.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, gradeLevel: u.profile?.gradeLevel }));
  }

  /**
   * Bulk add students to a section (creates enrollments with classId = null)
   */
  async addStudentsToSection(sectionId: string, studentIds: string[]) {
    // Verify section exists
    await this.findById(sectionId);

    const created: any[] = [];

    for (const sid of studentIds) {
      // Verify student exists
      const student = await this.db.query.users.findFirst({ where: eq(users.id, sid) });
      if (!student) continue; // skip invalid ids

      // Check if already enrolled in this section without a class
      const existing = await this.db.query.enrollments.findFirst({
        where: and(eq(enrollments.sectionId, sectionId), eq(enrollments.studentId, sid), eq(enrollments.status, 'enrolled')),
      });

      if (existing) continue; // skip duplicates

      const [newEnrollment] = await this.db.insert(enrollments).values({
        studentId: sid,
        classId: null,
        sectionId: sectionId,
        status: 'enrolled',
        enrolledAt: new Date(),
      }).returning();

      created.push(newEnrollment);
    }

    return {
      createdCount: created.length,
      created,
    };
  }

  /**
   * Remove a student from a section (only if not enrolled in a class)
   */
  async removeStudentFromSection(sectionId: string, studentId: string) {
    // Verify section exists
    await this.findById(sectionId);

    // Find enrollment where student is in this section and not yet assigned to a class
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(eq(enrollments.sectionId, sectionId), eq(enrollments.studentId, studentId)),
    });

    if (!enrollment) {
      throw new BadRequestException('Student is not a member of this section');
    }

    if (enrollment.classId) {
      throw new BadRequestException('Student is enrolled in a class for this section; remove class enrollment first');
    }

    await this.db.delete(enrollments).where(eq(enrollments.id, enrollment.id));

    return { removed: true };
  }

  /**
   * Create a new section
   */
  async createSection(createSectionDto: CreateSectionDto) {
    // Check if section with same name, grade level, and school year already exists
    const existingSection = await this.db.query.sections.findFirst({
      where: and(
        eq(sections.name, createSectionDto.name),
        eq(sections.gradeLevel, createSectionDto.gradeLevel),
        eq(sections.schoolYear, createSectionDto.schoolYear),
      ),
    });

    if (existingSection) {
      throw new ConflictException(
        `Section "${createSectionDto.name}" already exists for ${createSectionDto.gradeLevel} in ${createSectionDto.schoolYear}`,
      );
    }

    // Verify adviser exists if provided
    if (createSectionDto.adviserId) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, createSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(
          `Adviser with ID "${createSectionDto.adviserId}" not found`,
        );
      }
    }

    // Create the section
    const [newSection] = await this.db
      .insert(sections)
      .values({
        name: createSectionDto.name,
        gradeLevel: createSectionDto.gradeLevel,
        schoolYear: createSectionDto.schoolYear,
        capacity: createSectionDto.capacity,
        roomNumber: createSectionDto.roomNumber || null,
        adviserId: createSectionDto.adviserId || null,
        isActive: true,
      })
      .returning();

    // Fetch with adviser details
    return this.findById(newSection.id);
  }

  /**
   * Update a section
   */
  async updateSection(id: string, updateSectionDto: UpdateSectionDto) {
    // Verify section exists
    const existingSection = await this.findById(id);

    // Check for name/grade/year conflicts if any of those are being updated
    if (
      updateSectionDto.name ||
      updateSectionDto.gradeLevel ||
      updateSectionDto.schoolYear
    ) {
      const nameToCheck = updateSectionDto.name || existingSection.name;
      const gradeToCheck =
        updateSectionDto.gradeLevel || existingSection.gradeLevel;
      const yearToCheck =
        updateSectionDto.schoolYear || existingSection.schoolYear;

      const duplicateSection = await this.db.query.sections.findFirst({
        where: and(
          eq(sections.name, nameToCheck),
          eq(sections.gradeLevel, gradeToCheck),
          eq(sections.schoolYear, yearToCheck),
        ),
      });

      if (duplicateSection && duplicateSection.id !== id) {
        throw new ConflictException(
          `Section "${nameToCheck}" already exists for ${gradeToCheck} in ${yearToCheck}`,
        );
      }
    }

    // Verify adviser exists if provided
    if (updateSectionDto.adviserId) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, updateSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(
          `Adviser with ID "${updateSectionDto.adviserId}" not found`,
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateSectionDto.name !== undefined) {
      updateData.name = updateSectionDto.name;
    }
    if (updateSectionDto.gradeLevel !== undefined) {
      updateData.gradeLevel = updateSectionDto.gradeLevel;
    }
    if (updateSectionDto.schoolYear !== undefined) {
      updateData.schoolYear = updateSectionDto.schoolYear;
    }
    if (updateSectionDto.capacity !== undefined) {
      updateData.capacity = updateSectionDto.capacity;
    }
    if (updateSectionDto.roomNumber !== undefined) {
      updateData.roomNumber = updateSectionDto.roomNumber;
    }
    if (updateSectionDto.adviserId !== undefined) {
      updateData.adviserId = updateSectionDto.adviserId;
    }
    if (updateSectionDto.isActive !== undefined) {
      updateData.isActive = updateSectionDto.isActive;
    }

    // Perform update
    await this.db
      .update(sections)
      .set(updateData)
      .where(eq(sections.id, id));

    // Fetch updated section with adviser details
    return this.findById(id);
  }

  /**
   * Delete (soft delete) a section by setting isActive to false
   */
  async deleteSection(id: string) {
    // Verify section exists
    await this.findById(id);

    // Soft delete by setting isActive to false
    await this.db
      .update(sections)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, id));

    return this.findById(id);
  }

  /**
   * Permanently delete a section (hard delete)
   * Use with caution - this will cascade delete related classes and enrollments
   */
  async permanentlyDeleteSection(id: string) {
    // Verify section exists
    await this.findById(id);

    await this.db.delete(sections).where(eq(sections.id, id));

    return { message: 'Section permanently deleted' };
  }
}



// ================================================================================
// FILE: src\modules\subjects\DTO\create-subject.dto.ts
// ================================================================================

import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject name is required' })
  @MinLength(2, { message: 'Subject name must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject code is required' })
  @MinLength(2, { message: 'Subject code must be at least 2 characters' })
  @MaxLength(20, { message: 'Subject code must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: 'Description must not exceed 500 characters',
  })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  @Transform(({ value }) => value?.trim())
  gradeLevel: string;
}



// ================================================================================
// FILE: src\modules\subjects\DTO\update-subject.dto.ts
// ================================================================================

import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Subject name must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Subject code must be at least 2 characters' })
  @MaxLength(20, { message: 'Subject code must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: 'Description must not exceed 500 characters',
  })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  gradeLevel?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}



// ================================================================================
// FILE: src\modules\subjects\subjects.controller.ts
// ================================================================================

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './DTO/create-subject.dto';
import { UpdateSubjectDto } from './DTO/update-subject.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  /**
   * Get all subjects with optional filters
   * Admin only
   */
  @Get('all')
  @Roles('admin', 'teacher')
  async getAllSubjects(
    @Query('gradeLevel') gradeLevel?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const subjects = await this.subjectsService.findAll(filters);

    return {
      success: true,
      data: subjects,
      count: subjects.length,
    };
  }

  /**
   * Get a single subject by ID
   * Admin and Teacher can access
   */
  @Get(':id')
  @Roles('admin', 'teacher')
  async getSubjectById(@Param('id') id: string) {
    const subject = await this.subjectsService.findById(id);

    return {
      success: true,
      data: subject,
    };
  }

  /**
   * Create a new subject
   * Admin only
   */
  @Post('create')
  @Roles('admin')
  async createSubject(@Body() createSubjectDto: CreateSubjectDto) {
    const subject = await this.subjectsService.createSubject(createSubjectDto);

    return {
      success: true,
      message: 'Subject created successfully',
      data: subject,
    };
  }

  /**
   * Update a subject
   * Admin only
   */
  @Put('update/:id')
  @Roles('admin')
  async updateSubject(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const updatedSubject = await this.subjectsService.updateSubject(
      id,
      updateSubjectDto,
    );

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  /**
   * Soft delete a subject (set isActive to false)
   * Admin only
   */
  @Delete('delete/:id')
  @Roles('admin')
  async deleteSubject(@Param('id') id: string) {
    await this.subjectsService.deleteSubject(id);

    return {
      success: true,
      message: 'Subject deleted successfully (set to inactive)',
    };
  }

  /**
   * Permanently delete a subject
   * Admin only - Use with extreme caution
   */
  @Delete('permanent/:id')
  @Roles('admin')
  async permanentlyDeleteSubject(@Param('id') id: string) {
    await this.subjectsService.permanentlyDeleteSubject(id);

    return {
      success: true,
      message: 'Subject permanently deleted',
    };
  }
}



// ================================================================================
// FILE: src\modules\subjects\subjects.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}



// ================================================================================
// FILE: src\modules\subjects\subjects.service.ts
// ================================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { classes } from '../../drizzle/schema';
import { CreateSubjectDto } from './DTO/create-subject.dto';
import { UpdateSubjectDto } from './DTO/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Find all subjects with optional filters
   */
  async findAll(filters?: {
    gradeLevel?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    // Query classes and derive distinct subjects from denormalized fields
    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel) {
      whereConditions.push(eq(classes.subjectGradeLevel, filters.gradeLevel as '7'|'8'|'9'|'10'));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(classes.subjectName, searchPattern),
        ilike(classes.subjectCode, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const classRows = await this.db.query.classes.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: (classes, { asc }) => [asc(classes.subjectName)],
      limit: limit * 5, // fetch extra to allow de-duplication
      offset,
    });

    const map: Record<string, any> = {};
    classRows.forEach((r) => {
      if (!r.subjectCode) return;
      if (!map[r.subjectCode]) {
        map[r.subjectCode] = {
          name: r.subjectName,
          code: r.subjectCode,
          gradeLevel: r.subjectGradeLevel,
        };
      }
    });

    const subjectsList = Object.values(map).slice(0, limit);

    return subjectsList;
  }

  /**
   * Find a subject by ID
   */
  async findById(id: string) {
    // Treat id as subject code for compatibility
    const subject = await this.db.query.classes.findFirst({
      where: eq(classes.subjectCode, id),
    });

    if (!subject) {
      throw new NotFoundException(`Subject with code "${id}" not found`);
    }

    return {
      name: subject.subjectName,
      code: subject.subjectCode,
      gradeLevel: subject.subjectGradeLevel,
    };
  }

  /**
   * Find subject by code
   */
  async findByCode(code: string) {
    const subject = await this.db.query.classes.findFirst({
      where: eq(classes.subjectCode, code.toUpperCase()),
    });

    if (!subject) return null;

    return {
      name: subject.subjectName,
      code: subject.subjectCode,
      gradeLevel: subject.subjectGradeLevel,
    };
  }

  /**
   * Create a new subject
   */
  async createSubject(createSubjectDto: CreateSubjectDto) {
    // Subjects are now represented within `classes` (denormalized); creating a subject directly is no longer supported.
    throw new BadRequestException(
      'Subjects are now derived from Classes. To add a subject, create a Class with the desired subjectName/subjectCode.',
    );
  }

  /**
   * Update a subject
   */
  async updateSubject(id: string, updateSubjectDto: UpdateSubjectDto) {
    // Subjects are denormalized into Classes; direct subject updates are not supported.
    throw new BadRequestException(
      'Subjects are denormalized into Classes. To change a subject, update the Classes that reference it.',
    );
  }

  /**
   * Delete (soft delete) a subject by setting isActive to false
   */
  async deleteSubject(id: string) {
    throw new BadRequestException('Subjects are denormalized into Classes; deleting subjects directly is not supported.');
  }

  /**
   * Permanently delete a subject (hard delete)
   * Use with caution - this will cascade delete related classes
   */
  async permanentlyDeleteSubject(id: string) {
    throw new BadRequestException('Subjects are denormalized into Classes; permanent deletes are not supported through this endpoint.');
  }
}



// ================================================================================
// FILE: src\modules\teacher\teacher.controller.ts
// ================================================================================

import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from '../lessons/lessons.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassesService } from '../classes/classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiBearerAuth('token')
@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(
    private lessonsService: LessonsService,
    private assessmentsService: AssessmentsService,
    private classesService: ClassesService,
  ) {}

  /**
   * Get all lessons for the current teacher
   */
  @Get('lessons')
  @Roles('teacher', 'admin')
  async getLessons(@CurrentUser() user: any) {
    // Get teacher's classes first
    const classes = await this.classesService.getClassesByTeacher(user.userId);
    const classIds = classes.map((c) => c.id);

    // Get all lessons for those classes
    let lessons: any[] = [];
    for (const classId of classIds) {
      const classLessons = await this.lessonsService.getLessonsByClass(classId);
      lessons = lessons.concat(classLessons);
    }

    return {
      success: true,
      data: lessons,
      count: lessons.length,
    };
  }

  /**
   * Get all classes for the current teacher
   */
  @Get('classes')
  @Roles('teacher', 'admin')
  async getClasses(@CurrentUser() user: any) {
    const classes = await this.classesService.getClassesByTeacher(user.userId);
    return {
      success: true,
      data: classes,
      count: classes.length,
    };
  }

  /**
   * Get all assessments for the current teacher
   */
  @Get('assessments')
  @Roles('teacher', 'admin')
  async getAssessments(@CurrentUser() user: any) {
    const assessments = await this.assessmentsService.getAssessmentsByTeacher(
      user.userId,
    );
    return {
      success: true,
      data: assessments,
      count: assessments.length,
    };
  }
}



// ================================================================================
// FILE: src\modules\teacher\teacher.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { LessonsModule } from '../lessons/lessons.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [LessonsModule, AssessmentsModule, ClassesModule],
  controllers: [TeacherController],
})
export class TeacherModule {}



// ================================================================================
// FILE: src\modules\users\DTO\create-user.dto.ts
// ================================================================================

import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsIn,
  IsOptional,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Custom email domain validator
function IsPopularEmailProvider(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPopularEmailProvider',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;

          const popularDomains = [
            'gmail.com',
            'yahoo.com',
            'outlook.com',
            'hotmail.com',
            'icloud.com',
            'live.com',
            'msn.com',
            'aol.com',
            'protonmail.com',
            'zoho.com',
          ];

          const domain = value.split('@')[1]?.toLowerCase();
          return popularDomains.includes(domain);
        },
        defaultMessage() {
          return `Email must be from a Known provider (Gmail, Yahoo, Outlook, etc.)`;
        },
      },
    });
  };
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsPopularEmailProvider()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[@$!%*?&#]/, {
    message: 'Password must contain at least one special character',
  })
  password?: string;

  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  firstName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  middleName?: string;

  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  lastName: string;

  @IsIn(['student', 'teacher', 'admin'], {
    message: 'Role must be student, teacher, or admin',
  })
  role: string;

  @ValidateIf((o: { role: string }) => o.role === 'student')
  @IsString({ message: 'Student ID must be a string' })
  @Matches(/^[0-9]{9}$/, {
    message: 'Student ID must be exactly 9 digits (e.g., 202412345)',
  })
  studentId?: string;
}



// ================================================================================
// FILE: src\modules\users\DTO\update-user.dto.ts
// ================================================================================

import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsIn,
  IsOptional,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[@$!%*?&#]/, {
    message: 'Password must contain at least one special character',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsIn(['student', 'teacher', 'admin'], {
    message: 'Role must be student, teacher, or admin',
  })
  role?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'], {
    message: 'Status must be ACTIVE, PENDING, SUSPENDED, or DELETED',
  })
  status?: string;

  @ValidateIf((o: { role: string }) => o.role === 'student')
  @IsOptional()
  @IsString({ message: 'Student ID must be a string' })
  @Matches(/^[0-9]{9}$/, {
    message: 'Student ID must be exactly 9 digits (e.g., 202412345)',
  })
  studentId?: string;

  // Profile fields
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsIn(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message:
      'Relationship must be one of: Father, Mother, Guardian, Sibling, Other',
  })
  familyRelationship?: string;

  @IsOptional()
  @IsString()
  familyContact?: string;

  @IsOptional()
  @IsIn(['7','8','9','10'], {
    message: 'Grade level must be one of: 7, 8, 9, 10',
  })
  gradeLevel?: '7' | '8' | '9' | '10';
}



// ================================================================================
// FILE: src\modules\users\users.controller.ts
// ================================================================================

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Get Commands
  @Get('all')
  @Roles('admin')
  async getAllUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const users = await this.usersService.findAll({
      role,
      status,
      page,
      limit,
    });
    return {
      success: true,
      users: [...users],
    };
  }

  @Get(':id')
  @Roles('admin')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    return {
      success: true,
      data: { user },
    };
  }

  //Crud Operations

  @Post('create')
  @Roles('admin') // Only admins can create users
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);

    return {
      success: true,
      message: 'User created successfully. Verification email sent.',
      data: { user },
    };
  }

  @Put('update/:id')
  @Roles('admin')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.updateUser(id, updateUserDto);

    return {
      success: true,
      message: 'User updated successfully.',
      data: { user: updatedUser },
    };
  }
  // !! Delete should be archived not delete completely
  @Delete('delete/:id')
  @Roles('admin')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return {
      success: true,
      message: 'User set to DELETED',
    };
  }
}



// ================================================================================
// FILE: src\modules\users\users.module.ts
// ================================================================================

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OtpModule } from '../otp/otp.module';
import { RolesModule } from '../roles/roles.module';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [OtpModule, RolesModule],
  controllers: [UsersController],
  providers: [UsersService, MailService],
  exports: [UsersService],
})
export class UsersModule {}



// ================================================================================
// FILE: src\modules\users\users.service.ts
// ================================================================================

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, SQL } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { users, roles, userRoles, studentProfiles } from '../../drizzle/schema';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { PasswordGenerator } from './utils/password-generator';

const VALID_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

@Injectable()
export class UsersService {
  constructor(
    private databaseService: DatabaseService,
    private otpService: OtpService,
    private mailService: MailService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }
  // Search Users

  async findAll(filters?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    if (filters?.status && !VALID_STATUSES.includes(filters.status as any)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];
    if (filters?.status) {
      whereConditions.push(eq(users.status, filters.status as any));
    }



    // Build the query step by step
    const usersList = await this.db.query.users.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        userRoles: {
          with: { role: true },
        },
      },
      limit,
      offset,
    });

    // Filter by role in memory if specified
    let filteredUsers = usersList;
    if (filters?.role) {
      filteredUsers = usersList.filter((user) =>
        user.userRoles.some((ur) => ur.role.name === filters.role),
      );
    }

    return filteredUsers.map((user) => {
      const { userRoles: userRolesData, ...userData } = user;
      return {
        ...userData,
        roles: userRolesData.map((ur) => ur.role),
      };
    });
  }

  async findByEmail(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });

    if (!user) return null;

    // Transform to include roles array and flatten profile into the user object
    const profile = (user as any).profile || {};
    const { userRoles: userRolesData, profile: _p, ...userData } = user as any;

    return {
      ...userData,
      ...profile,
      roles: userRolesData.map((ur) => ur.role),
    };
  }

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
        profile: true,
      },
    });

    if (!user) return null;

    const profile = (user as any).profile || {};
    const { userRoles: userRolesData, profile: _p, ...userData } = user as any;

    return {
      ...userData,
      ...profile,
      roles: userRolesData.map((ur) => ur.role),
    };
  }
  //CRUD Operations

  async createUser(createUserDto: CreateUserDto) {
    const {
      email,
      password,
      firstName,
      middleName,
      lastName,
      role,
      studentId,
    } = createUserDto;

    // 1. Check if email already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 2. NEW: Validate student ID if role is student
    if (role === 'student') {
      if (!studentId) {
        throw new ConflictException(
          'Student ID is required for student accounts',
        );
      }

      const existingStudent = await this.db.query.users.findFirst({
        where: eq(users.studentId, studentId),
      });

      if (existingStudent) {
        throw new ConflictException(
          `Student ID ${studentId} is already registered`,
        );
      }
    }

    // 3. Find the role in database
    const roleEntity = await this.db.query.roles.findFirst({
      where: eq(roles.name, role),
    });

    if (!roleEntity) {
      throw new NotFoundException(`Role '${role}' not found`);
    }

    // 4. Generate password if not provided (new students get auto-generated passwords)
    let generatedPassword = password;
    if (!generatedPassword) {
      generatedPassword = PasswordGenerator.generate();
    }

    // 5. Hash the password
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // 6. Create user in transaction
    const result = await this.db.transaction(async (tx) => {
      // Insert user
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          middleName,
          lastName,
          studentId: role === 'student' ? studentId : null,
          status: 'PENDING',
          isEmailVerified: false,
        })
        .returning();

      // Assign role
      await tx.insert(userRoles).values({
        userId: newUser.id,
        roleId: roleEntity.id,
        assignedBy: 'ADMIN',
      });

      return newUser;
    });

    // 7. Send emails asynchronously (don't await - fire and forget)
    // This prevents blocking the API response for slow email services
    Promise.all([
      this.otpService.createAndSendOTP(
        result.id,
        result.email,
        'email_verification',
      ),
      this.mailService.sendPasswordEmail(result.email, generatedPassword),
    ]).catch((err) => {
      // Log email errors but don't fail the request
      console.error('[USERS] Failed to send emails for user:', result.email, err);
    });

    // 8. Return user with generated password (for admin to see in modal)
    return {
      ...result,
      temporaryPassword: generatedPassword,
    };
  }

  // !!Subject to change based on requirements
  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    console.log('[USERS] updateUser called for id:', id, 'payload:', updateUserDto);

    const existingUser = await this.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: Partial<typeof users.$inferInsert> = {};

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.findByEmail(updateUserDto.email);
      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }
      updateData.email = updateUserDto.email;
      updateData.isEmailVerified = false;

      // Send new verification email
      const [updatedUser] = await this.db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      await this.otpService.createAndSendOTP(
        updatedUser.id,
        updatedUser.email,
        'email_verification',
      );
    }

    if (updateUserDto.password) {
      updateData.password = await (
        bcrypt.hash as (s: string, r: number) => Promise<string>
      )(updateUserDto.password, 10);
    }

    if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.middleName !== undefined)
      updateData.middleName = updateUserDto.middleName;
    if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.status) updateData.status = updateUserDto.status as any;
    if (updateUserDto.studentId !== undefined)
      updateData.studentId = updateUserDto.studentId;

    // New profile fields will be stored in `student_profiles` table as a separate one-to-one record
    const profilePayload: any = {};
    if (updateUserDto.dob) profilePayload.dateOfBirth = new Date(updateUserDto.dob);
    if (updateUserDto.gender !== undefined) profilePayload.gender = updateUserDto.gender;
    if (updateUserDto.phone !== undefined) profilePayload.phone = updateUserDto.phone;
    if (updateUserDto.address !== undefined) profilePayload.address = updateUserDto.address;
    if (updateUserDto.familyName !== undefined)
      profilePayload.familyName = updateUserDto.familyName;
    if (updateUserDto.familyRelationship !== undefined)
      profilePayload.familyRelationship = updateUserDto.familyRelationship;
    if (updateUserDto.familyContact !== undefined)
      profilePayload.familyContact = updateUserDto.familyContact;

    let updatedUser;
    try {
      [updatedUser] = await this.db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
    } catch (err) {
      console.error('[USERS] Failed to update users row for user:', id, err);
      throw err;
    }

    // Upsert profile record if payload exists
    if (Object.keys(profilePayload).length > 0) {
      console.log('[USERS] profilePayload to upsert for user:', id, profilePayload);
      try {
        const existingProfile = await this.db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.userId, id),
        });

        if (existingProfile) {
          await this.db
            .update(studentProfiles)
            .set({ ...profilePayload, updatedAt: new Date() })
            .where(eq(studentProfiles.userId, id));
        } else {
          await this.db.insert(studentProfiles).values({
            userId: id,
            ...profilePayload,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('[USERS] Failed to upsert profile for user:', id, err);
        throw err;
      }
    }

    if (updateUserDto.role) {
      await this.db.delete(userRoles).where(eq(userRoles.userId, id));

      const roleRecord = await this.db.query.roles.findFirst({
        where: eq(roles.name, updateUserDto.role),
      });

      if (roleRecord) {
        await this.db.insert(userRoles).values({
          userId: id,
          roleId: roleRecord.id,
          assignedBy: 'ADMIN',
        });
      }
    }

    return this.findById(id);
  }

  async updatePassword(id: string, newPassword: string) {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return {
      message: 'Password successfully updated',
      userId: id,
    };
  }

  async deleteUser(id: string) {
    const existingUser = await this.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status === 'DELETED') {
      throw new BadRequestException('User is already deleted');
    }

    await this.db
      .update(users)
      .set({
        status: 'DELETED',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return {
      message: 'User successfully deleted',
      userId: id,
    };
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        isEmailVerified: true,
        status: 'ACTIVE',
      })
      .where(eq(users.id, userId));
  }
}



// ================================================================================
// FILE: src\modules\users\utils\password-generator.ts
// ================================================================================

/**
 * Password Generator Utility
 * Generates random passwords that meet the validation requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&#)
 */

export class PasswordGenerator {
  private static readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly NUMBERS = '0123456789';
  private static readonly SPECIAL = '@$!%*?&#';

  /**
   * Generate a random password that meets all validation requirements
   * @param length - Password length (default: 14, minimum: 8)
   * @returns Random password string
   */
  static generate(length: number = 14): string {
    if (length < 8) {
      throw new Error('Password length must be at least 8 characters');
    }

    // Ensure we have all required character types
    const requiredChars = [
      this.getRandomChar(this.UPPERCASE),
      this.getRandomChar(this.LOWERCASE),
      this.getRandomChar(this.NUMBERS),
      this.getRandomChar(this.SPECIAL),
    ];

    // Fill remaining characters with random characters from all sets
    const allChars = this.UPPERCASE + this.LOWERCASE + this.NUMBERS + this.SPECIAL;
    for (let i = requiredChars.length; i < length; i++) {
      requiredChars.push(this.getRandomChar(allChars));
    }

    // Shuffle the array to randomize position of required characters
    return this.shuffle(requiredChars).join('');
  }

  /**
   * Validate if a password meets all requirements
   * @param password - Password to validate
   * @returns true if valid, false otherwise
   */
  static validate(password: string): boolean {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[@$!%*?&#]/.test(password)) return false;
    return true;
  }

  /**
   * Get a random character from a string
   */
  private static getRandomChar(chars: string): string {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  /**
   * Fisher-Yates shuffle algorithm for array randomization
   */
  private static shuffle(array: string[]): string[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}



// ================================================================================
// FILE: test.js
// ================================================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

function loadEnvFromFile() {
  if (process.env.DATABASE_URL) return;

  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function ensureAdmin() {
  loadEnvFromFile();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add it to backend/.env or export it before running this script.',
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminMiddleName = process.env.ADMIN_MIDDLE_NAME || null;
  const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query('BEGIN');

    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['admin'],
    );

    let roleId = roleResult.rows[0]?.id;
    if (!roleId) {
      const insertedRole = await pool.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
        ['admin', 'Administrator role'],
      );
      roleId = insertedRole.rows[0].id;
    }

    const existingUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail],
    );

    let userId = existingUserResult.rows[0]?.id;
    if (!userId) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const insertedUser = await pool.query(
        `INSERT INTO users
          (email, password, first_name, middle_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          adminEmail,
          passwordHash,
          adminFirstName,
          adminMiddleName,
          adminLastName,
          'ACTIVE',
          true,
        ],
      );

      userId = insertedUser.rows[0].id;
    }

    const userRoleResult = await pool.query(
      'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId],
    );

    if (userRoleResult.rowCount === 0) {
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
        [userId, roleId, 'SYSTEM'],
      );
    }

    await pool.query('COMMIT');

    console.log('Admin account is ready.');
    console.log(`Email: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Password: ${adminPassword}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

ensureAdmin().catch((error) => {
  console.error('Failed to create admin account:', error.message);
  process.exitCode = 1;
});



// ================================================================================
// FILE: test\app.e2e-spec.ts
// ================================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});



// ================================================================================
// FILE: test\jest-e2e.json
// ================================================================================

{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}



// ================================================================================
// FILE: tsconfig.build.json
// ================================================================================

{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}




// ================================================================================
// END OF EXPORT
// ================================================================================
