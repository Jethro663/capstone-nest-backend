'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  CircleHelp,
  GripVertical,
  Layers3,
  Lock,
  NotebookPen,
  Plus,
  Save,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { fileService } from '@/services/file-service';
import { LibraryFilePickerDialog } from '@/components/library/LibraryFilePickerDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { normalizeRichText } from '@/lib/rich-text';
import { ActionTooltip } from '@/components/shared/ActionTooltip';
import { cn } from '@/utils/cn';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { ClassModule, ModuleItem, ModuleItemType } from '@/types/module';
import './module-workspace.css';

type ModuleTab = 'sections' | 'visibility' | 'locking' | 'notes';
type AssessmentAttachMode = 'create-new' | 'attach-existing';
type FileAttachSource = 'upload' | 'library';

const ATTACH_BLOCK_OPTIONS: Array<{
  type: ModuleItemType;
  label: string;
  description: string;
  icon: typeof BookOpen;
  tone: 'lesson' | 'assessment' | 'file';
}> = [
  {
    type: 'lesson',
    label: 'Lesson',
    description: 'Attach lesson content already created in this class.',
    icon: BookOpen,
    tone: 'lesson',
  },
  {
    type: 'assessment',
    label: 'Assessment',
    description: 'Attach assessment content and control student release with Give.',
    icon: ClipboardList,
    tone: 'assessment',
  },
  {
    type: 'file',
    label: 'PDF',
    description: 'Upload a PDF resource block for this section.',
    icon: FileText,
    tone: 'file',
  },
];

const FILE_ATTACH_SOURCE_OPTIONS: Array<{
  value: FileAttachSource;
  label: string;
  description: string;
  icon: typeof BookOpen;
  tone: 'upload' | 'library';
}> = [
  {
    value: 'upload',
    label: 'Upload New PDF',
    description: 'Upload a fresh PDF file for this module block.',
    icon: Upload,
    tone: 'upload',
  },
  {
    value: 'library',
    label: 'Choose from Library',
    description: 'Attach an existing General Module or My Library file.',
    icon: FolderOpen,
    tone: 'library',
  },
];

const ASSESSMENT_ATTACH_MODE_OPTIONS: Array<{
  value: AssessmentAttachMode;
  label: string;
  description: string;
  icon: typeof BookOpen;
}> = [
  {
    value: 'create-new',
    label: 'Create New Assessment',
    description: 'Start with a blank assessment and open the editor.',
    icon: ClipboardList,
  },
  {
    value: 'attach-existing',
    label: 'Attach Existing Assessment',
    description: 'Reuse an assessment already created for this class.',
    icon: FolderOpen,
  },
];

type AttachState = {
  open: boolean;
  sectionId: string;
  itemType: ModuleItemType | null;
  assessmentMode: AssessmentAttachMode;
  itemId: string;
  lessonPoints: string;
  file: File | null;
};

type DraggingItem = {
  sectionId: string;
  itemId: string;
} | null;

const TAB_ITEMS: Array<{ key: ModuleTab; label: string; icon: typeof Layers3 }> = [
  { key: 'sections', label: 'Sections', icon: Layers3 },
  { key: 'visibility', label: 'Visibility', icon: Eye },
  { key: 'locking', label: 'Locking', icon: Lock },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
];

const teacherModuleGuideDialogStyle = {
  '--intervention-border': '#dbe2ec',
  '--intervention-border-soft': '#edf1f6',
  '--intervention-muted': '#637083',
  '--intervention-strong': '#111827',
  '--intervention-red': '#a32d2d',
  '--intervention-red-soft': '#fcebeb',
} as CSSProperties;

type TeacherModuleGuideScreen = 'header' | 'sections' | 'blocks' | 'visibility' | 'locking' | 'notes';
type GuidePinProps = {
  children: string;
  lineSide: 'left' | 'right';
  lineWidth: string;
  style: CSSProperties;
};

