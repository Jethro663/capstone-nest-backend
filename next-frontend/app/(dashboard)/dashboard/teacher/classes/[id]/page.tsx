'use client';

import dynamic from 'next/dynamic';
import Cropper from 'react-easy-crop';
import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { Area, Point } from 'react-easy-crop';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  BookText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ClipboardList,
  Copy,
  Eye,
  FileSpreadsheet,
  Flag,
  Grid2X2,
  Heart,
  LayoutPanelTop,
  CircleHelp,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Plus,
  Radar,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { announcementService } from '@/services/announcement-service';
import { discussionBoardService } from '@/services/discussion-board-service';
import { assessmentService } from '@/services/assessment-service';
import { extractionService } from '@/services/extraction-service';
import { aiService } from '@/services/ai-service';
import { classRecordService } from '@/services/class-record-service';
import { fileService } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassWorkspaceShell } from '@/components/class/workspace/ClassWorkspaceShell';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { AiOutageNotice } from '@/components/student/AiOutageNotice';
import { useTeacherClassRecord } from '@/hooks/use-teacher-class-record';
import { useAiAvailability } from '@/hooks/use-ai-availability';
import { normalizeRichText } from '@/lib/rich-text';
import { isAiDraftTerminalStatus, readTrackedAiDraftJobs, type TrackedAiDraftJobEntry, writeTrackedAiDraftJobs } from '@/lib/ai-draft-job-tracker';
import { upsertTrackedExtractionNotification } from '@/lib/extraction-notification-tracker';
import {
  createCroppedModuleCoverBlob,
  DEFAULT_MODULE_GRADIENT,
  MODULE_GRADIENT_OPTIONS,
  MODULE_STOCK_IMAGE_OPTIONS,
  sanitizeModuleCoverUploadName,
  validateModuleCoverFile,
} from '@/lib/module-cover-images';
import {
  hasCoreAssessmentPlacementForPublish,
  resolveAssessmentForPublishValidation,
} from '@/lib/core-assessment-publish';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { ClassRecord } from '@/types/class-record';
import type {
  DiscussionAuthor,
  DiscussionCommentReportReason,
  DiscussionThreadDetail,
  DiscussionThreadSummary,
} from '@/types/discussion';
import type { Extraction } from '@/types/extraction';
import type { LibraryGradeLevel, LibrarySubjectKey } from '@/types/file';
import type { ClassModule } from '@/types/module';
import './workspace.css';

const RichTextEditor = dynamic(
  () =>
    import('@/components/shared/rich-text/RichTextEditor').then(
      (mod) => mod.RichTextEditor,
    ),
  {
    loading: () => <Skeleton className="h-48 w-full rounded-[1.75rem]" />,
  },
);

const RichTextRenderer = dynamic(
  () =>
    import('@/components/shared/rich-text/RichTextRenderer').then(
      (mod) => mod.RichTextRenderer,
    ),
  {
    loading: () => <Skeleton className="h-24 w-full rounded-[1.75rem]" />,
  },
);

const TeacherClassRecordWorkbook = dynamic(
  () =>
    import('@/components/teacher/class-record/TeacherClassRecordWorkbook').then(
      (mod) => mod.TeacherClassRecordWorkbook,
    ),
  {
    loading: () => <Skeleton className="h-[32rem] w-full rounded-[1.75rem]" />,
  },
);

type WorkspaceTab = 'modules' | 'assignments' | 'extraction' | 'announcements' | 'discussion' | 'class-record' | 'students' | 'calendar';
type AssignmentFilter = 'all' | 'written' | 'performance' | 'quarterly' | 'discussion' | 'drafts';
type CalendarKind = 'assessment' | 'event' | 'holiday';
type CalendarViewMode = 'calendar' | 'upcoming';
type ModuleViewMode = 'wide' | 'compact';
type ExtractionTargetSectionCount = 3 | 4 | 5;
type ModuleThemeKind = 'gradient' | 'image';

interface ModulePresentationDraft {
  themeKind: ModuleThemeKind;
  gradientId: string;
  coverImageUrl: string | null;
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
}

interface LocalModuleCoverDraft {
  file: File;
  objectUrl: string;
  crop: Point;
  zoom: number;
  croppedAreaPixels: Area | null;
}

interface StudentRow {
  enrollmentId: string;
  studentId: string;
  initials: string;
  fullName: string;
  email: string;
  lrn: string;
  gradePercent: number | null;
}

interface CalendarEventItem {
  id: string;
  title: string;
  subtitle: string;
  date: Date;
  kind: CalendarKind;
}

interface ModuleDeadlineCardItem {
  id: string;
  title: string;
  subtitle: string;
  dayLabel: string;
  monthLabel: string;
  kind: CalendarKind;
  href: string;
  isUrgent: boolean;
}

type TeacherDiscussionComment = DiscussionThreadDetail['comments'][number];

const CLASS_TABS: Array<{ key: WorkspaceTab; label: string; icon: typeof BookOpen }> = [
  { key: 'modules', label: 'Modules', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'extraction', label: 'Extraction', icon: Radar },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'discussion', label: 'Discussion Board', icon: MessageSquare },
  { key: 'class-record', label: 'Class Record', icon: FileSpreadsheet },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const ASSIGNMENT_FILTERS: Array<{ key: AssignmentFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'written', label: 'Written Work' },
  { key: 'performance', label: 'Performance Task' },
  { key: 'quarterly', label: 'Quarterly Assessment' },
  { key: 'discussion', label: 'Discussion' },
  { key: 'drafts', label: 'Drafts' },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY_MODULES_VIEW = 'teacher-class-detail-modules-view-v1';
const STORAGE_KEY_CALENDAR_VIEW = 'teacher-class-detail-calendar-view-v1';
type TeacherClassGuideScreen =
  | 'header'
  | 'modules'
  | 'assignments'
  | 'extraction'
  | 'community'
  | 'students'
  | 'class-record'
  | 'calendar';
type GuidePinProps = {
  children: string;
  lineSide: 'left' | 'right';
  lineWidth: string;
  style: CSSProperties;
};

const teacherClassGuideDialogStyle = {
  '--intervention-border': '#dbe2ec',
  '--intervention-border-soft': '#edf1f6',
  '--intervention-muted': '#637083',
  '--intervention-strong': '#111827',
  '--intervention-red': '#a32d2d',
  '--intervention-red-soft': '#fcebeb',
} as CSSProperties;

const teacherClassGuidePages: Array<{
  title: string;
  description: string;
  screen: TeacherClassGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'caution';
  }>;
}> = [
  {
    title: 'Start at the top of the class workspace',
    description:
      'Use the header to confirm where you are, how many learners are enrolled, and where the current class tab points.',
    screen: 'header',
    reminder: 'Keep this header in view while moving between tabs so actions always map to the right class.',
    steps: [
      {
        action: 'Read',
        body: 'Check the class title, section details, room, and schedule from the title card.',
      },
      {
        action: 'Go back',
        body: 'Use Back to Classes if you want to return to your class list safely.',
      },
      {
        action: 'Open tabs',
        body: 'Move across Modules, Assignments, Extraction, and other sections using the tab row.',
      },
      {
        action: 'Open help',
        body: 'Tap this guide button again anytime you need these instructions while working.',
      },
    ],
  },
  {
    title: 'Manage class modules first',
    description:
      'Modules are the learning map for the class. The tab is where you build learning flow and check lesson progress.',
    screen: 'modules',
    reminder:
      'Switch to Compact or Wide view when you compare module quality and progress at a glance.',
    steps: [
      {
        action: 'Create',
        body: 'Open Add Module to create a new unit before posting assignments or discussions.',
      },
      {
        action: 'Rearrange',
        body: 'Use Select All and Delete Selected only when you intentionally want bulk changes.',
      },
      {
        action: 'Review',
        body: 'Inspect each module card for lesson count, assignment count, and progress indicator.',
      },
      {
        action: 'Edit style',
        body: 'Use Design if you want a custom cover and gradient on a module.',
      },
    ],
  },
  {
    title: 'Use assignment filters and assignment actions',
    description:
      'Assignments can be filtered by timing and type so you can move quickly from overdue to draft or graded work.',
    screen: 'assignments',
    reminder: 'For new classes, start with All and then narrow to Written Work or Discussion.',
    steps: [
      {
        action: 'Filter',
        body: 'Use All, Written Work, Performance, or Quarterly to narrow the assignment list.',
      },
      {
        action: 'Check status',
        body: 'Look at Published and Draft tags to avoid editing items that are already live.',
      },
      {
        action: 'Select',
        body: 'Use row selection when multiple items need the same action.',
      },
      {
        action: 'Open',
        body: 'Open assignment cards to review title, points, and due date details.',
      },
    ],
  },
  {
    title: 'Run AI extraction when you need fast lesson input',
    description:
      'The extraction tab is for uploading a PDF and turning it into a structured draft for module work.',
    screen: 'extraction',
    reminder: 'Extraction can pause when AI is unavailable; the notice and upload state will reflect that.',
    steps: [
      {
        action: 'Drop PDF',
        body: 'Use the extraction dropzone to start converting source material.',
      },
      {
        action: 'Track',
        body: 'Review extraction status text to see Completed, Failed, or images that still need review.',
      },
      {
        action: 'Open result',
        body: 'Open an extraction row to inspect parsed title, sections, and assignment suggestions.',
      },
    ],
  },
  {
    title: 'Keep class communication in one workflow',
    description:
      'Announcements and Discussion sit near each other so notices and student questions stay on the same class page.',
    screen: 'community',
    reminder:
      'If students need immediate visibility, post to Announcements first and then link to a discussion for questions.',
    steps: [
      {
        action: 'Create',
        body: 'Use New Announcement for formal class-wide updates.',
      },
      {
        action: 'Start thread',
        body: 'Use New Thread to start a discussion area with comments and attachments.',
      },
      {
        action: 'Pin wisely',
        body: 'Pin posts and threads only for high-priority information.',
      },
    ],
  },
  {
    title: 'Review students from one tab',
    description:
      'The students tab is where you view class members, open profiles, and remove people who no longer belong.',
    screen: 'students',
    reminder: 'Removing a student happens intentionally. Confirm before finalizing any deletion.',
    steps: [
      {
        action: 'Add',
        body: 'Use Add Student when enrolling new learners for this class.',
      },
      {
        action: 'Open profile',
        body: 'Open a student row to inspect contact details and performance history.',
      },
      {
        action: 'Read grade',
        body: 'Use the Grade % column to identify quickly who may need a follow-up.',
      },
      {
        action: 'Remove',
        body: 'Use Remove only when enrollment has truly changed.',
      },
    ],
  },
  {
    title: 'View class record and progress summaries',
    description:
      'Class Record gives one view for workbook data, category points, and the current progress snapshot.',
    screen: 'class-record',
    reminder: 'Keep student privacy in mind and open workbook entries only for official grading workflows.',
    steps: [
      {
        action: 'Open',
        body: 'Use this tab to open the class record workbook inside the class context.',
      },
      {
        action: 'Read trends',
        body: 'Check the summary before making new grade edits or posting extra remediation.',
      },
    ],
  },
  {
    title: 'Plan with the class calendar',
    description:
      'The calendar keeps assessments, announcements, and events in one quick schedule view.',
    screen: 'calendar',
    reminder: 'Check Upcoming before Calendar view when you only need short-term deadlines.',
    steps: [
      {
        action: 'Choose',
        body: 'Pick Calendar for date blocks or Upcoming for a simple list workflow.',
      },
      {
        action: 'Select date',
        body: 'In Calendar view, click a date to review events for that day.',
      },
      {
        action: 'Open full calendar',
        body: 'Use Full Calendar when you need a cross-class schedule check.',
      },
    ],
  },
];

function GuidePin({ children, lineSide, lineWidth, style }: GuidePinProps) {
  return (
    <em
      className="pointer-events-none absolute z-10 inline-flex items-center gap-1.5 rounded-full border border-[#7f1d1d] bg-white px-2.5 py-1 text-[0.62rem] font-black not-italic leading-none text-[#7f1d1d] shadow-[0_0.5rem_1rem_rgba(127,29,29,0.1)]"
      style={style}
    >
      <span className="h-[0.42rem] w-[0.42rem] rounded-full bg-[#a32d2d]" />
      <span>{children}</span>
      <span
        className="absolute top-1/2 h-px -translate-y-1/2 bg-[#a32d2d]"
        style={
          lineSide === 'right'
            ? { left: 'calc(100% - 0.05rem)', width: lineWidth }
            : { right: 'calc(100% - 0.05rem)', width: lineWidth }
        }
      />
    </em>
  );
}

