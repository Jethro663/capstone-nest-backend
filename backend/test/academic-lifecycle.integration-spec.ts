import { ConfigService } from '@nestjs/config';
import { sql, eq } from 'drizzle-orm';
import { DatabaseService } from '../src/database/database.service';
import { AcademicCommittedResponse } from '../src/database/academic-transaction';
import {
  academicSystemStates,
  academicPeriodGradeRevisions,
  classes,
  classRecords,
  enrollments,
  sections,
  subjectAnnualGrades,
  classRecordParticipants,
  studentProfiles,
  assessments,
  classSchedules,
  assessmentAttempts,
  assessmentQuestions,
  classRecordFinalGrades,
  classRecordItems,
  classRecordCategories,
  classRecordScores,
  roles,
  userRoles,
  users,
} from '../src/drizzle/schema';
import { AnnualGradesService } from '../src/modules/academic-state/annual-grades.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AcademicPolicyService } from '../src/modules/academic-state/academic-policy.service';
import { getDefaultAcademicPolicy } from '../src/modules/academic-state/academic-policy';
import { ACADEMIC_STATE_ID } from '../src/modules/academic-state/academic-policy.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassRecordSyncService } from '../src/modules/class-record/class-record-sync.service';
import { ClassRecordService } from '../src/modules/class-record/class-record.service';
import { ClassRecordComputationService } from '../src/modules/class-record/class-record-computation.service';
import { ClassRecordReadinessService } from '../src/modules/class-record/class-record-readiness.service';
import { ClassRecordRosterService } from '../src/modules/class-record/class-record-roster.service';
import { AssessmentAccessService } from '../src/modules/assessments/assessment-access.service';
import { AssessmentsService } from '../src/modules/assessments/assessments.service';
import { AssessmentType } from '../src/modules/assessments/DTO/assessment.dto';
import { AcademicPeriodService } from '../src/modules/academic-state/academic-period.service';
import { ClassesService } from '../src/modules/classes/classes.service';
import * as bcrypt from 'bcrypt';
import { randomUUID, createHash } from 'node:crypto';
import { AcademicStateService } from '../src/modules/academic-state/academic-state.service';
import { AcademicTransitionReadinessService } from '../src/modules/academic-state/academic-transition-readiness.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AcademicAuditService } from '../src/modules/academic-state/academic-audit.service';
import { AcademicRepairService } from '../src/modules/academic-state/academic-repair.service';
import { AcademicStateAlignmentService } from '../src/modules/academic-state/academic-state-alignment.service';
import { ProfilesService } from '../src/modules/profiles/profiles.service';
import { RosterImportService } from '../src/modules/roster-import/roster-import.service';

// This suite exercises the approved import transaction, not spreadsheet parsing.
// Parser behavior has separate fixtures; avoiding ExcelJS also avoids its ESM
// dependency loader in Jest's CommonJS integration runtime.
jest.mock('../src/modules/roster-import/parsers/xlsx.parser', () => ({
  parseXlsx: jest.fn(),
}));
jest.mock('../src/modules/roster-import/parsers/csv.parser', () => ({
  parseCsv: jest.fn(),
}));

const url = process.env.ACADEMIC_TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'ACADEMIC_TEST_DATABASE_URL must identify a disposable local test database',
  );
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/nexora_academic_test')
)
  throw new Error(
    'Refusing to run destructive fixtures outside a local nexora_academic_test database',
  );

