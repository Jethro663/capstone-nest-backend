'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  BookText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  FolderOpen,
  Grid2X2,
  LayoutPanelTop,
  Megaphone,
  MessageSquare,
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
import { discussionBoardService } from '@/services/discussion-board-service';
import { ClassWorkspaceShell } from '@/components/class/workspace/ClassWorkspaceShell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import './student-class-detail.css';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';
import type { ClassItem, Enrollment } from '@/types/class';
import type { ClassModule } from '@/types/module';
import type { SchoolEvent } from '@/types/school-event';
import type { DiscussionThreadDetail, DiscussionThreadSummary } from '@/types/discussion';
import { getTeacherName } from '@/utils/helpers';
import { normalizeRichText } from '@/lib/rich-text';

type StudentClassTab =
  | 'modules'
  | 'assignments'
  | 'announcements'
  | 'discussion'
  | 'classmates'
  | 'grades'
  | 'calendar';
type AssignmentCategory =
  | 'upcoming'
  | 'past_due'
  | 'completed';
type GradeCategory =
  | 'written_work'
  | 'performance_task'
  | 'quarterly_assessment'
  | 'discussion';
type CalendarKind = 'assessment' | 'event' | 'holiday';
type ModuleCardView = 'card' | 'wide';
type StudentClassGuideScreen =
  | 'overview'
  | 'modules'
  | 'assignments'
  | 'updates'
  | 'classmates'
  | 'grades'
  | 'calendar';

interface AssignmentRow {
  assessment: Assessment;
  category: AssignmentCategory;
  href: string;
  dueDate: Date | null;
  latestSubmitted: AssessmentAttempt | null;
  submittedAttempts: number;
  isGraded: boolean;
  isOutOfAttempts: boolean;
}

interface GradeRow {
  id: string;
  title: string;
  category: GradeCategory;
  categoryLabel: string;
  scoreText: string;
  percentText: string;
  dueText: string;
  detailText: string;
  isPending: boolean;
  scoreValue: number | null;
  possiblePoints: number;
  percentValue: number | null;
  sortTime: number;
  statusLabel: string;
  statusTone: 'graded' | 'submitted' | 'pending';
  gradeTone: 'excellent' | 'good' | 'warning' | 'muted';
  actionHref: string;
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
  { key: 'discussion', label: 'Discussion Board', icon: MessageSquare },
  { key: 'classmates', label: 'Classmates', icon: Users },
  { key: 'grades', label: 'Grades', icon: FileSpreadsheet },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const ASSIGNMENT_FILTERS: Array<{ key: AssignmentCategory; label: string }> = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past_due', label: 'Past Due' },
  { key: 'completed', label: 'Completed' },
];
const MODULE_CARD_VIEW_STORAGE_KEY_PREFIX = 'nexora.student.class.modules.view';