const teacherModuleGuidePages: Array<{
  title: string;
  description: string;
  screen: TeacherModuleGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'caution';
  }>;
}> = [
  {
    title: 'Start from the module header',
    description:
      'The top section confirms module identity, visibility, lock state, and where this module sits in the class.',
    screen: 'header',
    reminder: 'Keep this header visible while jumping across sections and settings for this module.',
    steps: [
      {
        action: 'Read',
        body: 'Check the title, class relationship, lesson count, and schedule summary.',
      },
      {
        action: 'Return',
        body: 'Use Back to Class whenever you need to switch to another module quickly.',
      },
      {
        action: 'Open help',
        body: 'Tap this guide button anytime you need reminders about module workflow.',
      },
    ],
  },
  {
    title: 'Build sections first',
    description:
      'Sections are containers for lessons, assessments, and resources. Start by creating clear learning blocks.',
    screen: 'sections',
    reminder: 'Core modules from templates may be locked by design; edit in template mode for deep structure changes.',
    steps: [
      {
        action: 'Create',
        body: 'Add a section title and save each unit of the module in order.',
      },
      {
        action: 'Name clearly',
        body: 'Use stable section names to match your teaching sequence.',
      },
      {
        action: 'Order',
        body: 'Drag the handle to reorder sections after the draft structure is in place.',
      },
    ],
  },
  {
    title: 'Attach and manage module blocks',
    description: 'Use Add Block on a section to attach lesson, assessment, or PDF blocks.',
    screen: 'blocks',
    reminder: 'Keep section blocks consistent: lessons, assessments, then references for a readable learner flow.',
    steps: [
      {
        action: 'Add',
        body: 'Click Add Block and choose Lesson, Assessment, or PDF.',
      },
      {
        action: 'Verify',
        body: 'Use Give and Hide controls to control what each block shows to students.',
      },
      {
        action: 'Open',
        body: 'Use View Content for quick read-only review of attached assessments and lessons.',
      },
    ],
  },
  {
    title: 'Choose whether students can see this module',
    description:
      'Visibility controls determine whether students can open a module in their course path.',
    screen: 'visibility',
    reminder: 'Only use Unhidden once your first teaching cycle starts.',
    steps: [
      {
        action: 'Hide',
        body: 'Mark this module hidden while it is still in draft.',
      },
      {
        action: 'Show',
        body: 'Set visible when materials and items are ready to publish.',
      },
      {
        action: 'Save',
        body: 'The visibility toggle updates instantly after you choose the option.',
      },
    ],
  },
  {
    title: 'Control release through locking',
    description:
      'Locking blocks student access without changing content visibility for teachers.',
    screen: 'locking',
    reminder: 'Use locking for staged release and readiness checks before assessments open.',
    steps: [
      {
        action: 'Unlock',
        body: 'Unlock to allow students to use module items from this tab.',
      },
      {
        action: 'Lock',
        body: 'Lock to pause access without deleting assignments or materials.',
      },
      {
        action: 'Release core',
        body: 'For template modules, release the default module only after template-level changes are done.',
      },
      {
        action: 'Avoid confusion',
        body: 'Changing lock state is immediate; make sure students have your intended sequence first.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Use private module notes for pacing',
    description: 'Notes help you keep reminders for this module without affecting learner-facing content.',
    screen: 'notes',
    reminder: 'Notes save your internal plan; students do not see this text.',
    steps: [
      {
        action: 'Edit',
        body: 'Write pacing cues, pacing targets, or reminders in rich text.',
      },
      {
        action: 'Save',
        body: 'Save your notes after edits so they are available on return.',
      },
      {
        action: 'Protect',
        body: 'Keep sensitive comments out because these notes are not learner-visible.',
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

function TeacherModuleGuideScreenshot({ screen }: { screen: TeacherModuleGuideScreen }) {
  if (screen === 'header') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="module header screenshot"
      >
        <div className="absolute inset-x-0 top-0 flex h-8 items-center gap-1 border-b border-[#edf1f6] bg-white px-3">
          <span className="h-2 w-2 rounded-full bg-[#f87171]" />
          <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
          <span className="h-2 w-2 rounded-full bg-[#34d399]" />
        </div>
        <div className="rounded-xl border border-[#1d3659] bg-[#10254a] p-4 text-white">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[1.05rem] font-black leading-tight">Module 1: Foundations</h3>
              <p className="mt-2 text-sm text-[#b6c8df]">Science 7 • Week 1 • 2 lessons • 1 assessment</p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#284269] bg-[#17345d]"
              aria-label="Module help"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 rounded-lg border border-[#263e62] bg-[#17345d] px-2 py-1 text-xs">
            Lesson count, assessment count, and schedule summary
          </p>
        </div>

        <GuidePin lineSide="left" lineWidth="7rem" style={{ right: '1rem', top: '1.6rem' }}>
          Module help
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="6rem" style={{ left: '1rem', top: '8.2rem' }}>
          Back to Class
        </GuidePin>
        <GuidePin lineSide="right" lineWidth="5rem" style={{ left: '1rem', top: '10rem' }}>
          Visibility and lock status
        </GuidePin>
      </div>
    );
  }

  if (screen === 'sections') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="module sections screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-lg font-black text-[#111827]">Sections</strong>
            <span className="rounded-full border border-[#e8eff7] bg-[#f8fbfe] px-2 py-1 text-[0.72rem] font-black text-[#4f6694]">
              1 section
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="h-10 flex-1 rounded-lg border border-[#d6deea] bg-[#f8fbfe] px-3 py-2 text-sm text-[#6f819f]">
              Add section title
            </span>
            <button
              type="button"
              className="inline-flex h-10 min-w-20 items-center justify-center rounded-full bg-[#c9252d] px-3 text-sm font-black text-white"
            >
              Add Section
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-[#e2e9f4] bg-[#f8fbfe] p-3">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-black text-[#143155]">Section A: Warm-up</strong>
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.56rem] font-black text-[#4a648a]">
                2 items
              </span>
            </div>
            <p className="mt-1 text-sm text-[#60789a]">Drag by handle to reorder sections.</p>
          </div>
        </div>

        <GuidePin lineSide="right" lineWidth="4.3rem" style={{ left: '1rem', top: '2.1rem' }}>
          Sections tab
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="6rem" style={{ right: '0.7rem', top: '6.2rem' }}>
          Add Section
        </GuidePin>
        <GuidePin lineSide="right" lineWidth="5.4rem" style={{ left: '1rem', top: '6.8rem' }}>
          Section row and controls
        </GuidePin>
      </div>
    );
  }

  if (screen === 'blocks') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="module blocks screenshot"
      >
        <div className="rounded-xl border border-[#d8d5cf] bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm font-black text-[#143155]">Section A: Warm-up</strong>
            <button
              type="button"
              className="inline-flex h-8 min-w-24 items-center justify-center rounded-full bg-[#c9252d] px-3 py-1 text-xs font-black text-white"
            >
              Add Block
            </button>
          </div>
          <div className="mt-2 rounded-lg border border-[#e2dad3] bg-[#fffdfa] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-black text-[#143155]">Lesson: Intro Activity</span>
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.58rem] font-black text-[#4a648a]">
                Draft
              </span>
            </div>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.62rem] font-black text-[#4a648a]">
                Give
              </span>
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.62rem] font-black text-[#4a648a]">
                Hide
              </span>
              <span className="rounded-full border border-[#d2ddec] px-2 py-1 text-[0.62rem] font-black text-[#4a648a]">
                View Content
              </span>
            </div>
          </div>
        </div>

        <GuidePin lineSide="left" lineWidth="4.8rem" style={{ left: '1rem', top: '2.05rem' }}>
          Add Block button
        </GuidePin>
        <GuidePin lineSide="right" lineWidth="5rem" style={{ left: '1rem', top: '6.2rem' }}>
          Lesson row
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="4.9rem" style={{ right: '1rem', top: '7.2rem' }}>
          Give, Hide, View content
        </GuidePin>
      </div>
    );
  }

  if (screen === 'visibility') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="module visibility screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <p className="mb-2 text-sm text-[#556986]">Visibility</p>
          <div className="grid gap-2">
            <span className="rounded-lg border border-[#95dbb0] bg-[#f1fbf4] px-3 py-2 text-sm font-black text-[#157845]">
              Visible
            </span>
            <span className="rounded-lg border border-[#d8e2ef] bg-[#fffdfa] px-3 py-2 text-sm font-black text-[#4f688d]">
              Hidden
            </span>
          </div>
          <p className="mt-3 text-xs text-[#5f7698]">Default: Visible</p>
        </div>

        <GuidePin lineSide="right" lineWidth="4.6rem" style={{ left: '1rem', top: '1rem' }}>
          Visibility tab
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="4.8rem" style={{ left: '1rem', top: '5.8rem' }}>
          Select visibility state
        </GuidePin>
      </div>
    );
  }

  if (screen === 'locking') {
    return (
      <div
        className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
        aria-label="module locking screenshot"
      >
        <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
          <p className="mb-2 text-sm text-[#556986]">Locking</p>
          <div className="grid gap-2">
            <span className="rounded-lg border border-[#95dbb0] bg-[#f1fbf4] px-3 py-2 text-sm font-black text-[#157845]">
              Unlocked
            </span>
            <span className="rounded-lg border border-[#f2dd9d] bg-[#fff7df] px-3 py-2 text-sm font-black text-[#8b6a00]">
              Locked
            </span>
          </div>
          <p className="mt-3 text-xs text-[#5f7698]">Default behavior: unlocked</p>
        </div>

        <GuidePin lineSide="right" lineWidth="4.8rem" style={{ left: '1rem', top: '1.1rem' }}>
          Locking tab
        </GuidePin>
        <GuidePin lineSide="left" lineWidth="5rem" style={{ left: '1rem', top: '6.1rem' }}>
          Choose unlocked or locked
        </GuidePin>
      </div>
    );
  }

  return (
    <div
      className="teacher-intervention-workspace__manual-shot relative rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner"
      aria-label="module notes screenshot"
    >
      <div className="rounded-xl border border-[#e4ecf4] bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <strong className="text-sm font-black text-[#143155]">Module Notes</strong>
          <span className="rounded-full border border-[#d8e2ef] bg-[#fffdfa] px-2 py-1 text-xs font-black text-[#4f688d]">
            Private
          </span>
        </div>
        <span className="block h-16 w-full rounded-lg border border-[#d4deed] bg-[#f9fbff] p-2 text-xs text-[#60789a]">
          Write reminders here
        </span>
        <button
          type="button"
          className="mt-2 inline-flex h-10 min-w-28 items-center justify-center rounded-full bg-[#c9252d] px-3 py-1 text-sm font-black text-white"
        >
          Save Notes
        </button>
      </div>

      <GuidePin lineSide="right" lineWidth="5rem" style={{ left: '1rem', top: '1.1rem' }}>
        Private notes
      </GuidePin>
      <GuidePin lineSide="left" lineWidth="4.6rem" style={{ right: '1rem', top: '5.5rem' }}>
        Save notes
      </GuidePin>
    </div>
  );
}

function toParamValue(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] || '';
  return input || '';
}


function getPlainTextLength(html: string) {
  return normalizeRichText(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .length;
}

function normalizeModule(raw: ClassModule) {
  const orderedSections = [...raw.sections]
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      ...section,
      order: index + 1,
      items: [...section.items]
        .sort((a, b) => a.order - b.order)
        .map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })),
    }));

  return {
    ...raw,
    sections: orderedSections,
  };
}

