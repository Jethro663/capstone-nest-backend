import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { MobileCalendarQueryDto } from './dto/mobile-calendar-query.dto';

type WorkspaceRole = 'student' | 'teacher';
type RawRow = Record<string, unknown>;

@Injectable()
export class MobileWorkspaceService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async getStudentOverview(userId: string) {
    const result = await this.db.execute(sql`
      WITH visible_lessons AS (
        SELECT DISTINCT cm.class_id, mi.lesson_id
        FROM class_modules cm
        JOIN module_sections ms ON ms.module_id = cm.id
        JOIN module_items mi ON mi.module_section_id = ms.id
        JOIN lessons l ON l.id = mi.lesson_id
        WHERE cm.is_visible = true
          AND cm.is_locked = false
          AND mi.is_visible = true
          AND mi.item_type = 'lesson'
          AND l.is_draft = false
      )
      SELECT
        c.id,
        c.subject_name,
        c.subject_code,
        c.subject_grade_level,
        c.school_year,
        s.name AS section_name,
        s.grade_level AS section_grade_level,
        teacher.first_name AS teacher_first_name,
        teacher.last_name AS teacher_last_name,
        COUNT(DISTINCT classmates.student_id) AS classmate_count,
        COUNT(DISTINCT visible_lessons.lesson_id) AS total_lessons,
        COUNT(DISTINCT completed.lesson_id) AS completed_lesson_count,
        COUNT(DISTINCT a.id) AS total_assessments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.due_date IS NOT NULL) AS assessment_due_count,
        COUNT(DISTINCT an.id) AS announcement_count,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', cs.id,
              'days', cs.days,
              'startTime', cs.start_time,
              'endTime', cs.end_time
            )
          ) FILTER (WHERE cs.id IS NOT NULL),
          '[]'::jsonb
        ) AS schedules
      FROM enrollments own
      JOIN classes c ON c.id = own.class_id
      JOIN sections s ON s.id = c.section_id
      LEFT JOIN users teacher ON teacher.id = c.teacher_id
      LEFT JOIN enrollments classmates
        ON classmates.class_id = c.id AND classmates.status = 'enrolled'
      LEFT JOIN visible_lessons ON visible_lessons.class_id = c.id
      LEFT JOIN lesson_completions completed
        ON completed.lesson_id = visible_lessons.lesson_id
        AND completed.student_id = ${userId}
      LEFT JOIN assessments a ON a.class_id = c.id AND a.is_published = true
      LEFT JOIN announcements an
        ON an.class_id = c.id
        AND an.is_visible = true
        AND an.published_at IS NOT NULL
        AND an.archived_at IS NULL
      LEFT JOIN class_schedules cs ON cs.class_id = c.id
      WHERE own.student_id = ${userId}
        AND own.status = 'enrolled'
        AND c.is_active = true
        AND s.is_active = true
      GROUP BY c.id, s.id, teacher.first_name, teacher.last_name
      ORDER BY c.subject_name ASC
      LIMIT 100
    `);
    const courses = this.rows(result).map((row) => {
      const totalLessons = this.number(row.total_lessons);
      const completedLessonCount = this.number(row.completed_lesson_count);
      return {
        id: this.text(row.id),
        subjectName: this.text(row.subject_name, 'Class'),
        subjectCode: this.text(row.subject_code),
        schoolYear: this.text(row.school_year),
        sectionName: this.text(row.section_name, 'Section'),
        sectionGradeLevel: this.text(row.section_grade_level),
        subjectGradeLevel: this.text(row.subject_grade_level),
        teacherName:
          [row.teacher_first_name, row.teacher_last_name]
            .filter(Boolean)
            .join(' ') || 'Teacher not assigned',
        totalLessons,
        completedLessonCount,
        totalAssessments: this.number(row.total_assessments),
        assessmentDueCount: this.number(row.assessment_due_count),
        announcementCount: this.number(row.announcement_count),
        classmateCount: this.number(row.classmate_count),
        schedules: Array.isArray(row.schedules) ? row.schedules : [],
        progress:
          totalLessons > 0
            ? Math.round((completedLessonCount / totalLessons) * 100)
            : 0,
      };
    });
    return {
      schemaVersion: 1 as const,
      courses,
      sections: { courses: 'ok' as const },
      offlineSnapshotReadsEnabled: this.offlineSnapshotReadsEnabled(),
      generatedAt: new Date().toISOString(),
      requestBudget: { clientRequests: 1, dbQueries: 1 },
    };
  }

  async getTeacherOverview(userId: string) {
    const classResult = await this.db.execute(this.teacherClassesQuery(userId));
    const [assessmentResult, announcementResult, riskResult] =
      await Promise.allSettled([
        this.db.execute(sql`
          SELECT a.id, a.class_id, a.title, a.due_date, a.is_published, a.created_at
          FROM assessments a
          JOIN classes c ON c.id = a.class_id
          WHERE c.teacher_id = ${userId} AND c.is_active = true
          ORDER BY a.created_at DESC
          LIMIT 200
        `),
        this.db.execute(sql`
          SELECT an.id, an.class_id, an.title, an.created_at, an.scheduled_at, an.published_at
          FROM announcements an
          JOIN classes c ON c.id = an.class_id
          WHERE c.teacher_id = ${userId}
            AND c.is_active = true
            AND an.archived_at IS NULL
          ORDER BY an.created_at DESC
          LIMIT 50
        `),
        this.db.execute(sql`
          SELECT ps.class_id, COUNT(*) AS count
          FROM performance_snapshots ps
          JOIN classes c ON c.id = ps.class_id
          WHERE c.teacher_id = ${userId}
            AND c.is_active = true
            AND ps.is_at_risk = true
          GROUP BY ps.class_id
          LIMIT 100
        `),
      ]);
    return {
      schemaVersion: 1 as const,
      classes: this.rows(classResult).map((row) => this.mapClass(row)),
      assessments:
        assessmentResult.status === 'fulfilled'
          ? this.rows(assessmentResult.value).map((row) => ({
              id: this.text(row.id),
              classId: this.text(row.class_id),
              title: this.text(row.title),
              dueDate: row.due_date ?? null,
              isPublished: Boolean(row.is_published),
              createdAt: row.created_at,
            }))
          : [],
      announcements:
        announcementResult.status === 'fulfilled'
          ? this.rows(announcementResult.value).map((row) => ({
              id: this.text(row.id),
              classId: this.text(row.class_id),
              title: this.text(row.title),
              createdAt: row.created_at,
              scheduledAt: row.scheduled_at ?? null,
              publishedAt: row.published_at ?? null,
            }))
          : [],
      atRiskCounts: Object.fromEntries(
        riskResult.status === 'fulfilled'
          ? this.rows(riskResult.value).map((row) => [
              this.text(row.class_id),
              this.number(row.count),
            ])
          : [],
      ),
      sections: {
        classes: 'ok' as const,
        assessments:
          assessmentResult.status === 'fulfilled'
            ? ('ok' as const)
            : ('unavailable' as const),
        announcements:
          announcementResult.status === 'fulfilled'
            ? ('ok' as const)
            : ('unavailable' as const),
        atRiskCounts:
          riskResult.status === 'fulfilled'
            ? ('ok' as const)
            : ('unavailable' as const),
      },
      offlineSnapshotReadsEnabled: this.offlineSnapshotReadsEnabled(),
      generatedAt: new Date().toISOString(),
      requestBudget: { clientRequests: 1, dbQueries: 4 },
    };
  }

  async getTeacherLibraryIndex(userId: string) {
    const result = await this.db.execute(sql`
      SELECT
        cm.id,
        cm.class_id,
        cm.title,
        cm.description,
        cm.order,
        cm.is_visible,
        cm.is_locked,
        c.subject_code,
        c.subject_name,
        COUNT(DISTINCT ms.id) AS section_count,
        COUNT(DISTINCT mi.id) FILTER (WHERE mi.item_type = 'lesson') AS lesson_count
      FROM class_modules cm
      JOIN classes c ON c.id = cm.class_id
      LEFT JOIN module_sections ms ON ms.module_id = cm.id
      LEFT JOIN module_items mi ON mi.module_section_id = ms.id
      WHERE c.teacher_id = ${userId} AND c.is_active = true
      GROUP BY cm.id, c.id
      ORDER BY c.subject_name ASC, cm.order ASC, cm.created_at DESC
      LIMIT 200
    `);
    return {
      schemaVersion: 1 as const,
      modules: this.rows(result).map((row) => ({
        id: this.text(row.id),
        classId: this.text(row.class_id),
        title: this.text(row.title),
        description:
          typeof row.description === 'string' ? row.description : null,
        order: this.number(row.order),
        isVisible: Boolean(row.is_visible),
        isLocked: Boolean(row.is_locked),
        classLabel: `${this.text(row.subject_code)} | ${this.text(row.subject_name, 'Class')}`,
        sectionCount: this.number(row.section_count),
        lessonCount: this.number(row.lesson_count),
      })),
      generatedAt: new Date().toISOString(),
      requestBudget: { clientRequests: 1 as const, dbQueries: 1 as const },
    };
  }

  async getCalendar(
    userId: string,
    role: WorkspaceRole,
    query: MobileCalendarQueryDto,
  ) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const rangeMs = to.getTime() - from.getTime();
    if (
      !Number.isFinite(rangeMs) ||
      rangeMs < 0 ||
      rangeMs > 93 * 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        'Mobile calendar range must be between 0 and 93 days.',
      );
    }

    const classResult = await this.db.execute(
      this.scopedClassesQuery(userId, role),
    );
    const scope = this.scopeCondition(userId, role);
    const optional = await Promise.allSettled([
      this.db.execute(sql`
        SELECT a.id, a.class_id, a.title, a.description, a.due_date, a.is_published
        FROM assessments a
        JOIN classes c ON c.id = a.class_id
        WHERE ${scope}
          AND c.is_active = true
          AND a.due_date BETWEEN ${from} AND ${to}
          ${role === 'student' ? sql`AND a.is_published = true` : sql``}
        ORDER BY a.due_date ASC
        LIMIT 200
      `),
      this.db.execute(sql`
        SELECT an.id, an.class_id, an.title, an.content, an.created_at, an.scheduled_at, an.published_at
        FROM announcements an
        JOIN classes c ON c.id = an.class_id
        WHERE ${scope}
          AND c.is_active = true
          AND an.archived_at IS NULL
          AND COALESCE(an.published_at, an.scheduled_at, an.created_at) BETWEEN ${from} AND ${to}
          ${role === 'student' ? sql`AND an.is_visible = true AND an.published_at IS NOT NULL` : sql``}
        ORDER BY COALESCE(an.published_at, an.scheduled_at, an.created_at) ASC
        LIMIT 200
      `),
      this.db.execute(sql`
        SELECT se.id, se.event_type, se.school_year, se.title, se.description,
               se.location, se.starts_at, se.ends_at, se.all_day
        FROM school_events se
        WHERE se.archived_at IS NULL
          AND se.starts_at <= ${to}
          AND se.ends_at >= ${from}
          AND se.school_year IN (
            SELECT DISTINCT c.school_year FROM classes c WHERE ${scope}
          )
        ORDER BY se.starts_at ASC
        LIMIT 100
      `),
    ]);

    const [assessmentResult, announcementResult, schoolEventResult] = optional;
    return {
      schemaVersion: 1 as const,
      classes: this.rows(classResult).map((row) => this.mapClass(row)),
      assessments:
        assessmentResult.status === 'fulfilled'
          ? this.rows(assessmentResult.value).map((row) => ({
              id: this.text(row.id),
              classId: this.text(row.class_id),
              title: this.text(row.title),
              description: row.description ?? null,
              dueDate: row.due_date,
              isPublished: Boolean(row.is_published),
            }))
          : [],
      announcements:
        announcementResult.status === 'fulfilled'
          ? this.rows(announcementResult.value).map((row) => ({
              id: this.text(row.id),
              classId: this.text(row.class_id),
              title: this.text(row.title),
              content: this.text(row.content),
              createdAt: row.created_at,
              scheduledAt: row.scheduled_at ?? null,
              publishedAt: row.published_at ?? null,
            }))
          : [],
      schoolEvents:
        schoolEventResult.status === 'fulfilled'
          ? this.rows(schoolEventResult.value).map((row) => ({
              id: this.text(row.id),
              eventType: row.event_type,
              schoolYear: row.school_year,
              title: row.title,
              description: row.description ?? null,
              location: row.location ?? null,
              startsAt: row.starts_at,
              endsAt: row.ends_at,
              allDay: Boolean(row.all_day),
            }))
          : [],
      sections: {
        classes: 'ok' as const,
        assessments:
          assessmentResult.status === 'fulfilled'
            ? ('ok' as const)
            : ('unavailable' as const),
        announcements:
          announcementResult.status === 'fulfilled'
            ? ('ok' as const)
            : ('unavailable' as const),
        schoolEvents:
          schoolEventResult.status === 'fulfilled'
            ? ('ok' as const)
            : ('unavailable' as const),
      },
      offlineSnapshotReadsEnabled: this.offlineSnapshotReadsEnabled(),
      generatedAt: new Date().toISOString(),
      requestBudget: { clientRequests: 1, dbQueries: 4 },
    };
  }

  private offlineSnapshotReadsEnabled(): boolean {
    return process.env.MOBILE_OFFLINE_SNAPSHOTS_ENABLED !== 'false';
  }

  private teacherClassesQuery(userId: string) {
    return this.scopedClassesQuery(userId, 'teacher');
  }

  private scopedClassesQuery(userId: string, role: WorkspaceRole) {
    const scope = this.scopeCondition(userId, role);
    return sql`
      SELECT c.id, c.section_id, c.is_active, c.subject_name, c.subject_code, c.school_year, c.room,
             s.id AS section_id, s.name AS section_name, s.grade_level AS section_grade_level,
             COUNT(DISTINCT enrolled.student_id) AS enrollment_count,
             COALESCE(
               jsonb_agg(
                 jsonb_build_object(
                   'id', cs.id,
                   'days', cs.days,
                   'startTime', cs.start_time,
                   'endTime', cs.end_time
                 ) ORDER BY cs.start_time
               ) FILTER (WHERE cs.id IS NOT NULL),
               '[]'::jsonb
             ) AS schedules
      FROM classes c
      JOIN sections s ON s.id = c.section_id
      LEFT JOIN class_schedules cs ON cs.class_id = c.id
      LEFT JOIN enrollments enrolled
        ON enrolled.class_id = c.id AND enrolled.status = 'enrolled'
      WHERE ${scope} AND c.is_active = true AND s.is_active = true
      GROUP BY c.id, s.id
      ORDER BY c.subject_name ASC
      LIMIT 100
    `;
  }

  private scopeCondition(userId: string, role: WorkspaceRole) {
    return role === 'teacher'
      ? sql`c.teacher_id = ${userId}`
      : sql`EXISTS (
          SELECT 1 FROM enrollments own
          WHERE own.class_id = c.id
            AND own.student_id = ${userId}
            AND own.status = 'enrolled'
        )`;
  }

  private mapClass(row: RawRow) {
    return {
      id: this.text(row.id),
      sectionId: this.text(row.section_id),
      isActive: Boolean(row.is_active),
      subjectName: this.text(row.subject_name),
      subjectCode: this.text(row.subject_code),
      schoolYear: this.text(row.school_year),
      room: typeof row.room === 'string' ? row.room : undefined,
      section: {
        id: this.text(row.section_id),
        name: this.text(row.section_name, 'Section'),
        gradeLevel: this.text(row.section_grade_level),
      },
      enrollmentCount: this.number(row.enrollment_count),
      schedules: Array.isArray(row.schedules) ? row.schedules : [],
    };
  }

  private rows(result: unknown): RawRow[] {
    const rows = (result as { rows?: unknown[] })?.rows;
    return Array.isArray(rows) ? (rows as RawRow[]) : [];
  }

  private number(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private text(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }
}