const moduleToneByIndex = ['blue', 'green', 'violet'] as const;
const DEFAULT_MODULE_GRADIENT = 'oceanic-blue';
const MODULE_STOCK_IMAGES = [
  '/images/modules/module-stock-board.svg',
  '/images/modules/module-stock-library.svg',
  '/images/modules/module-stock-science.svg',
] as const;
const MODULE_GRADIENT_OPTIONS = [
  { id: 'oceanic-blue', label: 'Oceanic Blue', background: 'linear-gradient(135deg, #2b4fdd 0%, #3c62f0 100%)' },
  { id: 'emerald-wave', label: 'Emerald Wave', background: 'linear-gradient(135deg, #089f79 0%, #10b78f 100%)' },
  { id: 'violet-burst', label: 'Violet Burst', background: 'linear-gradient(135deg, #7f22f0 0%, #9a44f6 100%)' },
  { id: 'sunset-orange', label: 'Sunset Orange', background: 'linear-gradient(135deg, #d76a1f 0%, #f08d2d 100%)' },
  { id: 'rose-dusk', label: 'Rose Dusk', background: 'linear-gradient(135deg, #d42756 0%, #ef5f87 100%)' },
  { id: 'slate-night', label: 'Slate Night', background: 'linear-gradient(135deg, #1d304f 0%, #2e4a73 100%)' },
] as const;
const studentClassGuidePages: Array<{
  title: string;
  description: string;
  screen: StudentClassGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'caution';
  }>;
}> = [
  {
    title: 'Start here on the class page',
    description:
      'This page is the home for one subject. The top area shows your class details, and the tabs below open each part of the class.',
    screen: 'overview',
    reminder: 'Simple rule: pick the tab that matches what you need before scrolling too far down.',
    steps: [
      {
        action: 'Read',
        body: 'Check the subject title, teacher line, schedule, room, and module count first.',
      },
      {
        action: 'Move tabs',
        body: 'Use the tab row to switch between modules, assignments, announcements, discussion, classmates, grades, and calendar.',
      },
      {
        action: 'Go back',
        body: 'Use Back to Courses when you want to return to your full class list.',
      },
      {
        action: 'Open help',
        body: 'Tap the question mark button if you want this guide again at any time.',
      },
    ],
  },
  {
    title: 'Open modules to study step by step',
    description:
      'The Modules tab is where you open the main learning content for this class. Each card shows what is inside before you open it.',
    screen: 'modules',
    reminder: 'If you are not sure where to continue, start with the first available module.',
    steps: [
      {
        action: 'Check',
        body: 'Read the module title, short description, lesson count, assessment count, and progress first.',
      },
      {
        action: 'Switch view',
        body: 'Use Grid View or Wide Card View to choose the layout that is easier for you to read.',
      },
      {
        action: 'Watch status',
        body: 'Available means you can open it now. Locked means it is not ready for you yet.',
      },
      {
        action: 'Open',
        body: 'Use the Open link or the module card itself to enter that module.',
      },
    ],
  },
  {
    title: 'Use assignments to find class work fast',
    description:
      'The Assignments tab groups your class work by timing and completion, so you can quickly spot what is coming next, what is overdue, and what you already finished.',
    screen: 'assignments',
    reminder: 'Best habit: check the due status first, then open the assignment row itself.',
    steps: [
      {
        action: 'Switch tabs',
        body: 'Use Upcoming, Past Due, or Completed to focus on the right set of assignments first.',
      },
      {
        action: 'Read',
        body: 'Each row shows the task title, due date, points, and small status tags like Graded or Out of Attempts.',
      },
      {
        action: 'Open row',
        body: 'Tap the assignment body itself when you are ready to open that assessment.',
      },
      {
        action: 'Watch out',
        body: 'If the due date is close, finish that task first so you do not miss it.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Check updates and join class discussions',
    description:
      'Announcements and Discussion help you stay updated and talk inside the class. One is for notices, and the other is for active threads.',
    screen: 'updates',
    reminder: 'Read pinned updates first because they are usually the most important.',
    steps: [
      {
        action: 'Read announcements',
        body: 'Open the Announcements tab for teacher notices, reminders, and class news.',
      },
      {
        action: 'Open threads',
        body: 'Use the Discussion Board tab when you want to read or join a conversation.',
      },
      {
        action: 'Post carefully',
        body: 'If comments are open, write clearly and upload only class-related images or replies.',
      },
      {
        action: 'React',
        body: 'Use the thread reactions only when they match what you really want to say.',
      },
    ],
  },
  {
    title: 'Use classmates when you need names and section info',
    description:
      'The Classmates tab is a simple class list. It helps you check who is in the class and which section the class belongs to.',
    screen: 'classmates',
    reminder: 'This tab is for viewing classmate details, not for editing them.',
    steps: [
      {
        action: 'Look',
        body: 'Read the student name first, then the email and section columns.',
      },
      {
        action: 'Match',
        body: 'Use the initials bubble to quickly match the row to the student name.',
      },
      {
        action: 'Confirm',
        body: 'If you need to make sure someone is in the class, this is the best tab to check.',
      },
    ],
  },
  {
    title: 'Read grades as your class record snapshot',
    description:
      'The Grades tab turns your class record into a simpler view, so you can track overall standing, category averages, and each scored item.',
    screen: 'grades',
    reminder: 'If a score is still pending, wait for teacher checking before expecting a final number.',
    steps: [
      {
        action: 'Start',
        body: 'Look at the big class record summary first to see your overall standing in the class.',
      },
      {
        action: 'Compare',
        body: 'Read the category cards to see which grading area is strongest and which one needs work.',
      },
      {
        action: 'Check rows',
        body: 'Use the assessment ledger to read every score and the date it belongs to.',
      },
      {
        action: 'Be patient',
        body: 'Pending rows mean the task is not fully graded yet.',
      },
    ],
  },
  {
    title: 'Use the class calendar for due dates and events',
    description:
      'The Calendar tab mixes assessments and school events into one list so you can see what is coming up for this class.',
    screen: 'calendar',
    reminder: 'Check this tab often before a busy week so you do not miss class deadlines.',
    steps: [
      {
        action: 'Read date',
        body: 'The day badge on the left tells you exactly when the event or assessment happens.',
      },
      {
        action: 'Read kind',
        body: 'The tag on the right shows whether the row is an Assessment, Event, or Holiday.',
      },
      {
        action: 'Match details',
        body: 'Use the title and small subtitle to know what the row is about.',
      },
    ],
  },
];

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

function StudentClassGuideBuddy({
  src,
  alt,
  label,
  tip,
}: {
  src: string;
  alt: string;
  label: string;
  tip: string;
}) {
  return (
    <div className="student-class-guide-shell__ja-tip">
      <div className="student-class-guide-shell__ja-image">
        <Image src={src} alt={alt} fill sizes="72px" className="object-contain" />
      </div>
      <div className="student-class-guide-shell__ja-copy">
        <small>{label}</small>
        <strong>{tip}</strong>
      </div>
    </div>
  );
}

function StudentClassGuideScreenshot({ screen }: { screen: StudentClassGuideScreen }) {
  if (screen === 'overview') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
        <div className="student-class-guide-shell">
          <div className="student-class-guide-shell__hero">
            <div className="student-class-guide-shell__hero-copy">
              <small>Class page</small>
              <strong>Mathematics 7</strong>
              <p>Grade 7 - Section A - Mrs. Cruz</p>
            </div>
            <div className="student-class-guide-shell__hero-actions">
              <span>Back to Courses</span>
              <b>?</b>
            </div>
          </div>

          <div className="student-class-guide-shell__meta-row">
            <span>MON/WED 8:00 AM - 9:00 AM</span>
            <span>Room 402</span>
            <span>6 modules</span>
          </div>

          <div className="student-class-guide-shell__tabs">
            <b>Modules</b>
            <span>Assignments</span>
            <span>Announcements</span>
            <span>Discussion Board</span>
            <span>Classmates</span>
            <span>Grades</span>
            <span>Calendar</span>
          </div>

          <StudentClassGuideBuddy
            src="/images/JA/ja_wave.png"
            alt="JA waving beside the class guide"
            label="JA says"
            tip="This one page holds almost everything for one subject."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-tabs">
          Class tabs
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-help">
          Help button
        </em>
      </div>
    );
  }

  if (screen === 'modules') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
        <div className="student-class-guide-shell">
          <div className="student-class-guide-shell__panel-head">
            <div>
              <small>Modules</small>
              <strong>Course Modules</strong>
            </div>
            <div className="student-class-guide-shell__view-toggle">
              <span>Grid</span>
              <b>Wide</b>
            </div>
          </div>

          <div className="student-class-guide-shell__module-grid">
            <article>
              <header>
                <span>1</span>
                <div>
                  <strong>Numbers and Patterns</strong>
                  <p>Core lessons and first checks.</p>
                </div>
              </header>
              <div className="student-class-guide-shell__module-stats">
                <i>4 Lessons</i>
                <i>2 Assessments</i>
                <i>70% Progress</i>
              </div>
              <footer>
                <small>Available</small>
                <b>Open</b>
              </footer>
            </article>
          </div>

          <StudentClassGuideBuddy
            src="/images/JA/ja_cheer.png"
            alt="JA cheering beside modules"
            label="Quick tip"
            tip="Use the status and progress before choosing which module to open."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-view">
          View switch
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-module">
          Module card
        </em>
      </div>
    );
  }

  if (screen === 'assignments') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
        <div className="student-class-guide-shell">
          <div className="student-class-guide-shell__filter-row">
            <b>Upcoming</b>
            <span>Past Due</span>
            <span>Completed</span>
          </div>

          <div className="student-class-guide-shell__assignment-list">
            <article>
              <div>
                <small>Out of Attempts</small>
                <strong>Seatwork 1</strong>
                <p>Due Apr 10, 2026 - 20 pts</p>
              </div>
            </article>
            <article>
              <div>
                <small>Graded</small>
                <strong>Poster Activity</strong>
                <p>Due Apr 12, 2026 - 40 pts</p>
              </div>
            </article>
          </div>

          <StudentClassGuideBuddy
            src="/images/JA/ja_thinking.png"
            alt="JA thinking beside assignments"
            label="JA says"
            tip="Filter first if you only want one kind of task."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-filter">
          Due tabs
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-take">
          Assignment row
        </em>
      </div>
    );
  }

  if (screen === 'updates') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
        <div className="student-class-guide-shell">
          <div className="student-class-guide-shell__update-grid">
            <article>
              <small>Announcements</small>
              <strong>Science Fair Reminder</strong>
              <p>Bring your materials this Friday.</p>
              <i>Pinned</i>
            </article>
            <article>
              <small>Discussion Board</small>
              <strong>Quadratic Formula Questions</strong>
              <p>8 comments - published</p>
              <b>Open Thread</b>
            </article>
          </div>

          <div className="student-class-guide-shell__reaction-row">
            <span>Like 2</span>
            <span>Heart 1</span>
            <span>Wow 0</span>
          </div>

          <StudentClassGuideBuddy
            src="/images/JA/ja_wave.png"
            alt="JA waving beside class updates"
            label="Friendly reminder"
            tip="Pinned notices and open threads usually matter most."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-announcement">
          Announcement
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-thread">
          Discussion thread
        </em>
      </div>
    );
  }

  if (screen === 'classmates') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
        <div className="student-class-guide-shell">
          <div className="student-class-guide-shell__table">
            <div className="student-class-guide-shell__table-head">
              <strong>Student</strong>
              <strong>Email</strong>
              <strong>Section</strong>
            </div>
            <div className="student-class-guide-shell__table-row">
              <span className="is-badge">LN</span>
              <b>Liam Navarro</b>
              <i>student71@lms.local</i>
              <u>Grade 10 - Rizal</u>
            </div>
            <div className="student-class-guide-shell__table-row">
              <span className="is-badge">MV</span>
              <b>Mia Villanueva</b>
              <i>student72@lms.local</i>
              <u>Grade 10 - Rizal</u>
            </div>
          </div>

          <StudentClassGuideBuddy
            src="/images/JA/ja_cheer.png"
            alt="JA cheering beside classmates"
            label="JA says"
            tip="Use this tab when you need to confirm who is in the class."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-classmate">
          Student row
        </em>
      </div>
    );
  }

  if (screen === 'grades') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
        <div className="student-class-guide-shell">
          <div className="student-class-guide-shell__grade-summary">
            <div className="student-class-guide-shell__grade-ring">88%</div>
            <div>
              <small>Class Record Snapshot</small>
              <strong>Stable progress</strong>
              <p>44 / 50 total points earned</p>
            </div>
          </div>

          <div className="student-class-guide-shell__grade-cards">
            <article>
              <small>Written Work</small>
              <strong>90%</strong>
            </article>
            <article>
              <small>Performance Task</small>
              <strong>85%</strong>
            </article>
            <article>
              <small>Quarterly Assessment</small>
              <strong>88%</strong>
            </article>
          </div>

          <div className="student-class-guide-shell__ledger-row">
            <div>
              <small>Written Work</small>
              <strong>Seatwork 1</strong>
              <p>Apr 10, 2026</p>
            </div>
            <b>18 / 20</b>
          </div>

          <StudentClassGuideBuddy
            src="/images/JA/ja_thinking.png"
            alt="JA thinking beside grades"
            label="Quick tip"
            tip="Read the big summary first, then check the category cards and ledger."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-summary">
          Grade summary
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-ledger">
          Ledger row
        </em>
      </div>
    );
  }

  return (
    <div className="teacher-intervention-workspace__manual-shot student-class-guide-shot">
      <div className="student-class-guide-shell">
        <div className="student-class-guide-shell__calendar-list">
          <article>
            <span>
              <b>15</b>
              <small>MAY</small>
            </span>
            <div>
              <strong>Quarter Exam</strong>
              <p>Mathematics 7</p>
            </div>
            <i>Assessment</i>
          </article>
          <article>
            <span>
              <b>16</b>
              <small>MAY</small>
            </span>
            <div>
              <strong>Midyear Break</strong>
              <p>All students</p>
            </div>
            <i>Holiday</i>
          </article>
        </div>

        <StudentClassGuideBuddy
          src="/images/JA/ja_wave.png"
          alt="JA waving beside the class calendar"
          label="JA says"
          tip="The date badge and kind tag help you read this list quickly."
        />
      </div>

      <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-date">
        Date badge
      </em>
      <em className="teacher-intervention-workspace__manual-pin student-class-guide-pin is-student-class-guide-kind">
        Kind tag
      </em>
    </div>
  );
}