describe('academic lifecycle PostgreSQL integration', () => {
  let database: DatabaseService;
  beforeAll(async () => {
    database = new DatabaseService(
      new ConfigService({
        database: {
          url,
          poolMax: 6,
          idleTimeout: 1000,
          connectionTimeout: 5000,
          statementTimeout: 15000,
        },
        NODE_ENV: 'test',
      }),
    );
    await database.onModuleInit();
  });
  afterAll(async () => {
    await database?.onModuleDestroy();
  });
  beforeEach(async () => {
    await database.db.execute(
      sql`TRUNCATE users, sections, academic_system_states, academic_year_policies CASCADE`,
    );
    await database.db.insert(academicSystemStates).values({
      id: ACADEMIC_STATE_ID,
      schoolYear: '2026-2027',
      quarter: 'Q1',
    });
  });

  it('serializes competing academic writers and makes the second read committed state', async () => {
    let unlock!: () => void;
    let firstLocked!: () => void;
    const barrier = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const locked = new Promise<void>((resolve) => {
      firstLocked = resolve;
    });
    const first = database.academicTransaction(async () => {
      const current = await database.db.query.academicSystemStates.findFirst();
      expect(current?.version).toBe(1);
      firstLocked();
      await barrier;
      await database.db
        .update(academicSystemStates)
        .set({ quarter: 'Q2', version: 2 })
        .where(eq(academicSystemStates.id, ACADEMIC_STATE_ID));
    });
    await locked;
    let secondRead = false;
    const second = database.academicTransaction(async () => {
      secondRead = true;
      const current = await database.db.query.academicSystemStates.findFirst();
      expect(current?.quarter).toBe('Q2');
      expect(current?.version).toBe(2);
    });
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const result = await database.db.execute(
          sql`SELECT count(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND NOT granted`,
        );
        if (Number(result.rows[0]?.count) > 0) break;
        if (attempt === 99)
          throw new Error('Second transaction did not reach the advisory lock');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(secondRead).toBe(false);
    } finally {
      unlock();
    }
    await Promise.all([first, second]);
  });

  it('rolls back nested academic mutations and does not dispatch their effects', async () => {
    const effect = jest.fn();
    await expect(
      database.academicTransaction(async () => {
        await database.db
          .update(academicSystemStates)
          .set({ quarter: 'Q3', version: 3 });
        await database.academicTransaction(async () => {
          await database.afterAcademicCommit(effect);
          throw new Error('deliberate rollback');
        });
      }),
    ).rejects.toThrow('deliberate rollback');
    const state = await database.db.query.academicSystemStates.findFirst();
    expect(state?.quarter).toBe('Q1');
    expect(state?.version).toBe(1);
    expect(effect).not.toHaveBeenCalled();
  });

  it('commits an explicit terminal response without weakening ordinary rollback', async () => {
    const effect = jest.fn();
    await expect(
      database.academicTransaction(async () => {
        await database.db
          .update(academicSystemStates)
          .set({ quarter: 'Q2', version: 2 });
        await database.afterAcademicCommit(effect);
        throw new AcademicCommittedResponse(
          new Error('Attempt was auto-submitted'),
        );
      }),
    ).rejects.toThrow('Attempt was auto-submitted');
    expect(
      (await database.db.query.academicSystemStates.findFirst())?.version,
    ).toBe(2);
    expect(effect).toHaveBeenCalledTimes(1);
  });
  async function seedAnnualFixture(gradeLevel = '8') {
    const [actor, student] = await database.db
      .insert(users)
      .values([
        {
          email: 'admin@example.test',
          password: 'test-only',
          firstName: 'Admin',
          lastName: 'Test',
        },
        {
          email: 'student@example.test',
          password: 'test-only',
          firstName: 'Learner',
          lastName: 'Test',
        },
      ])
      .returning();
    const [section] = await database.db
      .insert(sections)
      .values({ name: 'Annual test', schoolYear: '2026-2027', gradeLevel })
      .returning();
    const [cls] = await database.db
      .insert(classes)
      .values({
        sectionId: section.id,
        teacherId: actor.id,
        subjectName: 'Mathematics',
        subjectCode: `MATH-${gradeLevel}`,
        subjectGradeLevel: gradeLevel,
        schoolYear: '2026-2027',
      })
      .returning();
    await database.db.insert(enrollments).values({
      classId: cls.id,
      sectionId: section.id,
      studentId: student.id,
    });
    const records = await database.db
      .insert(classRecords)
      .values(
        (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((gradingPeriod) => ({
          classId: cls.id,
          teacherId: actor.id,
          gradingPeriod,
          status: 'finalized' as const,
          revision: 1,
          rosterConfirmedAt: new Date(),
        })),
      )
      .returning();
    const policy = getDefaultAcademicPolicy('2026-2027');
    const service = new AnnualGradesService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
    );
    const addRevision = async (index: number, grade: number) => {
      const [revision] = await database.db
        .insert(academicPeriodGradeRevisions)
        .values({
          classRecordId: records[index].id,
          classId: cls.id,
          studentId: student.id,
          schoolYear: cls.schoolYear,
          subjectCode: `MATH-${gradeLevel}`,
          gradeLevel,
          period: records[index].gradingPeriod,
          revision: 1,
          grade,
          computedBy: actor.id,
          evidence: {
            policy,
            initialGrade: grade,
            categories: [],
            participant: { eligibility: 'eligible' },
          },
        })
        .returning();
      return revision;
    };
    return { actor, student, cls, records, service, addRevision };
  }

  async function seedTransitionFixture(gradeLevel = '8', mark = 80) {
    const f = await seedAnnualFixture(gradeLevel);
    await database.db
      .update(users)
      .set({ password: await bcrypt.hash('transition-test-only', 4) })
      .where(eq(users.id, f.actor.id));
    await database.db
      .update(academicSystemStates)
      .set({ quarter: 'Q4' })
      .where(eq(academicSystemStates.id, ACADEMIC_STATE_ID));
    await database.db
      .insert(studentProfiles)
      .values({ userId: f.student.id, gradeLevel });
    await database.db.insert(classRecordParticipants).values(
      f.records.map((r) => ({
        classRecordId: r.id,
        studentId: f.student.id,
        eligibility: 'eligible' as const,
        source: 'test',
        updatedBy: f.actor.id,
      })),
    );
    for (let i = 0; i < 4; i++) await f.addRevision(i, mark);
    await f.service.refreshForClass(f.cls.id, f.actor.id);
    const policy = new AcademicPolicyService(database);
    const readiness = new AcademicTransitionReadinessService(database, policy);
    const gateway = { emitToUser: jest.fn() };
    const audit = new AuditService(database);
    const stateService = new AcademicStateService(
      database,
      audit,
      new NotificationsService(database),
      gateway as never,
      policy,
      readiness,
    );
    const dto = {
      schoolYear: '2027-2028',
      expectedSchoolYear: '2026-2027',
      expectedQuarter: 'Q4' as const,
      expectedVersion: 1,
      currentPassword: 'transition-test-only',
      confirmationText: AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
    return { ...f, stateService, dto, readiness, gateway, audit };
  }

  it('audits without seeding policy and preserves exact legacy grades without certifying annual sources', async () => {
    const f = await seedAnnualFixture();
    await database.db.insert(classRecordFinalGrades).values({
      classRecordId: f.records[0].id,
      studentId: f.student.id,
      finalPercentage: '74.125',
      remarks: 'For Intervention',
    });
    expect(
      await database.db.query.academicYearPolicies.findMany(),
    ).toHaveLength(0);
    const report = await new AcademicAuditService(database).report('2026-2027');
    expect(report.counts.unarchivedLegacyGrades).toBe(1);
    expect(report.issues.map((i) => i.code)).toContain(
      'unverified_legacy_grades',
    );
    expect(
      await database.db.query.academicYearPolicies.findMany(),
    ).toHaveLength(0);
    const policy = new AcademicPolicyService(database);
    const audit = new AuditService(database);
    const repair = new AcademicRepairService(
      database,
      policy,
      audit,
      f.service,
    );
    await expect(
      repair.preserveLegacy('Archive exact legacy values', f.actor.id, [
        'teacher',
      ]),
    ).rejects.toThrow('admins');
    expect(
      await repair.preserveLegacy('Archive exact legacy values', f.actor.id, [
        'admin',
      ]),
    ).toEqual({ preservedCount: 1, trusted: false });
    expect(
      await repair.preserveLegacy('Repeat archival verification', f.actor.id, [
        'admin',
      ]),
    ).toEqual({ preservedCount: 0, trusted: false });
    const workbook = new ClassRecordService(
      database,
      new ClassRecordComputationService(database, policy),
      {} as never,
      new EventEmitter2(),
      audit,
      policy,
      new ClassRecordReadinessService(database, policy),
      new ClassRecordRosterService(database, policy, audit),
      f.service,
    );
    await workbook.reopenClassRecord(
      f.records[0].id,
      f.actor.id,
      ['admin'],
      'Reconcile historical score and eligibility evidence',
    );
    const history = await workbook.getPeriodHistory(
      f.records[0].id,
      f.actor.id,
      ['admin'],
    );
    expect(history.revisions).toHaveLength(0);
    expect(history.legacyEvidence[0].sourceSnapshot).toMatchObject({
      trusted: false,
      finalGrade: { final_percentage: 74.125 },
    });
    expect(await database.db.query.subjectAnnualGrades.findMany()).toHaveLength(
      0,
    );
  });

  it('treats Q4 as required four-quarter evidence that cannot be excluded', async () => {
    const f = await seedAnnualFixture();
    await database.db.insert(classRecordFinalGrades).values({
      classRecordId: f.records[3].id,
      studentId: f.student.id,
      finalPercentage: '63.500',
      remarks: 'For Intervention',
    });
    const repair = new AcademicRepairService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
      f.service,
    );
    await expect(
      repair.excludeHistoricalPeriod(
        f.records[0].id,
        'Attempt to skip required term',
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('required policy period');
    await expect(
      repair.excludeHistoricalPeriod(
        f.records[3].id,
        'Attempt to skip required fourth quarter',
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('required policy period');
    expect(
      (
        await database.db.query.classRecordFinalGrades.findFirst({
          where: eq(classRecordFinalGrades.classRecordId, f.records[3].id),
        })
      )?.finalPercentage,
    ).toBe('63.500');
  });

  it('repairs duplicate state only with password and exact observed row/version preconditions', async () => {
    const f = await seedAnnualFixture();
    await database.db
      .update(users)
      .set({ password: await bcrypt.hash('repair-state-test', 4) })
      .where(eq(users.id, f.actor.id));
    const [duplicate] = await database.db
      .insert(academicSystemStates)
      .values({ schoolYear: '2026-2027', quarter: 'Q4', version: 4 })
      .returning();
    const repair = new AcademicRepairService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
      f.service,
    );
    const dto = {
      selectedStateId: duplicate.id,
      expectedStateIds: [ACADEMIC_STATE_ID, duplicate.id],
      expectedVersion: 4,
      quarter: 'Q2' as const,
      reason: 'Reconcile duplicate administrative state from legacy setup',
      currentPassword: 'repair-state-test',
    };
    await expect(
      repair.repairState({ ...dto, currentPassword: 'wrong' }, f.actor.id, [
        'admin',
      ]),
    ).rejects.toThrow('authentication');
    await expect(
      repair.repairState(
        { ...dto, expectedStateIds: [duplicate.id] },
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('rows changed');
    expect(await repair.repairState(dto, f.actor.id, ['admin'])).toMatchObject({
      id: duplicate.id,
      quarter: 'Q2',
      version: 5,
    });
    expect(
      await database.db.query.academicSystemStates.findMany(),
    ).toHaveLength(1);
    expect(await database.db.query.classRecords.findMany()).toHaveLength(4);
  });

  it('previews and atomically applies a reviewed academic-state alignment while rejecting a stale manifest', async () => {
    const password = 'alignment-test-only';
    const [actor] = await database.db
      .insert(users)
      .values({
        email: 'alignment-admin@example.test',
        password: await bcrypt.hash(password, 4),
        firstName: 'Alignment',
        lastName: 'Admin',
      })
      .returning();
    const [section] = await database.db
      .insert(sections)
      .values({
        name: 'Misdated Grade 7',
        gradeLevel: '7',
        schoolYear: '2027-2028',
      })
      .returning();
    const [cls] = await database.db
      .insert(classes)
      .values({
        sectionId: section.id,
        teacherId: actor.id,
        subjectName: 'Science',
        subjectCode: 'SCI-7',
        subjectGradeLevel: '7',
        schoolYear: '2027-2028',
      })
      .returning();
    await database.db
      .update(academicSystemStates)
      .set({ schoolYear: '2027-2028', quarter: 'Q2', version: 7 })
      .where(eq(academicSystemStates.id, ACADEMIC_STATE_ID));

    const service = new AcademicStateAlignmentService(
      database,
      new AuditService(database),
    );
    const request = {
      sourceSchoolYear: '2027-2028',
      targetSchoolYear: '2026-2027',
      targetQuarter: 'Q1' as const,
      classIds: [cls.id],
    };
    const preview = await service.preview(request);
    expect(preview).toMatchObject({
      safeToApply: true,
      state: { schoolYear: '2027-2028', quarter: 'Q2', version: 7 },
      movedSectionIds: [section.id],
    });
    expect(
      await database.db.query.academicSystemStates.findFirst(),
    ).toMatchObject({ schoolYear: '2027-2028', quarter: 'Q2', version: 7 });

    await database.db.insert(assessments).values({
      classId: cls.id,
      title: 'Created after preview',
      type: 'quiz',
      quarter: 'Q1',
    });
    await expect(
      service.execute(
        {
          ...request,
          manifestHash: preview.manifestHash,
          confirmations: preview.requiredConfirmations,
          currentPassword: password,
          reason: 'Correct the reviewed school-year alignment',
        },
        actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('changed');

    const refreshed = await service.preview(request);
    const result = await service.execute(
      {
        ...request,
        manifestHash: refreshed.manifestHash,
        confirmations: refreshed.requiredConfirmations,
        currentPassword: password,
        reason: 'Correct the reviewed school-year alignment',
      },
      actor.id,
      ['admin'],
    );
    expect(result).toMatchObject({
      state: { schoolYear: '2026-2027', quarter: 'Q1', version: 8 },
      movedClassIds: [cls.id],
      movedSectionIds: [section.id],
      updatedLegacyEvidenceRows: 0,
      auditEventId: expect.any(String),
    });
    expect(await database.db.query.classes.findFirst()).toMatchObject({
      id: cls.id,
      schoolYear: '2026-2027',
    });
    expect(await database.db.query.sections.findFirst()).toMatchObject({
      id: section.id,
      schoolYear: '2026-2027',
    });
    expect(await database.db.query.academicYearPolicies.findMany()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolYear: '2026-2027',
          policyId: 'deped-2026-q4-v2',
        }),
        expect.objectContaining({
          schoolYear: '2027-2028',
          policyId: 'deped-2027-q4-v2',
        }),
      ]),
    );
  });

  it('transitions only complete annual evidence, persists outcomes, and clones structure with empty next-year rosters', async () => {
    const f = await seedTransitionFixture();
    await database.db.insert(classSchedules).values({
      classId: f.cls.id,
      days: ['Monday'],
      startTime: '08:00',
      endTime: '09:00',
    });
    await database.db.insert(assessments).values({
      classId: f.cls.id,
      title: 'Reusable term quiz',
      type: 'quiz',
      quarter: 'Q2',
      isPublished: true,
    });
    expect((await f.readiness.getReadiness()).transitionBlocked).toBe(false);
    const result = await f.stateService.transition(f.dto, f.actor.id);
    expect(result.state).toMatchObject({
      schoolYear: '2027-2028',
      quarter: 'Q1',
      version: 2,
    });
    expect(result.impact).toMatchObject({
      classRecordsFinalized: 0,
      studentsPromoted: 1,
      reusableClassesCreated: 1,
      classSchedulesCloned: 1,
    });
    expect(
      (await database.db.query.studentProfiles.findFirst())?.gradeLevel,
    ).toBe('9');
    expect(
      await database.db.query.academicStudentYearOutcomes.findMany(),
    ).toEqual([
      expect.objectContaining({
        studentId: f.student.id,
        outcome: 'promoted',
        evidence: expect.objectContaining({
          annualGradeIds: [expect.any(String)],
        }),
      }),
    ]);
    const nextClass = await database.db.query.classes.findFirst({
      where: eq(classes.schoolYear, '2027-2028'),
    });
    expect(nextClass).toMatchObject({
      teacherId: f.actor.id,
      writtenWorkGradingWeight: 20,
      performanceTaskGradingWeight: 50,
      quarterlyAssessmentGradingWeight: 30,
    });
    expect(
      await database.db.query.enrollments.findMany({
        where: eq(enrollments.classId, nextClass!.id),
      }),
    ).toEqual([]);
    expect(
      await database.db.query.assessments.findMany({
        where: eq(assessments.classId, nextClass!.id),
      }),
    ).toEqual([expect.objectContaining({ isPublished: false, quarter: 'Q2' })]);
    expect(
      await database.db.query.academicPeriodGradeRevisions.findMany(),
    ).toHaveLength(4);
    await expect(f.stateService.transition(f.dto, f.actor.id)).rejects.toThrow(
      'Academic state changed',
    );
  });

  it('blocks draft and missing period evidence without auto-finalizing anything', async () => {
    const f = await seedTransitionFixture();
    await database.db
      .update(classRecords)
      .set({ status: 'draft' })
      .where(eq(classRecords.id, f.records[1].id));
    const readiness = await f.readiness.getReadiness();
    expect(readiness.blockers.map((b) => b.code)).toContain(
      'period_not_finalized',
    );
    await expect(
      f.stateService.transition(f.dto, f.actor.id),
    ).rejects.toThrow();
    expect(
      (
        await database.db.query.classRecords.findFirst({
          where: eq(classRecords.id, f.records[1].id),
        })
      )?.status,
    ).toBe('draft');
    expect(
      (await database.db.query.academicSystemStates.findFirst())?.schoolYear,
    ).toBe('2026-2027');
  });

  it('prevents profile edits from promoting an enrolled learner', async () => {
    const f = await seedTransitionFixture();
    const profiles = new ProfilesService(database, new AuditService(database));
    await expect(
      profiles.updateProfile(f.student.id, { gradeLevel: '9' }, f.actor.id, [
        'admin',
      ]),
    ).rejects.toThrow('active membership');
    await expect(
      profiles.updateProfile(f.student.id, { gradeLevel: '9' }, f.student.id, [
        'student',
      ]),
    ).rejects.toThrow('Only an admin');
    expect(
      (await database.db.query.studentProfiles.findFirst())?.gradeLevel,
    ).toBe('8');
  });

  it('includes a newly imported section student in year-end readiness before transition', async () => {
    const f = await seedTransitionFixture();
    const [newStudent] = await database.db
      .insert(users)
      .values({
        email: 'late-enrollee@example.test',
        password: 'test-only',
        firstName: 'Late',
        lastName: 'Learner',
      })
      .returning();
    await database.db
      .insert(studentProfiles)
      .values({ userId: newStudent.id, gradeLevel: '8' });
    await database.db
      .insert(roles)
      .values({ name: 'student' })
      .onConflictDoNothing();
    const role = await database.db.query.roles.findFirst({
      where: eq(roles.name, 'student'),
    });
    await database.db.insert(userRoles).values({
      userId: newStudent.id,
      roleId: role!.id,
      assignedBy: f.actor.id,
    });
    const importer = new RosterImportService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
    );
    await importer.commitRoster(
      f.cls.sectionId,
      {
        sectionId: f.cls.sectionId,
        enrolledRows: [
          {
            userId: newStudent.id,
            name: { firstName: 'Late', lastName: 'Learner' },
            gradeLevel: '8',
            lrn: '123456789012',
            email: newStudent.email,
          },
        ],
        pendingRows: [],
      },
      { id: f.actor.id, email: f.actor.email, roles: ['admin'] },
    );
    const readiness = await f.readiness.getReadiness();
    expect(readiness.activeStudentsInCurrentYear).toBe(2);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: newStudent.id,
          code: 'missing_period_grade',
        }),
      ]),
    );
    await expect(
      f.stateService.transition(f.dto, f.actor.id),
    ).rejects.toThrow();
    expect(
      (await database.db.query.academicSystemStates.findFirst())?.schoolYear,
    ).toBe('2026-2027');
  });

  it('allows only one of two competing transitions to commit', async () => {
    const f = await seedTransitionFixture();
    const results = await Promise.allSettled([
      f.stateService.transition(f.dto, f.actor.id),
      f.stateService.transition(f.dto, f.actor.id),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      await database.db.query.academicStudentYearOutcomes.findMany(),
    ).toHaveLength(1);
    expect(
      await database.db.query.classes.findMany({
        where: eq(classes.schoolYear, '2027-2028'),
      }),
    ).toHaveLength(1);
  });

  it('rebuilds transition readiness after a competing correction commits', async () => {
    const f = await seedTransitionFixture();
    let release!: () => void;
    let acquired!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const locked = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const correction = database.academicTransaction(async () => {
      await database.db
        .update(classRecords)
        .set({ status: 'draft' })
        .where(eq(classRecords.id, f.records[0].id));
      await f.service.invalidateRecordSources(
        f.records[0].id,
        f.actor.id,
        'Concurrent correction fixture',
      );
      acquired();
      await barrier;
    });
    await locked;
    const transition = f.stateService.transition(f.dto, f.actor.id).then(
      () => 'unexpected success',
      () => 'blocked',
    );
    try {
      for (let i = 0; i < 100; i++) {
        const waiting = await database.db.execute(
          sql`SELECT count(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND NOT granted`,
        );
        if (Number(waiting.rows[0]?.count) > 0) break;
        if (i === 99)
          throw new Error('Transition did not wait for the academic lock');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } finally {
      release();
    }
    await correction;
    expect(await transition).toBe('blocked');
    expect(
      (await database.db.query.academicSystemStates.findFirst())?.schoolYear,
    ).toBe('2026-2027');
    expect(
      await database.db.query.academicStudentYearOutcomes.findMany(),
    ).toHaveLength(0);
  });

  it('rejects early, non-next-year, and conflicting target transitions', async () => {
    const f = await seedTransitionFixture();
    await expect(
      f.stateService.transition(
        { ...f.dto, schoolYear: '2028-2029' },
        f.actor.id,
      ),
    ).rejects.toThrow('immediate next');
    await database.db
      .update(academicSystemStates)
      .set({ quarter: 'Q2' })
      .where(eq(academicSystemStates.id, ACADEMIC_STATE_ID));
    await expect(
      f.stateService.transition(
        { ...f.dto, expectedQuarter: 'Q2' },
        f.actor.id,
      ),
    ).rejects.toThrow();
    await database.db
      .update(academicSystemStates)
      .set({ quarter: 'Q4' })
      .where(eq(academicSystemStates.id, ACADEMIC_STATE_ID));
    await database.db.insert(sections).values({
      name: 'Already planned',
      gradeLevel: '8',
      schoolYear: '2027-2028',
    });
    await expect(f.stateService.transition(f.dto, f.actor.id)).rejects.toThrow(
      'Target school-year',
    );
  });

  it('rolls back clones, profile changes, outcomes and state when the transition audit fails', async () => {
    const f = await seedTransitionFixture();
    jest
      .spyOn(f.audit, 'log')
      .mockRejectedValue(new Error('audit write failure'));
    await expect(f.stateService.transition(f.dto, f.actor.id)).rejects.toThrow(
      'audit write failure',
    );
    expect(
      (await database.db.query.academicSystemStates.findFirst())?.version,
    ).toBe(1);
    expect(
      (await database.db.query.studentProfiles.findFirst())?.gradeLevel,
    ).toBe('8');
    expect(
      await database.db.query.academicStudentYearOutcomes.findMany(),
    ).toHaveLength(0);
    expect(await database.db.query.classes.findMany()).toHaveLength(1);
    expect((await database.db.query.enrollments.findFirst())?.status).toBe(
      'enrolled',
    );
  });

  it('groups missing-period reminders per teacher and deduplicates a persisted identical run', async () => {
    const f = await seedTransitionFixture();
    await database.db
      .update(classRecords)
      .set({ status: 'draft' })
      .where(eq(classRecords.classId, f.cls.id));
    const first = await f.stateService.notifyUnfinalizedTeachers(f.actor.id);
    const retry = await f.stateService.notifyUnfinalizedTeachers(f.actor.id);
    expect(first).toMatchObject({
      notifiedTeachersCount: 1,
      notifiedClassesCount: 1,
      replayed: false,
    });
    expect(retry).toMatchObject({ replayed: true });
    expect(await database.db.query.notifications.findMany()).toHaveLength(1);
    expect(f.gateway.emitToUser).toHaveBeenCalledTimes(1);
  });

  it('sends no reminder to a ready teacher and no notification escapes a failed transaction', async () => {
    const f = await seedTransitionFixture();
    expect(
      await f.stateService.notifyUnfinalizedTeachers(f.actor.id),
    ).toMatchObject({ notifiedTeachersCount: 0 });
    await database.db
      .update(classRecords)
      .set({ status: 'draft' })
      .where(eq(classRecords.classId, f.cls.id));
    jest
      .spyOn(f.audit, 'log')
      .mockRejectedValue(new Error('notification audit failure'));
    await expect(
      f.stateService.notifyUnfinalizedTeachers(f.actor.id),
    ).rejects.toThrow('notification audit failure');
    expect(await database.db.query.notifications.findMany()).toHaveLength(0);
    expect(f.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('creates annual grades only from complete sources and is idempotent', async () => {
    const { actor, student, cls, service, addRevision } =
      await seedAnnualFixture();
    await addRevision(0, 75);
    await addRevision(1, 75);
    await service.refreshForClass(cls.id, actor.id);
    expect(await database.db.query.subjectAnnualGrades.findMany()).toHaveLength(
      0,
    );
    await addRevision(2, 74);
    await addRevision(3, 74);
    await service.refreshForClass(cls.id, actor.id);
    const rows = await database.db.query.subjectAnnualGrades.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      studentId: student.id,
      officialGrade: 75,
      sum: 298,
      divisor: 4,
      isCurrent: true,
    });
    await service.refreshForClass(cls.id, actor.id);
    expect(
      (await database.db.query.subjectAnnualGrades.findMany()).map(
        (row) => row.id,
      ),
    ).toEqual([rows[0].id]);
  });

  it('invalidates annual results on reopen while retaining immutable evidence', async () => {
    const { actor, cls, records, service, addRevision } =
      await seedAnnualFixture();
    for (let index = 0; index < 4; index++) await addRevision(index, 80);
    await service.refreshForClass(cls.id, actor.id);
    await service.invalidateRecordSources(
      records[0].id,
      actor.id,
      'Approved correction',
    );
    const history = await database.db.query.subjectAnnualGrades.findMany();
    expect(history).toHaveLength(1);
    expect(history[0].isCurrent).toBe(false);
    expect(history[0].components).toHaveLength(4);
    expect(
      (await database.db.query.academicPeriodGradeRevisions.findMany()).filter(
        (row) => row.isCurrent,
      ),
    ).toHaveLength(3);
  });

  it('finalizes only a confirmed complete workbook and preserves every revision on correction', async () => {
    const fixture = await seedAnnualFixture();
    await database.db.delete(classRecords);
    const policy = new AcademicPolicyService(database);
    const audit = new AuditService(database);
    const roster = new ClassRecordRosterService(database, policy, audit);
    const workbook = new ClassRecordService(
      database,
      new ClassRecordComputationService(database, policy),
      {} as never,
      new EventEmitter2(),
      audit,
      policy,
      new ClassRecordReadinessService(database, policy),
      roster,
      fixture.service,
    );
    const record = await workbook.generateClassRecord(
      { classId: fixture.cls.id, gradingPeriod: 'Q1' },
      fixture.actor.id,
      ['teacher'],
    );
    expect(
      record.categories
        .find((c) => c.name === 'Quarterly Assessment')
        ?.items.map((i) => i.examComponent),
    ).toEqual(['ST1', 'ST2', 'TE']);
    await expect(
      workbook.finalizeClassRecord(record.id, fixture.actor.id, ['teacher']),
    ).rejects.toThrow('incomplete');
    await roster.confirm(
      record.id,
      {
        reason: 'Verified enrollment register',
        participants: [
          { studentId: fixture.student.id, eligibility: 'eligible' },
        ],
      },
      fixture.actor.id,
      ['teacher'],
    );
    for (const category of record.categories) {
      const items =
        category.name === 'Quarterly Assessment'
          ? category.items
          : category.items.slice(0, 1);
      for (const item of items) {
        await workbook.updateClassRecordItem(
          item.id,
          { maxScore: 100 },
          fixture.actor.id,
          ['teacher'],
        );
        await workbook.recordScore(
          item.id,
          { studentId: fixture.student.id, score: 80 },
          fixture.actor.id,
          ['teacher'],
        );
      }
    }
    const finalized = await workbook.finalizeClassRecord(
      record.id,
      fixture.actor.id,
      ['teacher'],
    );
    expect(finalized).toMatchObject({
      gradeCount: 1,
      classRecord: { status: 'finalized', revision: 1 },
    });
    await expect(
      workbook.recordScore(
        record.categories[0].items[0].id,
        { studentId: fixture.student.id, score: 90 },
        fixture.actor.id,
        ['teacher'],
      ),
    ).rejects.toThrow('finalized');
    await expect(
      workbook.reopenClassRecord(record.id, fixture.actor.id, ['teacher'], ''),
    ).rejects.toThrow('reason');
    await workbook.reopenClassRecord(
      record.id,
      fixture.actor.id,
      ['teacher'],
      'Correct recorded score',
    );
    await workbook.recordScore(
      record.categories[0].items[0].id,
      { studentId: fixture.student.id, score: 90 },
      fixture.actor.id,
      ['teacher'],
    );
    await workbook.finalizeClassRecord(record.id, fixture.actor.id, [
      'teacher',
    ]);
    const revisions =
      await database.db.query.academicPeriodGradeRevisions.findMany();
    expect(revisions).toHaveLength(2);
    expect(revisions.filter((r) => r.isCurrent)).toHaveLength(1);
    expect(revisions.find((r) => r.revision === 1)?.isCurrent).toBe(false);
    expect(
      revisions.find((r) => r.revision === 2)?.evidence.participant,
    ).toMatchObject({ eligibility: 'eligible' });
  });

  it('requires an explicit admin choice when transfer evidence conflicts with a local period', async () => {
    const f = await seedAnnualFixture();
    const local = await f.addRevision(0, 80);
    await f.addRevision(1, 80);
    await f.addRevision(2, 80);
    await f.addRevision(3, 80);
    await f.service.refreshForClass(f.cls.id, f.actor.id);
    await expect(
      f.service.recordExternalGrade(
        f.cls.id,
        {
          studentId: f.student.id,
          period: 'Q1',
          grade: 90,
          sourceReference: 'Form 138 verified 123',
          reason: 'Transferred source register',
        },
        f.actor.id,
        ['teacher'],
      ),
    ).rejects.toThrow('Admin');
    const external = await f.service.recordExternalGrade(
      f.cls.id,
      {
        studentId: f.student.id,
        period: 'Q1',
        grade: 90,
        sourceReference: 'Form 138 verified 123',
        reason: 'Transferred source register',
      },
      f.actor.id,
      ['admin'],
    );
    expect(
      (await f.service.getSummary(f.cls.id, f.actor.id, ['admin'])).students[0]
        .current,
    ).toBeNull();
    await f.service.selectSource(
      f.cls.id,
      {
        studentId: f.student.id,
        period: 'Q1',
        sourceType: 'external',
        sourceId: external.id,
        reason: 'External school issued authoritative term result',
      },
      f.actor.id,
      ['admin'],
    );
    const summary = await f.service.getSummary(f.cls.id, f.actor.id, ['admin']);
    expect(summary.students[0].current?.officialGrade).toBe(83);
    expect(summary.students[0].history).toHaveLength(2);
    expect(
      summary.students[0].components.find((c) => c.period === 'Q1')?.sourceId,
    ).not.toBe(local.id);
  });

  it('records evidenced remediation and a durable back subject with audited scheduling and clearance', async () => {
    const f = await seedAnnualFixture();
    await database.db.update(academicSystemStates).set({ quarter: 'Q4' });
    for (let i = 0; i < 4; i++) await f.addRevision(i, 70);
    await f.service.refreshForClass(f.cls.id, f.actor.id);
    const [annual] = await database.db.query.subjectAnnualGrades.findMany();
    await expect(
      f.service.recordRemediation(
        annual.id,
        { remedialClassMark: 70, sourceReference: '', reason: 'SRC result' },
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('reference');
    const result = await f.service.recordRemediation(
      annual.id,
      {
        remedialClassMark: 70,
        sourceReference: 'SRC register 123',
        reason: 'Completed SRC',
      },
      f.actor.id,
      ['admin'],
    );
    expect(result.recomputedGrade).toBe(70);
    const [obligation] =
      await database.db.query.academicBackSubjects.findMany();
    expect(obligation.status).toBe('pending');
    await f.service.scheduleBackSubject(
      obligation.id,
      {
        schoolYear: '2027-2028',
        period: 'Q1',
        reason: 'Approved next-term support',
      },
      f.actor.id,
      ['admin'],
    );
    await expect(
      f.service.clearBackSubject(
        obligation.id,
        {
          grade: 80,
          sourceReference: 'Completion 123',
          reason: 'Subject completed',
        },
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('future');
    await database.db
      .update(academicSystemStates)
      .set({ schoolYear: '2027-2028', quarter: 'Q1' });
    await f.service.clearBackSubject(
      obligation.id,
      {
        grade: 80,
        sourceReference: 'Completion 123',
        reason: 'Subject completed',
      },
      f.actor.id,
      ['admin'],
    );
    expect(
      (await database.db.query.academicBackSubjects.findMany())[0],
    ).toMatchObject({ status: 'cleared', clearedGrade: 80 });
    expect(
      await database.db.query.academicBackSubjectEvents.findMany(),
    ).toHaveLength(3);
    expect(
      (await database.db.query.subjectAnnualGrades.findMany())[0].officialGrade,
    ).toBe(70);
    const [secondAnnual] = await database.db
      .insert(subjectAnnualGrades)
      .values({
        ...annual,
        id: undefined,
        subjectCode: 'SCI8',
        sourceFingerprint: 'test-independent-science-source',
      })
      .returning();
    // Prepare another valid obligation in the source year, then return to its scheduled year.
    await database.db
      .update(academicSystemStates)
      .set({ schoolYear: '2026-2027', quarter: 'Q4' });
    await f.service.recordRemediation(
      secondAnnual.id,
      {
        remedialClassMark: 70,
        sourceReference: 'SRC science 456',
        reason: 'Completed science SRC',
      },
      f.actor.id,
      ['admin'],
    );
    const second = (
      await database.db.query.academicBackSubjects.findMany()
    ).find((row) => row.annualGradeId === secondAnnual.id)!;
    await database.db
      .update(academicSystemStates)
      .set({ schoolYear: '2027-2028', quarter: 'Q1' });
    await expect(
      f.service.scheduleBackSubject(
        second.id,
        {
          schoolYear: '2027-2028',
          period: 'Q1',
          reason: 'Second support subject',
        },
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('one back subject');
  });

  it('restores linked assessment evidence after an audited exemption correction without inventing a score', async () => {
    const f = await seedTransitionFixture();
    const policy = new AcademicPolicyService(database),
      audit = new AuditService(database),
      emitter = new EventEmitter2();
    const sync = new ClassRecordSyncService(database, emitter, audit, policy);
    const workbook = new ClassRecordService(
      database,
      new ClassRecordComputationService(database, policy),
      sync,
      emitter,
      audit,
      policy,
      new ClassRecordReadinessService(database, policy),
      new ClassRecordRosterService(database, policy, audit),
      f.service,
    );
    await workbook.reopenClassRecord(
      f.records[0].id,
      f.actor.id,
      ['admin'],
      'Correct an erroneous exemption',
    );
    const [assessment] = await database.db
      .insert(assessments)
      .values({
        classId: f.cls.id,
        title: 'Evidence quiz',
        type: 'quiz',
        quarter: 'Q1',
        totalPoints: 20,
      })
      .returning();
    const [category] = await database.db
      .insert(classRecordCategories)
      .values({
        classRecordId: f.records[0].id,
        name: 'Written Works',
        weightPercentage: '20',
      })
      .returning();
    const [item] = await database.db
      .insert(classRecordItems)
      .values({
        classRecordId: f.records[0].id,
        categoryId: category.id,
        assessmentId: assessment.id,
        title: 'Quiz',
        maxScore: '20',
      })
      .returning();
    const [attempt] = await database.db
      .insert(assessmentAttempts)
      .values({
        assessmentId: assessment.id,
        studentId: f.student.id,
        isSubmitted: true,
        score: 80,
      })
      .returning();
    await workbook.recordScore(
      item.id,
      {
        studentId: f.student.id,
        status: 'excused',
        score: null,
        reason: 'Original exemption',
      },
      f.actor.id,
      ['admin'],
    );
    await workbook.syncScoresFromAssessment(item.id, f.actor.id, ['admin']);
    expect(
      (await database.db.query.classRecordScores.findFirst())?.status,
    ).toBe('excused');
    await (workbook as any).restoreAssessmentEvidence(
      item.id,
      f.student.id,
      'Verified original quiz submission',
      f.actor.id,
      ['admin'],
    );
    expect(await database.db.query.classRecordScores.findFirst()).toMatchObject(
      { status: 'recorded', score: '16.00', sourceAttemptId: attempt.id },
    );
    await workbook.recordScore(
      item.id,
      {
        studentId: f.student.id,
        status: 'excused',
        score: null,
        reason: 'Second exemption',
      },
      f.actor.id,
      ['admin'],
    );
    await database.db
      .update(assessmentAttempts)
      .set({ score: null })
      .where(eq(assessmentAttempts.id, attempt.id));
    await (workbook as any).restoreAssessmentEvidence(
      item.id,
      f.student.id,
      'Remove exemption pending corrected grading',
      f.actor.id,
      ['admin'],
    );
    expect(await database.db.query.classRecordScores.findMany()).toHaveLength(
      0,
    );
  });

  it('repairs modern workbook configuration only with explicit exam mapping and preserves raw scores', async () => {
    const f = await seedAnnualFixture();
    const record = f.records[0];
    await database.db
      .update(classRecords)
      .set({ status: 'draft' })
      .where(eq(classRecords.id, record.id));
    const categories = await database.db
      .insert(classRecordCategories)
      .values([
        {
          classRecordId: record.id,
          name: 'Written Works',
          weightPercentage: '30',
        },
        {
          classRecordId: record.id,
          name: 'Performance Tasks',
          weightPercentage: '50',
        },
        {
          classRecordId: record.id,
          name: 'Quarterly Assessment',
          weightPercentage: '20',
        },
      ])
      .returning();
    const [exam] = await database.db
      .insert(classRecordItems)
      .values({
        classRecordId: record.id,
        categoryId: categories[2].id,
        title: 'Legacy exam',
        maxScore: '100',
        itemOrder: 1,
      })
      .returning();
    await database.db.insert(classRecordScores).values({
      classRecordItemId: exam.id,
      studentId: f.student.id,
      score: '65',
    });
    const repair = new AcademicRepairService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
      f.service,
    );
    await expect(
      repair.repairWorkbookPolicy(
        record.id,
        { reason: 'Apply verified modern policy', examinations: [] },
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('Explicitly classify');
    expect(
      (
        await database.db.query.classRecordCategories.findFirst({
          where: eq(classRecordCategories.id, categories[0].id),
        })
      )?.weightPercentage,
    ).toBe('30.00');
    await repair.repairWorkbookPolicy(
      record.id,
      {
        reason: 'Verified legacy exam is the term examination',
        examinations: [{ itemId: exam.id, component: 'TE' }],
      },
      f.actor.id,
      ['admin'],
    );
    expect((await database.db.query.classRecordScores.findFirst())?.score).toBe(
      '65.00',
    );
    expect(
      (
        await database.db.query.classRecordItems.findFirst({
          where: eq(classRecordItems.id, exam.id),
        })
      )?.examComponent,
    ).toBe('TE');
    expect(
      (await database.db.query.classRecordItems.findMany())
        .map((i) => i.examComponent)
        .sort(),
    ).toEqual(['ST1', 'ST2', 'TE']);
    expect(
      (
        await database.db.query.classRecordCategories.findFirst({
          where: eq(classRecordCategories.id, categories[0].id),
        })
      )?.weightPercentage,
    ).toBe('20.00');
  });

  it('retires a duplicate only after canonical enrollment and keeps historical records intact', async () => {
    const f = await seedTransitionFixture();
    const [canonical] = await database.db
      .insert(classes)
      .values({
        sectionId: f.cls.sectionId,
        teacherId: f.actor.id,
        subjectCode: 'MATH-08',
        subjectName: 'Mathematics',
        subjectGradeLevel: '8',
        schoolYear: '2026-2027',
      })
      .returning();
    const repair = new AcademicRepairService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
      f.service,
    );
    const dto = {
      canonicalClassId: canonical.id,
      reason: 'Verified duplicate learning area',
    };
    await expect(
      repair.retireDuplicateClass(f.cls.id, dto, f.actor.id, ['admin']),
    ).rejects.toThrow('Enroll each');
    await database.db.insert(enrollments).values({
      classId: canonical.id,
      sectionId: canonical.sectionId,
      studentId: f.student.id,
    });
    await repair.retireDuplicateClass(f.cls.id, dto, f.actor.id, ['admin']);
    expect(await database.db.query.classRecords.findMany()).toHaveLength(4);
    expect(
      await database.db.query.academicPeriodGradeRevisions.findMany(),
    ).toHaveLength(4);
    expect(
      await database.db.query.classes.findFirst({
        where: eq(classes.id, f.cls.id),
      }),
    ).toMatchObject({ isActive: false, teacherId: f.actor.id });
    expect((await f.readiness.getReadiness()).transitionBlocked).toBe(true);
  });

  it('completes Grade 10 only after clearance and preserves the original year-end and annual evidence', async () => {
    const f = await seedTransitionFixture('10', 70);
    const [annual] = await database.db.query.subjectAnnualGrades.findMany();
    await f.service.recordRemediation(
      annual.id,
      {
        remedialClassMark: 70,
        reason: 'SRC completed below passing',
        sourceReference: 'SRC 10-123',
      },
      f.actor.id,
      ['admin'],
    );
    const result = await f.stateService.transition(f.dto, f.actor.id);
    expect(result.impact.studentsGraduated).toBe(0);
    const [outcome] =
      await database.db.query.academicStudentYearOutcomes.findMany();
    expect(outcome.outcome).toBe('pending_completion');
    const evidence = {
      reason: 'All completion requirements verified',
      sourceReference: 'Completion register 10-123',
    };
    await expect(
      (f.service as any).completeGrade10(f.student.id, evidence, f.actor.id, [
        'admin',
      ]),
    ).rejects.toThrow('Uncleared');
    const [obligation] =
      await database.db.query.academicBackSubjects.findMany();
    await f.service.scheduleBackSubject(
      obligation.id,
      {
        schoolYear: '2027-2028',
        period: 'Q1',
        reason: 'Approved support term',
      },
      f.actor.id,
      ['admin'],
    );
    await f.service.clearBackSubject(
      obligation.id,
      {
        grade: 80,
        reason: 'Completed learning area',
        sourceReference: 'Clearance 10-123',
      },
      f.actor.id,
      ['admin'],
    );
    const completion = await (f.service as any).completeGrade10(
      f.student.id,
      evidence,
      f.actor.id,
      ['admin'],
    );
    expect(completion.outcomeId).toBe(outcome.id);
    expect(
      (await database.db.query.studentProfiles.findFirst())?.graduatedAt,
    ).not.toBeNull();
    expect(
      (await database.db.query.academicStudentYearOutcomes.findFirst())
        ?.outcome,
    ).toBe('pending_completion');
    expect(
      (await database.db.query.subjectAnnualGrades.findFirst())?.officialGrade,
    ).toBe(70);
    expect(
      (
        await (f.service as any).completeGrade10(
          f.student.id,
          evidence,
          f.actor.id,
          ['admin'],
        )
      ).id,
    ).toBe(completion.id);
  });

  it('allows future draft preparation, creates placement atomically, and preserves in-flight completion across periods', async () => {
    const f = await seedAnnualFixture();
    await database.db.delete(classRecords);
    const policy = new AcademicPolicyService(database);
    const audit = new AuditService(database);
    const emitter = new EventEmitter2();
    const workbook = new ClassRecordService(
      database,
      new ClassRecordComputationService(database, policy),
      {} as never,
      emitter,
      audit,
      policy,
      new ClassRecordReadinessService(database, policy),
      new ClassRecordRosterService(database, policy, audit),
      f.service,
    );
    const service = new AssessmentsService(
      database,
      emitter,
      {} as never,
      audit,
      { queueClassReindex: jest.fn() } as never,
      {
        enqueueAssessmentAssigned: jest.fn(),
        rescheduleAssessmentDueReminder: jest.fn(),
        removeAssessmentDueReminder: jest.fn(),
      } as never,
      new AssessmentAccessService(database),
      policy,
      workbook,
    );
    const actor = { userId: f.actor.id, roles: ['teacher'] };
    const draft = await service.createAssessment(
      {
        classId: f.cls.id,
        title: 'Future work',
        type: AssessmentType.FILE_UPLOAD,
        quarter: 'Q2',
        fileUploadInstructions: 'Upload the assignment',
        maxAttempts: 2,
        passingScore: 60,
      },
      actor,
    );
    expect(draft.quarter).toBe('Q2');
    expect(await database.db.query.classRecords.findMany()).toHaveLength(0);
    await expect(
      service.updateAssessment(draft.id, { isPublished: true }, actor),
    ).rejects.toThrow('active period');
    const published = await service.updateAssessment(
      draft.id,
      { quarter: 'Q1', classRecordCategory: 'written_work', isPublished: true },
      actor,
    );
    expect(published.isPublished).toBe(true);
    expect(await database.db.query.classRecords.findMany()).toHaveLength(1);
    const { attempt } = await service.startAttempt(f.student.id, draft.id);
    await expect(
      service.updateAssessment(draft.id, { quarter: 'Q2' }, actor),
    ).rejects.toThrow('attempt');
    await database.db.update(academicSystemStates).set({ quarter: 'Q2' });
    const resumed = await service.startAttempt(f.student.id, draft.id);
    expect(resumed.attempt.id).toBe(attempt.id);
    // A file is required for submission; use the attempt snapshot contract as the fixture evidence.
    await database.db.execute(
      sql`UPDATE assessment_attempts SET submitted_files = '[{"id":"file-fixture","originalName":"work.pdf","mimeType":"application/pdf","sizeBytes":123}]'::jsonb WHERE id=${attempt.id}`,
    );
    await service.submitAssessment(f.student.id, {
      assessmentId: draft.id,
      responses: [],
      timeSpentSeconds: 10,
    });
    await expect(service.startAttempt(f.student.id, draft.id)).rejects.toThrow(
      'active period',
    );
    const [timed] = await database.db
      .insert(assessments)
      .values({
        classId: f.cls.id,
        title: 'Timed questions',
        type: 'quiz',
        quarter: 'Q2',
        totalPoints: 1,
        isPublished: true,
        timedQuestionsEnabled: true,
        questionTimeLimitSeconds: 30,
      })
      .returning();
    await database.db.insert(assessmentQuestions).values({
      assessmentId: timed.id,
      content: 'True?',
      type: 'true_false',
      points: 1,
      order: 0,
    });
    const started = await service.startAttempt(f.student.id, timed.id);
    await database.db
      .update(assessmentAttempts)
      .set({ currentQuestionDeadlineAt: new Date(Date.now() - 60_000) })
      .where(eq(assessmentAttempts.id, started.attempt.id));
    await database.db.update(academicSystemStates).set({ quarter: 'Q3' });
    await expect(service.startAttempt(f.student.id, timed.id)).rejects.toThrow(
      'active period',
    );
    expect(
      (
        await database.db.query.assessmentAttempts.findFirst({
          where: eq(assessmentAttempts.id, started.attempt.id),
        })
      )?.isSubmitted,
    ).toBe(true);
  });

  it('activates periods with step-up authentication, version preconditions, replay protection, and reasoned overrides', async () => {
    const f = await seedAnnualFixture();
    await database.db
      .update(users)
      .set({ password: await bcrypt.hash('test-period-password', 4) })
      .where(eq(users.id, f.actor.id));
    const service = new AcademicPeriodService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
    );
    const request = {
      expectedSchoolYear: '2026-2027',
      expectedQuarter: 'Q1' as const,
      expectedVersion: 1,
      targetQuarter: 'Q2' as const,
      currentPassword: 'test-period-password',
      requestId: randomUUID(),
    };
    await expect(
      service.activate({ ...request, currentPassword: 'wrong' }, f.actor.id, [
        'admin',
      ]),
    ).rejects.toThrow('password');
    const result = await service.activate(request, f.actor.id, ['admin']);
    expect(result).toMatchObject({ quarter: 'Q2', version: 2 });
    expect(
      await service.activate(request, f.actor.id, ['admin']),
    ).toMatchObject({ quarter: 'Q2', version: 2, replayed: true });
    await expect(
      service.activate({ ...request, requestId: randomUUID() }, f.actor.id, [
        'admin',
      ]),
    ).rejects.toThrow('changed');
    await expect(
      service.activate(
        {
          ...request,
          expectedQuarter: 'Q2',
          expectedVersion: 2,
          targetQuarter: 'Q1',
          requestId: randomUUID(),
        },
        f.actor.id,
        ['admin'],
      ),
    ).rejects.toThrow('override');
    await service.activate(
      {
        ...request,
        expectedQuarter: 'Q2',
        expectedVersion: 2,
        targetQuarter: 'Q1',
        override: true,
        reason: 'Correct accidental activation',
        requestId: randomUUID(),
      },
      f.actor.id,
      ['admin'],
    );
    await expect(
      service.activate({ ...request, requestId: randomUUID() }, f.actor.id, [
        'admin',
      ]),
    ).rejects.toThrow('changed');
    expect(
      (await database.db.query.academicSystemStates.findFirst())?.version,
    ).toBe(3);
  });

  it('preserves period membership before class removal and blocks roster changes after finalization', async () => {
    const f = await seedAnnualFixture();
    await database.db.update(academicSystemStates).set({ quarter: 'Q2' });
    const policy = new AcademicPolicyService(database);
    const audit = new AuditService(database);
    const workbook = new ClassRecordService(
      database,
      new ClassRecordComputationService(database, policy),
      {} as never,
      new EventEmitter2(),
      audit,
      policy,
      new ClassRecordReadinessService(database, policy),
      new ClassRecordRosterService(database, policy, audit),
      f.service,
    );
    const classesService = new ClassesService(
      database,
      audit,
      workbook,
      {} as never,
    );
    await expect(
      classesService.removeStudent(f.cls.id, f.student.id, f.actor.id, [
        'teacher',
      ]),
    ).rejects.toThrow('finalized');
    expect(await database.db.query.enrollments.findMany()).toHaveLength(1);
    await database.db.update(classRecords).set({ status: 'draft' });
    await classesService.removeStudent(f.cls.id, f.student.id, f.actor.id, [
      'teacher',
    ]);
    const participants =
      await database.db.query.classRecordParticipants.findMany();
    expect(participants.map((p) => p.classRecordId)).toContain(f.records[1].id);
    expect(participants.map((p) => p.classRecordId)).not.toContain(
      f.records[0].id,
    );
    expect(
      participants.find((p) => p.classRecordId === f.records[1].id)
        ?.eligibility,
    ).toBe('eligible');
    const roster = await new ClassRecordRosterService(
      database,
      policy,
      audit,
    ).getRoster(f.records[1].id, f.actor.id, ['teacher']);
    expect(roster.participants[0]).toMatchObject({
      studentId: f.student.id,
      currentlyEnrolled: false,
      eligibility: 'eligible',
    });
    expect(roster.confirmedAt).toBeNull();
  });

  it('observes current enrollment only in the newly activated draft period and leaves historical rosters untouched', async () => {
    const f = await seedAnnualFixture();
    await database.db
      .update(classRecords)
      .set({ status: 'draft', rosterConfirmedAt: null })
      .where(eq(classRecords.id, f.records[1].id));
    await database.db
      .update(users)
      .set({ password: await bcrypt.hash('period-observation', 4) })
      .where(eq(users.id, f.actor.id));
    const service = new AcademicPeriodService(
      database,
      new AcademicPolicyService(database),
      new AuditService(database),
    );
    await service.activate(
      {
        expectedSchoolYear: '2026-2027',
        expectedQuarter: 'Q1',
        expectedVersion: 1,
        targetQuarter: 'Q2',
        currentPassword: 'period-observation',
        requestId: randomUUID(),
      },
      f.actor.id,
      ['admin'],
    );
    expect(await database.db.query.classRecordParticipants.findMany()).toEqual([
      expect.objectContaining({
        classRecordId: f.records[1].id,
        studentId: f.student.id,
        eligibility: 'eligible',
        source: 'period_activation',
      }),
    ]);
    expect(
      (
        await database.db.query.classRecords.findFirst({
          where: eq(classRecords.id, f.records[1].id),
        })
      )?.rosterConfirmedAt,
    ).toBeNull();
  });
  const schoolSizedTest =
    process.env.ACADEMIC_LARGE_FIXTURE === '1' ? it : it.skip;
  schoolSizedTest(
    'checks a school-sized matrix and identifies one stale annual among 9600 learning-area results',
    async () => {
      const [actor] = await database.db
        .insert(users)
        .values({
          email: 'scale-admin@example.test',
          password: 'invented-test-only',
          firstName: 'Scale',
          lastName: 'Admin',
        })
        .returning();
      const policyService = new AcademicPolicyService(database);
      const policy = await policyService.forYear('2026-2027');
      await database.db.update(academicSystemStates).set({ quarter: 'Q3' });
      const sectionRows: any[] = [],
        classRows: any[] = [],
        studentRows: any[] = [],
        profileRows: any[] = [];
      const enrollmentRows: any[] = [],
        recordRows: any[] = [],
        participantRows: any[] = [],
        revisionRows: any[] = [],
        annualRows: any[] = [];
      const subjects = [
        'MATH',
        'SCI',
        'ENG',
        'FIL',
        'AP',
        'TLE',
        'MAPEH',
        'ESP',
      ];
      for (let group = 0; group < 30; group++) {
        const sectionId = randomUUID();
        sectionRows.push({
          id: sectionId,
          name: `Scale ${group + 1}`,
          gradeLevel: '8',
          schoolYear: policy.schoolYear,
        });
        const learners = Array.from({ length: 40 }, (_, index) => ({
          id: randomUUID(),
          email: `scale-${group}-${index}@example.test`,
          password: 'invented-test-only',
          firstName: `Learner ${index}`,
          lastName: `Group ${group}`,
        }));
        studentRows.push(...learners);
        for (const student of learners) {
          profileRows.push({ userId: student.id, gradeLevel: '8' });
          enrollmentRows.push({ sectionId, studentId: student.id });
        }
        for (const subject of subjects) {
          const classId = randomUUID();
          const subjectCode = `${subject}-8`;
          classRows.push({
            id: classId,
            sectionId,
            subjectName: subject,
            subjectCode,
            subjectGradeLevel: '8',
            teacherId: actor.id,
            schoolYear: policy.schoolYear,
          });
          const records = policy.periods.map((period) => ({
            id: randomUUID(),
            classId,
            teacherId: actor.id,
            gradingPeriod: period.key,
            status: 'finalized',
            revision: 1,
            rosterConfirmedAt: new Date(),
          }));
          recordRows.push(...records);
          for (const student of learners) {
            const components = records.map((record) => {
              const id = randomUUID();
              participantRows.push({
                classRecordId: record.id,
                studentId: student.id,
                eligibility: 'eligible',
                source: 'scale fixture',
                updatedBy: actor.id,
              });
              revisionRows.push({
                id,
                classRecordId: record.id,
                classId,
                studentId: student.id,
                schoolYear: policy.schoolYear,
                subjectCode,
                gradeLevel: '8',
                period: record.gradingPeriod,
                revision: 1,
                grade: 80,
                evidence: {
                  policy,
                  initialGrade: 80,
                  categories: [],
                  participant: { eligibility: 'eligible' },
                },
                computedBy: actor.id,
              });
              return {
                period: record.gradingPeriod,
                grade: 80,
                sourceType: 'period_revision',
                sourceId: id,
                classId,
              };
            });
            annualRows.push({
              id: randomUUID(),
              schoolYear: policy.schoolYear,
              subjectCode,
              gradeLevel: '8',
              studentId: student.id,
              components,
              policy,
              sourceFingerprint: createHash('sha256')
                .update(JSON.stringify({ policy, components }))
                .digest('hex'),
              sum: 320,
              divisor: 4,
              rawAverage: '80',
              officialGrade: 80,
              remarks: 'Passed',
              computedBy: actor.id,
            });
          }
        }
      }
      const bulk = async (table: any, rows: any[]) => {
        for (let i = 0; i < rows.length; i += 400)
          await database.db.insert(table).values(rows.slice(i, i + 400));
      };
      await bulk(users, studentRows);
      await bulk(sections, sectionRows);
      await bulk(classes, classRows);
      await bulk(studentProfiles, profileRows);
      await bulk(enrollments, enrollmentRows);
      await bulk(classRecords, recordRows);
      await bulk(classRecordParticipants, participantRows);
      await bulk(academicPeriodGradeRevisions, revisionRows);
      await bulk(subjectAnnualGrades, annualRows);
      const readiness = new AcademicTransitionReadinessService(
        database,
        policyService,
      );
      const started = performance.now();
      const ready = await readiness.getReadiness();
      const elapsed = Math.round(performance.now() - started);
      expect(ready.transitionBlocked).toBe(false);
      expect(ready.activeStudentsInCurrentYear).toBe(1200);
      expect(ready.studentsToPromote).toBe(1200);
      expect(ready.studentOutcomes).toHaveLength(1200);
      await database.db
        .update(subjectAnnualGrades)
        .set({ sourceFingerprint: 'intentionally-stale-scale-fixture' })
        .where(eq(subjectAnnualGrades.id, annualRows[5999].id));
      const blocked = await readiness.getReadiness();
      expect(blocked.transitionBlocked).toBe(true);
      expect(blocked.blockers).toEqual([
        expect.objectContaining({
          code: 'missing_current_annual',
          studentId: annualRows[5999].studentId,
        }),
      ]);
      console.info(
        JSON.stringify({
          academicScale: {
            students: 1200,
            classes: 240,
            records: 720,
            periodGrades: 28800,
            annualGrades: 9600,
            readinessMilliseconds: elapsed,
          },
        }),
      );
    },
    120000,
  );
});