function moveEntry<T>(list: T[], fromIndex: number, toIndex: number) {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return list;
  next.splice(toIndex, 0, moved);
  return next;
}

function formatScheduleSummary(classItem: ClassItem) {
  const schedule = classItem.schedules?.[0];
  if (!schedule) return 'Schedule unavailable';
  const day = schedule.days?.[0] || 'Day';
  return `${day} ${schedule.startTime}-${schedule.endTime}`;
}

function normalizeLibrarySubjectKey(
  subjectCode?: string | null,
  subjectName?: string | null,
) {
  const raw = `${subjectCode ?? ''} ${subjectName ?? ''}`.toLowerCase();
  if (raw.includes('science') || raw.includes('sci')) return 'science' as const;
  if (raw.includes('math')) return 'math' as const;
  if (raw.includes('english') || raw.includes('eng')) return 'english' as const;
  if (raw.includes('filipino') || raw.includes('fil')) return 'filipino' as const;
  if (raw.includes('araling') || raw.includes('panlipunan') || /\bap\b/.test(raw)) return 'ap' as const;
  if (raw.includes('tle')) return 'tle' as const;
  if (raw.includes('mapeh')) return 'mapeh' as const;
  if (raw.includes('esp') || raw.includes('values') || raw.includes('pagpapakatao')) return 'esp' as const;
  return undefined;
}

function normalizeLibraryGradeLevel(value?: string | null) {
  const match = String(value ?? '').match(/\b(7|8|9|10)\b/);
  return match?.[1] as '7' | '8' | '9' | '10' | undefined;
}

function iconForItemType(itemType: ModuleItemType) {
  if (itemType === 'assessment') return ClipboardList;
  if (itemType === 'file') return FileText;
  return BookOpen;
}

function titleForItem(item: ModuleItem) {
  if (item.itemType === 'lesson') {
    const metadataTitle =
      typeof item.metadata?.lessonTitle === 'string'
        ? item.metadata.lessonTitle
        : undefined;
    return item.lesson?.title || metadataTitle || 'Untitled lesson';
  }
  if (item.itemType === 'assessment') return item.assessment?.title || 'Untitled assessment';
  return item.file?.originalName || 'Untitled file';
}

function statusForItem(item: ModuleItem) {
  if (item.itemType === 'lesson') {
    return item.lesson?.isDraft ? 'Draft' : 'Published';
  }
  if (item.itemType === 'assessment') {
    return item.assessment?.isPublished ? 'Published' : 'Draft';
  }
  return 'File';
}

function itemMeta(item: ModuleItem) {
  if (item.itemType === 'assessment') {
    const scoreText = item.assessment?.totalPoints ? `${item.assessment.totalPoints} pts` : 'Assessment';
    return scoreText;
  }
  if (item.itemType === 'file') {
    return item.file?.mimeType || 'File';
  }
  return typeof item.metadata?.lessonSummary === 'string'
    ? item.metadata.lessonSummary
    : 'Lesson';
}

function isDraftAssessmentItem(item: ModuleItem) {
  return item.itemType === 'assessment' && !item.assessment?.isPublished;
}

function getItemEditorHref(item: ModuleItem, classId: string, moduleId: string) {
  if (item.itemType === 'lesson' && item.lessonId) {
    return `/dashboard/teacher/lessons/${item.lessonId}/edit`;
  }
  if (item.itemType === 'assessment' && item.assessmentId) {
    return `/dashboard/teacher/assessments/${item.assessmentId}/edit`;
  }
  if (item.itemType === 'file' && item.fileId) {
    return `/dashboard/teacher/classes/${classId}/modules/${moduleId}/files/${item.fileId}`;
  }
  return null;
}


