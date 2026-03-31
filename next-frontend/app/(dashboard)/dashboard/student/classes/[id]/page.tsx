'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  FolderOpen,
  Megaphone,
  School,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';
import { ClassWorkspaceShell } from '@/components/class/workspace/ClassWorkspaceShell';
import { Skeleton } from '@/components/ui/skeleton';
import './student-class-detail.css';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';
import type { ClassModule } from '@/types/module';
import type { SchoolEvent } from '@/types/school-event';
import { getTeacherName } from '@/utils/helpers';

type StudentClassTab =
  | 'modules'
  | 'assignments'
  | 'announcements'
  | 'classmates'
  | 'grades'
  | 'calendar';
type AssignmentCategory =
  | 'all'
  | 'written_work'
  | 'performance_task'
  | 'quarterly_assessment'
  | 'discussion';
type CalendarKind = 'assessment' | 'event' | 'holiday';

interface AssignmentRow {
  assessment: Assessment;
  category: Exclude<AssignmentCategory, 'all'>;
}

interface GradeRow {
  id: string;
  title: string;
  categoryLabel: string;
  scoreText: string;
  percentText: string;
  dateText: string;
  isPending: boolean;
}

interface CalendarRow {
  id: string;
  kind: CalendarKind;
  date: Date;
  title: string;
  subtitle: string;
}

const TABS: Array<{ key: StudentClassTab; label: string; icon: typeof FolderOpen }> = [
  { key: 'modules', label: 'Modules', icon: FolderOpen },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'classmates', label: 'Classmates', icon: Users },
  { key: 'grades', label: 'Grades', icon: FileSpreadsheet },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const ASSIGNMENT_FILTERS: Array<{ key: AssignmentCategory; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'written_work', label: 'Written Work' },
  { key: 'performance_task', label: 'Performance Task' },
  { key: 'quarterly_assessment', label: 'Quarterly Assessment' },
  { key: 'discussion', label: 'Discussion' },
];

const moduleToneByIndex = ['blue', 'green', 'violet'] as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
    },
  },
};

function isStudentClassTab(value: string | null): value is StudentClassTab {
  return (
    value === 'modules' ||
    value === 'assignments' ||
    value === 'announcements' ||
    value === 'classmates' ||
    value === 'grades' ||
    value === 'calendar'
  );
}

function getClassId(raw: string | string[] | undefined) {
  if (!raw) return '';
  return Array.isArray(raw) ? raw[0] : raw;
}

function formatScheduleLabel(classItem: ClassItem | null) {
  const schedule = classItem?.schedules?.[0];
  if (!schedule) return 'Schedule TBA';
  const start = formatTime(schedule.startTime);
  const end = formatTime(schedule.endTime);
  return `${schedule.days.join('/')} ${start}-${end}`;
}