function isStudentClassTab(value: string | null): value is StudentClassTab {
  return (
    value === 'modules' ||
    value === 'assignments' ||
    value === 'announcements' ||
    value === 'discussion' ||
    value === 'classmates' ||
    value === 'grades' ||
    value === 'calendar'
  );
}

const RichTextRenderer = dynamic(
  () =>
    import('@/components/shared/rich-text/RichTextRenderer').then(
      (mod) => mod.RichTextRenderer,
    ),
  {
    loading: () => <Skeleton className="h-16 w-full rounded-xl" />,
  },
);

const RichTextEditor = dynamic(
  () =>
    import('@/components/shared/rich-text/RichTextEditor').then(
      (mod) => mod.RichTextEditor,
    ),
  {
    loading: () => <Skeleton className="h-16 w-full rounded-xl" />,
  },
);

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
  return `Grade ${gradeLevel} - ${sectionName} - ${teacherName}`;
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

function getModuleGradient(gradientId?: string) {
  return (
    MODULE_GRADIENT_OPTIONS.find((option) => option.id === gradientId)?.background ||
    MODULE_GRADIENT_OPTIONS.find((option) => option.id === DEFAULT_MODULE_GRADIENT)?.background ||
    MODULE_GRADIENT_OPTIONS[0].background
  );
}