export default function TeacherModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = toParamValue(params.id);
  const moduleId = toParamValue(params.moduleId);

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [module, setModule] = useState<ClassModule | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeTab, setActiveTab] = useState<ModuleTab>('sections');
  const [loading, setLoading] = useState(true);
  const [creatingSection, setCreatingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [updatingModule, setUpdatingModule] = useState(false);
  const [attachingItem, setAttachingItem] = useState(false);
  const [attachSource, setAttachSource] = useState<FileAttachSource>('upload');
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [attachState, setAttachState] = useState<AttachState>({
    open: false,
    sectionId: '',
    itemType: null,
    assessmentMode: 'create-new',
    itemId: '',
    lessonPoints: '0',
    file: null,
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [savingSectionEdit, setSavingSectionEdit] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<DraggingItem>(null);
  const [pendingItemIds, setPendingItemIds] = useState<Record<string, boolean>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [previewItem, setPreviewItem] = useState<ModuleItem | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!classId || !moduleId) return;

    try {
      setLoading(true);
      const [classResponse, modulesResponse, assessmentResponse] = await Promise.all([
        classService.getById(classId),
        moduleService.getByClass(classId),
        assessmentService.getByClass(classId),
      ]);

      const resolvedClass = classResponse.data || null;
      const normalizedModules = (modulesResponse.data || []).map((entry) =>
        normalizeModule(entry),
      );
      const currentModule =
        normalizedModules.find((entry) => entry.id === moduleId) || null;

      setClassItem(resolvedClass);
      setModule(currentModule);
      setAssessments(assessmentResponse.data || []);
      setNotesDraft(currentModule?.teacherNotes || '');
      setExpandedSections((current) => {
        if (!currentModule) return {};
        const next: Record<string, boolean> = {};
        currentModule.sections.forEach((section) => {
          next[section.id] = current[section.id] ?? true;
        });
        return next;
      });
    } catch {
      setClassItem(null);
      setModule(null);
      setAssessments([]);
      toast.error('Unable to load module details');
    } finally {
      setLoading(false);
    }
  }, [classId, moduleId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const sectionList = useMemo(() => module?.sections || [], [module]);

  const allAttachedAssessmentIds = useMemo(() => {
    return new Set(
      sectionList.flatMap((section) =>
        section.items
          .filter((item) => item.itemType === 'assessment' && item.assessmentId)
          .map((item) => item.assessmentId as string),
      ),
    );
  }, [sectionList]);

  const availableAttachOptions = useMemo(() => {
    if (attachState.itemType === 'assessment') {
      return assessments
        .filter((assessment) => !allAttachedAssessmentIds.has(assessment.id))
        .map((assessment) => ({ id: assessment.id, label: assessment.title }));
    }
    return [];
  }, [assessments, allAttachedAssessmentIds, attachState.itemType]);

  const attachDialogTitle =
    attachState.itemType === 'lesson'
      ? 'Add Lesson Block'
      : attachState.itemType === 'assessment'
        ? 'Add Assessment Block'
        : attachState.itemType === 'file'
          ? 'Add PDF Block'
          : 'Add Block';

  const attachDialogDescription =
    attachState.itemType === 'lesson'
      ? 'Create a new empty lesson, attach it to this section, then open the lesson editor.'
      : attachState.itemType === 'assessment'
        ? 'Create a new empty assessment or attach an existing one.'
        : attachState.itemType === 'file'
          ? 'Upload a new PDF or attach an existing library file as a downloadable module block.'
          : 'Choose the block type you want to add to this section.';

  const canSubmitAttach =
    attachState.itemType === 'file'
      ? attachSource === 'library'
        ? Boolean(attachState.itemId)
        : Boolean(attachState.file)
      : attachState.itemType === 'lesson'
        ? true
      : attachState.itemType === 'assessment'
        ? attachState.assessmentMode === 'create-new' || Boolean(attachState.itemId)
      : attachState.itemType === null
        ? false
        : false;

  const activeGuidePage = teacherModuleGuidePages[helpPage] ?? teacherModuleGuidePages[0];

  useEffect(() => {
    if (!attachState.open) return;
    if (
      attachState.itemType === 'file' ||
      attachState.itemType === 'lesson' ||
      attachState.assessmentMode !== 'attach-existing' ||
      attachState.itemType === null
    ) {
      return;
    }
    setAttachState((current) => {
      if (current.itemId && availableAttachOptions.some((option) => option.id === current.itemId)) {
        return current;
      }
      return {
        ...current,
        itemId: availableAttachOptions[0]?.id || '',
      };
    });
  }, [attachState.assessmentMode, attachState.itemType, attachState.open, availableAttachOptions]);

  const lessonCount = sectionList.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'lesson').length,
    0,
  );

  const assessmentCount = sectionList.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'assessment').length,
    0,
  );
  const isCoreModule = Boolean(module?.isCoreTemplateAsset);

  const runModulePatch = async (patch: { isVisible?: boolean; isLocked?: boolean; teacherNotes?: string }) => {
    if (!module) return;

    const previous = module;
    const next = { ...module, ...patch };
    setModule(next);

    try {
      setUpdatingModule(true);
      await moduleService.update(module.id, patch);
    } catch {
      setModule(previous);
      toast.error('Unable to update module settings');
    } finally {
      setUpdatingModule(false);
    }
  };

  const handleReleaseCoreModule = async (isVisible: boolean) => {
    if (!module || updatingModule) return;

    const previous = module;
    const next = { ...module, isVisible };
    setModule(next);

    try {
      setUpdatingModule(true);
      const response = await moduleService.releaseCoreModule(module.id, { isVisible });
      setModule(response.data);
      toast.success(isVisible ? 'Default module released to students' : 'Default module hidden from students');
    } catch {
      setModule(previous);
      toast.error('Unable to update default module release');
    } finally {
      setUpdatingModule(false);
    }
  };

  const handleCreateSection = async () => {
    if (!module || creatingSection) return;
    const title = sectionTitle.trim();
    if (!title) {
      toast.error('Section title is required');
      return;
    }

    try {
      setCreatingSection(true);
      await moduleService.createSection(module.id, {
        title,
        order: module.sections.length + 1,
      });
      setSectionTitle('');
      await fetchData();
      toast.success('Section created');
    } catch {
      toast.error('Unable to create section');
    } finally {
      setCreatingSection(false);
    }
  };

  const handleSaveSectionTitle = async (sectionId: string) => {
    const title = editingSectionTitle.trim();
    if (!title || savingSectionEdit) return;

    try {
      setSavingSectionEdit(true);
      await moduleService.updateSection(sectionId, { title });
      setModule((current) => {
        if (!current) return current;
        return {
          ...current,
          sections: current.sections.map((section) =>
            section.id === sectionId ? { ...section, title } : section,
          ),
        };
      });
      setEditingSectionId(null);
      setEditingSectionTitle('');
      toast.success('Section updated');
    } catch {
      toast.error('Unable to update section');
    } finally {
      setSavingSectionEdit(false);
    }
  };

  const confirmDeleteSection = (sectionId: string) => {
    setConfirmation({
      title: 'Delete section?',
      description: 'The section and all attached items will be removed from this module.',
      tone: 'danger',
      confirmLabel: 'Delete Section',
      details: 'This action cannot be undone.',
      onConfirm: async () => {
        await moduleService.deleteSection(sectionId);
        await fetchData();
        toast.success('Section deleted');
      },
    });
  };

  const handleReorderSections = async (targetSectionId: string) => {
    if (!module || !draggingSectionId || draggingSectionId === targetSectionId) return;

    const sections = [...module.sections];
    const fromIndex = sections.findIndex((section) => section.id === draggingSectionId);
    const toIndex = sections.findIndex((section) => section.id === targetSectionId);
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = moveEntry(sections, fromIndex, toIndex).map((section, index) => ({
      ...section,
      order: index + 1,
    }));

    const previous = module.sections;
    setModule((current) => (current ? { ...current, sections: moved } : current));

    try {
      await moduleService.reorderSections(
        module.id,
        moved.map((section) => ({ id: section.id, order: section.order })),
      );
    } catch {
      setModule((current) => (current ? { ...current, sections: previous } : current));
      toast.error('Unable to reorder sections');
    } finally {
      setDraggingSectionId(null);
    }
  };

  const handleReorderItems = async (sectionId: string, targetItemId: string) => {
    if (!module || !draggingItem || draggingItem.sectionId !== sectionId) return;
    if (draggingItem.itemId === targetItemId) return;

    const section = module.sections.find((entry) => entry.id === sectionId);
    if (!section) return;

    const fromIndex = section.items.findIndex((item) => item.id === draggingItem.itemId);
    const toIndex = section.items.findIndex((item) => item.id === targetItemId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reorderedItems = moveEntry(section.items, fromIndex, toIndex).map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    const previous = section.items;
    setModule((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((entry) =>
          entry.id === sectionId ? { ...entry, items: reorderedItems } : entry,
        ),
      };
    });

    try {
      await moduleService.reorderItems(
        sectionId,
        reorderedItems.map((item) => ({ id: item.id, order: item.order })),
      );
    } catch {
      setModule((current) => {
        if (!current) return current;
        return {
          ...current,
          sections: current.sections.map((entry) =>
            entry.id === sectionId ? { ...entry, items: previous } : entry,
          ),
        };
      });
      toast.error('Unable to reorder items');
    } finally {
      setDraggingItem(null);
    }
  };

  const handleUpdateItem = async (
    sectionId: string,
    itemId: string,
    patch: { isRequired?: boolean; isVisible?: boolean; isGiven?: boolean; points?: number },
  ) => {
    if (!module || pendingItemIds[itemId]) return;

    const snapshot = module;
    setPendingItemIds((current) => ({ ...current, [itemId]: true }));
    setModule((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        ...patch,
                        ...(patch.points !== undefined
                          ? {
                              lessonPoints: patch.points,
                              metadata: {
                                ...(item.metadata || {}),
                                points: patch.points,
                              },
                            }
                          : {}),
                      }
                    : item,
                ),
              }
            : section,
        ),
      };
    });

    try {
      await moduleService.updateItem(itemId, patch);
    } catch {
      setModule(snapshot);
      toast.error('Unable to update item setting');
    } finally {
      setPendingItemIds((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
  };

  const handleReleaseCoreItem = async (
    sectionId: string,
    itemId: string,
    patch: { isVisible?: boolean; isGiven?: boolean },
  ) => {
    if (!module || pendingItemIds[itemId]) return;

    const snapshot = module;
    setPendingItemIds((current) => ({ ...current, [itemId]: true }));
    setModule((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.id === itemId ? { ...item, ...patch } : item,
                ),
              }
            : section,
        ),
      };
    });

    try {
      await moduleService.releaseCoreItem(itemId, patch);
      toast.success('Default item release updated');
    } catch {
      setModule(snapshot);
      toast.error('Unable to update default item release');
    } finally {
      setPendingItemIds((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
  };

  const handleOpenCoreItemPreview = async (item: ModuleItem) => {
    if (!item.isCoreTemplateAsset) return;

    if (item.itemType === 'lesson' && item.lessonId) {
      router.push(
        `/dashboard/teacher/lessons/${item.lessonId}/view?classId=${classId}&moduleId=${moduleId}`,
      );
      return;
    }

    if (item.itemType === 'assessment' && item.assessmentId) {
      router.push(
        `/dashboard/teacher/assessments/${item.assessmentId}/edit?mode=view&classId=${classId}&moduleId=${moduleId}`,
      );
      return;
    }
  };

  const confirmDetachItem = (itemId: string) => {
    setConfirmation({
      title: 'Remove item from module?',
      description: 'This removes the item from this module section only.',
      tone: 'danger',
      confirmLabel: 'Remove Item',
      details: 'The source lesson or assessment remains available in the class.',
      onConfirm: async () => {
        await moduleService.detachItem(itemId);
        await fetchData();
        toast.success('Item removed');
      },
    });
  };

  const handleAttachItem = async () => {
    if (!attachState.sectionId || !attachState.itemType || attachingItem) return;

    if (
      attachState.itemType === 'assessment' &&
      attachState.assessmentMode === 'attach-existing' &&
      !attachState.itemId
    ) {
      toast.error('Select an item to attach');
      return;
    }

    try {
      setAttachingItem(true);
      let createdAssessmentId: string | null = null;
      let payload:
        | {
            itemType: 'lesson';
            lessonId: string;
            points?: number;
          }
        | {
            itemType: 'assessment';
            assessmentId: string;
            isGiven: boolean;
          }
        | {
            itemType: 'file';
            fileId: string;
            metadata: Record<string, unknown>;
          };

      if (attachState.itemType === 'lesson') {
        const createdLesson = await lessonService.create({
          classId,
          title: 'Untitled Lesson',
          description: '',
        });
        const parsedPoints = Number.parseInt(attachState.lessonPoints || '0', 10);
        payload = {
          itemType: 'lesson',
          lessonId: createdLesson.data.id,
          points: Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : 0,
        };
      } else if (attachState.itemType === 'assessment') {
        if (attachState.assessmentMode === 'create-new') {
          const createdAssessment = await assessmentService.create({
            title: 'Untitled Assessment',
            classId,
          });
          createdAssessmentId = createdAssessment.data.id;
          payload = {
            itemType: 'assessment',
            assessmentId: createdAssessmentId,
            isGiven: false,
          };
        } else {
          payload = {
            itemType: 'assessment',
            assessmentId: attachState.itemId,
            isGiven: false,
          };
        }
      } else {
        if (attachSource === 'library') {
          if (!attachState.itemId) {
            toast.error('Choose a library file first');
            setAttachingItem(false);
            return;
          }
          payload = {
            itemType: 'file',
            fileId: attachState.itemId,
            metadata: { fileSubtype: 'library' },
          };
        } else {
          if (!attachState.file) {
            toast.error('Upload a PDF file first');
            setAttachingItem(false);
            return;
          }
          const uploaded = await fileService.upload(attachState.file, {
            classId,
            scope: 'private',
          });
          payload = {
            itemType: 'file',
            fileId: uploaded.data.id,
            metadata: { fileSubtype: 'pdf' },
          };
        }
      }
      await moduleService.attachItem(attachState.sectionId, payload);
      setAttachState({
        open: false,
        sectionId: '',
        itemType: null,
        assessmentMode: 'create-new',
        itemId: '',
        lessonPoints: '0',
        file: null,
      });
      setAttachSource('upload');
      setLibraryPickerOpen(false);
      await fetchData();
      if (attachState.itemType === 'lesson' && payload.itemType === 'lesson') {
        toast.success('Lesson block created');
        router.push(`/dashboard/teacher/lessons/${payload.lessonId}/edit`);
        return;
      }

      if (
        attachState.itemType === 'assessment' &&
        attachState.assessmentMode === 'create-new' &&
        createdAssessmentId
      ) {
        toast.success('Assessment block created');
        router.push(`/dashboard/teacher/assessments/${createdAssessmentId}/edit`);
        return;
      }

      toast.success(
        attachState.itemType === 'assessment'
          ? 'Assessment attached (not given yet)'
          : 'PDF block attached',
      );
    } catch {
      toast.error('Unable to attach item');
    } finally {
      setAttachingItem(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!module || savingNotes) return;
    try {
      setSavingNotes(true);
      const safeNotes = normalizeRichText(notesDraft).trim() || '';
      await moduleService.update(module.id, { teacherNotes: safeNotes });
      setModule((current) => (current ? { ...current, teacherNotes: safeNotes } : current));
      toast.success('Notes saved');
    } catch {
      toast.error('Unable to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-[32rem] rounded-2xl" />
      </div>
    );
  }

  if (!module || !classItem) {
    return <p className="text-sm text-slate-500">Module not found.</p>;
  }

  return (
    <div className="teacher-module-detail">
      <header className="teacher-module-detail__hero">
        <button
          type="button"
          className="teacher-module-detail__hero-help"
          onClick={() => {
            setHelpPage(0);
            setHelpOpen(true);
          }}
          aria-label="Module help"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
        <Link href={`/dashboard/teacher/classes/${classId}`} className="teacher-module-detail__back">
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Link>
        <div className="teacher-module-detail__hero-row">
          <span className="teacher-module-detail__pill">M{module.order}</span>
          <div className="teacher-module-detail__hero-copy">
            <h1>{module.title}</h1>
            {module.description ? <RichTextRenderer html={module.description} /> : <p>No module description yet.</p>}
            <div className="teacher-module-detail__hero-meta">
              {isCoreModule ? (
                <span data-tone="warn">
                  <Lock className="h-3.5 w-3.5" />
                  Default module
                </span>
              ) : null}
              <span data-tone={module.isVisible ? 'good' : 'muted'}>
                {module.isVisible ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hidden
                  </>
                )}
              </span>
              <span data-tone={module.isLocked ? 'warn' : 'neutral'}>
                {module.isLocked ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Unlocked
                  </>
                )}
              </span>
              <span>
                {lessonCount} lessons - {assessmentCount} assessments - {formatScheduleSummary(classItem)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav className="teacher-module-detail__tabs" aria-label="Module detail tabs">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className="teacher-module-detail__tab"
              data-active={active}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="teacher-module-detail__content">
        {activeTab === 'sections' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <div className="teacher-module-detail__section-head">
              <div>
                <h2>Sections</h2>
                <p>{sectionList.length} sections</p>
              </div>
              {isCoreModule ? (
                <div className="teacher-module-detail__tip" data-tone="warning">
                  <strong>Default module:</strong> Section structure is inherited from the template and cannot be edited here.
                </div>
              ) : (
                <div className="teacher-module-detail__section-creator">
                  <Input
                    value={sectionTitle}
                    onChange={(event) => setSectionTitle(event.target.value)}
                    placeholder="Add section title"
                    maxLength={120}
                  />
                  <Button
                    type="button"
                    className="teacher-module-detail__primary"
                    data-priority="primary"
                    onClick={() => void handleCreateSection()}
                    disabled={creatingSection}
                  >
                    <Plus className="h-4 w-4" />
                    Add Section
                  </Button>
                </div>
              )}
            </div>

            {sectionList.map((section) => {
              const expanded = expandedSections[section.id] ?? true;
              return (
                <article
                  key={section.id}
                  className="teacher-module-detail__section-card"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleReorderSections(section.id)}
                  data-dragging={draggingSectionId === section.id}
                >
                  <header className="teacher-module-detail__section-card-head">
                    {isCoreModule ? (
                      <span className="teacher-module-detail__drag-handle" aria-hidden="true">
                        <Lock className="h-4 w-4" />
                      </span>
                    ) : (
                      <ActionTooltip label="Drag to reorder section">
                        <button
                          type="button"
                          className="teacher-module-detail__drag-handle"
                          draggable
                          onDragStart={() => setDraggingSectionId(section.id)}
                          onDragEnd={() => setDraggingSectionId(null)}
                          aria-label="Reorder section"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </ActionTooltip>
                    )}
                    <div className="teacher-module-detail__section-main">
                      {editingSectionId === section.id ? (
                        <div className="teacher-module-detail__section-edit">
                          <Input
                            value={editingSectionTitle}
                            onChange={(event) => setEditingSectionTitle(event.target.value)}
                            maxLength={120}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="teacher-module-detail__primary"
                            data-priority="primary"
                            onClick={() => void handleSaveSectionTitle(section.id)}
                            disabled={savingSectionEdit}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3>{section.title}</h3>
                          <span>{section.items.length} items</span>
                        </>
                      )}
                    </div>
                    <div className="teacher-module-detail__section-actions">
                      {!isCoreModule ? (
                        <>
                          <ActionTooltip label="Rename section">
                            <button
                              type="button"
                              className="teacher-module-detail__ghost"
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditingSectionTitle(section.title);
                              }}
                              aria-label="Edit section title"
                            >
                              <NotebookPen className="h-4 w-4" />
                            </button>
                          </ActionTooltip>
                          <ActionTooltip label="Delete section">
                            <button
                              type="button"
                              className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                              onClick={() => confirmDeleteSection(section.id)}
                              aria-label="Delete section"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </ActionTooltip>
                        </>
                      ) : null}
                      <ActionTooltip label={expanded ? 'Collapse items' : 'Expand items'}>
                        <button
                          type="button"
                          className="teacher-module-detail__ghost"
                          onClick={() =>
                            setExpandedSections((current) => ({
                              ...current,
                              [section.id]: !expanded,
                            }))
                          }
                          aria-label="Toggle section items"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                        </button>
                      </ActionTooltip>
                    </div>
                  </header>

                  {expanded ? (
                    <div className="teacher-module-detail__items">
                      {section.items.length === 0 ? (
                        <div className="teacher-module-detail__empty">No module items yet.</div>
                      ) : (
                        section.items.map((item) => {
                          const Icon = iconForItemType(item.itemType);
                          const pending = pendingItemIds[item.id] || false;
                          const status = statusForItem(item);
                          const itemEditorHref = getItemEditorHref(item, classId, moduleId);
                          const isCoreItem = Boolean(item.isCoreTemplateAsset);
                          return (
                            <div
                              key={item.id}
                              className="teacher-module-detail__item-row"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => void handleReorderItems(section.id, item.id)}
                            >
                              <ActionTooltip label="Drag to reorder item">
                                <button
                                  type="button"
                                  className="teacher-module-detail__drag-handle"
                                  draggable
                                  onDragStart={() => setDraggingItem({ sectionId: section.id, itemId: item.id })}
                                  onDragEnd={() => setDraggingItem(null)}
                                  aria-label="Reorder item"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                              </ActionTooltip>

                              {itemEditorHref && !isCoreItem ? (
                                <Link
                                  href={itemEditorHref}
                                  className="teacher-module-detail__item-main"
                                  aria-label={`Open ${item.itemType} editor`}
                                >
                                  <div className="teacher-module-detail__item-icon">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="teacher-module-detail__item-copy">
                                    <div className="teacher-module-detail__chips">
                                      <span data-kind={item.itemType}>{item.itemType}</span>
                                      <span data-kind={status === 'Published' ? 'published' : status === 'Draft' ? 'draft' : 'file'}>
                                        {status}
                                      </span>
                                      {isCoreItem ? <span data-kind="draft">Default item</span> : null}
                                    </div>
                                    <h4>{titleForItem(item)}</h4>
                                    <p>{itemMeta(item)}</p>
                                  </div>
                                </Link>
                              ) : (
                                <div className="teacher-module-detail__item-main teacher-module-detail__item-main--disabled">
                                  <div className="teacher-module-detail__item-icon">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="teacher-module-detail__item-copy">
                                    <div className="teacher-module-detail__chips">
                                      <span data-kind={item.itemType}>{item.itemType}</span>
                                      <span data-kind={status === 'Published' ? 'published' : status === 'Draft' ? 'draft' : 'file'}>
                                        {status}
                                      </span>
                                      {isCoreItem ? <span data-kind="draft">Default item</span> : null}
                                    </div>
                                    <h4>{titleForItem(item)}</h4>
                                    <p>{itemMeta(item)}</p>
                                  </div>
                                </div>
                              )}
                              <div className="teacher-module-detail__item-controls">
                                {isCoreItem ? (
                                  <>
                                    <button
                                      type="button"
                                      className="teacher-module-detail__outline"
                                      onClick={() => void handleOpenCoreItemPreview(item)}
                                      disabled={pending}
                                      aria-label="View Content"
                                    >
                                      View Content
                                    </button>
                                    <label className="teacher-module-detail__control-toggle">
                                      <input
                                        type="checkbox"
                                        checked={!item.isVisible}
                                        disabled={pending}
                                        onChange={(event) =>
                                          void handleReleaseCoreItem(section.id, item.id, { isVisible: !event.target.checked })
                                        }
                                      />
                                      Hide
                                    </label>
                                    {item.itemType === 'assessment' ? (
                                      <label className="teacher-module-detail__control-toggle">
                                        <input
                                          type="checkbox"
                                          checked={item.isGiven}
                                          disabled={pending || isDraftAssessmentItem(item)}
                                          onChange={(event) =>
                                            void handleReleaseCoreItem(section.id, item.id, { isGiven: event.target.checked })
                                          }
                                        />
                                        Give
                                      </label>
                                    ) : null}
                                  </>
                                ) : (
                                  <>
                                    <label className="teacher-module-detail__control-toggle">
                                      <input
                                        type="checkbox"
                                        checked={item.isRequired}
                                        disabled={pending}
                                        onChange={(event) =>
                                          void handleUpdateItem(section.id, item.id, { isRequired: event.target.checked })
                                        }
                                      />
                                      Required
                                    </label>
                                    <label className="teacher-module-detail__control-toggle">
                                      <input
                                        type="checkbox"
                                        checked={!item.isVisible}
                                        disabled={pending}
                                        onChange={(event) =>
                                          void handleUpdateItem(section.id, item.id, { isVisible: !event.target.checked })
                                        }
                                      />
                                      Hide
                                    </label>
                                    {item.itemType === 'assessment' ? (
                                      <label className="teacher-module-detail__control-toggle">
                                        <input
                                          type="checkbox"
                                          checked={item.isGiven}
                                          disabled={pending || isDraftAssessmentItem(item)}
                                          onChange={(event) =>
                                            void handleUpdateItem(section.id, item.id, { isGiven: event.target.checked })
                                          }
                                        />
                                        Give
                                      </label>
                                    ) : null}
                                    {item.itemType === 'lesson' ? (
                                      <label className="teacher-module-detail__points-field">
                                        Points
                                        <input
                                          type="number"
                                          min={0}
                                          max={10000}
                                          value={String(item.lessonPoints ?? Number((item.metadata as Record<string, unknown> | null)?.points ?? 0))}
                                          disabled={pending}
                                          onChange={(event) =>
                                            void handleUpdateItem(section.id, item.id, {
                                              points: Math.max(0, Number.parseInt(event.target.value || '0', 10) || 0),
                                            })
                                          }
                                        />
                                      </label>
                                    ) : null}
                                    <ActionTooltip label="Remove item from section">
                                      <button
                                        type="button"
                                        className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                                        onClick={() => confirmDetachItem(item.id)}
                                        aria-label="Remove item"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </ActionTooltip>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}

                  <footer className="teacher-module-detail__section-footer">
                    {isCoreModule ? (
                      <div className="teacher-module-detail__tip" data-tone="warning">
                        <strong>Default module:</strong> Add or remove blocks in the template workspace, then create a fresh class from that template.
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="teacher-module-detail__outline teacher-module-detail__section-add-cta"
                        data-priority="section-add"
                        aria-label="Add Block"
                        onClick={() =>
                          setAttachState({
                            open: true,
                            sectionId: section.id,
                            itemType: null,
                            assessmentMode: 'create-new',
                            itemId: '',
                            lessonPoints: '0',
                            file: null,
                          })
                        }
                      >
                        <span className="teacher-module-detail__section-add-icon" aria-hidden="true">
                          <Plus className="h-4 w-4" />
                        </span>
                        <span className="teacher-module-detail__section-add-copy">
                          <span>Add Block</span>
                          <small aria-hidden="true">Lesson, assessment, or PDF</small>
                        </span>
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}

          </div>
        ) : null}
        {activeTab === 'visibility' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Visibility</h2>
            <p className="teacher-module-detail__lead">
              {isCoreModule
                ? 'Default modules stay immutable. You can only control whether students can see them.'
                : 'Control whether students can see this module in their course view.'}
            </p>
            <div className="teacher-module-detail__choice-grid">
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={module.isVisible}
                onClick={() =>
                  void (isCoreModule
                    ? handleReleaseCoreModule(true)
                    : runModulePatch({ isVisible: true }))
                }
                disabled={updatingModule}
                aria-label={isCoreModule ? 'Release Module' : undefined}
              >
                <Eye className="h-5 w-5" />
                <div>
                  <h3>{isCoreModule ? 'Release Module' : 'Visible'}</h3>
                  <p>
                    {isCoreModule
                      ? 'Students can see this default module and access its locked template content.'
                      : 'Students can see this module and access its content.'}
                  </p>
                </div>
                {module.isVisible ? <span><Eye className="h-4 w-4" /></span> : null}
              </button>
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={!module.isVisible}
                onClick={() =>
                  void (isCoreModule
                    ? handleReleaseCoreModule(false)
                    : runModulePatch({ isVisible: false }))
                }
                disabled={updatingModule}
              >
                <EyeOff className="h-5 w-5" />
                <div>
                  <h3>{isCoreModule ? 'Hide Module' : 'Hidden'}</h3>
                  <p>
                    {isCoreModule
                      ? 'Keep this default module in teacher-only view until you are ready to release it.'
                      : 'This module is hidden from students. Only teachers can see it.'}
                  </p>
                </div>
                {!module.isVisible ? <span><EyeOff className="h-4 w-4" /></span> : null}
              </button>
            </div>
            <div className="teacher-module-detail__tip" data-tone="warning">
              <strong>Note:</strong> Hiding a module does not delete any content.
            </div>
          </div>
        ) : null}

        {activeTab === 'locking' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Locking</h2>
            {isCoreModule ? (
              <>
                <p className="teacher-module-detail__lead">
                  Default modules remain locked and immutable in the class. Change the template if the structure needs to evolve.
                </p>
                <div className="teacher-module-detail__tip" data-tone="warning">
                  <strong>Default module:</strong> Locking is enforced by the template copy. Only student visibility can be changed here.
                </div>
              </>
            ) : (
              <>
                <p className="teacher-module-detail__lead">
                  Lock this module to prevent students from opening content until you unlock it.
                </p>
                <div className="teacher-module-detail__choice-grid">
                  <button
                    type="button"
                    className="teacher-module-detail__choice"
                    data-active={!module.isLocked}
                    onClick={() => void runModulePatch({ isLocked: false })}
                    disabled={updatingModule}
                  >
                    <Unlock className="h-5 w-5" />
                    <div>
                      <h3>Unlocked</h3>
                      <p>Students can access all lessons and assessments in this module.</p>
                    </div>
                    {!module.isLocked ? <span><Unlock className="h-4 w-4" /></span> : null}
                  </button>
                  <button
                    type="button"
                    className="teacher-module-detail__choice"
                    data-active={module.isLocked}
                    onClick={() => void runModulePatch({ isLocked: true })}
                    disabled={updatingModule}
                  >
                    <Lock className="h-5 w-5" />
                    <div>
                      <h3>Locked</h3>
                      <p>Students see the module but cannot open lessons or assessments.</p>
                    </div>
                    {module.isLocked ? <span><Lock className="h-4 w-4" /></span> : null}
                  </button>
                </div>
                <div className="teacher-module-detail__tip" data-tone="info">
                  <strong>Tip:</strong> Use locking to release modules progressively.
                </div>
              </>
            )}
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Notes</h2>
            <p className="teacher-module-detail__lead">
              Private notes visible only to you. Use this for reminders and pacing notes.
            </p>
            <article className="teacher-module-detail__notes-card">
              <RichTextEditor
                value={notesDraft}
                onChange={setNotesDraft}
                placeholder="Add your private notes for this module..."
                minHeight={240}
              />
              <div className="teacher-module-detail__notes-foot">
                <span>{getPlainTextLength(notesDraft)} characters</span>
                <Button
                  type="button"
                  className="teacher-module-detail__primary"
                  data-priority="primary"
                  onClick={() => void handleSaveNotes()}
                  disabled={savingNotes}
                >
                  <Save className="h-4 w-4" />
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </article>
          </div>
        ) : null}

      </section>

      <Dialog
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (open) return;
          setPreviewItem(null);
          setPreviewLesson(null);
          setPreviewAssessment(null);
          setPreviewError(null);
          setPreviewLoading(false);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewLesson?.title || previewAssessment?.title || (previewItem ? titleForItem(previewItem) : 'Content Preview')}
            </DialogTitle>
            <DialogDescription>
              Read-only preview of template-managed content.
            </DialogDescription>
          </DialogHeader>
          {previewLoading ? <p className="text-sm text-slate-500">Loading preview...</p> : null}
          {!previewLoading && previewError ? (
            <p className="text-sm text-rose-600">{previewError}</p>
          ) : null}
          {!previewLoading && !previewError && previewLesson ? (
            <div className="space-y-4">
              {previewLesson.description ? (
                <RichTextRenderer html={previewLesson.description} />
              ) : (
                <p className="text-sm text-slate-500">No lesson description.</p>
              )}
              <div className="space-y-3">
                {(previewLesson.contentBlocks ?? [])
                  .slice()
                  .sort((left, right) => left.order - right.order)
                  .map((block) => (
                    <article key={block.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Block {block.order} · {block.type}
                      </p>
                      {typeof block.content === 'string' ? (
                        <RichTextRenderer html={block.content || '<p></p>'} />
                      ) : (
                        <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                          {JSON.stringify(block.content ?? {}, null, 2)}
                        </pre>
                      )}
                    </article>
                  ))}
                {(previewLesson.contentBlocks ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No lesson blocks available.</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {!previewLoading && !previewError && previewAssessment ? (
            <div className="space-y-4">
              {previewAssessment.description ? (
                <RichTextRenderer html={previewAssessment.description} />
              ) : (
                <p className="text-sm text-slate-500">No assessment description.</p>
              )}
              <div className="space-y-3">
                {(previewAssessment.questions ?? []).map((question, index) => (
                  <article key={question.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Question {index + 1} · {question.type}
                    </p>
                    <RichTextRenderer html={question.content || '<p></p>'} />
                    {(question.options ?? []).length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {(question.options ?? []).map((option) => (
                          <li key={option.id}>
                            {option.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
                {(previewAssessment.questions ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No questions available.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={attachState.open}
        onOpenChange={(open) =>
          setAttachState((current) =>
            open
              ? { ...current, open: true }
              : {
                  ...current,
                  open: false,
                  sectionId: '',
                  itemType: null,
                  assessmentMode: 'create-new',
                  itemId: '',
                  lessonPoints: '0',
                  file: null,
                },
          )
        }
      >
        <DialogContent className="teacher-module-detail__attach-modal">
          <DialogHeader>
            <DialogTitle>{attachDialogTitle}</DialogTitle>
            <DialogDescription>{attachDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="teacher-module-detail__attach-modal-body">
            <div className="teacher-module-detail__attach-type-grid">
              {ATTACH_BLOCK_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.type}
                    type="button"
                    className="teacher-module-detail__attach-type"
                    data-active={attachState.itemType === option.type}
                    data-tone={option.tone}
                    onClick={() =>
                      setAttachState((current) => ({
                        ...current,
                        itemType: option.type,
                        assessmentMode: option.type === 'assessment' ? 'create-new' : current.assessmentMode,
                        itemId: '',
                        lessonPoints: '0',
                        file: null,
                      }))
                    }
                  >
                    <span className="teacher-module-detail__attach-type-icon" aria-hidden="true">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="teacher-module-detail__attach-type-copy">
                      <strong>{option.label}</strong>
                      <span className="teacher-module-detail__attach-type-description">
                        {option.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {attachState.itemType === 'file' ? (
              <div className="teacher-module-detail__attach-field">
                <div className="teacher-module-detail__attach-type-grid">
                  {FILE_ATTACH_SOURCE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className="teacher-module-detail__attach-type"
                        data-active={attachSource === option.value}
                        data-tone={option.tone}
                        onClick={() => {
                          setAttachSource(option.value);
                          setAttachState((current) => ({
                            ...current,
                            itemId: option.value === 'upload' ? '' : current.itemId,
                            file: null,
                          }));
                          if (option.value === 'library') {
                            setLibraryPickerOpen(true);
                          }
                        }}
                      >
                        <span className="teacher-module-detail__attach-type-icon" aria-hidden="true">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="teacher-module-detail__attach-type-copy">
                          <strong>{option.label}</strong>
                          <span className="teacher-module-detail__attach-type-description">
                            {option.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {attachSource === 'upload' ? (
                  <>
                    <label htmlFor="attach-file">PDF File</label>
                    <Input
                      id="attach-file"
                      type="file"
                      accept="application/pdf"
                      onChange={(event) =>
                        setAttachState((current) => ({
                          ...current,
                          file: event.target.files?.[0] || null,
                          itemId: '',
                        }))
                      }
                    />
                    {attachState.file ? (
                      <p className="teacher-module-detail__attach-note">
                        Selected file: <strong>{attachState.file.name}</strong>
                      </p>
                    ) : (
                      <p className="teacher-module-detail__attach-note">Upload a PDF to continue.</p>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit"
                      onClick={() => setLibraryPickerOpen(true)}
                    >
                      Choose from Library
                    </Button>
                    {attachState.itemId ? (
                      <p className="teacher-module-detail__attach-note">
                        Library file selected. Add block to attach it to this section.
                      </p>
                    ) : (
                      <p className="teacher-module-detail__attach-note">Choose a library file to continue.</p>
                    )}
                  </>
                )}
              </div>
            ) : attachState.itemType ? (
              <>
                {attachState.itemType === 'lesson' ? (
                  <div className="teacher-module-detail__attach-field">
                    <label htmlFor="attach-lesson-points">Lesson Reward Points</label>
                    <Input
                      id="attach-lesson-points"
                      type="number"
                      min={0}
                      max={10000}
                      value={attachState.lessonPoints}
                      onChange={(event) =>
                        setAttachState((current) => ({
                          ...current,
                          lessonPoints: event.target.value,
                        }))
                      }
                    />
                    <p className="teacher-module-detail__attach-note">
                      Students earn these points after completing the lesson.
                    </p>
                    <p className="teacher-module-detail__attach-note">
                      A new empty draft lesson will be created and attached to this section.
                    </p>
                  </div>
                ) : null}
                {attachState.itemType === 'assessment' ? (
                  <>
                    <div className="teacher-module-detail__attach-type-grid">
                      {ASSESSMENT_ATTACH_MODE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="teacher-module-detail__attach-type"
                            data-active={attachState.assessmentMode === option.value}
                            data-tone="assessment"
                            onClick={() =>
                              setAttachState((current) => ({
                                ...current,
                                assessmentMode: option.value,
                                itemId: '',
                              }))
                            }
                          >
                            <span className="teacher-module-detail__attach-type-icon" aria-hidden="true">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="teacher-module-detail__attach-type-copy">
                              <strong>{option.label}</strong>
                              <span className="teacher-module-detail__attach-type-description">
                                {option.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {attachState.assessmentMode === 'create-new' ? (
                      <p className="teacher-module-detail__attach-note">
                        A new empty assessment will be created, attached to this section, then opened in the editor.
                      </p>
                    ) : null}

                    {attachState.assessmentMode === 'attach-existing' ? (
                      <>
                        <label htmlFor="attach-item">Available assessments</label>
                        <select
                          id="attach-item"
                          value={attachState.itemId}
                          onChange={(event) =>
                            setAttachState((current) => ({
                              ...current,
                              itemId: event.target.value,
                            }))
                          }
                        >
                          {availableAttachOptions.length === 0 ? (
                            <option value="">No available items</option>
                          ) : (
                            availableAttachOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))
                          )}
                        </select>
                        {availableAttachOptions.length === 0 ? (
                          <p className="teacher-module-detail__attach-note">
                            No available assessments. Create one from{' '}
                            <Link href="/dashboard/teacher/assessments">Assessments</Link>.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <p className="teacher-module-detail__attach-note">
                Pick a block type above to continue.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAttachState({
                  open: false,
                  sectionId: '',
                  itemType: null,
                  assessmentMode: 'create-new',
                  itemId: '',
                  lessonPoints: '0',
                  file: null,
                })
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-module-detail__primary"
              data-priority="primary"
              onClick={() => void handleAttachItem()}
              disabled={!canSubmitAttach || attachingItem || !attachState.itemType}
            >
              {attachingItem ? 'Attaching...' : 'Add Block'}
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
        <DialogContent
          className="teacher-intervention-workspace__manual-dialog"
          style={teacherModuleGuideDialogStyle}
        >
          <DialogHeader>
            <DialogTitle>Teacher guide: Module Workspace</DialogTitle>
            <DialogDescription>
              Read this guide one page at a time. Each screenshot points to the core controls for this module page.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>Page {helpPage + 1} of {teacherModuleGuidePages.length}</span>
            <div>
              {teacherModuleGuidePages.map((page, index) => (
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
            <TeacherModuleGuideScreenshot screen={activeGuidePage.screen} />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Module workspace walkthrough</p>
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
              <p className="teacher-intervention-workspace__manual-reminder">{activeGuidePage.reminder}</p>
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
              {helpPage < teacherModuleGuidePages.length - 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setHelpPage((current) => Math.min(current + 1, teacherModuleGuidePages.length - 1))
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

      <LibraryFilePickerDialog
        open={libraryPickerOpen}
        onOpenChange={setLibraryPickerOpen}
        subjectKey={normalizeLibrarySubjectKey(classItem.subjectCode, classItem.subjectName)}
        gradeLevel={normalizeLibraryGradeLevel(classItem.subjectGradeLevel ?? classItem.section?.gradeLevel)}
        onSelect={(file) =>
          setAttachState((current) => ({
            ...current,
            itemType: 'file',
            itemId: file.id,
            file: null,
          }))
        }
      />

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