function TeacherClassGuideScreenshot({ screen }: { screen: TeacherClassGuideScreen }) {
  if (screen === 'header') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class detail header screenshot"
      >
        <div className="absolute inset-x-0 top-0 flex h-8 items-center gap-1 border-b border-[#edf1f6] bg-white px-3">
          <span className="h-2 w-2 rounded-full bg-[#f87171]" />
          <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
          <span className="h-2 w-2 rounded-full bg-[#34d399]" />
        </div>
        <div className="rounded-xl border border-[#1d3659] bg-[#10254a] p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <small className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#c4d0e2]">
                Teacher Class Detail
              </small>
              <strong className="mt-1 block text-[1.1rem] font-black leading-tight text-white">Science 7</strong>
              <p className="mt-1.5 text-sm text-[#b6c8df]">Grade 7 - Rizal - Schedule TBA - Room 201</p>
            </div>
            <span className="rounded-full border border-[#284269] bg-[#17345d] px-3 py-1 text-[0.62rem] font-black">
              ? Help
            </span>
          </div>
          <div className="mt-3 grid gap-2 rounded-lg border border-[#263e62] bg-[#17345d] p-2">
            <a className="h-3 w-max border-b border-dotted border-[#91a7c1] pb-1 text-xs font-black text-[#f0f6ff]">
              Back to Classes
            </a>
            <div className="flex flex-wrap gap-2 text-[0.62rem] font-black">
              <span className="rounded-full bg-[#f0f5ff] px-2 py-1 text-[#10254a]">Modules</span>
              <span className="rounded-full bg-[#1c2f4f] px-2 py-1 text-[#c5d2e8]">Assignments</span>
              <span className="rounded-full bg-[#1c2f4f] px-2 py-1 text-[#c5d2e8]">Extraction</span>
              <span className="rounded-full bg-[#1c2f4f] px-2 py-1 text-[#c5d2e8]">Students</span>
            </div>
          </div>
        </div>

        <GuidePin lineSide="left" lineWidth="6.2rem" style={{ right: '1rem', top: '1.95rem' }}>
          Help button
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="6rem" style={{ left: '1.2rem', top: '8.2rem' }}>
          Back to Classes
        </GuidePin>
        <GuidePin lineSide="right" lineWidth="8rem" style={{ left: '1.2rem', top: '9.8rem' }}>
          Module tabs
        </GuidePin>
      </div>
    );
  }

  if (screen === 'modules') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class modules screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <small className="text-[0.64rem] font-black uppercase tracking-[0.08em] text-[#647083]">Course Modules</small>
              <strong className="text-lg font-black text-[#111827]">3 modules</strong>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 min-w-16 items-center justify-center rounded-full border border-[#d2ddec] bg-[#f7fafe] text-[0.72rem] font-black text-[#4f6694]">
                Wide
              </span>
              <span className="inline-flex h-8 min-w-16 items-center justify-center rounded-full border border-[#e8eff7] bg-white text-[0.72rem] font-black text-[#4f6694]">
                Compact
              </span>
              <span className="inline-flex h-8 min-w-20 items-center justify-center rounded-full border border-[#e8eff7] bg-[#f8fbfe] text-[0.72rem] font-black text-[#4f6694]">
                Select All
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-sm font-black text-[#143155]">Week 1: Foundations</strong>
              <span className="rounded-full bg-[#fff1f5] px-2 py-1 text-[0.56rem] font-black text-[#9f2342]">
                Locked
              </span>
            </div>
            <p className="text-sm text-[#60789a]">3 lessons - 2 assessments - 40% complete</p>
            <div className="mt-2 inline-flex gap-2">
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.62rem] font-black text-[#4a648a]">
                Preview
              </span>
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.62rem] font-black text-[#4a648a]">
                Design
              </span>
            </div>
          </div>
        </div>
        <GuidePin lineSide="right" lineWidth="4.7rem" style={{ left: '1rem', top: '1.2rem' }}>
          Add module / filters
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="4.5rem" style={{ right: '1rem', top: '2.6rem' }}>
          View style
        </GuidePin>
        <GuidePin lineSide="right" lineWidth="5.2rem" style={{ left: '1rem', top: '7.9rem' }}>
          Module card
        </GuidePin>
      </div>
    );
  }

  if (screen === 'assignments') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class assignments screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <strong className="text-lg font-black text-[#111827]">Assignments</strong>
              <p className="text-sm text-[#647083]">8 total</p>
            </div>
            <div className="inline-flex rounded-full border border-[#d2ddec] bg-[#f7fafe] p-1">
              <span className="rounded-full bg-[#e70012] px-2 py-1 text-xs font-black text-white">All</span>
              <span className="rounded-full px-2 py-1 text-xs font-black text-[#4f6694]">Written</span>
              <span className="rounded-full px-2 py-1 text-xs font-black text-[#4f6694]">Discussion</span>
            </div>
          </div>
          <div className="rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
            <div className="flex items-center justify-between">
              <div>
                <small className="text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#7a8ea8]">Published</small>
                <strong className="mt-0.5 block text-[#111827]">Seatwork 1 Quiz</strong>
                <p className="mt-1 text-sm text-[#60789a]">Due Apr 10, 2026 - 20 pts</p>
              </div>
              <div className="inline-flex gap-1">
                <span className="rounded-full border border-[#e7edf5] px-2 py-1 text-[0.56rem] font-black text-[#4f6694]">
                  Edit
                </span>
                <span className="rounded-full border border-[#f2d3d8] px-2 py-1 text-[0.56rem] font-black text-[#b71d3a]">
                  Delete
                </span>
              </div>
            </div>
          </div>
        </div>
        <GuidePin lineSide="left" lineWidth="6.1rem" style={{ left: '1rem', top: '1.1rem' }}>
          Filter chips
        </GuidePin>
        <GuidePin lineSide="right" lineWidth="5.8rem" style={{ right: '1rem', top: '6rem' }}>
          Assignment actions
        </GuidePin>
      </div>
    );
  }

  if (screen === 'extraction') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class extraction screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <div className="mb-2">
            <strong className="text-lg font-black text-[#111827]">AI Extractions</strong>
            <p className="text-sm text-[#647083]">Upload a PDF to extract lesson content.</p>
          </div>
          <div className="rounded-lg border border-[#d6e3f3] bg-[#f7fbff] px-3 py-4 text-center">
            <strong className="text-sm text-[#143155]">Drop a PDF here to extract module</strong>
            <p className="mt-1 text-sm text-[#647083]">or click to browse</p>
          </div>
          <div className="mt-3 rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-sm text-[#111827]">Cells and Systems</strong>
              <span className="rounded-full border border-[#cce3f7] px-2 py-1 text-xs font-black text-[#2862a6]">Ready</span>
            </div>
            <p className="text-xs text-[#677f9e]">2026-04-30</p>
            <span className="mt-2 inline-flex rounded-full border border-[#d2ddec] px-2 py-1 text-xs font-black text-[#4f6694]">
              View
            </span>
          </div>
        </div>
        <GuidePin lineSide="right" lineWidth="4.6rem" style={{ left: '1rem', top: '1.1rem' }}>
          PDF dropzone
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="5rem" style={{ right: '1rem', top: '7.4rem' }}>
          Extraction history
        </GuidePin>
      </div>
    );
  }

  if (screen === 'community') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class community screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <strong className="text-base font-black text-[#111827]">Announcements</strong>
              <p className="text-sm text-[#647083]">6 posts</p>
            </div>
            <span className="rounded-full border border-[#d2ddec] bg-[#f7fafe] px-3 py-1 text-xs font-black text-[#4f6694]">
              + New Announcement
            </span>
          </div>
          <div className="mb-3 rounded-lg border border-[#d8e3f3] bg-[#f8fbff] p-2">
            <span className="rounded-full border border-[#e6a8b4] bg-[#fff2f5] px-2 py-1 text-[0.56rem] font-black text-[#8f1f45]">
              Pinned
            </span>
            <strong className="mt-1 block text-sm text-[#111827]">Science Fair Reminder</strong>
          </div>
          <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <strong className="text-base font-black text-[#111827]">Discussion Board</strong>
                <p className="text-sm text-[#647083]">2 threads</p>
              </div>
              <span className="rounded-full border border-[#d2ddec] bg-[#f7fafe] px-3 py-1 text-xs font-black text-[#4f6694]">
                + New Thread
              </span>
            </div>
            <div className="rounded-lg border border-[#d8e4f4] bg-[#f8fbff] p-2">
              <small className="text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#7a8ea8]">
                Discussion thread
              </small>
              <strong className="mt-0.5 block text-sm text-[#111827]">How to solve slope questions?</strong>
            </div>
          </div>
        </div>
        <GuidePin lineSide="left" lineWidth="6.3rem" style={{ left: '1rem', top: '1.05rem' }}>
          New Announcement
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="6rem" style={{ left: '1rem', top: '9.25rem' }}>
          New Thread
        </GuidePin>
      </div>
    );
  }

  if (screen === 'students') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class students screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <strong className="text-lg font-black text-[#111827]">Students (18)</strong>
            <span className="rounded-full border border-[#d2ddec] bg-[#f7fafe] px-3 py-1 text-xs font-black text-[#4f6694]">
              + Add Student
            </span>
          </div>
          <div className="rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="rounded-full bg-[#d5e3f7] p-2 text-xs font-black text-[#1f3d66]">LN</span>
              <strong className="text-sm text-[#111827]">Liam Navarro</strong>
              <span className="text-sm text-[#4f6694]">88.0%</span>
            </div>
            <p className="text-xs text-[#647083]">student71@lms.local - 17-11-0011</p>
          </div>
          <div className="mt-2 rounded-lg border border-[#f0d8db] bg-[#fff2f5] px-3 py-2 text-right">
            <span className="text-xs font-black text-[#9f1e3d]">Delete</span>
          </div>
        </div>
        <GuidePin lineSide="right" lineWidth="4.8rem" style={{ left: '1rem', top: '1.35rem' }}>
          Add Student
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="4.4rem" style={{ right: '1rem', top: '6.4rem' }}>
          Student row
        </GuidePin>
      </div>
    );
  }

  if (screen === 'class-record') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="class record screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <strong className="text-lg font-black text-[#111827]">Class Record Workspace</strong>
          <p className="text-sm text-[#647083]">Track grade summaries and workbook milestones.</p>
          <div className="mt-3 rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
            <div className="mb-2 grid gap-1">
              <span className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#647083]">Summary</span>
              <strong className="text-2xl font-black text-[#111827]">92/140</strong>
              <span className="text-sm text-[#647083]">Written Work | Performance | Quarterly</span>
            </div>
            <div className="grid gap-2">
              <span className="rounded-full bg-[#f1f5fb] px-2 py-1 text-xs font-black text-[#405f88]">Written Work: 93%</span>
              <span className="rounded-full bg-[#f1f5fb] px-2 py-1 text-xs font-black text-[#405f88]">Performance Task: 90%</span>
            </div>
          </div>
        </div>
        <GuidePin lineSide="right" lineWidth="5.4rem" style={{ left: '1rem', top: '1.05rem' }}>
          Class Record tab
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="4.5rem" style={{ right: '1rem', top: '6rem' }}>
          Score snapshot
        </GuidePin>
      </div>
    );
  }

  return (
    <div
      className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
      aria-label="class calendar screenshot"
    >
      <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <strong className="text-lg font-black text-[#111827]">Class Calendar</strong>
            <p className="text-sm text-[#647083]">Upcoming events and assessments</p>
          </div>
          <div className="inline-flex rounded-full border border-[#d2ddec] bg-[#f7fafe] p-1">
            <span className="rounded-full bg-[#e70012] px-2 py-1 text-xs font-black text-white">Calendar</span>
            <span className="rounded-full px-2 py-1 text-xs font-black text-[#4f6694]">Upcoming</span>
          </div>
        </div>
        <div className="rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-black text-[#143155]">May 15</span>
            <span className="rounded-full border border-[#dce2ec] bg-[#ecf3ff] px-2 py-1 text-[0.58rem] font-black text-[#3f5f89]">
              Assessment
            </span>
          </div>
          <strong className="text-sm font-black text-[#111827]">Quarter Examination</strong>
          <p className="text-xs text-[#647083]">Mathematics 7</p>
        </div>
      </div>
      <GuidePin lineSide="right" lineWidth="5rem" style={{ left: '1rem', top: '1.4rem' }}>
        View switch
      </GuidePin>
      <GuidePin lineSide="left" lineWidth="4.8rem" style={{ right: '1rem', top: '8.1rem' }}>
        Event row
      </GuidePin>
    </div>
  );
}

function normalizeModulesOrder(modules: ClassModule[]) {
  return modules.map((module, index) => ({ ...module, order: index + 1 }));
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return (
    value === 'modules' ||
    value === 'assignments' ||
    value === 'extraction' ||
    value === 'announcements' ||
    value === 'discussion' ||
    value === 'class-record' ||
    value === 'students' ||
    value === 'calendar'
  );
}

function formatDateYmd(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toISOString().slice(0, 10);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'Unknown';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getExtractionStatusLabel(extraction: Extraction) {
  if (extraction.extractionStatus === 'failed') return 'Failed';
  if (extraction.reviewRequired) return 'Needs review';
  if (extraction.extractionStatus === 'completed' || extraction.extractionStatus === 'applied') return 'Ready';
  return extraction.extractionStatus;
}

function normalizeLibrarySubjectKey(
  subjectCode?: string | null,
  subjectName?: string | null,
): LibrarySubjectKey | undefined {
  const raw = `${subjectCode ?? ''} ${subjectName ?? ''}`.toLowerCase();
  if (raw.includes('science') || raw.includes('sci')) return 'science';
  if (raw.includes('math')) return 'math';
  if (raw.includes('english') || raw.includes('eng')) return 'english';
  if (raw.includes('filipino') || raw.includes('fil')) return 'filipino';
  if (raw.includes('araling') || raw.includes('panlipunan') || /\bap\b/.test(raw)) return 'ap';
  if (raw.includes('tle')) return 'tle';
  if (raw.includes('mapeh')) return 'mapeh';
  if (raw.includes('esp') || raw.includes('values') || raw.includes('pagpapakatao')) return 'esp';
  return undefined;
}

function normalizeLibraryGradeLevel(value?: string | null): LibraryGradeLevel | undefined {
  const match = String(value ?? '').match(/\b(7|8|9|10)\b/);
  if (!match) return undefined;
  return match[1] as LibraryGradeLevel;
}

function formatEventBadgeDate(date: Date) {
  return {
    day: String(date.getDate()),
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function summarizeModule(module: ClassModule) {
  const lessons = module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'lesson').length,
    0,
  );
  const assessments = module.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'assessment').length,
    0,
  );
  return { lessons, assessments };
}

function deriveAssignmentFilter(assessment: Assessment): AssignmentFilter {
  const title = assessment.title.toLowerCase();
  const type = assessment.type.toLowerCase();
  if (!assessment.isPublished) return 'drafts';
  if (title.includes('project') || title.includes('performance')) return 'performance';
  if (title.includes('quarter') || title.includes('exam')) return 'quarterly';
  if (title.includes('discussion')) return 'discussion';
  if (type.includes('assignment') || type.includes('file_upload')) return 'written';
  return 'written';
}

function assignmentTagLabel(filter: AssignmentFilter) {
  if (filter === 'written') return 'Written Work';
  if (filter === 'performance') return 'Performance Task';
  if (filter === 'quarterly') return 'Quarterly Assessment';
  if (filter === 'discussion') return 'Discussion';
  return 'Assessment';
}

function calendarKindLabel(kind: CalendarKind) {
  if (kind === 'assessment') return 'Assessment';
  if (kind === 'holiday') return 'Holiday';
  return 'Class Event';
}

function inferCalendarKindFromAnnouncement(announcement: Announcement): CalendarKind {
  const content = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (content.includes('quiz') || content.includes('exam') || content.includes('assessment')) return 'assessment';
  if (content.includes('holiday') || content.includes('break')) return 'holiday';
  return 'event';
}

function gradeTone(value: number | null) {
  if (value === null) return 'neutral';
  if (value >= 85) return 'good';
  if (value >= 75) return 'warn';
  return 'bad';
}

function safeInitials(firstName?: string, lastName?: string) {
  const a = (firstName || '').trim().charAt(0);
  const b = (lastName || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || 'NA';
}

function getApiErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

function sortDiscussionThreads(threads: DiscussionThreadSummary[]) {
  return [...threads].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aTs = new Date(a.publishedAt || a.createdAt || 0).getTime();
    const bTs = new Date(b.publishedAt || b.createdAt || 0).getTime();
    return bTs - aTs;
  });
}

function getDiscussionAttachmentHref(
  attachment:
    | DiscussionThreadSummary['attachments'][number]
    | DiscussionThreadDetail['comments'][number]['attachments'][number],
) {
  return attachment.inlineUrl || attachment.downloadUrl || attachment.linkUrl || '#';
}

function isDiscussionImageAttachment(
  attachment:
    | DiscussionThreadSummary['attachments'][number]
    | DiscussionThreadDetail['comments'][number]['attachments'][number],
) {
  return attachment.type === 'image' || Boolean(attachment.mimeType?.startsWith('image/'));
}

const DISCUSSION_REPORT_REASON_OPTIONS: Array<{
  value: DiscussionCommentReportReason;
  label: string;
  hint: string;
}> = [
  {
    value: 'inappropriate',
    label: 'Inappropriate',
    hint: 'Rude, explicit, or not suitable for class.',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    hint: 'Targets or attacks another learner directly.',
  },
  {
    value: 'spam',
    label: 'Spam',
    hint: 'Repeated, irrelevant, or disruptive posting.',
  },
  {
    value: 'off_topic',
    label: 'Off-topic',
    hint: 'Not related to the lesson or discussion prompt.',
  },
  {
    value: 'academic_dishonesty',
    label: 'Academic Dishonesty',
    hint: 'Cheating, answer sharing, or suspicious misconduct.',
  },
];