function resolveAssignmentCategory(assessment: Assessment): GradeCategory {
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

function assignmentCategoryLabel(category: 'written_work' | 'performance_task' | 'quarterly_assessment' | 'discussion') {
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

function formatScoreNumber(value: number | null) {
  if (value === null) return '--';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatStudentName(student?: Enrollment['student']) {
  const parts = [student?.firstName, student?.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unnamed student';
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
    const firstName = enrollment.student?.firstName?.trim() || '';
    const lastName = enrollment.student?.lastName?.trim() || '';
    const fullName = formatStudentName(enrollment.student);
    const initials = [firstName.charAt(0), lastName.charAt(0)]
      .filter(Boolean)
      .join('')
      .toUpperCase();
    return {
      id: enrollment.id,
      fullName,
      email: enrollment.student?.email?.trim() || '--',
      section: sectionLabel,
      initials: initials || 'NA',
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

function getSubmittedAttemptCount(attempts: AssessmentAttempt[]) {
  return attempts.filter((attempt) => attempt.isSubmitted).length;
}

function isAssessmentGraded(attempt: AssessmentAttempt | null) {
  if (!attempt) return false;
  return Boolean(
    attempt.isReturned ||
    attempt.returnedAt ||
    typeof attempt.score === 'number' ||
    typeof attempt.directScore === 'number',
  );
}

function getScoreTone(percent: number) {
  if (percent >= 90) return 'outstanding';
  if (percent >= 80) return 'good';
  if (percent >= 70) return 'fair';
  return 'at-risk';
}

function getOpenModuleHref(moduleEntry: ClassModule, classId: string) {
  return `/dashboard/student/classes/${classId}/modules/${moduleEntry.id}`;
}

function sortDiscussionThreads(threads: DiscussionThreadSummary[]) {
  return [...threads].sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    const leftTs = new Date(left.publishedAt || left.createdAt || 0).getTime();
    const rightTs = new Date(right.publishedAt || right.createdAt || 0).getTime();
    return rightTs - leftTs;
  });
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
  const [discussionThreads, setDiscussionThreads] = useState<DiscussionThreadSummary[]>([]);
  const [selectedDiscussionThreadId, setSelectedDiscussionThreadId] = useState<string | null>(null);
  const [selectedDiscussionThread, setSelectedDiscussionThread] = useState<DiscussionThreadDetail | null>(null);
  const [discussionCommentBody, setDiscussionCommentBody] = useState('');
  const [discussionCommentImages, setDiscussionCommentImages] = useState<File[]>([]);
  const [discussionSubmitting, setDiscussionSubmitting] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [attemptsByAssessment, setAttemptsByAssessment] = useState<Record<string, AssessmentAttempt[]>>({});
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentCategory>('upcoming');
  const [moduleCardView, setModuleCardView] = useState<ModuleCardView>('wide');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const fetchPageData = useCallback(async () => {
    if (!classId) {
      setClassItem(null);
      setForbiddenMessage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setForbiddenMessage(null);
      const shouldLoadFullClassData = currentTab !== 'discussion';

      const classResponse = await classService.getById(classId);
      const classData = classResponse.data;

      const [modulesResponse, assessmentsResponse, announcementsResponse, schoolEventsResponse] =
        await Promise.all([
          shouldLoadFullClassData
            ? moduleService.getByClass(classId).catch(() => ({ data: [] as ClassModule[] }))
            : Promise.resolve({ data: [] as ClassModule[] }),
          shouldLoadFullClassData
            ? assessmentService
                .getByClass(classId, { page: 1, limit: 100, status: 'all' })
                .catch(() => ({ data: [] as Assessment[] }))
            : Promise.resolve({ data: [] as Assessment[] }),
          shouldLoadFullClassData
            ? announcementService
                .getByClass(classId, { limit: 50 })
                .catch(() => ({ data: [] as Announcement[] }))
            : Promise.resolve({ data: [] as Announcement[] }),
          shouldLoadFullClassData
            ? schoolEventService
                .getAll({ schoolYear: classData.schoolYear })
                .catch(() => ({ data: [] as SchoolEvent[] }))
            : Promise.resolve({ data: [] as SchoolEvent[] }),
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

      const publishedAssessments = shouldLoadFullClassData
        ? (assessmentsResponse.data || []).filter((entry) => entry.isPublished)
        : [];
      const attemptsEntries = shouldLoadFullClassData
        ? await Promise.all(
            publishedAssessments.map(async (entry) => {
              const response = await assessmentService
                .getStudentAttempts(entry.id)
                .catch(() => ({ data: [] as AssessmentAttempt[] }));
              return [entry.id, response.data || []] as const;
            }),
          )
        : [];

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
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status ?? null;
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        null;
      if (status === 403) {
        setForbiddenMessage(message || 'You do not have access to this class.');
      }
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setAnnouncements([]);
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
      setSchoolEvents([]);
      setAttemptsByAssessment({});
    } finally {
      setLoading(false);
    }
  }, [classId, currentTab, user?.id]);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  const loadDiscussionThreads = useCallback(async () => {
    if (!classId) {
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
      return;
    }

    try {
      const response = await discussionBoardService.listThreads(classId, { limit: 50 });
      setDiscussionThreads(sortDiscussionThreads(response.data.items || []));
    } catch {
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
    }
  }, [classId]);

  useEffect(() => {
    if (currentTab !== 'discussion') return;
    void loadDiscussionThreads();
  }, [currentTab, loadDiscussionThreads]);

  useEffect(() => {
    if (!classId) return;
    const storageKey = `${MODULE_CARD_VIEW_STORAGE_KEY_PREFIX}.${classId}`;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'wide' || saved === 'card') {
      setModuleCardView(saved);
      return;
    }
    if (saved === 'long') {
      setModuleCardView('wide');
      return;
    }
    if (saved === 'compact') {
      setModuleCardView('card');
    }
  }, [classId]);

  const setPersistedModuleCardView = useCallback(
    (view: ModuleCardView) => {
      setModuleCardView(view);
      if (!classId) return;
      const storageKey = `${MODULE_CARD_VIEW_STORAGE_KEY_PREFIX}.${classId}`;
      window.localStorage.setItem(storageKey, view);
    },
    [classId],
  );

  const loadSelectedDiscussionThread = useCallback(
    async (threadId: string) => {
      try {
        const response = await discussionBoardService.getThread(classId, threadId);
        setSelectedDiscussionThread(response.data);
      } catch {
        setSelectedDiscussionThread(null);
      }
    },
    [classId],
  );

  useEffect(() => {
    if (!selectedDiscussionThreadId) {
      setSelectedDiscussionThread(null);
      return;
    }
    void loadSelectedDiscussionThread(selectedDiscussionThreadId);
  }, [loadSelectedDiscussionThread, selectedDiscussionThreadId]);

  const handleSubmitDiscussionComment = useCallback(async () => {
    if (!selectedDiscussionThread || discussionSubmitting) return;
    const safeBody = normalizeRichText(discussionCommentBody).trim();
    if (!safeBody && discussionCommentImages.length === 0) return;

    try {
      setDiscussionSubmitting(true);
      const uploads = await Promise.all(
        discussionCommentImages.map((file) =>
          discussionBoardService.uploadCommentImage(
            classId,
            selectedDiscussionThread.id,
            file,
          ),
        ),
      );
      const attachmentFileIds = uploads.map((entry) => entry.data.id);
      await discussionBoardService.createComment(classId, selectedDiscussionThread.id, {
        bodyHtml: safeBody || undefined,
        attachmentFileIds,
      });
      setDiscussionCommentBody('');
      setDiscussionCommentImages([]);
      await loadSelectedDiscussionThread(selectedDiscussionThread.id);
      await loadDiscussionThreads();
    } finally {
      setDiscussionSubmitting(false);
    }
  }, [
    classId,
    discussionCommentBody,
    discussionCommentImages,
    discussionSubmitting,
    loadDiscussionThreads,
    loadSelectedDiscussionThread,
    selectedDiscussionThread,
  ]);

  const handleDeleteDiscussionComment = useCallback(
    async (commentId: string) => {
      if (!selectedDiscussionThread) return;
      await discussionBoardService.deleteComment(
        classId,
        selectedDiscussionThread.id,
        commentId,
      );
      await loadSelectedDiscussionThread(selectedDiscussionThread.id);
      await loadDiscussionThreads();
    },
    [classId, loadDiscussionThreads, loadSelectedDiscussionThread, selectedDiscussionThread],
  );

  const handleToggleDiscussionReaction = useCallback(
    async (commentId: string, reactionType: 'like' | 'heart' | 'wow') => {
      if (!selectedDiscussionThread) return;
      const comment = selectedDiscussionThread.comments.find(
        (entry) => entry.id === commentId,
      );
      if (!comment) return;

      if (comment.reactions.userReaction === reactionType) {
        await discussionBoardService.removeReaction(
          classId,
          selectedDiscussionThread.id,
          commentId,
        );
      } else {
        await discussionBoardService.setReaction(
          classId,
          selectedDiscussionThread.id,
          commentId,
          reactionType,
        );
      }
      await loadSelectedDiscussionThread(selectedDiscussionThread.id);
    },
    [classId, loadSelectedDiscussionThread, selectedDiscussionThread],
  );

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
    const now = new Date();
    const rows = assessments.map((assessment) => {
      const attempts = attemptsByAssessment[assessment.id] || [];
      const latestSubmitted = getLatestSubmittedAttempt(attempts);
      const submittedAttempts = getSubmittedAttemptCount(attempts);
      const dueDate = parseDate(assessment.dueDate);
      const closesWhenDue = assessment.closeWhenDue ?? true;
      const isCompleted = Boolean(latestSubmitted);
      const isPastDue = Boolean(
        !isCompleted &&
        closesWhenDue &&
        dueDate &&
        dueDate.getTime() < now.getTime(),
      );
      const isOutOfAttempts =
        assessment.type === 'file_upload'
          ? false
          : submittedAttempts >= (assessment.maxAttempts ?? 1);

      return {
        assessment,
        category: isCompleted ? 'completed' : isPastDue ? 'past_due' : 'upcoming',
        href: `/dashboard/student/assessments/${assessment.id}?classId=${classId}`,
        dueDate,
        latestSubmitted,
        submittedAttempts,
        isGraded: isAssessmentGraded(latestSubmitted),
        isOutOfAttempts,
      } satisfies AssignmentRow;
    });

    const filteredRows = rows.filter((entry) => entry.category === assignmentFilter);
    return filteredRows.sort((left, right) => {
      if (assignmentFilter === 'completed') {
        const leftTime = new Date(
          left.latestSubmitted?.submittedAt ||
            left.latestSubmitted?.updatedAt ||
            left.latestSubmitted?.createdAt ||
            0,
        ).getTime();
        const rightTime = new Date(
          right.latestSubmitted?.submittedAt ||
            right.latestSubmitted?.updatedAt ||
            right.latestSubmitted?.createdAt ||
            0,
        ).getTime();
        return rightTime - leftTime;
      }

      const leftTime = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return assignmentFilter === 'past_due' ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [assessments, assignmentFilter, attemptsByAssessment, classId]);

  const gradeRows = useMemo<GradeRow[]>(() => {
    return assessments
      .map((assessment) => {
        const category = resolveAssignmentCategory(assessment);
        const attempts = attemptsByAssessment[assessment.id] || [];
        const submittedAttempts = attempts.filter((attempt) => attempt.isSubmitted);
        const latestSubmitted = getLatestSubmittedAttempt(attempts);
        const possiblePoints = latestSubmitted?.totalPoints ?? assessment.totalPoints ?? 0;
        const score = typeof latestSubmitted?.score === 'number' ? latestSubmitted.score : null;
        const percent =
          score !== null && possiblePoints > 0 ? Math.round((score / possiblePoints) * 100) : null;
        const submittedDate = parseDate(latestSubmitted?.submittedAt || latestSubmitted?.updatedAt);
        const dueDate = parseDate(assessment.dueDate);
        const sortTime = (submittedDate || dueDate)?.getTime() ?? 0;
        const submittedCount = submittedAttempts.length;
        const statusLabel =
          score !== null ? 'Graded' : latestSubmitted ? 'Submitted' : 'Pending';
        const statusTone: GradeRow['statusTone'] =
          score !== null ? 'graded' : latestSubmitted ? 'submitted' : 'pending';
        const gradeTone: GradeRow['gradeTone'] =
          score === null || percent === null
            ? 'muted'
            : percent >= 90
              ? 'excellent'
              : percent >= 75
                ? 'good'
                : 'warning';

        return {
          id: assessment.id,
          title: assessment.title,
          category,
          categoryLabel: assignmentCategoryLabel(category),
          scoreText:
            score === null
              ? 'Not graded'
              : `${formatScoreNumber(score)} / ${possiblePoints || '--'}`,
          percentText: score === null || percent === null ? '' : `${percent}%`,
          dueText: formatDateLong(dueDate),
          detailText:
            submittedCount > 0
              ? `${submittedCount} attempt${submittedCount === 1 ? '' : 's'} submitted`
              : `${assessment.totalPoints ?? 0} pts available`,
          isPending: score === null,
          scoreValue: score,
          possiblePoints,
          percentValue: percent,
          sortTime,
          statusLabel,
          statusTone,
          gradeTone,
          actionHref: `/dashboard/student/assessments/${assessment.id}?classId=${classId}`,
        };
      })
      .sort((left, right) => right.sortTime - left.sortTime);
  }, [assessments, attemptsByAssessment, classId]);

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
  const activeGuidePage = studentClassGuidePages[helpPage] ?? studentClassGuidePages[0];

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
        <p>{forbiddenMessage || 'Class not found.'}</p>
        <Link href="/dashboard/student/courses">Back to Courses</Link>
      </section>
    );
  }

  return (
    <>
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
        heroActions={
          <Button
            type="button"
            variant="outline"
            className="student-class-help-button"
            aria-label="Class page help"
            onClick={() => {
              setHelpPage(0);
              setHelpOpen(true);
            }}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
        }
      >
      {currentTab === 'modules' ? (
        <motion.section
          className="student-class-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <header className="student-class-panel__head student-class-panel__head--modules">
            <div>
              <h2>Course Modules</h2>
              <p>{modules.length} modules available</p>
            </div>
            <div className="teacher-home-view-toggle" role="group" aria-label="Module view style">
              <button
                type="button"
                data-active={moduleCardView === 'card'}
                aria-label="Grid View"
                title="Grid View"
                onClick={() => setPersistedModuleCardView('card')}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-active={moduleCardView === 'wide'}
                aria-label="Wide Card View"
                title="Wide Card View"
                onClick={() => setPersistedModuleCardView('wide')}
              >
                <LayoutPanelTop className="h-4 w-4" />
              </button>
            </div>
          </header>

          {modules.length === 0 ? (
            <div className="teacher-class-workspace__empty">No modules available yet.</div>
          ) : (
            <div className="student-class-modules-grid" data-view={moduleCardView}>
              {modules.map((moduleEntry, index) => {
                const summary = summarizeModule(moduleEntry);
                const openHref = getOpenModuleHref(moduleEntry, classId);
                const mediaSource =
                  moduleEntry.coverImageUrl ||
                  MODULE_STOCK_IMAGES[index % MODULE_STOCK_IMAGES.length];
                const gradientBackground = getModuleGradient(moduleEntry.gradientId);
                const imagePositionX = moduleEntry.imagePositionX ?? 50;
                const imagePositionY = moduleEntry.imagePositionY ?? 50;
                const imageScale = moduleEntry.imageScale ?? 120;
                return (
                  <motion.article
                    key={moduleEntry.id}
                    className="student-class-module-card"
                    data-tone={moduleToneByIndex[index % moduleToneByIndex.length]}
                    data-locked={moduleEntry.isLocked}
                    data-view={moduleCardView}
                    variants={staggerItem}
                  >
                    <Link
                      href={openHref}
                      className="student-class-module-card__body-link"
                      aria-label={`Open ${moduleEntry.title} module`}
                    >
                      <div className="student-class-module-card__media-wrap">
                        <div
                          className="student-class-module-card__media"
                          style={{
                            backgroundImage: `linear-gradient(120deg, rgba(8, 23, 44, 0.26), rgba(8, 23, 44, 0.12)), url(${mediaSource})`,
                            backgroundSize: `${imageScale}%`,
                            backgroundPosition: `${imagePositionX}% ${imagePositionY}%`,
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#f1f5fb',
                          }}
                        >
                          <div
                            className="student-class-module-card__media-gradient"
                            style={{ background: gradientBackground }}
                          />
                        </div>
                      </div>

                      <div className="student-class-module-card__content">
                        <header>
                          <span className="student-class-module-card__index">{index + 1}</span>
                          <div className="student-class-module-card__copy">
                          <h3>{moduleEntry.title}</h3>
                            {moduleEntry.isCoreTemplateAsset ? (
                              <span className="student-class-module-card__pill">Core Module</span>
                            ) : null}
                            {moduleEntry.description ? (
                              <RichTextRenderer html={moduleEntry.description} />
                            ) : null}
                          </div>
                        </header>

                        <div className="student-class-module-card__stats">
                          <article>
                            <BookText className="h-3.5 w-3.5" />
                            <strong>{summary.lessons}</strong>
                            <span>Lessons</span>
                          </article>
                          <article>
                            <ClipboardList className="h-3.5 w-3.5" />
                            <strong>{summary.assessments}</strong>
                            <span>Assessments</span>
                          </article>
                          <article>
                            <strong>{moduleEntry.progressPercent ?? 0}%</strong>
                            <span>Progress</span>
                          </article>
                        </div>
                      </div>
                    </Link>

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
                      <Link className="student-class-module-card__cta" href={openHref}>
                        Open
                      </Link>
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
            <div key={assignmentFilter} className="student-class-stack">
              {assignmentRows.map((row) => (
                <Link
                  key={row.assessment.id}
                  href={row.href}
                  className="student-class-assignment-row student-class-assignment-row__body"
                >
                    <div className="student-class-assignment-row__icon">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="student-class-assignment-row__main">
                      <div className="student-class-assignment-row__chips">
                        {row.isGraded ? <span data-status="graded">Graded</span> : null}
                        {row.isOutOfAttempts ? <span data-status="attempts">Out of Attempts</span> : null}
                        {!row.isGraded && row.category === 'completed' ? <span data-status="submitted">Submitted</span> : null}
                      </div>
                      <h3>{row.assessment.title}</h3>
                      <p>
                        Due {formatDateLong(row.dueDate)} - {row.assessment.totalPoints ?? 0} pts
                      </p>
                    </div>
                </Link>
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
                    <RichTextRenderer html={normalizeRichText(entry.content)} />
                    <small>
                      {entry.author?.firstName} {entry.author?.lastName} -{' '}
                      {formatDateLong(parseDate(entry.createdAt || null))}
                  </small>
                </motion.article>
              ))}
            </div>
          )}
        </motion.section>
      ) : null}

      {currentTab === 'discussion' ? (
        <motion.section
          className="student-class-panel"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <header className="student-class-panel__head">
            <h2>Discussion Board</h2>
            <p>{discussionThreads.length} active thread{discussionThreads.length === 1 ? '' : 's'}</p>
          </header>

          {discussionThreads.length === 0 ? (
            <div className="teacher-class-workspace__empty">No discussion threads yet.</div>
          ) : (
            <div className="student-class-stack">
              {discussionThreads.map((thread) => (
                <motion.article
                  key={thread.id}
                  className="student-class-announcement-card"
                  data-pinned={thread.isPinned}
                  variants={staggerItem}
                >
                  {thread.isPinned ? <span className="student-class-announcement-card__pin">Pinned</span> : null}
                  <h3>{thread.title}</h3>
                  <RichTextRenderer html={thread.bodyHtml} />
                  <small>
                    {thread.commentCount} comments • {thread.status}
                  </small>
                  <div className="student-class-assignment-row__chips">
                    <button
                      type="button"
                      className="student-class-assignment-row__take"
                      onClick={() => setSelectedDiscussionThreadId(thread.id)}
                    >
                      Open Thread
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {selectedDiscussionThread ? (
            <div className="student-class-panel">
              <header className="student-class-panel__head">
                <h2>{selectedDiscussionThread.title}</h2>
                <p>{selectedDiscussionThread.comments.length} comment{selectedDiscussionThread.comments.length === 1 ? '' : 's'}</p>
              </header>
              <div className="student-class-stack">
                {selectedDiscussionThread.comments.map((comment) => (
                  <article key={comment.id} className="student-class-announcement-card">
                    <h3>
                      {comment.author?.firstName} {comment.author?.lastName}
                    </h3>
                    <RichTextRenderer html={comment.bodyHtml || '<p>(Image-only comment)</p>'} />
                    {comment.attachments.length > 0 ? (
                      <div className="student-class-assignment-row__chips">
                        {comment.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.inlineUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {attachment.originalName || 'Image'}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="student-class-assignment-row__chips">
                      <button
                        type="button"
                        onClick={() => void handleToggleDiscussionReaction(comment.id, 'like')}
                      >
                        Like {comment.reactions.like}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleDiscussionReaction(comment.id, 'heart')}
                      >
                        Heart {comment.reactions.heart}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleDiscussionReaction(comment.id, 'wow')}
                      >
                        Wow {comment.reactions.wow}
                      </button>
                      {comment.canDelete ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteDiscussionComment(comment.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {selectedDiscussionThread.comments.length === 0 ? (
                  <div className="teacher-class-workspace__empty">No comments yet.</div>
                ) : null}
              </div>

              {selectedDiscussionThread.status === 'published' && selectedDiscussionThread.allowComments ? (
                <div className="teacher-class-workspace__announcement-form">
                  <RichTextEditor
                    value={discussionCommentBody}
                    onChange={setDiscussionCommentBody}
                    placeholder="Write your comment..."
                    minHeight={140}
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      setDiscussionCommentImages(Array.from(event.target.files || []))
                    }
                  />
                  <div className="teacher-class-workspace__head-actions">
                    <button
                      type="button"
                      className="student-class-assignment-row__take"
                      onClick={() => void handleSubmitDiscussionComment()}
                      disabled={discussionSubmitting}
                    >
                      {discussionSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="teacher-class-workspace__empty">
                  This thread is closed for new comments.
                </div>
              )}
            </div>
          ) : null}
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
          <header className="student-gradebook__head">
            <div>
              <h2>Gradebook</h2>
              <p>{gradeRows.length} graded items and submissions for {classItem.subjectName}</p>
            </div>
            <div className="student-gradebook__overall" data-tone={gradeSummary.tone}>
              <span>Overall</span>
              <strong>{gradeSummary.percent}%</strong>
            </div>
          </header>

          <div className="student-gradebook">
            <div className="student-gradebook__rule" aria-hidden="true" />
            <div className="student-class-table-wrap student-class-table-wrap--gradebook">

              {gradeRows.length === 0 ? (
                <div className="teacher-class-workspace__empty">No grade records yet.</div>
              ) : (
                <table className="student-class-table student-class-table--gradebook">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Grade</th>
                      <th>Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRows.map((row) => (
                      <tr key={row.id} data-pending={row.isPending}>
                        <td>
                          <div className="student-gradebook__item">
                            <span
                              className="student-gradebook__dot"
                              data-category={row.category}
                              aria-hidden="true"
                            />
                            <div className="student-gradebook__item-copy">
                              <strong>{row.title}</strong>
                              <p>
                                {row.categoryLabel} - {row.detailText}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>{row.dueText}</td>
                        <td>
                          <span className="student-gradebook__status" data-tone={row.statusTone}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td>
                          <div className="student-gradebook__grade-cell">
                            <span className="student-gradebook__grade-pill" data-tone={row.gradeTone}>
                              {row.scoreText}
                            </span>
                            <small>{row.percentText || 'Not graded'}</small>
                          </div>
                        </td>
                        <td>
                          <Link href={row.actionHref} className="student-gradebook__view">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog student-class-guide-dialog">
          <DialogHeader>
            <DialogTitle>Student guide: Class Page</DialogTitle>
            <DialogDescription>
              This guide explains each part of the class page in simple steps, with examples that match the student view.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-label="Class Page guide pages">
            <span>{`Page ${helpPage + 1} of ${studentClassGuidePages.length}`}</span>
            <div className="teacher-intervention-workspace__manual-dots">
              {studentClassGuidePages.map((page, index) => (
                <button
                  key={page.title}
                  type="button"
                  className={index === helpPage ? 'is-active' : undefined}
                  onClick={() => setHelpPage(index)}
                  aria-label={`Open guide page ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="teacher-intervention-workspace__manual-layout">
            <div className="teacher-intervention-workspace__manual-copy">
              <span className="teacher-intervention-workspace__manual-kicker">Class page tour</span>
              <h3>{activeGuidePage.title}</h3>
              <p>{activeGuidePage.description}</p>

              <div className="route-guide-steps">
                {activeGuidePage.steps.map((step, index) => (
                  <div
                    key={`${activeGuidePage.title}-${step.action}-${index}`}
                    className={`route-guide-step${step.tone ? ` is-${step.tone}` : ''}`}
                  >
                    <span className="route-guide-step__index">{index + 1}</span>
                    <div>
                      <strong>{step.action}</strong>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="teacher-intervention-workspace__manual-reminder">{activeGuidePage.reminder}</div>
            </div>

            <StudentClassGuideScreenshot screen={activeGuidePage.screen} />
          </div>

          <DialogFooter className="teacher-intervention-workspace__manual-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHelpPage((current) => Math.max(0, current - 1))}
              disabled={helpPage === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous page
            </Button>
            <Button type="button" variant="ghost" aria-label="Close guide" onClick={() => setHelpOpen(false)}>
              Close guide
            </Button>
            <Button
              type="button"
              onClick={() =>
                setHelpPage((current) => Math.min(studentClassGuidePages.length - 1, current + 1))
              }
              disabled={helpPage === studentClassGuidePages.length - 1}
            >
              Next page
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