function formatTime(value: string) {
  const [rawHours = '0', rawMinutes = '0'] = value.split(':');
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

function formatClassLine(classItem: ClassItem | null) {
  const gradeLevel = classItem?.section?.gradeLevel || classItem?.subjectGradeLevel || '--';
  const sectionName = classItem?.section?.name || 'Section';
  const teacherName = getTeacherName(classItem?.teacher);
  return `Grade ${gradeLevel} - ${sectionName} · ${teacherName}`;
}

function summarizeModule(moduleEntry: ClassModule) {
  return moduleEntry.sections.reduce(
    (acc, section) => {
      for (const item of section.items) {
        if (item.itemType === 'lesson') acc.lessons += 1;
        if (item.itemType === 'assessment') acc.assessments += 1;
      }
      return acc;
    },
    { lessons: 0, assessments: 0 },
  );
}

function resolveAssignmentCategory(assessment: Assessment): Exclude<AssignmentCategory, 'all'> {
  const type = assessment.type.toLowerCase();
  const title = assessment.title.toLowerCase();
  const description = (assessment.description || '').toLowerCase();
  const text = `${title} ${description}`;
  if (text.includes('discussion')) return 'discussion';
  if (text.includes('project') || text.includes('performance')) return 'performance_task';
  if (text.includes('quarter') || text.includes('exam') || type.includes('quarter')) {
    return 'quarterly_assessment';
  }
  if (type.includes('discussion')) return 'discussion';
  if (type.includes('performance')) return 'performance_task';
  if (type.includes('quarter')) return 'quarterly_assessment';
  return 'written_work';
}

function assignmentCategoryLabel(category: Exclude<AssignmentCategory, 'all'>) {
  if (category === 'written_work') return 'Written Work';
  if (category === 'performance_task') return 'Performance Task';
  if (category === 'quarterly_assessment') return 'Quarterly Assessment';
  return 'Discussion';
}

function parseDate(dateString?: string | null) {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function sortByDateAsc<T>(items: T[], resolver: (item: T) => Date | null) {
  return [...items].sort((left, right) => {
    const leftDate = resolver(left);
    const rightDate = resolver(right);
    if (!leftDate && !rightDate) return 0;
    if (!leftDate) return 1;
    if (!rightDate) return -1;
    return leftDate.getTime() - rightDate.getTime();
  });
}

function formatDateLong(value: Date | null) {
  if (!value) return '--';
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCalendarDay(value: Date) {
  return {
    day: String(value.getDate()),
    month: value.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function getEnrollmentRows(classItem: ClassItem | null) {
  const rows = classItem?.enrollments || [];
  const gradeLevel = classItem?.section?.gradeLevel || classItem?.subjectGradeLevel || '--';
  const sectionName = classItem?.section?.name || 'Section';
  const sectionLabel = `Grade ${gradeLevel} - ${sectionName}`;
  return rows.map((enrollment) => {
    const firstName = enrollment.student?.firstName || '';
    const lastName = enrollment.student?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unnamed student';
    return {
      id: enrollment.id,
      fullName,
      email: enrollment.student?.email || '--',
      section: sectionLabel,
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'NA',
    };
  });
}

function getLatestSubmittedAttempt(attempts: AssessmentAttempt[]) {
  const submitted = attempts.filter((attempt) => attempt.isSubmitted);
  if (submitted.length === 0) return null;
  return [...submitted].sort((left, right) => {
    const leftTs = new Date(left.submittedAt || left.updatedAt || left.createdAt || 0).getTime();
    const rightTs = new Date(right.submittedAt || right.updatedAt || right.createdAt || 0).getTime();
    return rightTs - leftTs;
  })[0];
}

function getScoreTone(percent: number) {
  if (percent >= 90) return 'outstanding';
  if (percent >= 80) return 'good';
  if (percent >= 70) return 'fair';
  return 'at-risk';
}

function getOpenModuleHref(moduleEntry: ClassModule, classId: string) {
  if (moduleEntry.isLocked) return null;
  for (const section of moduleEntry.sections) {
    for (const item of section.items) {
      if (item.itemType === 'lesson' && item.lessonId) {
        return `/dashboard/student/lessons/${item.lessonId}?classId=${classId}`;
      }
      if (item.itemType === 'assessment' && item.assessmentId) {
        return `/dashboard/student/assessments/${item.assessmentId}?classId=${classId}`;
      }
    }
  }
  return `/dashboard/student/classes/${classId}?view=modules`;
}

export default function StudentClassDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const classId = getClassId(params.id as string | string[] | undefined);
  const currentTab = isStudentClassTab(searchParams.get('view'))
    ? (searchParams.get('view') as StudentClassTab)
    : 'modules';

  const [loading, setLoading] = useState(true);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [attemptsByAssessment, setAttemptsByAssessment] = useState<Record<string, AssessmentAttempt[]>>({});
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentCategory>('all');

  const fetchPageData = useCallback(async () => {
    if (!classId) {
      setClassItem(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const classResponse = await classService.getById(classId);
      const classData = classResponse.data;

      const [modulesResponse, assessmentsResponse, announcementsResponse, schoolEventsResponse] =
        await Promise.all([
          moduleService.getByClass(classId).catch(() => ({ data: [] as ClassModule[] })),
          assessmentService
            .getByClass(classId, { page: 1, limit: 100, status: 'all' })
            .catch(() => ({ data: [] as Assessment[] })),
          announcementService
            .getByClass(classId, { limit: 50 })
            .catch(() => ({ data: [] as Announcement[] })),
          schoolEventService
            .getAll({ schoolYear: classData.schoolYear })
            .catch(() => ({ data: [] as SchoolEvent[] })),
        ]);

      let enrichedClass: ClassItem = classData;
      if ((!classData.enrollments || classData.enrollments.length === 0) && user?.id) {
        const studentClasses = await classService
          .getByStudent(user.id, 'all')
          .catch(() => ({ data: [] as ClassItem[] }));
        const matched = (studentClasses.data || []).find((entry) => entry.id === classId);
        if (matched?.enrollments?.length) {
          enrichedClass = { ...classData, enrollments: matched.enrollments };
        }
      }

      const publishedAssessments = (assessmentsResponse.data || []).filter((entry) => entry.isPublished);
      const attemptsEntries = await Promise.all(
        publishedAssessments.map(async (entry) => {
          const response = await assessmentService
            .getStudentAttempts(entry.id)
            .catch(() => ({ data: [] as AssessmentAttempt[] }));
          return [entry.id, response.data || []] as const;
        }),
      );

      setClassItem(enrichedClass);
      setModules(sortByDateAsc(modulesResponse.data || [], () => null).sort((a, b) => a.order - b.order));
      setAssessments(publishedAssessments);
      setAnnouncements(
        [...(announcementsResponse.data || [])].sort((left, right) => {
          if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
          const leftTs = new Date(left.createdAt || 0).getTime();
          const rightTs = new Date(right.createdAt || 0).getTime();
          return rightTs - leftTs;
        }),
      );
      setSchoolEvents(schoolEventsResponse.data || []);
      setAttemptsByAssessment(Object.fromEntries(attemptsEntries));
    } catch {
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setAnnouncements([]);
      setSchoolEvents([]);
      setAttemptsByAssessment({});
    } finally {
      setLoading(false);
    }
  }, [classId, user?.id]);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  const workspaceTabs = useMemo(
    () =>
      TABS.map((entry) => ({
        key: entry.key,
        label: entry.label,
        href: `/dashboard/student/classes/${classId}?view=${entry.key}`,
        icon: entry.icon,
        active: currentTab === entry.key,
      })),
    [classId, currentTab],
  );

  const assignmentRows = useMemo<AssignmentRow[]>(() => {
    const rows = assessments.map((assessment) => ({
      assessment,
      category: resolveAssignmentCategory(assessment),
    }));
    if (assignmentFilter === 'all') return rows;
    return rows.filter((entry) => entry.category === assignmentFilter);
  }, [assessments, assignmentFilter]);

  const gradeRows = useMemo<GradeRow[]>(() => {
    return assessments.map((assessment) => {
      const category = resolveAssignmentCategory(assessment);
      const attempts = attemptsByAssessment[assessment.id] || [];
      const latestSubmitted = getLatestSubmittedAttempt(attempts);
      const possiblePoints = latestSubmitted?.totalPoints ?? assessment.totalPoints ?? 0;
      const score = typeof latestSubmitted?.score === 'number' ? latestSubmitted.score : null;
      const percent =
        score !== null && possiblePoints > 0 ? Math.round((score / possiblePoints) * 100) : null;
      const submittedDate = parseDate(latestSubmitted?.submittedAt || latestSubmitted?.updatedAt);

      return {
        id: assessment.id,
        title: assessment.title,
        categoryLabel: assignmentCategoryLabel(category),
        scoreText: score === null ? 'Pending' : `${score}/${possiblePoints || '--'}`,
        percentText: score === null || percent === null ? '' : `(${percent}%)`,
        dateText: score === null ? formatDateLong(parseDate(assessment.dueDate)) : formatDateLong(submittedDate),
        isPending: score === null,
      };
    });
  }, [assessments, attemptsByAssessment]);

  const gradeSummary = useMemo(() => {
    const scoredRows = assessments
      .map((assessment) => {
        const attempts = attemptsByAssessment[assessment.id] || [];
        const latestSubmitted = getLatestSubmittedAttempt(attempts);
        const possible = latestSubmitted?.totalPoints ?? assessment.totalPoints ?? 0;
        const earned = typeof latestSubmitted?.score === 'number' ? latestSubmitted.score : null;
        if (earned === null || possible <= 0) return null;
        return { earned, possible };
      })
      .filter((entry): entry is { earned: number; possible: number } => entry !== null);

    const earnedTotal = scoredRows.reduce((sum, row) => sum + row.earned, 0);
    const possibleTotal = scoredRows.reduce((sum, row) => sum + row.possible, 0);
    const percent = possibleTotal > 0 ? Math.round((earnedTotal / possibleTotal) * 100) : 0;
    const tone = getScoreTone(percent);

    return {
      earnedTotal,
      possibleTotal,
      percent,
      tone,
      label:
        tone === 'outstanding'
          ? 'Outstanding'
          : tone === 'good'
            ? 'Good Standing'
            : tone === 'fair'
              ? 'Needs Attention'
              : 'At Risk',
      helper:
        tone === 'outstanding'
          ? 'On track'
          : tone === 'good'
            ? 'Stable progress'
            : tone === 'fair'
              ? 'Review upcoming assessments'
              : 'Immediate intervention needed',
    };
  }, [assessments, attemptsByAssessment]);

  const calendarRows = useMemo<CalendarRow[]>(() => {
    const rows: CalendarRow[] = [];

    for (const assessment of assessments) {
      const date = parseDate(assessment.dueDate);
      if (!date) continue;
      rows.push({
        id: `assessment-${assessment.id}`,
        kind: 'assessment',
        date,
        title: assessment.title,
        subtitle: classItem?.subjectName || 'Assessment',
      });
    }

    for (const event of schoolEvents) {
      const date = parseDate(event.startsAt);
      if (!date) continue;
      rows.push({
        id: `event-${event.id}`,
        kind: event.eventType === 'holiday_break' ? 'holiday' : 'event',
        date,
        title: event.title,
        subtitle: event.location || 'All',
      });
    }

    return rows.sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [assessments, classItem?.subjectName, schoolEvents]);

  const classmateRows = useMemo(() => getEnrollmentRows(classItem), [classItem]);
  const scheduleLabel = useMemo(() => formatScheduleLabel(classItem), [classItem]);

  if (loading) {
    return (
      <div className="student-class-workspace-loading">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (!classItem) {
    return (
      <section className="teacher-class-workspace__not-found">
        <p>Class not found.</p>
        <Link href="/dashboard/student/courses">Back to Courses</Link>
      </section>
    );
  }

  return (
    <ClassWorkspaceShell
      className="student-class-workspace"
      backHref="/dashboard/student/courses"
      backLabel={
        <>
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </>
      }
      icon={<BookOpen className="h-5 w-5" />}
      title={classItem.subjectName || classItem.className || 'Class'}
      subtitle={formatClassLine(classItem)}
      metaItems={[
        {
          key: 'schedule',
          icon: <Clock3 className="h-3.5 w-3.5" />,
          label: scheduleLabel,
        },
        {
          key: 'room',
          icon: <School className="h-3.5 w-3.5" />,
          label: classItem.room ? `Room ${classItem.room}` : 'Room TBA',
        },
        {
          key: 'modules',
          icon: <FolderOpen className="h-3.5 w-3.5" />,
          label: `${modules.length} module${modules.length === 1 ? '' : 's'}`,
        },
      ]}
      tabs={workspaceTabs}
    >
      {currentTab === 'modules' ? (
        <motion.section
          className="student-class-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <header className="student-class-panel__head">
            <h2>Course Modules</h2>
            <p>{modules.length} modules available</p>
          </header>

          {modules.length === 0 ? (
            <div className="teacher-class-workspace__empty">No modules available yet.</div>
          ) : (
            <div className="student-class-modules-grid">
              {modules.map((moduleEntry, index) => {
                const summary = summarizeModule(moduleEntry);
                const openHref = getOpenModuleHref(moduleEntry, classId);
                return (
                  <motion.article
                    key={moduleEntry.id}
                    className="student-class-module-card"
                    data-tone={moduleToneByIndex[index % moduleToneByIndex.length]}
                    data-locked={moduleEntry.isLocked}
                    variants={staggerItem}
                  >
                    <header>
                      <span className="student-class-module-card__index">{index + 1}</span>
                      <div>
                        <h3>{moduleEntry.title}</h3>
                        <p>{moduleEntry.description || 'Extended learning and higher-order thinking activities.'}</p>
                      </div>
                    </header>

                    <div className="student-class-module-card__stats">
                      <article>
                        <strong>{summary.lessons}</strong>
                        <span>Lessons</span>
                      </article>
                      <article>
                        <strong>{summary.assessments}</strong>
                        <span>Assessments</span>
                      </article>
                    </div>

                    <footer>
                      <span
                        className={
                          moduleEntry.isLocked
                            ? 'student-class-chip student-class-chip--locked'
                            : 'student-class-chip student-class-chip--open'
                        }
                      >
                        {moduleEntry.isLocked ? 'Locked' : 'Available'}
                      </span>
                      {moduleEntry.isLocked || !openHref ? (
                        <span className="student-class-module-card__cta muted">Locked</span>
                      ) : (
                        <Link className="student-class-module-card__cta" href={openHref}>
                          Open
                        </Link>
                      )}
                    </footer>
                  </motion.article>
                );
              })}
            </div>
          )}
        </motion.section>
      ) : null}

      {currentTab === 'assignments' ? (
        <motion.section
          className="student-class-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <header className="student-class-panel__head">
            <h2>Assignments</h2>
            <p>{assignmentRows.length} assignments</p>
          </header>

          <div className="student-class-filters">
            {ASSIGNMENT_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                data-active={assignmentFilter === filter.key}
                onClick={() => setAssignmentFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {assignmentRows.length === 0 ? (
            <div className="teacher-class-workspace__empty">No assignments for this filter.</div>
          ) : (
            <div className="student-class-stack">
              {assignmentRows.map(({ assessment, category }) => (
                <motion.article key={assessment.id} className="student-class-assignment-row" variants={staggerItem}>
                  <div className="student-class-assignment-row__icon">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="student-class-assignment-row__main">
                    <div className="student-class-assignment-row__chips">
                      <span data-type={category}>{assignmentCategoryLabel(category)}</span>
                      <span data-status="published">Published</span>
                    </div>
                    <h3>{assessment.title}</h3>
                    <p>
                      Due {formatDateLong(parseDate(assessment.dueDate))} · {assessment.totalPoints ?? 0} pts
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/student/assessments/${assessment.id}?classId=${classId}`}
                    className="student-class-assignment-row__take"
                  >
                    Take
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </motion.section>
      ) : null}

      {currentTab === 'announcements' ? (
        <motion.section
          className="student-class-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <header className="student-class-panel__head">
            <h2>Announcements</h2>
          </header>

          {announcements.length === 0 ? (
            <div className="teacher-class-workspace__empty">No announcements yet.</div>
          ) : (
            <div className="student-class-stack">
              {announcements.map((entry) => (
                <motion.article
                  key={entry.id}
                  className="student-class-announcement-card"
                  data-pinned={entry.isPinned}
                  variants={staggerItem}
                >
                  {entry.isPinned ? <span className="student-class-announcement-card__pin">Pinned</span> : null}
                  <h3>{entry.title}</h3>
                  <p>{entry.content}</p>
                  <small>
                    {entry.author?.firstName} {entry.author?.lastName} ·{' '}
                    {formatDateLong(parseDate(entry.createdAt || null))}
                  </small>
                </motion.article>
              ))}
            </div>
          )}
        </motion.section>
      ) : null}

      {currentTab === 'classmates' ? (
        <motion.section className="student-class-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <header className="student-class-panel__head">
            <h2>Classmates</h2>
            <p>{classmateRows.length} students in {classItem.section?.name || 'this class'}</p>
          </header>

          <div className="student-class-table-wrap">
            <table className="student-class-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Section</th>
                </tr>
              </thead>
              <tbody>
                {classmateRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="student-class-student-cell">
                        <span>{row.initials}</span>
                        <strong>{row.fullName}</strong>
                      </div>
                    </td>
                    <td>{row.email}</td>
                    <td>{row.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {classmateRows.length === 0 ? (
              <div className="teacher-class-workspace__empty">No classmates found.</div>
            ) : null}
          </div>
        </motion.section>
      ) : null}

      {currentTab === 'grades' ? (
        <motion.section className="student-class-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <header className="student-class-panel__head">
            <h2>My Grades</h2>
            <p>Grade breakdown for {classItem.subjectName}</p>
          </header>

          <article className="student-class-grade-summary" data-tone={gradeSummary.tone}>
            <div className="student-class-grade-summary__ring-wrap">
              <svg viewBox="0 0 42 42" className="student-class-grade-summary__ring" aria-hidden="true">
                <circle cx="21" cy="21" r="15.915" />
                <motion.circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  initial={{ strokeDasharray: '0 100' }}
                  animate={{ strokeDasharray: `${gradeSummary.percent} 100` }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </svg>
              <strong>{gradeSummary.percent}%</strong>
            </div>
            <div className="student-class-grade-summary__copy">
              <h3>{gradeSummary.label}</h3>
              <p>
                {Math.round(gradeSummary.earnedTotal)} / {Math.round(gradeSummary.possibleTotal)} total points
                earned
              </p>
              <span>{gradeSummary.helper}</span>
            </div>
          </article>

          <div className="student-class-table-wrap">
            <table className="student-class-table student-class-table--grades">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Category</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((row) => (
                  <tr key={row.id} data-pending={row.isPending}>
                    <td>{row.title}</td>
                    <td>
                      <span className="student-class-grade-tag">{row.categoryLabel}</span>
                    </td>
                    <td>
                      <strong>{row.scoreText}</strong>
                      {row.percentText ? <span>{row.percentText}</span> : null}
                    </td>
                    <td>{row.dateText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gradeRows.length === 0 ? (
              <div className="teacher-class-workspace__empty">No grade records yet.</div>
            ) : null}
          </div>
        </motion.section>
      ) : null}

      {currentTab === 'calendar' ? (
        <motion.section
          className="student-class-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <header className="student-class-panel__head">
            <h2>Class Calendar</h2>
            <p>Upcoming events and due dates for {classItem.subjectName}</p>
          </header>

          {calendarRows.length === 0 ? (
            <div className="teacher-class-workspace__empty">No upcoming events.</div>
          ) : (
            <div className="student-class-stack">
              {calendarRows.map((entry) => {
                const dayBadge = formatCalendarDay(entry.date);
                return (
                  <motion.article
                    key={entry.id}
                    className="student-class-calendar-row"
                    data-kind={entry.kind}
                    variants={staggerItem}
                  >
                    <div className="student-class-calendar-row__date">
                      <strong>{dayBadge.day}</strong>
                      <span>{dayBadge.month}</span>
                    </div>
                    <div className="student-class-calendar-row__copy">
                      <h3>{entry.title}</h3>
                      <p>{entry.subtitle}</p>
                    </div>
                    <span className="student-class-calendar-row__kind">
                      {entry.kind === 'assessment'
                        ? 'Assessment'
                        : entry.kind === 'holiday'
                          ? 'Holiday'
                          : 'Event'}
                    </span>
                  </motion.article>
                );
              })}
            </div>
          )}
        </motion.section>
      ) : null}
    </ClassWorkspaceShell>
  );
}