function stripDiscussionHtml(input?: string | null) {
  return String(input ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDiscussionAuthorName(author?: DiscussionAuthor) {
  const fullName = `${author?.firstName || ''} ${author?.lastName || ''}`.trim();
  return fullName || author?.email || 'Unknown user';
}

function getDiscussionAuthorInitials(author?: DiscussionAuthor) {
  const words = getDiscussionAuthorName(author)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return 'NA';
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}

function TeacherDiscussionAvatar({ author }: { author?: DiscussionAuthor }) {
  const displayName = getDiscussionAuthorName(author);

  return (
    <Avatar className="teacher-discussion-avatar">
      {author?.profilePicture ? (
        <AvatarImage
          src={author.profilePicture}
          alt={displayName}
          className="teacher-discussion-avatar__image"
        />
      ) : null}
      <AvatarFallback className="teacher-discussion-avatar__fallback">
        {getDiscussionAuthorInitials(author)}
      </AvatarFallback>
    </Avatar>
  );
}

function TeacherDiscussionReactionSummary({
  comment,
}: {
  comment: TeacherDiscussionComment;
}) {
  const reactionItems = [
    { key: 'like', label: 'Like', icon: ThumbsUp, count: comment.reactions.like },
    { key: 'heart', label: 'Heart', icon: Heart, count: comment.reactions.heart },
    { key: 'wow', label: 'Wow', icon: Sparkles, count: comment.reactions.wow },
  ].filter((entry) => entry.count > 0);

  if (reactionItems.length === 0) {
    return (
      <span className="teacher-discussion-comment__meta-pill">
        <MessageSquare className="h-3.5 w-3.5" />
        No reactions yet
      </span>
    );
  }

  return (
    <>
      {reactionItems.map((entry) => {
        const Icon = entry.icon;
        return (
          <span key={entry.key} className="teacher-discussion-comment__meta-pill">
            <Icon className="h-3.5 w-3.5" />
            {entry.count} {entry.label.toLowerCase()}
          </span>
        );
      })}
    </>
  );
}

function TeacherDiscussionAttachmentGallery({
  attachments,
}: {
  attachments: DiscussionThreadSummary['attachments'];
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="teacher-discussion-media-grid">
      {attachments.map((attachment) => {
        const href = getDiscussionAttachmentHref(attachment);

        return (
          <a
            key={attachment.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`teacher-discussion-media-card${
              isDiscussionImageAttachment(attachment) && href !== '#'
                ? ' is-image'
                : ''
            }`}
          >
            {isDiscussionImageAttachment(attachment) && href !== '#' ? (
              <div className="teacher-discussion-media-card__image">
                <Image
                  src={href}
                  alt={attachment.originalName || 'Thread attachment'}
                  fill
                  unoptimized
                  sizes="160px"
                />
              </div>
            ) : null}
            <span>{attachment.originalName || attachment.linkLabel || 'Attachment'}</span>
          </a>
        );
      })}
    </div>
  );
}

function TeacherSelectedDiscussionFilePreviews({ files }: { files: File[] }) {
  const previewItems = useMemo(
    () =>
      files
        .filter((file) => file.type.startsWith('image/'))
        .map((file) => ({
          key: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          url: URL.createObjectURL(file),
        })),
    [files],
  );

  useEffect(
    () => () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [previewItems],
  );

  if (files.length === 0) return null;

  return (
    <div className="teacher-discussion-upload-preview">
      {previewItems.map((item) => (
        <div key={item.key} className="teacher-discussion-upload-preview__card">
          <div className="teacher-discussion-upload-preview__image">
            <Image src={item.url} alt={item.name} fill unoptimized sizes="96px" />
          </div>
          <span>{item.name}</span>
        </div>
      ))}
      {files
        .filter((file) => !file.type.startsWith('image/'))
        .map((file) => (
          <div
            key={`${file.name}-${file.size}-${file.lastModified}`}
            className="teacher-discussion-upload-preview__file"
          >
            <span>{file.name}</span>
          </div>
        ))}
    </div>
  );
}

function normalizeModulePresentation(module: ClassModule): ModulePresentationDraft {
  const gradientId =
    MODULE_GRADIENT_OPTIONS.find((option) => option.id === module.gradientId)?.id ||
    DEFAULT_MODULE_GRADIENT;

  const coverImageUrl = module.coverImageUrl || null;
  const themeKind: ModuleThemeKind = module.themeKind === 'image' ? 'image' : 'gradient';

  const clamp = (value: number | undefined, min: number, max: number, fallback: number) =>
    typeof value === 'number' ? Math.min(Math.max(value, min), max) : fallback;

  return {
    themeKind,
    gradientId,
    coverImageUrl,
    imagePositionX: clamp(module.imagePositionX, 0, 100, 50),
    imagePositionY: clamp(module.imagePositionY, 0, 100, 50),
    imageScale: clamp(module.imageScale, 100, 220, 120),
  };
}

export default function TeacherClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const aiAvailability = useAiAvailability();
  const classIdParam = params.id;
  const classId = Array.isArray(classIdParam) ? classIdParam[0] : (classIdParam as string) || '';
  const isClassIdValid = UUID_PATTERN.test(classId);
  const modulesViewStorageKey = `${STORAGE_KEY_MODULES_VIEW}:${isClassIdValid ? classId : 'invalid'}`;
  const calendarViewStorageKey = `${STORAGE_KEY_CALENDAR_VIEW}:${isClassIdValid ? classId : 'invalid'}`;
  const viewParam = searchParams.get('view');
  const activeTab = isWorkspaceTab(viewParam) ? viewParam : 'modules';

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discussionThreads, setDiscussionThreads] = useState<DiscussionThreadSummary[]>([]);
  const [selectedDiscussionThreadId, setSelectedDiscussionThreadId] = useState<string | null>(null);
  const [selectedDiscussionThread, setSelectedDiscussionThread] = useState<DiscussionThreadDetail | null>(null);
  const [finalGradeByStudentId, setFinalGradeByStudentId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);
  const [modulesViewMode, setModulesViewMode] = useState<ModuleViewMode>('wide');
  const [modulesViewLoaded, setModulesViewLoaded] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('upcoming');
  const [calendarViewLoaded, setCalendarViewLoaded] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()));
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [isReorderingModules, setIsReorderingModules] = useState(false);
  const [customizingModuleId, setCustomizingModuleId] = useState<string | null>(null);
  const [moduleDraft, setModuleDraft] = useState<ModulePresentationDraft>({
    themeKind: 'gradient',
    gradientId: DEFAULT_MODULE_GRADIENT,
    coverImageUrl: null,
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 120,
  });
  const [savingModuleDesign, setSavingModuleDesign] = useState(false);
  const [moduleCoverError, setModuleCoverError] = useState<string | null>(null);
  const [localModuleCoverDraft, setLocalModuleCoverDraft] = useState<LocalModuleCoverDraft | null>(null);

  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [busyAssessmentId, setBusyAssessmentId] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [aiDraftJobs, setAiDraftJobs] = useState<TrackedAiDraftJobEntry[]>([]);
  const [aiDraftJobsBusy, setAiDraftJobsBusy] = useState(false);

  const [uploadingExtraction, setUploadingExtraction] = useState(false);
  const [targetSectionCount, setTargetSectionCount] = useState<ExtractionTargetSectionCount>(4);
  const extractionInputRef = useRef<HTMLInputElement | null>(null);
  const aiUnavailable = aiAvailability.status === 'degraded';

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState<string>('');
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [busyAnnouncementId, setBusyAnnouncementId] = useState<string | null>(null);
  const [showDiscussionForm, setShowDiscussionForm] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState('');
  const [discussionBody, setDiscussionBody] = useState<string>('');
  const [discussionCommentLimit, setDiscussionCommentLimit] = useState('1');
  const [discussionAllowComments, setDiscussionAllowComments] = useState(true);
  const [discussionPinned, setDiscussionPinned] = useState(false);
  const [discussionLinksText, setDiscussionLinksText] = useState('');
  const [discussionAttachmentFiles, setDiscussionAttachmentFiles] = useState<File[]>([]);
  const [creatingDiscussion, setCreatingDiscussion] = useState(false);
  const [busyDiscussionThreadId, setBusyDiscussionThreadId] = useState<string | null>(null);
  const [busyDiscussionCommentId, setBusyDiscussionCommentId] = useState<string | null>(null);
  const [reportDialogComment, setReportDialogComment] = useState<TeacherDiscussionComment | null>(null);
  const [discussionReportReason, setDiscussionReportReason] =
    useState<DiscussionCommentReportReason>('inappropriate');
  const [discussionReportNotes, setDiscussionReportNotes] = useState('');
  const [reportingDiscussionComment, setReportingDiscussionComment] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const [busyEnrollmentId, setBusyEnrollmentId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const classRecordState = useTeacherClassRecord(isClassIdValid ? classId : undefined);

  const fetchData = useCallback(async () => {
    if (!isClassIdValid) {
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setExtractions([]);
      setAnnouncements([]);
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
      setFinalGradeByStudentId({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const shouldLoadFullWorkspaceData = activeTab !== 'discussion';
      const [
        classRes,
        modulesRes,
        assessmentsRes,
        extractionsRes,
        announcementsRes,
        classRecordsRes,
        enrollmentsRes,
      ] = await Promise.all([
        classService.getById(classId),
        shouldLoadFullWorkspaceData
          ? moduleService
              .getByClass(classId)
              .catch(() => ({ data: [] as ClassModule[] }))
          : Promise.resolve({ data: [] as ClassModule[] }),
        shouldLoadFullWorkspaceData
          ? assessmentService
              .getByClass(classId, { page: 1, limit: 100, status: 'all' })
              .catch(() => ({ data: [] as Assessment[] }))
          : Promise.resolve({ data: [] as Assessment[] }),
        shouldLoadFullWorkspaceData
          ? extractionService
              .listByClass(classId)
              .catch(() => ({ data: [] as Extraction[] }))
          : Promise.resolve({ data: [] as Extraction[] }),
        shouldLoadFullWorkspaceData
          ? announcementService
              .getByClass(classId, { limit: 50 })
              .catch(() => ({ data: [] as Announcement[] }))
          : Promise.resolve({ data: [] as Announcement[] }),
        shouldLoadFullWorkspaceData
          ? classRecordService
              .getByClass(classId)
              .catch(() => ({ data: [] as ClassRecord[] }))
          : Promise.resolve({ data: [] as ClassRecord[] }),
        classService.getEnrollments(classId).catch(() => ({ data: [] as ClassItem['enrollments'] })),
      ]);

      const enrolled = enrollmentsRes.data || classRes.data.enrollments || [];
      setClassItem({ ...classRes.data, enrollments: enrolled });
      setModules((modulesRes.data || []).slice().sort((a, b) => a.order - b.order));
      setAssessments((assessmentsRes.data || []).slice().sort((a, b) => {
        const aTs = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTs = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTs - aTs;
      }));
      setExtractions((extractionsRes.data || []).slice().sort((a, b) => {
        const aTs = new Date(a.createdAt || 0).getTime();
        const bTs = new Date(b.createdAt || 0).getTime();
        return bTs - aTs;
      }));
      setAnnouncements((announcementsRes.data || []).slice().sort((a, b) => {
        const aTs = new Date(a.createdAt || 0).getTime();
        const bTs = new Date(b.createdAt || 0).getTime();
        return bTs - aTs;
      }));

      if (!shouldLoadFullWorkspaceData) {
        setFinalGradeByStudentId({});
      } else {
        const records = (classRecordsRes.data || []).slice().sort((left, right) => {
          const leftTs = Math.max(toTimestamp(left.updatedAt), toTimestamp(left.createdAt));
          const rightTs = Math.max(toTimestamp(right.updatedAt), toTimestamp(right.createdAt));
          return rightTs - leftTs;
        });
        const prioritizedRecord =
          records.find((record) => record.status === 'finalized') ??
          records.find((record) => record.status === 'draft') ??
          null;

        if (!prioritizedRecord?.id) {
          setFinalGradeByStudentId({});
        } else {
          const finalGradesRes = await classRecordService
            .getFinalGrades(prioritizedRecord.id)
            .catch(() => ({ data: [] as { studentId: string; finalPercentage: number }[] }));
          const gradeMap = Object.fromEntries(
            (finalGradesRes.data || []).map((grade) => [grade.studentId, grade.finalPercentage]),
          );
          setFinalGradeByStudentId(gradeMap);
        }
      }
    } catch {
      setClassItem(null);
      setModules([]);
      setAssessments([]);
      setExtractions([]);
      setAnnouncements([]);
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
      setFinalGradeByStudentId({});
    } finally {
      setLoading(false);
    }
  }, [activeTab, classId, isClassIdValid]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const loadDiscussionThreads = useCallback(async () => {
    if (!isClassIdValid) {
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
      return;
    }

    try {
      const response = await discussionBoardService.listThreads(classId, { limit: 50 });
      setDiscussionThreads(sortDiscussionThreads(response.data.items || []));
    } catch (error) {
      setDiscussionThreads([]);
      setSelectedDiscussionThreadId(null);
      setSelectedDiscussionThread(null);
      toast.error(getApiErrorMessage(error, 'Failed to load discussion threads'));
    }
  }, [classId, isClassIdValid]);

  useEffect(() => {
    if (activeTab !== 'discussion') return;
    void loadDiscussionThreads();
  }, [activeTab, loadDiscussionThreads]);

  const loadDiscussionThreadDetail = useCallback(
    async (threadId: string) => {
      try {
        const response = await discussionBoardService.getThread(classId, threadId);
        setSelectedDiscussionThread(response.data);
      } catch (error) {
        setSelectedDiscussionThread(null);
        toast.error(getApiErrorMessage(error, 'Failed to load discussion thread'));
      }
    },
    [classId],
  );

  useEffect(() => {
    if (!selectedDiscussionThreadId) {
      setSelectedDiscussionThread(null);
      return;
    }
    void loadDiscussionThreadDetail(selectedDiscussionThreadId);
  }, [loadDiscussionThreadDetail, selectedDiscussionThreadId]);

  const refreshAiDraftJobs = useCallback(async () => {
    if (!isClassIdValid) {
      setAiDraftJobs([]);
      return;
    }
    const cached = readTrackedAiDraftJobs(classId);
    if (cached.length === 0) {
      setAiDraftJobs([]);
      return;
    }

    setAiDraftJobsBusy(true);
    try {
      const refreshed = await Promise.all(cached.map(async (entry) => {
        try {
          const statusRes = await aiService.getTeacherJobStatus(entry.jobId);
          return {
            ...entry,
            lastKnownStatus: statusRes.data.status,
            lastKnownProgress: statusRes.data.progressPercent,
            assessmentId: statusRes.data.assessmentId ?? entry.assessmentId ?? null,
            updatedAt: statusRes.data.updatedAt ?? entry.updatedAt ?? null,
          };
        } catch {
          return entry;
        }
      }));

      const sorted = [...refreshed].sort((a, b) => {
        const aTs = Date.parse(a.updatedAt || a.createdAt);
        const bTs = Date.parse(b.updatedAt || b.createdAt);
        return bTs - aTs;
      });
      writeTrackedAiDraftJobs(classId, sorted);
      setAiDraftJobs(readTrackedAiDraftJobs(classId));
    } finally {
      setAiDraftJobsBusy(false);
    }
  }, [classId, isClassIdValid]);

  useEffect(() => {
    if (!isClassIdValid) {
      setAiDraftJobs([]);
      return;
    }
    setAiDraftJobs(readTrackedAiDraftJobs(classId));
  }, [classId, isClassIdValid]);

  useEffect(() => {
    if (activeTab !== 'assignments') return;
    void refreshAiDraftJobs();
  }, [activeTab, refreshAiDraftJobs]);

  useEffect(() => {
    if (activeTab !== 'assignments') return;
    if (aiDraftJobs.length === 0) return;
    if (!aiDraftJobs.some((entry) => !isAiDraftTerminalStatus(entry.lastKnownStatus))) return;
    const interval = window.setInterval(() => {
      void refreshAiDraftJobs();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeTab, aiDraftJobs, refreshAiDraftJobs]);

  useEffect(() => {
    if (activeTab !== 'extraction') return;
    if (!extractions.some((entry) => entry.extractionStatus === 'pending' || entry.extractionStatus === 'processing')) {
      return;
    }
    const interval = window.setInterval(() => {
      void fetchData();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [activeTab, extractions, fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(modulesViewStorageKey);
    if (raw === 'wide' || raw === 'compact') {
      setModulesViewMode(raw);
    } else {
      setModulesViewMode('wide');
    }
    setModulesViewLoaded(true);
  }, [modulesViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !modulesViewLoaded) return;
    window.localStorage.setItem(modulesViewStorageKey, modulesViewMode);
  }, [modulesViewLoaded, modulesViewMode, modulesViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(calendarViewStorageKey);
    if (raw === 'calendar' || raw === 'upcoming') {
      setCalendarViewMode(raw);
    } else {
      setCalendarViewMode('upcoming');
    }
    setCalendarViewLoaded(true);
  }, [calendarViewStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !calendarViewLoaded) return;
    window.localStorage.setItem(calendarViewStorageKey, calendarViewMode);
  }, [calendarViewLoaded, calendarViewMode, calendarViewStorageKey]);

  useEffect(() => {
    const moduleIdSet = new Set(modules.map((module) => module.id));
    setSelectedModuleIds((current) => current.filter((id) => moduleIdSet.has(id)));
  }, [modules]);

  const scheduleLine = useMemo(() => {
    const schedule = classItem?.schedules?.[0];
    if (!schedule) return 'Schedule TBA';
    const days = schedule.days.join('/');
    return `${days} ${schedule.startTime}-${schedule.endTime}`;
  }, [classItem]);

  const classInfoLine = useMemo(() => {
    const gradeLevel = classItem?.section?.gradeLevel || classItem?.subjectGradeLevel;
    const sectionName = classItem?.section?.name?.trim() || 'Section';
    const hasGradeInName = gradeLevel
      ? sectionName.toLowerCase().includes(`grade ${String(gradeLevel).toLowerCase()}`)
      : false;
    const sectionLabel = gradeLevel
      ? hasGradeInName
        ? sectionName
        : `Grade ${gradeLevel} - ${sectionName}`
      : sectionName;
    return `${sectionLabel} - ${scheduleLine}${classItem?.room ? ` - Room ${classItem.room}` : ''}`;
  }, [classItem?.room, classItem?.section?.gradeLevel, classItem?.section?.name, classItem?.subjectGradeLevel, scheduleLine]);

  const studentRows = useMemo<StudentRow[]>(() => {
    const enrollments = classItem?.enrollments || [];
    return enrollments.map((enrollment) => {
      const firstName = enrollment.student?.firstName?.trim() || '';
      const lastName = enrollment.student?.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unnamed Student';
      const profileLrn = enrollment.student?.profile?.lrn || '';
      const lrn = enrollment.student?.lrn || profileLrn || '--';
      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        initials: safeInitials(firstName, lastName),
        fullName,
        email: enrollment.student?.email || '--',
        lrn,
        gradePercent: finalGradeByStudentId[enrollment.studentId] ?? null,
      };
    });
  }, [classItem?.enrollments, finalGradeByStudentId]);

  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === 'all') return assessments;
    return assessments.filter((assessment) => deriveAssignmentFilter(assessment) === assignmentFilter);
  }, [assignmentFilter, assessments]);

  const assessmentAttachmentMap = useMemo(() => {
    const map = new Map<
      string,
      {
        attached: boolean;
        given: boolean;
        visible: boolean;
        moduleVisible: boolean;
        moduleLocked: boolean;
        gateOpen: boolean;
      }
    >();

    for (const classModule of modules) {
      for (const section of classModule.sections || []) {
        for (const item of section.items || []) {
          if (item.itemType !== 'assessment' || !item.assessmentId) continue;
          const current = map.get(item.assessmentId);
          const gateOpen =
            Boolean(item.isGiven) &&
            Boolean(item.isVisible) &&
            Boolean(classModule.isVisible) &&
            !classModule.isLocked;
          map.set(item.assessmentId, {
            attached: true,
            given: Boolean(current?.given || item.isGiven),
            visible: Boolean(current?.visible || item.isVisible),
            moduleVisible: Boolean(current?.moduleVisible || classModule.isVisible),
            moduleLocked: Boolean(current?.moduleLocked && classModule.isLocked),
            gateOpen: Boolean(current?.gateOpen || gateOpen),
          });
        }
      }
    }

    return map;
  }, [modules]);

  const recentAiDraftJobs = useMemo(() => aiDraftJobs.slice(0, 6), [aiDraftJobs]);
  const activeAiDraftJobCount = useMemo(
    () => aiDraftJobs.filter((entry) => !isAiDraftTerminalStatus(entry.lastKnownStatus)).length,
    [aiDraftJobs],
  );
  const activeGuidePage =
    teacherClassGuidePages[helpPage] ?? teacherClassGuidePages[0];

  useEffect(() => {
    const assessmentIdSet = new Set(filteredAssignments.map((assessment) => assessment.id));
    setSelectedAssessmentIds((current) => current.filter((id) => assessmentIdSet.has(id)));
  }, [filteredAssignments]);

  const calendarItems = useMemo<CalendarEventItem[]>(() => {
    const fromAssessments = assessments
      .filter((assessment) => Boolean(assessment.dueDate))
      .map((assessment) => {
        const dueDate = new Date(assessment.dueDate as string);
        const hasTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;
        const dueLabel = hasTime
          ? dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'All Day';

        return {
          id: `assessment-${assessment.id}`,
          title: assessment.title,
          subtitle: `${classItem?.subjectName || 'Assessment'} | Due ${dueLabel}`,
          date: dueDate,
          kind: 'assessment' as CalendarKind,
        };
      })
      .filter((item) => !Number.isNaN(item.date.getTime()));

    const fromAnnouncements = announcements
      .map((announcement) => ({
        id: `announcement-${announcement.id}`,
        title: announcement.title,
        subtitle: classItem?.subjectName || 'Class Event',
        date: new Date(announcement.scheduledAt || announcement.createdAt || ''),
        kind: inferCalendarKindFromAnnouncement(announcement),
      }))
      .filter((item) => !Number.isNaN(item.date.getTime()));

    return [...fromAssessments, ...fromAnnouncements]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 12);
  }, [announcements, assessments, classItem?.subjectName]);

  const calendarEventMap = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    calendarItems.forEach((event) => {
      const key = formatDateKey(event.date);
      const current = map.get(key) || [];
      current.push(event);
      map.set(key, current);
    });
    return map;
  }, [calendarItems]);

  useEffect(() => {
    if (calendarItems.length === 0) {
      setSelectedCalendarDateKey(null);
      return;
    }

    const monthEvent = calendarItems.find(
      (event) =>
        event.date.getFullYear() === calendarMonth.getFullYear() &&
        event.date.getMonth() === calendarMonth.getMonth(),
    );
    const fallback = monthEvent || calendarItems[0];
    const nextKey = formatDateKey(fallback.date);
    setSelectedCalendarDateKey((current) => current || nextKey);
  }, [calendarItems, calendarMonth]);

  const calendarGridDays = useMemo(() => {
    const monthStart = getMonthStart(calendarMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);
    const prevMonthDays = prevMonthEnd.getDate();

    const cells: Array<{ date: Date; key: string; inMonth: boolean; events: CalendarEventItem[] }> = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, prevMonthDays - i);
      const key = formatDateKey(date);
      cells.push({
        date,
        key,
        inMonth: false,
        events: calendarEventMap.get(key) || [],
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const key = formatDateKey(date);
      cells.push({
        date,
        key,
        inMonth: true,
        events: calendarEventMap.get(key) || [],
      });
    }

    while (cells.length % 7 !== 0) {
      const offset = cells.length - (firstWeekday + daysInMonth);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, offset + 1);
      const key = formatDateKey(date);
      cells.push({
        date,
        key,
        inMonth: false,
        events: calendarEventMap.get(key) || [],
      });
    }

    return cells;
  }, [calendarEventMap, calendarMonth]);

  const selectedCalendarEvents = useMemo(() => {
    if (!selectedCalendarDateKey) return [];
    return calendarEventMap.get(selectedCalendarDateKey) || [];
  }, [calendarEventMap, selectedCalendarDateKey]);

  const moduleDeadlineCards = useMemo<ModuleDeadlineCardItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = Date.now();
    const urgentWindowMs = 1000 * 60 * 60 * 72;

    const upcomingOnly = calendarItems.filter((event) => event.date.getTime() >= today.getTime());
    const source = (upcomingOnly.length > 0 ? upcomingOnly : calendarItems).slice(0, 8);

    return source.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: event.subtitle,
      dayLabel: String(event.date.getDate()).padStart(2, '0'),
      monthLabel: event.date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      kind: event.kind,
      href:
        event.kind === 'assessment'
          ? `/dashboard/teacher/classes/${classId}?view=assignments`
          : `/dashboard/teacher/classes/${classId}?view=calendar`,
      isUrgent: event.date.getTime() <= now + urgentWindowMs,
    }));
  }, [calendarItems, classId]);

  const moduleTone = (index: number) => {
    const tones = ['blue', 'green', 'violet', 'orange', 'rose', 'slate'] as const;
    return tones[index % tones.length];
  };
  const getModuleGradient = (gradientId?: string) =>
    MODULE_GRADIENT_OPTIONS.find((option) => option.id === gradientId)?.background ||
    MODULE_GRADIENT_OPTIONS[0].background;

  useEffect(() => {
    const objectUrl = localModuleCoverDraft?.objectUrl;
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [localModuleCoverDraft?.objectUrl]);

  const clearLocalModuleCoverDraft = useCallback(() => {
    setLocalModuleCoverDraft((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }
      return null;
    });
  }, []);

  const closeModuleDesignDialog = useCallback(() => {
    setCustomizingModuleId(null);
    setModuleCoverError(null);
    clearLocalModuleCoverDraft();
  }, [clearLocalModuleCoverDraft]);

  const allModulesSelected = modules.length > 0 && selectedModuleIds.length === modules.length;
  const allFilteredAssessmentsSelected =
    filteredAssignments.length > 0 && selectedAssessmentIds.length === filteredAssignments.length;

  const handleCreateModule = async () => {
    if (creatingModule) return;
    const title = newModuleTitle.trim();
    if (!title) {
      toast.error('Module title is required');
      return;
    }
    if (title.length > 120) {
      toast.error('Module title is too long');
      return;
    }
    try {
      setCreatingModule(true);
      await moduleService.create({
        classId,
        title,
        description: normalizeRichText(newModuleDescription).trim() || undefined,
        isVisible: false,
        isLocked: true,
      });
      toast.success('Module created');
      setShowAddModuleModal(false);
      setNewModuleTitle('');
      setNewModuleDescription('');
      await fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create module'));
    } finally {
      setCreatingModule(false);
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId],
    );
  };

  const toggleSelectAllModules = () => {
    setSelectedModuleIds(allModulesSelected ? [] : modules.map((module) => module.id));
  };

  const applyModuleReorder = async (nextModules: ClassModule[]) => {
    const previousModules = modules;
    const normalized = normalizeModulesOrder(nextModules);
    setModules(normalized);
    try {
      setIsReorderingModules(true);
      await moduleService.reorderByClass(
        classId,
        normalized.map((module) => ({ id: module.id, order: module.order })),
      );
      toast.success('Module order updated');
    } catch (error) {
      setModules(previousModules);
      toast.error(getApiErrorMessage(error, 'Failed to save module order'));
    } finally {
      setIsReorderingModules(false);
    }
  };

  const moveModuleOneStep = async (moduleId: string, direction: -1 | 1) => {
    if (isReorderingModules) return;

    const sourceIndex = modules.findIndex((module) => module.id === moduleId);
    if (sourceIndex < 0) return;

    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = modules.slice();
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    await applyModuleReorder(reordered);
  };

  const performDeleteModule = async (moduleId: string) => {
    if (busyModuleId) return;
    try {
      setBusyModuleId(moduleId);
      await moduleService.delete(moduleId);
      setModules((current) => current.filter((module) => module.id !== moduleId));
      setSelectedModuleIds((current) => current.filter((id) => id !== moduleId));
      toast.success('Module deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete module'));
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    setConfirmation({
      title: 'Delete Module',
      description: 'This will permanently remove the module and all of its organization details.',
      confirmLabel: 'Delete Module',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteModule(moduleId),
    });
  };

  const handleBulkDeleteModules = () => {
    if (selectedModuleIds.length === 0) return;
    const idsToDelete = selectedModuleIds.slice();
    setConfirmation({
      title: `Delete ${idsToDelete.length} Modules`,
      description: 'Selected modules will be permanently deleted.',
      confirmLabel: 'Delete Selected',
      tone: 'danger',
      details: `You are deleting ${idsToDelete.length} module(s). This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(idsToDelete.map((moduleId) => moduleService.delete(moduleId)));
          setModules((current) => current.filter((module) => !idsToDelete.includes(module.id)));
          setSelectedModuleIds([]);
          toast.success(`${idsToDelete.length} module(s) deleted`);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to delete selected modules'));
        }
      },
    });
  };

  const openModuleDesignDialog = (module: ClassModule) => {
    setCustomizingModuleId(module.id);
    setModuleDraft(normalizeModulePresentation(module));
    setModuleCoverError(null);
    clearLocalModuleCoverDraft();
  };

  const toggleCoreModuleVisibility = async (module: ClassModule) => {
    try {
      const response = await moduleService.releaseCoreModule(module.id, {
        isVisible: !module.isVisible,
      });
      setModules((current) =>
        current.map((entry) =>
          entry.id === module.id ? response.data : entry,
        ),
      );
      toast.success(
        response.data.isVisible
          ? 'Core module released to students'
          : 'Core module hidden from students',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Failed to update core module release'),
      );
    }
  };

  const handleUploadModuleCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setModuleCoverError(null);
      await validateModuleCoverFile(file);
      const nextObjectUrl = URL.createObjectURL(file);
      clearLocalModuleCoverDraft();
      setLocalModuleCoverDraft({
        file,
        objectUrl: nextObjectUrl,
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
      });
      setModuleDraft((current) => ({
        ...current,
        themeKind: 'image',
        imagePositionX: 50,
        imagePositionY: 50,
        imageScale: 120,
      }));
    } catch (error) {
      setModuleCoverError(
        error instanceof Error ? error.message : 'Failed to prepare cover image.',
      );
    }
  };

  const handleSaveModuleDesign = async () => {
    if (!customizingModuleId || savingModuleDesign) return;
    try {
      setSavingModuleDesign(true);
      setModuleCoverError(null);

      if (moduleDraft.themeKind === 'image' && localModuleCoverDraft) {
        const croppedBlob = await createCroppedModuleCoverBlob(
          localModuleCoverDraft.objectUrl,
          localModuleCoverDraft.croppedAreaPixels,
        );
        const uploadFile = new File(
          [croppedBlob],
          `${sanitizeModuleCoverUploadName(localModuleCoverDraft.file.name)}.png`,
          { type: 'image/png' },
        );
        const uploadResponse = await moduleService.uploadCover(customizingModuleId, uploadFile);
        setModules((current) =>
          current.map((module) =>
            module.id === customizingModuleId ? uploadResponse.data.module : module,
          ),
        );
        clearLocalModuleCoverDraft();
        setCustomizingModuleId(null);
        toast.success('Module design updated');
        return;
      }

      if (moduleDraft.themeKind === 'image' && !moduleDraft.coverImageUrl) {
        throw new Error(
          'Choose a stock image or upload a custom image before saving image mode.',
        );
      }

      const response = await moduleService.update(customizingModuleId, {
        themeKind: moduleDraft.themeKind,
        gradientId: moduleDraft.gradientId,
        coverImageUrl: moduleDraft.coverImageUrl,
        imagePositionX: moduleDraft.imagePositionX,
        imagePositionY: moduleDraft.imagePositionY,
        imageScale: moduleDraft.imageScale,
      });
      setModules((current) =>
        current.map((module) =>
          module.id === customizingModuleId ? response.data : module,
        ),
      );
      closeModuleDesignDialog();
      toast.success('Module design updated');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to update module design');
      setModuleCoverError(message);
      toast.error(message);
    } finally {
      setSavingModuleDesign(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (creatingAssessment) return;
    try {
      setCreatingAssessment(true);
      const response = await assessmentService.create({
        title: 'Untitled Assessment',
        classId,
      });
      toast.success('Assessment created');
      router.push(`/dashboard/teacher/assessments/${response.data.id}/edit`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create assessment'));
    } finally {
      setCreatingAssessment(false);
    }
  };

  const toggleAssessmentSelection = (assessmentId: string) => {
    setSelectedAssessmentIds((current) =>
      current.includes(assessmentId) ? current.filter((id) => id !== assessmentId) : [...current, assessmentId],
    );
  };

  const toggleSelectAllFilteredAssessments = () => {
    setSelectedAssessmentIds(
      allFilteredAssessmentsSelected ? [] : filteredAssignments.map((assessment) => assessment.id),
    );
  };

  const performDeleteAssessment = async (assessmentId: string) => {
    if (busyAssessmentId) return;
    try {
      setBusyAssessmentId(assessmentId);
      await assessmentService.delete(assessmentId);
      setAssessments((current) => current.filter((assessment) => assessment.id !== assessmentId));
      setSelectedAssessmentIds((current) => current.filter((id) => id !== assessmentId));
      await fetchData();
      toast.success('Assessment deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete assessment'));
    } finally {
      setBusyAssessmentId(null);
    }
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    setConfirmation({
      title: 'Delete Assignment',
      description: 'This assignment will be permanently deleted.',
      confirmLabel: 'Delete Assignment',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteAssessment(assessmentId),
    });
  };

  const handleBulkDeleteAssessments = () => {
    if (selectedAssessmentIds.length === 0) return;
    const idsToDelete = selectedAssessmentIds.slice();
    setConfirmation({
      title: `Delete ${idsToDelete.length} Assignments`,
      description: 'Selected assignments will be permanently deleted.',
      confirmLabel: 'Delete Selected',
      tone: 'danger',
      details: `You are deleting ${idsToDelete.length} assignment(s). This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(idsToDelete.map((assessmentId) => assessmentService.delete(assessmentId)));
          setAssessments((current) => current.filter((assessment) => !idsToDelete.includes(assessment.id)));
          setSelectedAssessmentIds([]);
          await fetchData();
          toast.success(`${idsToDelete.length} assignment(s) deleted`);
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to delete selected assignments'));
        }
      },
    });
  };

  const toggleCoreAssessmentRelease = async (assessment: Assessment) => {
    if (busyAssessmentId) return;

    try {
      setBusyAssessmentId(assessment.id);
      const nextIsPublished = !assessment.isPublished;
      const isCoreTemplateAssessment = Boolean(assessment.isCoreTemplateAsset);
      let validatedAssessment = assessment;

      if (nextIsPublished && isCoreTemplateAssessment) {
        if (!hasCoreAssessmentPlacementForPublish(assessment)) {
          try {
            const detailedAssessment = await assessmentService.getById(assessment.id);
            validatedAssessment = resolveAssessmentForPublishValidation(
              assessment,
              detailedAssessment.data,
            );
          } catch (error) {
            toast.error(
              getApiErrorMessage(error, 'Failed to validate class record placement'),
            );
            return;
          }
        }
      }

      if (
        nextIsPublished &&
        isCoreTemplateAssessment &&
        !hasCoreAssessmentPlacementForPublish(validatedAssessment)
      ) {
        toast.warning(
          'Core assessments must be tagged in a class record category, quarter, and slot before publishing.',
        );
        return;
      }

      const response = await assessmentService.releaseCore(assessment.id, {
        isPublished: nextIsPublished,
      });
      setAssessments((current) =>
        current.map((entry) =>
          entry.id === assessment.id
            ? {
                ...entry,
                ...validatedAssessment,
                ...response.data,
              }
            : entry,
        ),
      );
      toast.success(
        response.data.isPublished
          ? 'Default assessment released to students'
          : 'Default assessment hidden from students',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Failed to update default assessment release'),
      );
    } finally {
      setBusyAssessmentId(null);
    }
  };

  const handleAssignmentCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>, assessmentId: string) => {
      const target = event.target as HTMLElement;
      if (target.closest('a,button,input,textarea,select,label,[role="button"],[role="link"]')) {
        return;
      }
      router.push(`/dashboard/teacher/assessments/${assessmentId}`);
    },
    [router],
  );

  const renderSelectionCheckbox = ({
    checked,
    onChange,
    ariaLabel,
  }: {
    checked: boolean;
    onChange: () => void;
    ariaLabel: string;
  }) => (
    <input
      type="checkbox"
      className="teacher-class-workspace__check"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );

  const handleExtractionSelect = () => {
    if (aiUnavailable) return;
    extractionInputRef.current?.click();
  };

  const handleExtractionFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingExtraction || aiUnavailable) return;
    const subjectKey = normalizeLibrarySubjectKey(
      classItem?.subjectCode,
      classItem?.subjectName,
    );
    const gradeLevel = normalizeLibraryGradeLevel(
      classItem?.subjectGradeLevel ?? classItem?.section?.gradeLevel,
    );
    if (!subjectKey || !gradeLevel) {
      toast.error('Unable to resolve class subject and grade for extraction upload.');
      return;
    }
    try {
      setUploadingExtraction(true);
      const uploadRes = await fileService.upload(file, {
        classId,
        scope: 'private',
        subjectKey,
        gradeLevel,
        aiEnabled: true,
      });
      const extractionRes = await extractionService.extractModule({
        fileId: uploadRes.data.id,
        targetSectionCount,
      });
      upsertTrackedExtractionNotification(classId, {
        extractionId: extractionRes.data.extractionId,
        classId,
        createdAt: new Date().toISOString(),
        originalName: file.name,
        targetSectionCount,
        lastKnownStatus: 'pending',
        lastKnownProgress: 0,
        updatedAt: null,
        notifiedAt: null,
      });
      toast.success('Extraction started');
      await fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start extraction'));
    } finally {
      setUploadingExtraction(false);
    }
  };

  const performDeleteExtraction = async (extractionId: string) => {
    try {
      await extractionService.delete(extractionId);
      setExtractions((current) => current.filter((extraction) => extraction.id !== extractionId));
      toast.success('Extraction deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete extraction'));
    }
  };

  const handleDeleteExtraction = (extractionId: string) => {
    setConfirmation({
      title: 'Delete Extraction',
      description: 'This extraction draft will be permanently removed from the class workspace.',
      confirmLabel: 'Delete Extraction',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteExtraction(extractionId),
    });
  };

  const handleCreateAnnouncement = async () => {
    const safeContent = normalizeRichText(announcementContent).trim();
    if (creatingAnnouncement) return;
    if (!announcementTitle.trim()) {
      toast.error('Announcement title is required');
      return;
    }
    if (!safeContent) {
      toast.error('Announcement content is required');
      return;
    }
    try {
      setCreatingAnnouncement(true);
      await announcementService.create(classId, {
        title: announcementTitle.trim(),
        content: safeContent,
        isPinned: announcementPinned,
      });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setAnnouncementPinned(false);
      setShowAnnouncementForm(false);
      toast.success('Announcement posted');
      await fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to post announcement'));
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const performDeleteAnnouncement = async (announcementId: string) => {
    if (busyAnnouncementId) return;
    try {
      setBusyAnnouncementId(announcementId);
      await announcementService.delete(classId, announcementId);
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));
      toast.success('Announcement deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete announcement'));
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    setConfirmation({
      title: 'Delete Announcement',
      description: 'This announcement will be permanently removed from the class feed.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: 'This action cannot be undone.',
      onConfirm: () => performDeleteAnnouncement(announcementId),
    });
  };

  const resetDiscussionComposer = () => {
    setDiscussionTitle('');
    setDiscussionBody('');
    setDiscussionCommentLimit('1');
    setDiscussionAllowComments(true);
    setDiscussionPinned(false);
    setDiscussionLinksText('');
    setDiscussionAttachmentFiles([]);
    setShowDiscussionForm(false);
  };

  const handleCreateDiscussionThread = async (publishImmediately: boolean) => {
    const safeBody = normalizeRichText(discussionBody).trim();
    if (creatingDiscussion) return;
    if (!discussionTitle.trim()) {
      toast.error('Discussion title is required');
      return;
    }
    if (!safeBody) {
      toast.error('Discussion prompt is required');
      return;
    }

    const commentLimit = Number.parseInt(discussionCommentLimit, 10);
    const parsedLinks = discussionLinksText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url) => ({ url }));

    try {
      setCreatingDiscussion(true);
      const uploadedFiles = await Promise.all(
        discussionAttachmentFiles.map((file) =>
          discussionBoardService.uploadThreadAttachment(classId, file),
        ),
      );
      const fileAttachmentIds = uploadedFiles.map((entry) => entry.data.id);

      const created = await discussionBoardService.createThread(classId, {
        title: discussionTitle.trim(),
        bodyHtml: safeBody,
        themeId: 'classic',
        commentLimitPerStudent:
          Number.isFinite(commentLimit) && commentLimit > 0 ? commentLimit : 1,
        allowComments: discussionAllowComments,
        isPinned: discussionPinned,
        fileAttachmentIds,
        linkAttachments: parsedLinks,
      });

      let nextThread = created.data;
      if (publishImmediately) {
        const published = await discussionBoardService.publishThread(
          classId,
          created.data.id,
        );
        nextThread = published.data;
      }

      setDiscussionThreads((current) => {
        const withoutExisting = current.filter((entry) => entry.id !== nextThread.id);
        return sortDiscussionThreads([nextThread, ...withoutExisting]);
      });
      setSelectedDiscussionThreadId(nextThread.id);
      setSelectedDiscussionThread(nextThread);
      resetDiscussionComposer();
      toast.success(
        publishImmediately
          ? 'Discussion thread published'
          : 'Discussion thread saved as draft',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save discussion thread'));
    } finally {
      setCreatingDiscussion(false);
    }
  };

  const handleDiscussionThreadAction = async (
    threadId: string,
    action: 'publish' | 'close' | 'reopen' | 'archive',
  ) => {
    if (busyDiscussionThreadId) return;
    try {
      setBusyDiscussionThreadId(threadId);
      if (action === 'archive') {
        await discussionBoardService.archiveThread(classId, threadId);
        setDiscussionThreads((current) =>
          current.filter((entry) => entry.id !== threadId),
        );
        if (selectedDiscussionThreadId === threadId) {
          setSelectedDiscussionThreadId(null);
          setSelectedDiscussionThread(null);
        }
        toast.success('Discussion thread archived');
        return;
      }

      const response =
        action === 'publish'
          ? await discussionBoardService.publishThread(classId, threadId)
          : action === 'close'
            ? await discussionBoardService.closeThread(classId, threadId)
            : await discussionBoardService.reopenThread(classId, threadId);

      const updated = response.data;
      setDiscussionThreads((current) =>
        sortDiscussionThreads(
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        ),
      );
      if (selectedDiscussionThreadId === updated.id) {
        setSelectedDiscussionThread(updated);
      }
      toast.success(
        action === 'publish'
          ? 'Thread published'
          : action === 'close'
            ? 'Thread closed'
            : 'Thread reopened',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update discussion thread'));
    } finally {
      setBusyDiscussionThreadId(null);
    }
  };

  const performDeleteDiscussionComment = async (commentId: string) => {
    if (!selectedDiscussionThread || busyDiscussionCommentId) return;
    try {
      setBusyDiscussionCommentId(commentId);
      await discussionBoardService.deleteComment(
        classId,
        selectedDiscussionThread.id,
        commentId,
      );
      await loadDiscussionThreadDetail(selectedDiscussionThread.id);
      await loadDiscussionThreads();
      toast.success('Comment removed from the discussion');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove comment'));
    } finally {
      setBusyDiscussionCommentId(null);
    }
  };

  const handleDeleteDiscussionComment = (comment: TeacherDiscussionComment) => {
    setConfirmation({
      title: 'Delete Comment',
      description: 'This reply will be removed from the thread for all students.',
      confirmLabel: 'Delete Comment',
      tone: 'danger',
      details: (
        <div className="teacher-discussion-confirmation-copy">
          <strong>{getDiscussionAuthorName(comment.author)}</strong>
          <p>{stripDiscussionHtml(comment.bodyHtml) || 'Image-only reply'}</p>
        </div>
      ),
      onConfirm: () => performDeleteDiscussionComment(comment.id),
    });
  };

  const handleOpenDiscussionReportDialog = (comment: TeacherDiscussionComment) => {
    setReportDialogComment(comment);
    setDiscussionReportReason('inappropriate');
    setDiscussionReportNotes('');
  };

  const handleCopyDiscussionComment = async (comment: TeacherDiscussionComment) => {
    const plainText = stripDiscussionHtml(comment.bodyHtml);
    if (!plainText) {
      toast.error('This reply only contains attachments');
      return;
    }

    try {
      await navigator.clipboard.writeText(plainText);
      toast.success('Reply text copied');
    } catch {
      toast.error('Failed to copy reply text');
    }
  };

  const handleSubmitDiscussionCommentReport = async () => {
    if (!selectedDiscussionThread || !reportDialogComment || reportingDiscussionComment) return;
    try {
      setReportingDiscussionComment(true);
      await discussionBoardService.reportComment(
        classId,
        selectedDiscussionThread.id,
        reportDialogComment.id,
        {
          reasonCode: discussionReportReason,
          notes: discussionReportNotes.trim() || undefined,
        },
      );
      toast.success(
        `${getDiscussionAuthorName(reportDialogComment.author)} was flagged for moderator follow-up`,
      );
      setReportDialogComment(null);
      setDiscussionReportNotes('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to report comment'));
    } finally {
      setReportingDiscussionComment(false);
    }
  };

  const performRemoveStudent = async (enrollmentId: string, studentId: string) => {
    if (busyEnrollmentId) return;
    try {
      setBusyEnrollmentId(enrollmentId);
      await classService.unenrollStudent(classId, studentId);
      setClassItem((current) =>
        current
          ? {
              ...current,
              enrollments: (current.enrollments || []).filter((enrollment) => enrollment.id !== enrollmentId),
            }
          : current,
      );
      toast.success('Student removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student'));
    } finally {
      setBusyEnrollmentId(null);
    }
  };

  const handleRemoveStudent = (enrollmentId: string, studentId: string) => {
    setConfirmation({
      title: 'Remove Student',
      description: 'This student will be removed from the class roster.',
      confirmLabel: 'Remove Student',
      tone: 'danger',
      details: 'Class enrollment and module access for this class will be removed.',
      onConfirm: () => performRemoveStudent(enrollmentId, studentId),
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[34rem] rounded-xl" />
      </div>
    );
  }

  if (!classItem) {
    return (
      <section className="teacher-class-workspace__not-found">
        <p>{isClassIdValid ? 'Class not found.' : 'Invalid class link.'}</p>
        <Link href="/dashboard/teacher/classes">Back to Classes</Link>
      </section>
    );
  }

  const workspaceTabs = CLASS_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    href: `/dashboard/teacher/classes/${classId}?view=${tab.key}`,
    icon: tab.icon,
    active: activeTab === tab.key,
  }));

  return (
    <div className="teacher-class-workspace-wrap">
      <ClassWorkspaceShell
        backHref="/dashboard/teacher/classes"
        backLabel={
          <>
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </>
        }
        icon={<BookOpen className="h-5 w-5" />}
        title={classItem.subjectName}
        subtitle={classInfoLine}
        metaItems={[
          { key: 'students', label: `${studentRows.length} students` },
          { key: 'modules', label: `${modules.length} modules` },
        ]}
        tabs={workspaceTabs}
        heroActions={
          <Button
            type="button"
            variant="outline"
            className="teacher-class-help-button"
            aria-label="Module help"
            onClick={() => {
              setHelpPage(0);
              setHelpOpen(true);
            }}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
        }
      >
        {activeTab === 'modules' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2 className="teacher-class-workspace__section-title">Course Modules</h2>
                <p>{modules.length} modules</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => setShowAddModuleModal(true)}
                  disabled={creatingModule}
                >
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
                <div className="teacher-class-workspace__view-toggle" role="group" aria-label="Module view style">
                  <button
                    type="button"
                    data-active={modulesViewMode === 'wide'}
                    onClick={() => setModulesViewMode('wide')}
                    aria-label="Wide list view"
                    title="Wide list view"
                  >
                    <LayoutPanelTop className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-active={modulesViewMode === 'compact'}
                    onClick={() => setModulesViewMode('compact')}
                    aria-label="Compact card view"
                    title="Compact card view"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                </div>
                <Button type="button" className="teacher-class-workspace__outline" onClick={toggleSelectAllModules}>
                  {allModulesSelected ? 'Clear Selection' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                  disabled={selectedModuleIds.length === 0}
                  onClick={handleBulkDeleteModules}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
            <div
              className={
                modulesViewMode === 'compact'
                  ? 'teacher-class-workspace__modules-grid teacher-class-workspace__modules-grid--compact'
                  : 'teacher-class-workspace__modules-grid teacher-class-workspace__modules-grid--wide'
              }
            >
              {modules.map((module, index) => {
                const summary = summarizeModule(module);
                const isSelected = selectedModuleIds.includes(module.id);
                const isCoreModule = Boolean(module.isCoreTemplateAsset);
                const mediaSource =
                  module.coverImageUrl ||
                  MODULE_STOCK_IMAGE_OPTIONS[index % MODULE_STOCK_IMAGE_OPTIONS.length].imageUrl;
                const gradientBackground = getModuleGradient(module.gradientId);
                const imagePositionX = module.imagePositionX ?? 50;
                const imagePositionY = module.imagePositionY ?? 50;
                const imageScale = module.imageScale ?? 120;
                    return (
                  <article
                    key={module.id}
                    className="teacher-class-workspace__module-card"
                    data-tone={moduleTone(index)}
                    data-selected={isSelected}
                  >
                    <div className="teacher-class-workspace__module-leading">
                      {renderSelectionCheckbox({
                        checked: isSelected,
                        onChange: () => toggleModuleSelection(module.id),
                        ariaLabel: `Select ${module.title}`,
                      })}
                      <div className="teacher-class-workspace__module-actions">
                        <button
                          type="button"
                          className="teacher-class-workspace__module-action teacher-class-workspace__module-action--design"
                          onClick={() => void moveModuleOneStep(module.id, -1)}
                          disabled={isReorderingModules || index === 0}
                          aria-label={`Move ${module.title} up`}
                          title="Move module up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="teacher-class-workspace__module-action teacher-class-workspace__module-action--design"
                          onClick={() => void moveModuleOneStep(module.id, 1)}
                          disabled={isReorderingModules || index === modules.length - 1}
                          aria-label={`Move ${module.title} down`}
                          title="Move module down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/teacher/classes/${classId}/modules/${module.id}`}
                      className="teacher-class-workspace__module-main-link"
                    >
                      <div className="teacher-class-workspace__module-media-wrap">
                        <div
                          className="teacher-class-workspace__module-media"
                          style={{
                            backgroundImage: `linear-gradient(120deg, rgba(8, 23, 44, 0.26), rgba(8, 23, 44, 0.12)), url(${mediaSource})`,
                            backgroundSize: `${imageScale}%`,
                            backgroundPosition: `${imagePositionX}% ${imagePositionY}%`,
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#f1f5fb',
                          }}
                        >
                          <div
                            className="teacher-class-workspace__module-media-gradient"
                            style={{ background: gradientBackground }}
                          />
                        </div>
                      </div>
                      <header>
                        <div className="teacher-class-workspace__module-index">{index + 1}</div>
                        <div className="teacher-class-workspace__module-copy">
                          <h3>{module.title}</h3>
                          {isCoreModule ? (
                            <span className="teacher-class-workspace__pill">
                              Core Module
                            </span>
                          ) : null}
                          {module.description ? <RichTextRenderer html={module.description} /> : <p>Add a short module description.</p>}
                        </div>
                      </header>
                      <div className="teacher-class-workspace__module-stats">
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
                      </div>
                    </Link>
                    {isCoreModule ? (
                      <button
                        type="button"
                        className="teacher-class-workspace__outline teacher-class-workspace__module-core-action"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void toggleCoreModuleVisibility(module);
                        }}
                      >
                        {module.isVisible ? 'Hide Core' : 'Release Core'}
                      </button>
                    ) : (
                      <div className="teacher-class-workspace__module-actions">
                        <button
                          type="button"
                          className="teacher-class-workspace__module-action teacher-class-workspace__module-action--design"
                          onClick={() => openModuleDesignDialog(module)}
                          aria-label="Customize module design"
                          title="Customize module design"
                        >
                          <Palette className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="teacher-class-workspace__module-action teacher-class-workspace__module-action--delete"
                          onClick={() => handleDeleteModule(module.id)}
                          disabled={busyModuleId === module.id}
                          aria-label="Delete module"
                          title="Delete module"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
              {modules.length === 0 ? (
                <div className="teacher-class-workspace__empty">No modules yet.</div>
              ) : null}
            </div>

            <article className="teacher-class-workspace__module-deadline-panel">
              <div className="teacher-class-workspace__module-deadline-head">
                <div>
                  <h3>Upcoming Deadlines</h3>
                  <p>Stay on top of quizzes, events, and announcements for this class.</p>
                </div>
                <Link href={`/dashboard/teacher/classes/${classId}?view=calendar`} className="teacher-class-workspace__outline">
                  Open Calendar
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {moduleDeadlineCards.length === 0 ? (
                <div className="teacher-class-workspace__module-deadline-empty">
                  No upcoming deadlines yet.
                </div>
              ) : (
                <div className="teacher-class-workspace__module-deadline-row">
                  {moduleDeadlineCards.map((deadline) => (
                    <Link
                      key={deadline.id}
                      href={deadline.href}
                      className="teacher-class-workspace__module-deadline-card"
                      data-kind={deadline.kind}
                    >
                      <div className="teacher-class-workspace__module-deadline-date">
                        <strong>{deadline.dayLabel}</strong>
                        <span>{deadline.monthLabel}</span>
                      </div>
                      <div className="teacher-class-workspace__module-deadline-copy">
                        <h4>{deadline.title}</h4>
                        <p>{deadline.subtitle}</p>
                        <span data-urgent={deadline.isUrgent}>
                          {deadline.isUrgent ? 'Due Soon' : calendarKindLabel(deadline.kind)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </div>
        ) : null}

        {activeTab === 'assignments' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Assignments</h2>
                <p>{filteredAssignments.length} assignments</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <Link href={`/dashboard/teacher/classes/${classId}/ai-draft`} className="teacher-class-workspace__outline">
                  AI Draft
                </Link>
                <Button
                  type="button"
                  className="teacher-class-workspace__solid"
                  onClick={() => void handleCreateAssessment()}
                  disabled={creatingAssessment}
                >
                  <Plus className="h-4 w-4" />
                  New Assignment
                </Button>
              </div>
            </div>

            <article className="teacher-class-workspace__assignment-card">
              <div className="teacher-class-workspace__assignment-main">
                <div className="teacher-class-workspace__assignment-icon">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="teacher-class-workspace__assignment-copy">
                  <div className="teacher-class-workspace__assignment-tags">
                    <span>AI Draft Jobs</span>
                    <span data-status={activeAiDraftJobCount > 0 ? 'published' : 'draft'}>
                      {activeAiDraftJobCount > 0 ? `${activeAiDraftJobCount} active` : 'No active jobs'}
                    </span>
                  </div>
                  <p>
                    {aiDraftJobsBusy ? 'Refreshing AI draft tracker...' : `${recentAiDraftJobs.length} tracked job(s) for this class`}
                  </p>
                  {recentAiDraftJobs.length === 0 ? (
                    <div className="teacher-class-workspace__assignment-actions">
                      <Link href={`/dashboard/teacher/classes/${classId}/ai-draft`} className="teacher-class-workspace__outline">
                        Start AI Draft
                      </Link>
                    </div>
                  ) : (
                    <div className="teacher-class-workspace__stack">
                      {recentAiDraftJobs.map((entry) => (
                        <div key={entry.jobId} className="teacher-class-workspace__selection-bar">
                          <div>
                            <strong>{entry.jobId}</strong>
                            <p className="text-xs text-muted-foreground">
                              {entry.lastKnownStatus} - {Math.round(entry.lastKnownProgress)}% - {formatRelativeTime(entry.updatedAt || entry.createdAt)}
                            </p>
                          </div>
                          <div className="teacher-class-workspace__selection-actions">
                            <Link href={`/dashboard/teacher/classes/${classId}/ai-draft`} className="teacher-class-workspace__outline">
                              Resume
                            </Link>
                            {entry.assessmentId ? (
                              <Link href={`/dashboard/teacher/assessments/${entry.assessmentId}/edit`} className="teacher-class-workspace__outline">
                                Open Assessment
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <div className="teacher-class-workspace__chips">
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

            <div className="teacher-class-workspace__selection-bar">
              <label>
                {renderSelectionCheckbox({
                  checked: allFilteredAssessmentsSelected,
                  onChange: toggleSelectAllFilteredAssessments,
                  ariaLabel: 'Select all filtered assignments',
                })}
                <span>Select All (Filtered)</span>
              </label>
              {selectedAssessmentIds.length > 0 ? (
                <div className="teacher-class-workspace__selection-actions">
                  <span>{selectedAssessmentIds.length} selected</span>
                  <Button type="button" className="teacher-class-workspace__outline" onClick={() => setSelectedAssessmentIds([])}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                    onClick={handleBulkDeleteAssessments}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="teacher-class-workspace__stack">
              {filteredAssignments.map((assessment) => {
                const filter = deriveAssignmentFilter(assessment);
                const isSelected = selectedAssessmentIds.includes(assessment.id);
                const isCoreAssessment = Boolean(assessment.isCoreTemplateAsset);
                const attachmentState = assessmentAttachmentMap.get(assessment.id);
                const moduleGateOpen = Boolean(attachmentState?.gateOpen);
                return (
                  <article key={assessment.id} className="teacher-class-workspace__assignment-card" data-selected={isSelected}>
                    <div
                      className="teacher-class-workspace__assignment-main"
                      onClick={(event) => handleAssignmentCardClick(event, assessment.id)}
                    >
                      {renderSelectionCheckbox({
                        checked: isSelected,
                        onChange: () => toggleAssessmentSelection(assessment.id),
                        ariaLabel: `Select ${assessment.title}`,
                      })}
                      <Link
                        href={`/dashboard/teacher/assessments/${assessment.id}`}
                        className="teacher-class-workspace__assignment-link"
                      >
                        <div className="teacher-class-workspace__assignment-icon">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="teacher-class-workspace__assignment-copy">
                          <div className="teacher-class-workspace__assignment-tags">
                            <span>{assignmentTagLabel(filter)}</span>
                            <span data-status={assessment.isPublished ? 'published' : 'draft'}>
                              {assessment.isPublished ? 'Published' : 'Draft'}
                            </span>
                            {isCoreAssessment ? <span>Default</span> : null}
                            <span>
                              {attachmentState?.attached
                                ? moduleGateOpen
                                  ? 'Attached: module-visible'
                                  : 'Attached: module-gated'
                                : 'Standalone class assignment'}
                            </span>
                          </div>
                          <h3>{assessment.title}</h3>
                          <p>
                            {(assessment.questions?.length ?? 0)} questions - {assessment.totalPoints ?? 0} pts - Due {formatDateYmd(assessment.dueDate)}
                          </p>
                        </div>
                      </Link>
                    </div>
                    <div className="teacher-class-workspace__assignment-actions">
                      {isCoreAssessment ? (
                        <>
                          <button
                            type="button"
                            className="teacher-class-workspace__outline"
                            onClick={() => void toggleCoreAssessmentRelease(assessment)}
                            disabled={busyAssessmentId === assessment.id}
                          >
                            {assessment.isPublished ? 'Hide Core' : 'Release Core'}
                          </button>
                          <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`} className="teacher-class-workspace__outline">
                            Edit
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`} className="teacher-class-workspace__outline">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="teacher-class-workspace__ghost-icon"
                            onClick={() => handleDeleteAssessment(assessment.id)}
                            disabled={busyAssessmentId === assessment.id}
                            aria-label="Delete assessment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
              {filteredAssignments.length === 0 ? (
                <div className="teacher-class-workspace__empty">No assignments in this filter.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'extraction' ? (
          <div className="teacher-class-workspace__panel">
            {aiUnavailable ? (
              <AiOutageNotice
                mode="teacher"
                message={aiAvailability.message}
                className="mb-4"
              />
            ) : null}
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>AI Extractions</h2>
                <p>Upload a PDF to extract lesson content using AI.</p>
              </div>
            </div>
            <div className="teacher-class-workspace__extract-wrap">
              <div className="rounded-[1.1rem] border border-[#e3eaf5] bg-[#f8fbfe] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#143155]">Lesson structure depth</p>
                    <p className="mt-1 text-xs text-[#647083]">
                      Choose how many sections the extraction should target. This shapes coherence, not output length.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#435f86]">
                    <span>Target</span>
                    <select
                      value={String(targetSectionCount)}
                      onChange={(event) => setTargetSectionCount(Number(event.target.value) as ExtractionTargetSectionCount)}
                      disabled={uploadingExtraction || aiUnavailable}
                      className="rounded-full border border-[#d2ddec] bg-white px-3 py-2 text-sm font-black text-[#143155]"
                      aria-label="Target section count"
                    >
                      <option value="3">3 sections</option>
                      <option value="4">4 sections</option>
                      <option value="5">5 sections</option>
                    </select>
                  </label>
                </div>
              </div>
              <button
                type="button"
                className="teacher-class-workspace__extract-dropzone"
                onClick={handleExtractionSelect}
                disabled={uploadingExtraction || aiUnavailable}
              >
                <Radar className="h-6 w-6" />
                <strong>{uploadingExtraction ? 'Uploading PDF...' : 'Drop a PDF here to extract module'}</strong>
                <span>or click to browse</span>
              </button>
              <input
                ref={extractionInputRef}
                type="file"
                accept="application/pdf"
                onChange={(event) => void handleExtractionFile(event)}
                disabled={uploadingExtraction || aiUnavailable}
                hidden
              />
              <div className="teacher-class-workspace__stack">
                {extractions.map((extraction) => (
                  <article key={extraction.id} className="teacher-class-workspace__extract-item">
                    <div>
                      <h3>{extraction.structuredContent?.title || extraction.originalName || 'PDF Extraction'}</h3>
                      <p>
                        {formatDateYmd(extraction.createdAt)}
                        {typeof extraction.structuredContent?.audit?.requestedSectionCount === 'number'
                          ? ` · Requested sections: ${extraction.structuredContent.audit.requestedSectionCount}`
                          : ''}
                      </p>
                    </div>
                    <div className="teacher-class-workspace__extract-item-actions">
                      <span data-status={extraction.extractionStatus}>{getExtractionStatusLabel(extraction)}</span>
                      <Link href={`/dashboard/teacher/extractions/${extraction.id}`} className="teacher-class-workspace__outline">
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      <button
                        type="button"
                        className="teacher-class-workspace__outline teacher-class-workspace__outline-danger"
                        onClick={() => handleDeleteExtraction(extraction.id)}
                        aria-label={`Delete ${extraction.structuredContent?.title || extraction.originalName || 'extraction'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {extractions.length === 0 ? (
                  <div className="teacher-class-workspace__empty">No extraction history yet.</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'announcements' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Announcements</h2>
                <p>{announcements.length} posts</p>
              </div>
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() => setShowAnnouncementForm((current) => !current)}
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            </div>

            {showAnnouncementForm ? (
              <div className="teacher-class-workspace__announcement-form">
                <Input
                  value={announcementTitle}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                  placeholder="Announcement title"
                />
                <RichTextEditor
                  value={announcementContent}
                  onChange={setAnnouncementContent}
                  placeholder="Write announcement content..."
                  minHeight={160}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={(event) => setAnnouncementPinned(event.target.checked)}
                  />
                  Pin this announcement
                </label>
                <div className="teacher-class-workspace__head-actions">
                  <Button
                    type="button"
                    className="teacher-class-workspace__solid"
                    onClick={() => void handleCreateAnnouncement()}
                    disabled={
                      creatingAnnouncement ||
                      !announcementTitle.trim() ||
                      !normalizeRichText(announcementContent).trim()
                    }
                  >
                    Post Announcement
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAnnouncementForm(false);
                      setAnnouncementTitle('');
                      setAnnouncementContent('');
                      setAnnouncementPinned(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="teacher-class-workspace__stack">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="teacher-class-workspace__announcement-card"
                  data-pinned={announcement.isPinned}
                >
                  <div>
                    {announcement.isPinned ? <span className="teacher-class-workspace__pin">Pinned</span> : null}
                    <h3>{announcement.title}</h3>
                    <RichTextRenderer
                      html={normalizeRichText(announcement.content)}
                      className="teacher-class-workspace__announcement-rich"
                    />
                    <small>{formatDateYmd(announcement.createdAt)}</small>
                  </div>
                  <button
                    type="button"
                    className="teacher-class-workspace__ghost-icon"
                    onClick={() => void handleDeleteAnnouncement(announcement.id)}
                    disabled={busyAnnouncementId === announcement.id}
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </article>
              ))}
              {announcements.length === 0 ? (
                <div className="teacher-class-workspace__empty">No announcements yet.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'discussion' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Discussion Board</h2>
                <p>{discussionThreads.length} thread{discussionThreads.length === 1 ? '' : 's'}</p>
              </div>
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() => setShowDiscussionForm((current) => !current)}
              >
                <Plus className="h-4 w-4" />
                New Thread
              </Button>
            </div>

            {showDiscussionForm ? (
              <div className="teacher-class-workspace__announcement-form">
                <Input
                  value={discussionTitle}
                  onChange={(event) => setDiscussionTitle(event.target.value)}
                  placeholder="Thread title"
                />
                <RichTextEditor
                  value={discussionBody}
                  onChange={setDiscussionBody}
                  placeholder="Write discussion prompt and details..."
                  minHeight={180}
                />
                <div className="teacher-class-workspace__head-actions">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={discussionCommentLimit}
                    onChange={(event) => setDiscussionCommentLimit(event.target.value)}
                    placeholder="Comment limit per student"
                  />
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(event) =>
                      setDiscussionAttachmentFiles(
                        Array.from(event.target.files || []),
                      )
                    }
                  />
                </div>
                <p className="teacher-discussion-upload-note">
                  Add images or PDFs here so students can open them directly from the thread.
                </p>
                <TeacherSelectedDiscussionFilePreviews files={discussionAttachmentFiles} />
                <textarea
                  className="teacher-module-modal__textarea"
                  value={discussionLinksText}
                  onChange={(event) => setDiscussionLinksText(event.target.value)}
                  placeholder="Optional links (one URL per line)"
                  rows={3}
                />
                <div className="teacher-class-workspace__head-actions">
                  <label>
                    <input
                      type="checkbox"
                      checked={discussionAllowComments}
                      onChange={(event) =>
                        setDiscussionAllowComments(event.target.checked)
                      }
                    />
                    Allow comments
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={discussionPinned}
                      onChange={(event) => setDiscussionPinned(event.target.checked)}
                    />
                    Pin thread
                  </label>
                </div>
                <div className="teacher-class-workspace__head-actions">
                  <Button
                    type="button"
                    className="teacher-class-workspace__outline"
                    onClick={() => void handleCreateDiscussionThread(false)}
                    disabled={
                      creatingDiscussion ||
                      !discussionTitle.trim() ||
                      !normalizeRichText(discussionBody).trim()
                    }
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    className="teacher-class-workspace__solid"
                    onClick={() => void handleCreateDiscussionThread(true)}
                    disabled={
                      creatingDiscussion ||
                      !discussionTitle.trim() ||
                      !normalizeRichText(discussionBody).trim()
                    }
                  >
                    Publish Thread
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetDiscussionComposer}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="teacher-discussion-thread-list">
              {discussionThreads.map((thread) => (
                <article
                  key={thread.id}
                  className="teacher-discussion-thread-card"
                  data-pinned={thread.isPinned}
                  data-active={selectedDiscussionThreadId === thread.id}
                >
                  <div className="teacher-discussion-thread-card__meta">
                    <div className="teacher-discussion-thread-card__author">
                      <TeacherDiscussionAvatar author={thread.author} />
                      <div className="teacher-discussion-thread-card__identity">
                        <strong>{getDiscussionAuthorName(thread.author)}</strong>
                        <span>
                          {formatRelativeTime(thread.publishedAt || thread.createdAt)} •{' '}
                          {thread.commentCount} comment{thread.commentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="teacher-discussion-thread-card__badges">
                      {thread.isPinned ? (
                        <span className="teacher-class-workspace__pin">Pinned</span>
                      ) : null}
                      <span className="teacher-discussion-thread-card__badge">
                        {thread.status.toUpperCase()}
                      </span>
                      <span
                        className="teacher-discussion-thread-card__badge"
                        data-status={thread.allowComments ? 'published' : 'draft'}
                      >
                        {thread.commentCount} comments
                      </span>
                    </div>
                  </div>
                  <div className="teacher-discussion-thread-card__body">
                    <h3>{thread.title}</h3>
                    <RichTextRenderer
                      html={thread.bodyHtml}
                      className="teacher-discussion-thread-card__rich"
                    />
                    <TeacherDiscussionAttachmentGallery attachments={thread.attachments} />
                  </div>
                  <div className="teacher-discussion-thread-card__footer">
                    <span className="teacher-discussion-thread-card__date">
                      {formatDateYmd(thread.publishedAt || thread.createdAt)} • Theme {thread.themeId}
                    </span>
                    <div className="teacher-class-workspace__assignment-actions">
                      <button
                        type="button"
                        className="teacher-class-workspace__outline"
                        onClick={() => setSelectedDiscussionThreadId(thread.id)}
                      >
                        {selectedDiscussionThreadId === thread.id ? 'Viewing' : 'Open'}
                      </button>
                      {thread.status === 'draft' ? (
                        <button
                          type="button"
                          className="teacher-class-workspace__outline"
                          disabled={busyDiscussionThreadId === thread.id}
                          onClick={() =>
                            void handleDiscussionThreadAction(thread.id, 'publish')
                          }
                        >
                          Publish
                        </button>
                      ) : null}
                      {thread.status === 'published' ? (
                        <button
                          type="button"
                          className="teacher-class-workspace__outline"
                          disabled={busyDiscussionThreadId === thread.id}
                          onClick={() =>
                            void handleDiscussionThreadAction(thread.id, 'close')
                          }
                        >
                          Close
                        </button>
                      ) : null}
                      {thread.status === 'closed' ? (
                        <button
                          type="button"
                          className="teacher-class-workspace__outline"
                          disabled={busyDiscussionThreadId === thread.id}
                          onClick={() =>
                            void handleDiscussionThreadAction(thread.id, 'reopen')
                          }
                        >
                          Reopen
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="teacher-class-workspace__ghost-icon"
                        onClick={() =>
                          void handleDiscussionThreadAction(thread.id, 'archive')
                        }
                        disabled={busyDiscussionThreadId === thread.id}
                        aria-label="Archive discussion thread"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {discussionThreads.length === 0 ? (
                <div className="teacher-class-workspace__empty">No discussion threads yet.</div>
              ) : null}
            </div>

            {selectedDiscussionThread ? (
              <div className="teacher-discussion-focus">
                <div className="teacher-class-workspace__panel-head teacher-discussion-focus__head">
                  <div>
                    <h2>{selectedDiscussionThread.title}</h2>
                    <p>
                      {selectedDiscussionThread.comments.length} comment
                      {selectedDiscussionThread.comments.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="teacher-discussion-focus__moderator">
                    <span className="teacher-discussion-focus__moderator-pill">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Moderator controls active
                    </span>
                    <button
                      type="button"
                      className="teacher-class-workspace__outline"
                      onClick={() => setSelectedDiscussionThreadId(null)}
                    >
                      Close Thread View
                    </button>
                  </div>
                </div>

                <article className="teacher-discussion-focus__post">
                  <div className="teacher-discussion-comment__head">
                    <TeacherDiscussionAvatar author={selectedDiscussionThread.author} />
                    <div className="teacher-discussion-comment__identity">
                      <strong>{getDiscussionAuthorName(selectedDiscussionThread.author)}</strong>
                      <span>
                        {formatRelativeTime(
                          selectedDiscussionThread.publishedAt ||
                            selectedDiscussionThread.createdAt,
                        )}{' '}
                        • {selectedDiscussionThread.allowComments ? 'Replies open' : 'Replies closed'}
                      </span>
                    </div>
                    <div className="teacher-discussion-comment__meta">
                      <span className="teacher-discussion-comment__meta-pill">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Limit:{' '}
                        {selectedDiscussionThread.commentLimitPerStudent || 'Open'}
                      </span>
                      <span className="teacher-discussion-comment__meta-pill">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {selectedDiscussionThread.status}
                      </span>
                    </div>
                  </div>
                  <RichTextRenderer
                    html={selectedDiscussionThread.bodyHtml}
                    className="teacher-discussion-focus__body"
                  />
                  <TeacherDiscussionAttachmentGallery
                    attachments={selectedDiscussionThread.attachments}
                  />
                </article>

                <div className="teacher-discussion-comment-stack">
                  {selectedDiscussionThread.comments.map((comment) => (
                    <article key={comment.id} className="teacher-discussion-comment-card">
                      <div className="teacher-discussion-comment__head">
                        <TeacherDiscussionAvatar author={comment.author} />
                        <div className="teacher-discussion-comment__identity">
                          <strong>{getDiscussionAuthorName(comment.author)}</strong>
                          <span>{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                        <div className="teacher-discussion-comment__menu-wrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="teacher-discussion-menu-button"
                                aria-label="Open moderator controls"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="teacher-discussion-menu"
                            >
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  void handleCopyDiscussionComment(comment);
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy reply text
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleOpenDiscussionReportDialog(comment);
                                }}
                              >
                                <Flag className="mr-2 h-4 w-4" />
                                Report for follow-up
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleDeleteDiscussionComment(comment);
                                }}
                                className="text-[#b42318] focus:text-[#b42318]"
                                disabled={busyDiscussionCommentId === comment.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete comment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="teacher-discussion-comment__body-wrap">
                        <RichTextRenderer
                          html={comment.bodyHtml || '<p>(Image-only comment)</p>'}
                          className="teacher-discussion-comment__body"
                        />
                        <TeacherDiscussionAttachmentGallery attachments={comment.attachments} />
                      </div>
                      <div className="teacher-discussion-comment__footer">
                        <div className="teacher-discussion-comment__meta">
                          <TeacherDiscussionReactionSummary comment={comment} />
                        </div>
                        <span className="teacher-discussion-comment__timestamp">
                          {formatDateYmd(comment.createdAt)}
                        </span>
                      </div>
                    </article>
                  ))}
                  {selectedDiscussionThread.comments.length === 0 ? (
                    <div className="teacher-class-workspace__empty">No comments yet.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'class-record' ? (
          <div className="teacher-class-workspace__panel teacher-class-workspace__panel--record">
            <div className="teacher-class-workspace__record-scroll">
              <TeacherClassRecordWorkbook
                state={classRecordState}
                emptyMessage="No class record exists yet for this class. Create a quarter workbook to begin."
                className="teacher-class-workspace__record-embed"
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'students' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Students ({studentRows.length})</h2>
              </div>
              <Link href={`/dashboard/teacher/classes/${classId}/students/add`} className="teacher-class-workspace__solid">
                <Plus className="h-4 w-4" />
                Add Student
              </Link>
            </div>
            <div className="teacher-class-workspace__table-wrap">
              <table className="teacher-class-workspace__table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>LRN</th>
                    <th>Grade %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((student) => (
                    <tr key={student.enrollmentId} className="teacher-class-workspace__table-row teacher-class-workspace__table-row--clickable">
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          <div className="teacher-class-workspace__student-cell">
                            <span className="teacher-class-workspace__avatar">{student.initials}</span>
                            <strong>{student.fullName}</strong>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          {student.email}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          {student.lrn}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/students/${student.studentId}`}
                          className="teacher-class-workspace__row-link"
                        >
                          <div className="teacher-class-workspace__grade">
                            <div className="teacher-class-workspace__grade-track">
                              <div
                                data-tone={gradeTone(student.gradePercent)}
                                style={{ width: `${Math.max(0, Math.min(100, student.gradePercent ?? 0))}%` }}
                              />
                            </div>
                            <span>{student.gradePercent !== null ? `${student.gradePercent.toFixed(1)}%` : '--'}</span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div className="teacher-class-workspace__table-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRemoveStudent(student.enrollmentId, student.studentId);
                            }}
                            disabled={busyEnrollmentId === student.enrollmentId}
                            aria-label="Remove student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {studentRows.length === 0 ? (
                <div className="teacher-class-workspace__empty">No students enrolled.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'calendar' ? (
          <div className="teacher-class-workspace__panel">
            <div className="teacher-class-workspace__panel-head">
              <div>
                <h2>Class Calendar</h2>
                <p>Upcoming events and assessments for {classItem.subjectName}</p>
              </div>
              <div className="teacher-class-workspace__head-actions">
                <div className="teacher-class-workspace__view-toggle" role="group" aria-label="Calendar view">
                  <button
                    type="button"
                    data-active={calendarViewMode === 'calendar'}
                    onClick={() => setCalendarViewMode('calendar')}
                    aria-label="Calendar grid view"
                    title="Calendar"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-active={calendarViewMode === 'upcoming'}
                    onClick={() => setCalendarViewMode('upcoming')}
                    aria-label="Upcoming list view"
                    title="Upcoming"
                  >
                    <LayoutPanelTop className="h-4 w-4" />
                  </button>
                </div>
                <Link href={`/dashboard/teacher/calendar?classId=${classId}`} className="teacher-class-workspace__outline">
                  <CalendarDays className="h-4 w-4" />
                  Full Calendar
                </Link>
              </div>
            </div>
            {calendarViewMode === 'upcoming' ? (
              <div className="teacher-class-workspace__stack">
                {calendarItems.map((event) => {
                  const badge = formatEventBadgeDate(event.date);
                  return (
                    <article key={event.id} className="teacher-class-workspace__calendar-item" data-kind={event.kind}>
                      <div className="teacher-class-workspace__calendar-date">
                        <strong>{badge.day}</strong>
                        <span>{badge.month}</span>
                      </div>
                      <div className="teacher-class-workspace__calendar-copy">
                        <h3>{event.title}</h3>
                        <p>{event.subtitle}</p>
                      </div>
                      <span className="teacher-class-workspace__calendar-kind">{event.kind}</span>
                    </article>
                  );
                })}
                {calendarItems.length === 0 ? (
                  <div className="teacher-class-workspace__empty">No upcoming events.</div>
                ) : null}
              </div>
            ) : (
              <div className="teacher-class-workspace__calendar-board">
                <div className="teacher-class-workspace__calendar-grid-wrap">
                  <div className="teacher-class-workspace__calendar-grid-head">
                    <button
                      type="button"
                      className="teacher-class-workspace__ghost-icon"
                      onClick={() => setCalendarMonth((current) => getMonthStart(new Date(current.getFullYear(), current.getMonth() - 1, 1)))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <strong>
                      {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </strong>
                    <button
                      type="button"
                      className="teacher-class-workspace__ghost-icon"
                      onClick={() => setCalendarMonth((current) => getMonthStart(new Date(current.getFullYear(), current.getMonth() + 1, 1)))}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="teacher-class-workspace__calendar-grid-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className="teacher-class-workspace__calendar-grid">
                    {calendarGridDays.map((cell) => {
                      const isSelected = selectedCalendarDateKey === cell.key;
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          className="teacher-class-workspace__calendar-cell"
                          data-in-month={cell.inMonth}
                          data-selected={isSelected}
                          onClick={() => setSelectedCalendarDateKey(cell.key)}
                        >
                          <strong>{cell.date.getDate()}</strong>
                          {cell.events.length > 0 ? (
                            <span>{cell.events.length} event{cell.events.length === 1 ? '' : 's'}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="teacher-class-workspace__calendar-selected">
                  <h3>
                    {selectedCalendarDateKey
                      ? new Date(`${selectedCalendarDateKey}T00:00:00`).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Select a date'}
                  </h3>
                  <div className="teacher-class-workspace__stack">
                    {selectedCalendarEvents.length > 0 ? (
                      selectedCalendarEvents.map((event) => (
                        <article key={event.id} className="teacher-class-workspace__calendar-item" data-kind={event.kind}>
                          <div className="teacher-class-workspace__calendar-date">
                            <strong>{event.date.getDate()}</strong>
                            <span>{event.date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                          </div>
                          <div className="teacher-class-workspace__calendar-copy">
                            <h3>{event.title}</h3>
                            <p>{event.subtitle}</p>
                          </div>
                          <span className="teacher-class-workspace__calendar-kind">{event.kind}</span>
                        </article>
                      ))
                    ) : (
                      <div className="teacher-class-workspace__empty">No events for this date.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </ClassWorkspaceShell>

      <Dialog open={showAddModuleModal} onOpenChange={setShowAddModuleModal}>
        <DialogContent className="teacher-module-modal">
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
            <DialogDescription>
              Create a module title and brief description. You can refine sections and items after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="teacher-module-modal__fields">
            <div>
              <label htmlFor="new-module-title">Title</label>
              <Input
                id="new-module-title"
                value={newModuleTitle}
                onChange={(event) => setNewModuleTitle(event.target.value)}
                placeholder="Module title"
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="new-module-description">Description</label>
              <RichTextEditor
                value={newModuleDescription}
                onChange={setNewModuleDescription}
                placeholder="What should students learn in this module?"
                minHeight={120}
              />
            </div>
            <button
              type="button"
              className="teacher-class-workspace__outline teacher-module-modal__template"
              onClick={() => toast.info('Quick templates will be available in a later update.')}
            >
              Quick Template
            </button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModuleModal(false);
                setNewModuleTitle('');
                setNewModuleDescription('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" className="teacher-class-workspace__solid" onClick={() => void handleCreateModule()} disabled={creatingModule}>
              {creatingModule ? 'Creating...' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(customizingModuleId)} onOpenChange={(open) => !open && closeModuleDesignDialog()}>
        <DialogContent className="teacher-module-modal teacher-module-modal--design">
          <DialogHeader>
            <DialogTitle>Customize Module Design</DialogTitle>
            <DialogDescription>
              Choose the module surface style and media placement. Changes are saved per module.
            </DialogDescription>
          </DialogHeader>
          <div className="teacher-module-modal__fields">
            <div className="teacher-module-modal__theme-toggle" role="group" aria-label="Module theme mode">
              <button
                type="button"
                data-active={moduleDraft.themeKind === 'gradient'}
                onClick={() => {
                  setModuleCoverError(null);
                  setModuleDraft((current) => ({ ...current, themeKind: 'gradient' }));
                }}
              >
                Gradient
              </button>
              <button
                type="button"
                data-active={moduleDraft.themeKind === 'image'}
                onClick={() => {
                  setModuleCoverError(null);
                  setModuleDraft((current) => ({ ...current, themeKind: 'image' }));
                }}
              >
                Image
              </button>
            </div>

            {moduleDraft.themeKind === 'gradient' ? (
              <div className="teacher-module-modal__palette">
                {MODULE_GRADIENT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    data-active={moduleDraft.gradientId === option.id}
                    onClick={() => setModuleDraft((current) => ({ ...current, gradientId: option.id }))}
                    aria-label={option.label}
                    title={option.label}
                    style={{ background: option.background }}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="teacher-module-modal__stock-grid">
                  {MODULE_STOCK_IMAGE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      data-active={!localModuleCoverDraft && moduleDraft.coverImageUrl === option.imageUrl}
                      onClick={() => {
                        setModuleCoverError(null);
                        clearLocalModuleCoverDraft();
                        setModuleDraft((current) => ({
                          ...current,
                          themeKind: 'image',
                          coverImageUrl: option.imageUrl,
                          imagePositionX: 50,
                          imagePositionY: 50,
                          imageScale: 120,
                        }));
                      }}
                      style={{
                        backgroundImage: `url(${option.imageUrl})`,
                      }}
                      aria-label={option.label}
                      title={option.label}
                    />
                  ))}
                </div>

                <div className="teacher-module-modal__upload">
                  <label htmlFor="module-cover-upload">Upload custom image</label>
                  <input
                    id="module-cover-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    onChange={(event) => void handleUploadModuleCover(event)}
                    disabled={savingModuleDesign}
                  />
                  <small>Only PNG, JPG, JPEG, or WebP up to 5 MB.</small>
                </div>

                {localModuleCoverDraft ? (
                  <div className="teacher-module-modal__cropper-shell">
                    <div className="teacher-module-modal__cropper-frame">
                      <Cropper
                        image={localModuleCoverDraft.objectUrl}
                        crop={localModuleCoverDraft.crop}
                        zoom={localModuleCoverDraft.zoom}
                        aspect={16 / 9}
                        cropShape="rect"
                        showGrid={false}
                        onCropChange={(crop) =>
                          setLocalModuleCoverDraft((current) =>
                            current ? { ...current, crop } : current,
                          )
                        }
                        onZoomChange={(zoom) =>
                          setLocalModuleCoverDraft((current) =>
                            current ? { ...current, zoom } : current,
                          )
                        }
                        onCropComplete={(_croppedArea, croppedAreaPixels) =>
                          setLocalModuleCoverDraft((current) =>
                            current ? { ...current, croppedAreaPixels } : current,
                          )
                        }
                      />
                    </div>
                    <div className="teacher-module-modal__cropper-tools">
                      <label>
                        Zoom
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.05}
                          value={localModuleCoverDraft.zoom}
                          onChange={(event) =>
                            setLocalModuleCoverDraft((current) =>
                              current
                                ? { ...current, zoom: Number(event.target.value) }
                                : current,
                            )
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="teacher-module-modal__cropper-reset"
                        onClick={() =>
                          setLocalModuleCoverDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  crop: { x: 0, y: 0 },
                                  zoom: 1,
                                  croppedAreaPixels: null,
                                }
                              : current,
                          )
                        }
                      >
                        Reset framing
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {moduleCoverError ? (
              <div className="teacher-module-modal__error" role="alert">
                {moduleCoverError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModuleDesignDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-class-workspace__solid"
              onClick={() => void handleSaveModuleDesign()}
              disabled={savingModuleDesign}
            >
              {savingModuleDesign ? 'Saving...' : 'Save Design'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) {
            setHelpPage(0);
          }
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog teacher-class-guide-dialog" style={teacherClassGuideDialogStyle}>
          <DialogHeader>
            <DialogTitle>Teacher guide: Class Workspace</DialogTitle>
            <DialogDescription>
              Read this guide one page at a time. Each screenshot points to the core controls for this class page.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>Page {helpPage + 1} of {teacherClassGuidePages.length}</span>
            <div>
              {teacherClassGuidePages.map((page, index) => (
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
            <TeacherClassGuideScreenshot screen={activeGuidePage.screen} />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Teacher workspace walkthrough</p>
              <h3>{activeGuidePage.title}</h3>
              <p>{activeGuidePage.description}</p>
              <div className="route-guide-steps grid gap-3">
                {activeGuidePage.steps.map((step, index) => (
                  <div
                    key={`${step.action}-${step.body}`}
                    className={`route-guide-step grid grid-cols-[1.9rem_minmax(0,1fr)] items-start gap-3 rounded-lg border border-[#edf1f6] border-l-[3px] bg-white p-3 shadow-sm ${
                      step.tone === 'caution' ? 'is-caution' : ''
                    }`}
                  >
                    <span
                      className={`route-guide-step__index inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white ${
                        step.tone === 'caution' ? 'bg-[#b7791f]' : 'bg-[#a32d2d]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <strong className="block text-sm font-black text-[#111827]">{step.action}</strong>
                      <p className="mt-1 text-sm leading-relaxed text-[#637083]">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="teacher-intervention-workspace__manual-reminder">
                {activeGuidePage.reminder}
              </p>
            </section>
          </div>

          <DialogFooter>
            <div className="teacher-intervention-workspace__manual-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHelpPage((current) => Math.max(current - 1, 0))}
                disabled={helpPage === 0}
              >
                Previous page
              </Button>
              {helpPage < teacherClassGuidePages.length - 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setHelpPage((current) => Math.min(current + 1, teacherClassGuidePages.length - 1))
                  }
                >
                  Next page
                </Button>
              ) : (
                <Button type="button" onClick={() => setHelpOpen(false)}>
                  Close guide
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportDialogComment)}
        onOpenChange={(open) => {
          if (!open && !reportingDiscussionComment) {
            setReportDialogComment(null);
            setDiscussionReportNotes('');
          }
        }}
      >
        <DialogContent className="teacher-discussion-report-dialog sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Comment</DialogTitle>
            <DialogDescription>
              Send this reply to the moderation audit trail for follow-up.
            </DialogDescription>
          </DialogHeader>

          {reportDialogComment ? (
            <div className="teacher-discussion-report-dialog__body">
              <div className="teacher-discussion-report-dialog__comment">
                <TeacherDiscussionAvatar author={reportDialogComment.author} />
                <div>
                  <strong>{getDiscussionAuthorName(reportDialogComment.author)}</strong>
                  <p>{stripDiscussionHtml(reportDialogComment.bodyHtml) || 'Image-only reply'}</p>
                </div>
              </div>

              <div className="teacher-discussion-report-dialog__reasons">
                {DISCUSSION_REPORT_REASON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="teacher-discussion-report-dialog__reason"
                    data-active={discussionReportReason === option.value}
                    onClick={() => setDiscussionReportReason(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>

              <label className="teacher-discussion-report-dialog__notes">
                <span>Moderator notes</span>
                <textarea
                  value={discussionReportNotes}
                  onChange={(event) => setDiscussionReportNotes(event.target.value)}
                  placeholder="Add extra context for admin or discipline follow-up..."
                  rows={4}
                  maxLength={500}
                />
                <small>{discussionReportNotes.trim().length}/500</small>
              </label>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReportDialogComment(null);
                setDiscussionReportNotes('');
              }}
              disabled={reportingDiscussionComment}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-class-workspace__solid"
              onClick={() => void handleSubmitDiscussionCommentReport()}
              disabled={reportingDiscussionComment || !reportDialogComment}
            >
              {reportingDiscussionComment ? 'Reporting...' : 'Report Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
