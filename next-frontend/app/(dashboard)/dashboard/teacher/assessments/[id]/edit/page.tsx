'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { AssessmentQuestionEditor } from '@/features/assessment-composer/AssessmentQuestionEditor';
import {
  createAssessmentComposerQuestion,
  deleteAssessmentComposerQuestion,
  duplicateAssessmentComposerQuestion,
  reorderAssessmentComposerQuestions,
} from '@/features/assessment-composer/reducer';
import {
  ASSESSMENT_COMPOSER_LABELS,
  ASSESSMENT_COMPOSER_QUESTION_TYPES,
} from '@/features/assessment-composer/question-config';
import type { AssessmentComposerQuestionDraft as QuestionDraft } from '@/features/assessment-composer/types';
import { academicStateService } from '@/services/academic-state-service';
import { assessmentService } from '@/services/assessment-service';
import { classRecordService } from '@/services/class-record-service';
import type {
  Assessment,
  AssessmentClassRecordPlacement,
  AssessmentQuestion,
  AssessmentPlacementMode,
  ClassRecordCategory,
  CreateQuestionDto,
  QuestionAnalyticsResponse,
  RubricCriterion,
  UpdateQuestionDto,
} from '@/types/assessment';
import type { ClassRecordSlotOverview, ClassRecordSlotOverviewCategory } from '@/types/class-record';
import type { AssessmentType, FeedbackLevel, GradingPeriod, QuestionType } from '@/utils/constants';
import './assessment-editor.css';

type RightTab = 'settings' | 'advanced' | 'rubric' | 'analytics';
type Availability = 'given' | 'draft';
type AcademicQuarterStatus = 'loading' | 'ready' | 'error';
type ResultReleaseMode =
  | 'score_immediately'
  | 'full_after_delay'
  | 'full_with_hints_after_delay';
type AssessmentComposerSaveState = 'saved' | 'saving' | 'dirty' | 'error';
type AssessmentSetupSectionId = 'basics' | 'content' | 'delivery' | 'placement' | 'review';
type AssessmentSetupSeverity = 'required' | 'recommended';
type AssessmentGuideScreen = 'overview' | 'build' | 'delivery' | 'placement' | 'review';
type AssessmentGuidePinDirection = 'left' | 'right';

type AssessmentSetupIssue = {
  id: string;
  title: string;
  description: string;
  section: AssessmentSetupSectionId;
  severity: AssessmentSetupSeverity;
  actionLabel?: string;
};

type AssessmentGuidePage = {
  title: string;
  description: string;
  screen: AssessmentGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
  tone?: 'default' | 'caution' | 'success';
  }>;
};

type ComposerImageDisplayMode = 'default' | 'expanded';

type AssessmentGuidePinProps = {
  children: string;
  lineSide: AssessmentGuidePinDirection;
  lineWidth: string;
  style: CSSProperties;
};

type AssessmentEditorLocalDraft = {
  title: string;
  description: string;
  questions: QuestionDraft[];
  selectedQuestionId: string | null;
  deletedQuestionIds: string[];
  availability: Availability;
  resultReleaseMode: ResultReleaseMode;
  assessmentType: AssessmentType;
  passingScore: number;
  maxAttempts: string;
  timeLimitMinutes: string;
  dueDate: string;
  feedbackDelayHours: number;
  category: ClassRecordCategory;
  quarter: GradingPeriod | '';
  placementMode: AssessmentPlacementMode;
  selectedSlotId: string | null;
  closeWhenDue: boolean;
  randomizeQuestions: boolean;
  timedQuestionsEnabled: boolean;
  questionTimeLimitSeconds: string;
  strictMode: boolean;
  fileUploadInstructions: string;
  allowedUploadExtensions: string[];
  allowedUploadMimeTypes: string[];
  maxUploadSizeBytes: number;
  teacherAttachmentFile: Assessment['teacherAttachmentFile'] | null;
  rubricCriteria: RubricCriterion[];
};

const TEACHER_ASSESSMENT_DRAFT_STORAGE_PREFIX = 'teacher-assessment-editor-draft';

const ASSESSMENT_TYPE_TABS: Array<{ value: AssessmentType; label: string }> = [
  { value: 'quiz', label: 'Question Assessment' },
  { value: 'file_upload', label: 'File Upload Assessment' },
];
const DEFAULT_RESULT_RELEASE_DELAY_HOURS = 24;
const RESULT_RELEASE_OPTIONS: Array<{
  value: ResultReleaseMode;
  title: string;
  description: string;
}> = [
  {
    value: 'score_immediately',
    title: 'Score only right away',
    description: 'Students can see their score as soon as they submit, but question-by-question review stays hidden.',
  },
  {
    value: 'full_after_delay',
    title: 'Full review after a delay',
    description: 'Students can open the full answer review after the release delay has passed.',
  },
  {
    value: 'full_with_hints_after_delay',
    title: 'Full review with hints after a delay',
    description: 'Students get guided study hints first, then the full answer review unlocks later.',
  },
] as const;

const FILE_UPLOAD_TYPE_GROUPS = [
  {
    key: 'documents',
    label: 'Documents',
    extensions: ['pdf', 'docx', 'txt', 'rtf'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
  },
  {
    key: 'images',
    label: 'Images',
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  {
    key: 'spreadsheets',
    label: 'Spreadsheets',
    extensions: ['xls', 'xlsx', 'csv'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },
] as const;

const PASSING_SCORE_OPTIONS = Array.from({ length: 51 }, (_, index) => 50 + index);
const DEFAULT_PASSING_SCORE = 74;
const DEFAULT_MAX_ATTEMPTS = 1;
const DEFAULT_TIME_LIMIT_MINUTES = 30;
const MAX_TIME_LIMIT_MINUTES = 999;
const MAX_ATTEMPTS = 99;
const RUBRIC_TOTAL_POINTS = 100;

function feedbackLevelToResultReleaseMode(level: FeedbackLevel): ResultReleaseMode {
  if (level === 'detailed') return 'full_with_hints_after_delay';
  if (level === 'standard') return 'full_after_delay';
  return 'score_immediately';
}

function resultReleaseModeToFeedbackLevel(mode: ResultReleaseMode): FeedbackLevel {
  if (mode === 'full_with_hints_after_delay') return 'detailed';
  if (mode === 'full_after_delay') return 'standard';
  return 'immediate';
}

function assessmentEditorDraftStorageKey(assessmentId: string) {
  return `${TEACHER_ASSESSMENT_DRAFT_STORAGE_PREFIX}:${assessmentId}`;
}

function buildAssessmentEditorDraftFingerprint(draft: AssessmentEditorLocalDraft) {
  return JSON.stringify({
    title: draft.title,
    description: draft.description,
    questions: draft.questions,
    availability: draft.availability,
    assessmentType: draft.assessmentType,
    passingScore: draft.passingScore,
    maxAttempts: draft.maxAttempts,
    timeLimitMinutes: draft.timeLimitMinutes,
    dueDate: draft.dueDate,
    feedbackLevel: resultReleaseModeToFeedbackLevel(draft.resultReleaseMode),
    feedbackDelayHours: draft.feedbackDelayHours,
    category: draft.category,
    quarter: draft.quarter,
    placementMode: draft.placementMode,
    selectedSlotId: draft.selectedSlotId,
    closeWhenDue: draft.closeWhenDue,
    randomizeQuestions: draft.randomizeQuestions,
    timedQuestionsEnabled: draft.timedQuestionsEnabled,
    questionTimeLimitSeconds: draft.questionTimeLimitSeconds,
    strictMode: draft.strictMode,
    fileUploadInstructions: draft.fileUploadInstructions,
    allowedUploadExtensions: draft.allowedUploadExtensions,
    allowedUploadMimeTypes: draft.allowedUploadMimeTypes,
    maxUploadSizeBytes: draft.maxUploadSizeBytes,
    teacherAttachmentFileId: draft.teacherAttachmentFile?.id ?? null,
    rubricCriteria: draft.rubricCriteria,
  });
}

function isAssessmentEditorLocalDraft(value: unknown): value is AssessmentEditorLocalDraft {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Partial<AssessmentEditorLocalDraft>;
  return (
    typeof maybe.title === 'string' &&
    typeof maybe.description === 'string' &&
    Array.isArray(maybe.questions) &&
    Array.isArray(maybe.deletedQuestionIds) &&
    typeof maybe.availability === 'string' &&
    typeof maybe.resultReleaseMode === 'string' &&
    typeof maybe.assessmentType === 'string'
  );
}

function readAssessmentEditorLocalDraft(assessmentId: string): AssessmentEditorLocalDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(assessmentEditorDraftStorageKey(assessmentId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isAssessmentEditorLocalDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeAssessmentEditorLocalDraft(assessmentId: string, draft: AssessmentEditorLocalDraft) {
  if (typeof window === 'undefined') return;
  const key = assessmentEditorDraftStorageKey(assessmentId);
  const next = JSON.stringify(draft);
  if (window.localStorage.getItem(key) === next) return;
  window.localStorage.setItem(key, next);
}

function clearAssessmentEditorLocalDraft(assessmentId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(assessmentEditorDraftStorageKey(assessmentId));
}

function getResultReleaseSummary(
  mode: ResultReleaseMode,
  delayHours: number,
  assessmentType: AssessmentType,
) {
  if (mode === 'score_immediately') {
    return assessmentType === 'file_upload'
      ? 'After you return the grade, students see their score right away. Question-by-question review stays hidden.'
      : 'Students see their score immediately after submitting. Question-by-question review stays hidden.';
  }

  const delayLabel = `${Math.max(delayHours, 0)} hour${Math.max(delayHours, 0) === 1 ? '' : 's'}`;

  if (mode === 'full_with_hints_after_delay') {
    return assessmentType === 'file_upload'
      ? `After you return the grade, students first see guided hints. The full review unlocks after ${delayLabel}.`
      : `Students first see guided hints. The full review unlocks after ${delayLabel}.`;
  }

  return assessmentType === 'file_upload'
    ? `After you return the grade, students can open the full review after ${delayLabel}.`
    : `Students can open the full review after ${delayLabel}.`;
}

function toParamValue(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] || '';
  return input || '';
}

function createTempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeBoundedPositiveIntegerInput(value: string, max: number) {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return '';
  const normalized = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(normalized) || normalized < 1) return '';
  return String(clampNumber(normalized, 1, max));
}

function finalizeBoundedPositiveIntegerInput(value: string | number | null | undefined, max: number, fallback: number) {
  const sanitized = sanitizeBoundedPositiveIntegerInput(String(value ?? ''), max);
  return sanitized || String(fallback);
}

function toBoundedPositiveInteger(value: string | number | null | undefined, max: number, fallback: number) {
  return Number(finalizeBoundedPositiveIntegerInput(value, max, fallback));
}

function normalizePassingScore(value: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PASSING_SCORE;
  return clampNumber(parsed, 50, 100);
}

function normalizeRubricPoints(value: string | number | null | undefined, max: number) {
  const digitsOnly = String(value ?? '').replace(/\D/g, '');
  if (!digitsOnly) return 0;
  const normalized = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(normalized) || normalized < 0) return 0;
  return clampNumber(normalized, 0, max);
}

function normalizeImageDisplayMode(value: unknown): ComposerImageDisplayMode {
  return value === 'expanded' ? 'expanded' : 'default';
}

function normalizeImageZoom(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, 50), 200);
}

function normalizeImagePosition(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(parsed, 0), 100);
}

function supportsOptions(type: QuestionType) {
  return (
    type === 'multiple_choice' ||
    type === 'multiple_select' ||
    type === 'true_false' ||
    type === 'dropdown'
  );
}

const FILL_BLANK_CASE_SENSITIVE_TAG = 'fill_blank:smart_case_sensitive';
const FILL_BLANK_EXPERIMENTAL_SMART_TAG = 'fill_blank:experimental_smart_match';
const FILL_BLANK_META_TAG_PREFIX = 'fill_blank:';

function normalizeConceptTags(rawConceptTags: unknown): string[] {
  if (!Array.isArray(rawConceptTags)) return [];
  return rawConceptTags
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function parseFillBlankSettings(conceptTags: string[]) {
  return {
    fillBlankSmartCaseInsensitive: !conceptTags.includes(FILL_BLANK_CASE_SENSITIVE_TAG),
    fillBlankExperimentalSmartMatch: conceptTags.includes(FILL_BLANK_EXPERIMENTAL_SMART_TAG),
  };
}

function buildFillBlankConceptTags(
  conceptTags: string[],
  fillBlankSmartCaseInsensitive: boolean,
  fillBlankExperimentalSmartMatch: boolean,
) {
  const passthroughTags = conceptTags.filter((tag) => !tag.startsWith(FILL_BLANK_META_TAG_PREFIX));
  if (!fillBlankSmartCaseInsensitive) {
    passthroughTags.push(FILL_BLANK_CASE_SENSITIVE_TAG);
  }
  if (fillBlankExperimentalSmartMatch) {
    passthroughTags.push(FILL_BLANK_EXPERIMENTAL_SMART_TAG);
  }
  return passthroughTags;
}

function normalizeQuestion(question: AssessmentQuestion): QuestionDraft {
  const conceptTags = normalizeConceptTags(
    (question as AssessmentQuestion & { conceptTags?: unknown }).conceptTags,
  );
  const fillBlankSettings = parseFillBlankSettings(conceptTags);
  return {
    id: question.id,
    type: question.type,
    content: question.content || '',
    points: question.points || 1,
    isRequired: question.isRequired ?? true,
    explanation: question.explanation || '',
    imageUrl: question.imageUrl || '',
    imageDisplayMode: normalizeImageDisplayMode(question.imageDisplayMode),
    imageZoom: normalizeImageZoom(question.imageZoom),
    imagePositionX: normalizeImagePosition(question.imagePositionX),
    imagePositionY: normalizeImagePosition(question.imagePositionY),
    conceptTags,
    fillBlankSmartCaseInsensitive: fillBlankSettings.fillBlankSmartCaseInsensitive,
    fillBlankExperimentalSmartMatch: fillBlankSettings.fillBlankExperimentalSmartMatch,
    options: (question.options || []).map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
      imageUrl: option.imageUrl || '',
      imageDisplayMode: normalizeImageDisplayMode(option.imageDisplayMode),
      imageZoom: normalizeImageZoom(option.imageZoom),
      imagePositionX: normalizeImagePosition(option.imagePositionX),
      imagePositionY: normalizeImagePosition(option.imagePositionY),
    })),
  };
}

function getDefaultUploadExtensions() {
  return FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.extensions]);
}

function getDefaultUploadMimeTypes() {
  return FILE_UPLOAD_TYPE_GROUPS.flatMap((group) => [...group.mimeTypes]);
}

function toDateInputValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateInputValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function stripTitleFromSerializedDraft(serializedDraft: string) {
  try {
    const parsed = JSON.parse(serializedDraft) as Record<string, unknown>;
    delete parsed.title;
    return JSON.stringify(parsed);
  } catch {
    return serializedDraft;
  }
}

function optionHasAnswerContent(option: {
  text?: string | null;
  imageUrl?: string | null;
}) {
  return Boolean(option.text?.trim() || option.imageUrl?.trim());
}

function getQuestionValidationIssueTitles(question: QuestionDraft, index: number) {
  const issuePrefix = `Question ${index + 1}`;
  const issues: Array<{ title: string; description: string }> = [];
  const content = question.content.trim();
  const points = Number(question.points);
  const isFillBlank = question.type === 'fill_blank';

  if (!content) {
    issues.push({
      title: `${issuePrefix} is empty`,
      description: 'Add the question body so students know what they need to answer.',
    });
  }

  if (!Number.isInteger(points) || points < 1) {
    issues.push({
      title: `${issuePrefix} needs valid points`,
      description: 'Set at least 1 point so the assessment can score this item correctly.',
    });
  }

  if (isFillBlank) {
    const answers = question.options
      .map((option) => option.text.trim())
      .filter((answer) => answer.length > 0);

    if (answers.length === 0) {
      issues.push({
        title: `${issuePrefix} needs at least one correct answer`,
        description: 'Fill-in-the-blank items need at least one accepted answer before students can take them.',
      });
    }

    return issues;
  }

  if (!supportsOptions(question.type)) {
    return issues;
  }

  if (question.options.length < 2) {
    issues.push({
      title: `${issuePrefix} needs at least two answer choices`,
      description: 'Add at least two choices so the question can be shown properly to students.',
    });
  }

  if (question.options.some((option) => !optionHasAnswerContent(option))) {
    issues.push({
      title: `${issuePrefix} has empty answer choices`,
      description: 'Remove blank options or add text or an image to every visible choice.',
    });
  }

  if (!question.options.some((option) => option.isCorrect)) {
    issues.push({
      title: `${issuePrefix} needs at least one correct answer`,
      description: 'Mark the correct choice so the question can be scored accurately.',
    });
  }

  return issues;
}

function AssessmentEditorGuideShot({
  screen,
  issueCount,
  fileUploadMode,
  publishReady,
}: {
  screen: AssessmentGuideScreen;
  issueCount: number;
  fileUploadMode: boolean;
  publishReady: boolean;
}) {
  return (
    <div className={`assessment-editor__guide-shot assessment-editor__guide-shot--${screen}`} style={{ position: 'relative' }}>
      <AssessmentEditorGuidePin lineSide="right" lineWidth="5.1rem" style={{ right: '2.25rem', top: '2.25rem' }}>
        {screen === 'overview'
          ? 'Top summary panel'
          : screen === 'build'
            ? 'Question cards'
            : screen === 'delivery'
              ? 'Delivery controls'
              : screen === 'placement'
                ? 'Placement setup'
                : 'Checklist preview'}
      </AssessmentEditorGuidePin>
      <div className="assessment-editor__guide-window">
        <span />
        <span />
        <span />
      </div>
      <div className="assessment-editor__guide-topbar">
        <div>
          <small>Checklist status</small>
          <strong>{publishReady ? 'Ready to publish' : 'Needs review'}</strong>
        </div>
        <div>
          <small>Open issues</small>
          <strong>{issueCount}</strong>
        </div>
      </div>
      <div className="assessment-editor__guide-canvas">
        <div className="assessment-editor__guide-header-shell">
          <div className="assessment-editor__guide-title-shell">
            <div className="assessment-editor__workspace-title-field">
              <span className="assessment-editor__guide-back" />
              <div className="assessment-editor__title-input assessment-editor__title-input--distinguished assessment-editor__guide-title-input">
                Fractions Checkpoint
              </div>
            </div>
            <div className="assessment-editor__workspace-context">
              <span>Class assessment</span>
              <span>Quarter Q1</span>
            </div>
          </div>
          <div className="assessment-editor__header-helper-group assessment-editor__guide-helper-shell">
            <span className="assessment-editor__warning-action">
              <AlertTriangle className="h-4 w-4" />
              {issueCount} issues
            </span>
            <span className="assessment-editor__icon-action assessment-editor__guide-icon">
              <CircleHelp className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="assessment-editor__header-tabbar assessment-editor__guide-tabbar">
          <span className={`assessment-editor__header-tab ${screen === 'overview' ? 'is-active' : ''}`}>Settings</span>
          <span className={`assessment-editor__header-tab ${screen === 'delivery' || screen === 'placement' ? 'is-active' : ''}`}>Advanced</span>
          <span className={`assessment-editor__header-tab ${screen === 'build' && fileUploadMode ? 'is-active' : ''}`}>Rubric</span>
          <span className={`assessment-editor__header-tab ${screen === 'review' ? 'is-active' : ''}`}>Analytics</span>
        </div>

        {screen === 'overview' ? (
          <div className="assessment-editor__guide-scene assessment-editor__guide-scene--overview">
            <AssessmentEditorGuidePin lineSide="left" lineWidth="5.5rem" style={{ left: '0.95rem', top: '2.15rem' }}>
              Title field
            </AssessmentEditorGuidePin>
            <AssessmentEditorGuidePin lineSide="left" lineWidth="5.5rem" style={{ right: '2rem', top: '5.05rem' }}>
              Warning + help
            </AssessmentEditorGuidePin>
            <AssessmentEditorGuidePin lineSide="right" lineWidth="5.4rem" style={{ right: '0.85rem', top: '10.25rem' }}>
              Save now
            </AssessmentEditorGuidePin>
            <div className="assessment-editor__header-publish-group assessment-editor__guide-publish-shell">
              <span className="assessment-editor__workbar-meta">
                Saved
              </span>
              <div className="assessment-editor__mode-switch assessment-editor__mode-switch--header">
                <button type="button" data-active={!publishReady}>
                  Draft
                </button>
                <button type="button" data-active={publishReady}>
                  Ready to give
                </button>
              </div>
              <span className="assessment-editor__save-btn assessment-editor__guide-save-btn">
                Save now
              </span>
            </div>
            <div className="assessment-editor__guide-summary">
              <div>
                <small>Format</small>
                <strong>{fileUploadMode ? 'File upload' : 'Question set'}</strong>
              </div>
              <div>
                <small>First stop</small>
                <strong>Question mark and warning</strong>
              </div>
            </div>
          </div>
        ) : null}

        {screen === 'build' ? (
          <div className="assessment-editor__guide-scene assessment-editor__guide-scene--build">
            <AssessmentEditorGuidePin lineSide="left" lineWidth="4.6rem" style={{ left: '0.9rem', top: '2.6rem' }}>
              Question card
            </AssessmentEditorGuidePin>
            <AssessmentEditorGuidePin lineSide="right" lineWidth="5.5rem" style={{ right: '0.9rem', top: '6.45rem' }}>
              Add question control
            </AssessmentEditorGuidePin>
            <div className="assessment-editor__guide-question-card">
              <div className="assessment-editor__guide-question-head">
                <span>Q1</span>
                <span>Multiple Choice</span>
              </div>
              <strong>What is 1/2 + 1/2?</strong>
              <div className="assessment-editor__guide-option-list">
                <span>1</span>
                <span>2</span>
              </div>
            </div>
            <div className="assessment-editor__guide-add-strip">
              <span>Add question</span>
              <span>Use the body to edit</span>
            </div>
          </div>
        ) : null}

        {screen === 'delivery' ? (
          <div className="assessment-editor__guide-scene assessment-editor__guide-scene--delivery">
            <AssessmentEditorGuidePin lineSide="left" lineWidth="3.6rem" style={{ left: '0.85rem', top: '2.2rem' }}>
              Due date
            </AssessmentEditorGuidePin>
            <AssessmentEditorGuidePin lineSide="left" lineWidth="5.1rem" style={{ left: '0.85rem', top: '4.85rem' }}>
              Attempts and time
            </AssessmentEditorGuidePin>
            <AssessmentEditorGuidePin lineSide="right" lineWidth="4.6rem" style={{ right: '0.85rem', top: '7.15rem' }}>
              Result settings
            </AssessmentEditorGuidePin>
            <div className="assessment-editor__guide-form-grid">
              <div className="assessment-editor__guide-field">
                <small>Due date</small>
                <strong>May 12, 2026</strong>
              </div>
              <div className="assessment-editor__guide-field">
                <small>Time limit</small>
                <strong>30 minutes</strong>
              </div>
              <div className="assessment-editor__guide-field">
                <small>Attempts</small>
                <strong>1</strong>
              </div>
              <div className="assessment-editor__guide-field">
                <small>Feedback</small>
                <strong>Immediate</strong>
              </div>
            </div>
            <div className="assessment-editor__guide-toggle-row">
              <span>Randomize</span>
              <span>Strict mode</span>
              <span>Question timer</span>
            </div>
          </div>
        ) : null}

        {screen === 'placement' ? (
          <div className="assessment-editor__guide-scene assessment-editor__guide-scene--placement">
            <AssessmentEditorGuidePin lineSide="left" lineWidth="4.8rem" style={{ left: '0.85rem', top: '2.3rem' }}>
              Class record category
            </AssessmentEditorGuidePin>
            <AssessmentEditorGuidePin lineSide="left" lineWidth="4.6rem" style={{ left: '0.85rem', top: '4.95rem' }}>
              Select slot mode
            </AssessmentEditorGuidePin>
            <div className="assessment-editor__guide-form-grid">
              <div className="assessment-editor__guide-field">
                <small>Category</small>
                <strong>Written Work</strong>
              </div>
              <div className="assessment-editor__guide-field">
                <small>Quarter</small>
                <strong>Q1</strong>
              </div>
            </div>
            <div className="assessment-editor__guide-slot-grid">
              <span className="is-active">Written Work 1</span>
              <span>Written Work 2</span>
              <span>Written Work 3</span>
            </div>
          </div>
        ) : null}

        {screen === 'review' ? (
          <div className="assessment-editor__guide-scene assessment-editor__guide-scene--review">
            <AssessmentEditorGuidePin lineSide="left" lineWidth="4.8rem" style={{ left: '0.85rem', top: '2.05rem' }}>
              Open warning checklist
            </AssessmentEditorGuidePin>
            <div className="assessment-editor__guide-checklist-preview">
              <div>
                <strong>Assessment setup checklist</strong>
                <p>Each missing setup item now shows as one clean checklist line with its explanation.</p>
              </div>
              <ul>
                <li>Set a due date</li>
                <li>Review student control rules</li>
                <li>{publishReady ? 'Ready to publish' : 'Fix publish requirements'}</li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssessmentEditorGuidePin({
  children,
  lineSide,
  lineWidth,
  style,
}: AssessmentGuidePinProps) {
  return (
    <span
      className="pointer-events-none absolute inline-flex items-center gap-1.5 rounded-full border border-[#7f1d1d] bg-white px-2.5 py-1 text-[0.62rem] font-black not-italic leading-none text-[#7f1d1d] shadow-[0_0.5rem_1rem_rgba(127,29,29,0.1)]"
      style={style}
    >
      <span className="h-[0.42rem] w-[0.42rem] rounded-full bg-[#a32d2d]" />
      <span>{children}</span>
      <span
        className="absolute top-1/2 h-px -translate-y-1/2 bg-[#a32d2d]"
        style={
          lineSide === 'right'
            ? { left: `calc(100% - 0.05rem)`, width: lineWidth }
            : { right: `calc(100% - 0.05rem)`, width: lineWidth }
        }
      />
      <span
        className="sr-only"
      >
        {lineSide}
      </span>
    </span>
  );
}

function ResultReleaseSettings({
  mode,
  delayHours,
  assessmentType,
  disabled,
  onModeChange,
  onDelayHoursChange,
}: {
  mode: ResultReleaseMode;
  delayHours: number;
  assessmentType: AssessmentType;
  disabled: boolean;
  onModeChange: (next: ResultReleaseMode) => void;
  onDelayHoursChange: (next: number) => void;
}) {
  const delayVisible = mode !== 'score_immediately';

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Result Release
        </label>
        <div className="grid gap-2">
          {RESULT_RELEASE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <input
                type="radio"
                checked={mode === option.value}
                onChange={() => onModeChange(option.value)}
                disabled={disabled}
              />
              <span className="grid gap-1">
                <span className="font-semibold text-slate-900">{option.title}</span>
                <span className="text-xs leading-relaxed text-slate-500">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {delayVisible ? (
        <div className="assessment-editor__field">
          <label>Release Delay (hours)</label>
          <Input
            type="number"
            min={0}
            value={delayHours}
            onChange={(event) => onDelayHoursChange(Math.max(0, Number(event.target.value) || 0))}
            disabled={disabled}
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Students will see</p>
        <p className="mt-1 text-sm text-slate-700">
          {getResultReleaseSummary(mode, delayHours, assessmentType)}
        </p>
      </div>
    </div>
  );
}

export default function AssessmentEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const assessmentId = toParamValue(params.id);
  const isReadOnlyMode =
    searchParams.get('mode') === 'view' || searchParams.get('readonly') === '1';
  const initializedDraftRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const lastSavedTitleRef = useRef('');
  const latestSerializedDraftRef = useRef('');
  const latestTitleRef = useRef('');
  const titleAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const academicQuarterRequestRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [saveState, setSaveState] = useState<AssessmentComposerSaveState>('saved');
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [insertAfterQuestionIndex, setInsertAfterQuestionIndex] = useState<number | null>(null);
  const [hideFloatingAdd, setHideFloatingAdd] = useState(false);
  const questionListBottomRef = useRef<HTMLDivElement | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionDetailsOpen, setQuestionDetailsOpen] = useState(false);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);

  const [rightTab, setRightTab] = useState<RightTab>('settings');
  const [availability, setAvailability] = useState<Availability>('draft');
  const [resultReleaseMode, setResultReleaseMode] = useState<ResultReleaseMode>('score_immediately');

  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz');
  const [passingScore, setPassingScore] = useState(DEFAULT_PASSING_SCORE);
  const [maxAttempts, setMaxAttempts] = useState<string>(String(DEFAULT_MAX_ATTEMPTS));
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>(String(DEFAULT_TIME_LIMIT_MINUTES));
  const [dueDate, setDueDate] = useState('');
  const [feedbackDelayHours, setFeedbackDelayHours] = useState(DEFAULT_RESULT_RELEASE_DELAY_HOURS);

  const [category, setCategory] = useState<ClassRecordCategory>('written_work');
  const [quarter, setQuarter] = useState<GradingPeriod | ''>('');
  const [lockedSystemQuarter, setLockedSystemQuarter] = useState<GradingPeriod | null>(null);
  const [quarterStatus, setQuarterStatus] =
    useState<AcademicQuarterStatus>('loading');
  const [placementMode, setPlacementMode] = useState<AssessmentPlacementMode>('automatic');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotOverview, setSlotOverview] = useState<ClassRecordSlotOverview | null>(null);
  const [slotOverviewLoading, setSlotOverviewLoading] = useState(false);
  const [slotOverviewError, setSlotOverviewError] = useState<string | null>(null);

  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [timedQuestionsEnabled, setTimedQuestionsEnabled] = useState(false);
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState<string>('');
  const [strictMode, setStrictMode] = useState(false);

  const [fileUploadInstructions, setFileUploadInstructions] = useState('');
  const [allowedUploadExtensions, setAllowedUploadExtensions] = useState<string[]>(getDefaultUploadExtensions);
  const [allowedUploadMimeTypes, setAllowedUploadMimeTypes] = useState<string[]>(getDefaultUploadMimeTypes);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState<number>(100 * 1024 * 1024);
  const [teacherAttachmentFile, setTeacherAttachmentFile] =
    useState<Assessment['teacherAttachmentFile'] | null>(null);
  const [uploadingTeacherAttachment, setUploadingTeacherAttachment] = useState(false);

  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [analytics, setAnalytics] = useState<QuestionAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);
  const [warningOpen, setWarningOpen] = useState(false);

  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const warningButtonRef = useRef<HTMLButtonElement | null>(null);
  const sectionRefs = useRef<Record<AssessmentSetupSectionId, HTMLElement | null>>({
    basics: null,
    content: null,
    delivery: null,
    placement: null,
    review: null,
  });
  const selectedQuestion = useMemo(
    () => questions.find((entry) => entry.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );
  const feedbackLevel = resultReleaseModeToFeedbackLevel(resultReleaseMode);

  const applyDraftSnapshot = useCallback((draft: AssessmentEditorLocalDraft) => {
    const resolvedSelectedQuestionId =
      draft.selectedQuestionId && draft.questions.some((question) => question.id === draft.selectedQuestionId)
        ? draft.selectedQuestionId
        : (draft.questions[0]?.id ?? null);

    setTitle(draft.title);
    setDescription(draft.description);
    setQuestions(draft.questions);
    setSelectedQuestionId(resolvedSelectedQuestionId);
    setDeletedQuestionIds(draft.deletedQuestionIds);
    setAvailability(draft.availability);
    setResultReleaseMode(draft.resultReleaseMode);
    setAssessmentType(draft.assessmentType);
    setPassingScore(draft.passingScore);
    setMaxAttempts(draft.maxAttempts);
    setTimeLimitMinutes(draft.timeLimitMinutes);
    setDueDate(draft.dueDate);
    setFeedbackDelayHours(draft.feedbackDelayHours);
    setCategory(draft.category);
    setQuarter(draft.quarter);
    setPlacementMode(draft.placementMode);
    setSelectedSlotId(draft.selectedSlotId);
    setCloseWhenDue(draft.closeWhenDue);
    setRandomizeQuestions(draft.randomizeQuestions);
    setTimedQuestionsEnabled(draft.timedQuestionsEnabled);
    setQuestionTimeLimitSeconds(draft.questionTimeLimitSeconds);
    setStrictMode(draft.strictMode);
    setFileUploadInstructions(draft.fileUploadInstructions);
    setAllowedUploadExtensions(draft.allowedUploadExtensions);
    setAllowedUploadMimeTypes(draft.allowedUploadMimeTypes);
    setMaxUploadSizeBytes(draft.maxUploadSizeBytes);
    setTeacherAttachmentFile(draft.teacherAttachmentFile);
    setRubricCriteria(draft.rubricCriteria);
  }, []);

  const draftSnapshot = useMemo<AssessmentEditorLocalDraft>(
    () => ({
      title,
      description,
      questions,
      selectedQuestionId,
      deletedQuestionIds,
      availability,
      resultReleaseMode,
      assessmentType,
      passingScore,
      maxAttempts,
      timeLimitMinutes,
      dueDate,
      feedbackDelayHours,
      category,
      quarter,
      placementMode,
      selectedSlotId,
      closeWhenDue,
      randomizeQuestions,
      timedQuestionsEnabled,
      questionTimeLimitSeconds,
      strictMode,
      fileUploadInstructions,
      allowedUploadExtensions,
      allowedUploadMimeTypes,
      maxUploadSizeBytes,
      teacherAttachmentFile,
      rubricCriteria,
    }),
    [
      allowedUploadExtensions,
      allowedUploadMimeTypes,
      assessmentType,
      availability,
      category,
      closeWhenDue,
      deletedQuestionIds,
      description,
      dueDate,
      feedbackDelayHours,
      fileUploadInstructions,
      maxAttempts,
      maxUploadSizeBytes,
      passingScore,
      placementMode,
      quarter,
      questionTimeLimitSeconds,
      questions,
      randomizeQuestions,
      resultReleaseMode,
      rubricCriteria,
      selectedQuestionId,
      selectedSlotId,
      strictMode,
      teacherAttachmentFile,
      timedQuestionsEnabled,
      timeLimitMinutes,
      title,
    ],
  );

  const fetchAssessment = useCallback(async () => {
    if (!assessmentId) return;
    try {
      setLoading(true);
      const response = await assessmentService.getById(assessmentId);
      const data = response.data;
      const normalizedQuestions = (data.questions || [])
        .sort((a, b) => a.order - b.order)
        .map(normalizeQuestion);
      const placement: AssessmentClassRecordPlacement | null | undefined = data.classRecordPlacement;
      const serverSnapshot: AssessmentEditorLocalDraft = {
        title: data.title || '',
        description: data.description || '',
        questions: normalizedQuestions,
        selectedQuestionId: normalizedQuestions[0]?.id || null,
        deletedQuestionIds: [],
        availability: data.isPublished ? 'given' : 'draft',
        resultReleaseMode: feedbackLevelToResultReleaseMode((data.feedbackLevel as FeedbackLevel) || 'immediate'),
        assessmentType: (data.type as AssessmentType) || 'quiz',
        passingScore: normalizePassingScore(data.passingScore),
        maxAttempts: finalizeBoundedPositiveIntegerInput(data.maxAttempts, MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS),
        timeLimitMinutes: finalizeBoundedPositiveIntegerInput(
          data.timeLimitMinutes,
          MAX_TIME_LIMIT_MINUTES,
          DEFAULT_TIME_LIMIT_MINUTES,
        ),
        dueDate: toDateInputValue(data.dueDate),
        feedbackDelayHours: Math.max(0, data.feedbackDelayHours ?? DEFAULT_RESULT_RELEASE_DELAY_HOURS),
        category: data.classRecordCategory || 'written_work',
        quarter: (data.quarter as GradingPeriod) || '',
        placementMode: (placement?.placementMode as AssessmentPlacementMode) || 'automatic',
        selectedSlotId: placement?.itemId ?? null,
        closeWhenDue: data.closeWhenDue ?? false,
        randomizeQuestions: data.randomizeQuestions ?? false,
        timedQuestionsEnabled: data.timedQuestionsEnabled ?? false,
        questionTimeLimitSeconds:
          data.questionTimeLimitSeconds === null || data.questionTimeLimitSeconds === undefined
            ? ''
            : String(data.questionTimeLimitSeconds),
        strictMode: data.strictMode ?? false,
        fileUploadInstructions: data.fileUploadInstructions || '',
        allowedUploadExtensions:
          data.allowedUploadExtensions && data.allowedUploadExtensions.length > 0
            ? data.allowedUploadExtensions
            : getDefaultUploadExtensions(),
        allowedUploadMimeTypes:
          data.allowedUploadMimeTypes && data.allowedUploadMimeTypes.length > 0
            ? data.allowedUploadMimeTypes
            : getDefaultUploadMimeTypes(),
        maxUploadSizeBytes: data.maxUploadSizeBytes ?? 100 * 1024 * 1024,
        teacherAttachmentFile: data.teacherAttachmentFile || null,
        rubricCriteria: data.rubricCriteria || [],
      };
      const serverFingerprint = buildAssessmentEditorDraftFingerprint(serverSnapshot);
      const cachedDraft = !isReadOnlyMode ? readAssessmentEditorLocalDraft(assessmentId) : null;
      const shouldRestoreCachedDraft =
        cachedDraft !== null &&
        buildAssessmentEditorDraftFingerprint(cachedDraft) !== serverFingerprint;
      const nextDraft = shouldRestoreCachedDraft ? cachedDraft : serverSnapshot;

      setAssessment(data);
      setPreviewEnabled(isReadOnlyMode);
      applyDraftSnapshot(nextDraft);
      lastSavedTitleRef.current = serverSnapshot.title;
      lastSavedFingerprintRef.current = serverFingerprint;
      setAnalytics(null);
      setSlotOverview(null);
      setSlotOverviewError(null);
      initializedDraftRef.current = true;

      if (!shouldRestoreCachedDraft) {
        clearAssessmentEditorLocalDraft(assessmentId);
        setSaveState('saved');
      } else {
        setSaveState('dirty');
        toast.success('Recovered unsaved assessment draft from this device');
      }
    } catch {
      toast.error('Unable to load assessment');
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [applyDraftSnapshot, assessmentId, isReadOnlyMode]);

  useEffect(() => {
    void fetchAssessment();
  }, [fetchAssessment]);

  const loadCurrentAcademicQuarter = useCallback(async () => {
    const requestId = academicQuarterRequestRef.current + 1;
    academicQuarterRequestRef.current = requestId;
    setQuarterStatus('loading');

    try {
      const response = await academicStateService.getCurrent();
      if (academicQuarterRequestRef.current !== requestId) return;

      const currentQuarter = response.data.quarter as GradingPeriod;
      setLockedSystemQuarter(currentQuarter);
      setQuarter(currentQuarter);
      setQuarterStatus('ready');
    } catch {
      if (academicQuarterRequestRef.current !== requestId) return;

      setLockedSystemQuarter(null);
      setQuarterStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadCurrentAcademicQuarter();

    return () => {
      academicQuarterRequestRef.current += 1;
    };
  }, [loadCurrentAcademicQuarter]);

  useEffect(() => {
    if (quarterStatus !== 'ready' || !lockedSystemQuarter) return;
    setQuarter((currentQuarter) => (currentQuarter === lockedSystemQuarter ? currentQuarter : lockedSystemQuarter));
  }, [lockedSystemQuarter, quarter, quarterStatus]);

  useEffect(() => {
    if (rightTab !== 'analytics' || !assessmentId) return;
    let cancelled = false;
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await assessmentService.getQuestionAnalytics(assessmentId);
        if (!cancelled) {
          setAnalytics(response.data);
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null);
          toast.error('Unable to load analytics');
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    };
    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, rightTab]);

  useEffect(() => {
    if (!assessment?.classId || !category || !quarter) {
      setSlotOverview(null);
      setSlotOverviewError(null);
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      try {
        setSlotOverviewLoading(true);
        setSlotOverviewError(null);
        const recordsResponse = await classRecordService.getByClass(assessment.classId);
        if (cancelled) return;

        const quarterWorkbookExists = recordsResponse.data.some(
          (record) => record.gradingPeriod === quarter,
        );
        if (!quarterWorkbookExists) {
          setSlotOverview(null);
          setSlotOverviewError(
            `Create the ${quarter} class record workbook before choosing a slot.`,
          );
          return;
        }

        const response = await classRecordService.getSlotOverview(
          assessment.classId,
          quarter,
          assessmentId || undefined,
        );
        if (cancelled) return;
        setSlotOverview(response.data);
      } catch {
        if (!cancelled) {
          setSlotOverview(null);
          setSlotOverviewError('Unable to load class record slots.');
        }
      } finally {
        if (!cancelled) {
          setSlotOverviewLoading(false);
        }
      }
    };
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [assessment?.classId, assessmentId, category, quarter]);

  const serializedDraft = useMemo(
    () => buildAssessmentEditorDraftFingerprint(draftSnapshot),
    [draftSnapshot],
  );

  useEffect(() => {
    latestSerializedDraftRef.current = serializedDraft;
  }, [serializedDraft]);

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    if (loading || !initializedDraftRef.current) return;

    if (serializedDraft !== lastSavedFingerprintRef.current) {
      setSaveState((current) => (current === 'saving' ? current : 'dirty'));
      return;
    }

    setSaveState((current) => (current === 'saving' || current === 'error' ? current : 'saved'));
  }, [loading, serializedDraft]);

  useEffect(() => {
    if (loading || !assessmentId || isReadOnlyMode || !initializedDraftRef.current) return;

    if (serializedDraft === lastSavedFingerprintRef.current) {
      clearAssessmentEditorLocalDraft(assessmentId);
      return;
    }

    writeAssessmentEditorLocalDraft(assessmentId, draftSnapshot);
  }, [assessmentId, draftSnapshot, isReadOnlyMode, loading, serializedDraft]);

  const autoSaveTitle = useCallback(
    async (nextTitle: string) => {
      if (!assessment || !assessmentId || saving || isReadOnlyMode) return;
      try {
        setSaveState('saving');
        await assessmentService.update(assessment.id, { title: nextTitle });
        lastSavedTitleRef.current = nextTitle;
        setAssessment((current) => (current ? { ...current, title: nextTitle } : current));

        if (latestTitleRef.current.trim() !== nextTitle) {
          setSaveState('dirty');
          return;
        }

        const latestDraft = latestSerializedDraftRef.current;
        const lastSavedDraft = lastSavedFingerprintRef.current;

        if (
          lastSavedDraft &&
          stripTitleFromSerializedDraft(lastSavedDraft) === stripTitleFromSerializedDraft(latestDraft)
        ) {
          lastSavedFingerprintRef.current = latestDraft;
          clearAssessmentEditorLocalDraft(assessmentId);
          setSaveState('saved');
          return;
        }

        setSaveState('dirty');
      } catch {
        setSaveState('error');
        toast.error('Unable to auto-save assessment title');
      }
    },
    [assessment, assessmentId, isReadOnlyMode, saving],
  );

  useEffect(() => {
    if (
      !assessment ||
      loading ||
      saving ||
      isReadOnlyMode ||
      !initializedDraftRef.current
    ) {
      return;
    }
    const nextTitle = title.trim();
    const lastSavedTitle = lastSavedTitleRef.current.trim();

    if (!nextTitle || nextTitle === lastSavedTitle) return;

    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }

    titleAutosaveTimerRef.current = setTimeout(() => {
      void autoSaveTitle(nextTitle);
    }, 5000);

    return () => {
      if (titleAutosaveTimerRef.current) {
        clearTimeout(titleAutosaveTimerRef.current);
        titleAutosaveTimerRef.current = null;
      }
    };
  }, [assessment, autoSaveTitle, isReadOnlyMode, loading, saving, title]);

  useEffect(() => {
    if (assessmentType !== 'file_upload' && rightTab === 'rubric') {
      setRightTab('settings');
    }
  }, [assessmentType, rightTab]);

  useEffect(() => {
    const observerTarget = questionListBottomRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setHideFloatingAdd(Boolean(entries[0]?.isIntersecting));
      },
      { root: null, threshold: 0.12 },
    );
    observer.observe(observerTarget);
    return () => observer.disconnect();
  }, [questions.length, previewEnabled, assessmentType]);

  const questionTotalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );
  const totalPoints = assessmentType === 'file_upload' ? RUBRIC_TOTAL_POINTS : questionTotalPoints;

  const rubricTotalPoints = useMemo(
    () =>
      rubricCriteria.reduce((sum, criterion) => {
        const points = Number(criterion.points);
        return sum + (Number.isFinite(points) ? points : 0);
      }, 0),
    [rubricCriteria],
  );

  const rubricRemainingPoints = RUBRIC_TOTAL_POINTS - rubricTotalPoints;
  const rubricIsBalanced = rubricCriteria.length > 0 && rubricTotalPoints === RUBRIC_TOTAL_POINTS;

  const updateRubricPoints = useCallback((targetIndex: number, rawValue: string) => {
    setRubricCriteria((current) => {
      const otherPointsTotal = current.reduce((sum, entry, entryIndex) => {
        if (entryIndex === targetIndex) return sum;
        const points = Number(entry.points);
        return sum + (Number.isFinite(points) ? points : 0);
      }, 0);
      const allowedForCurrent = Math.max(RUBRIC_TOTAL_POINTS - otherPointsTotal, 0);

      return current.map((entry, entryIndex) =>
        entryIndex === targetIndex
          ? { ...entry, points: normalizeRubricPoints(rawValue, allowedForCurrent) }
          : entry,
      );
    });
  }, []);

  const selectedCategorySlots = useMemo<ClassRecordSlotOverviewCategory | null>(() => {
    if (!slotOverview) return null;
    return slotOverview.categories.find((entry) => entry.key === category) || null;
  }, [category, slotOverview]);

  const setupIssues = useMemo<AssessmentSetupIssue[]>(() => {
    const issues: AssessmentSetupIssue[] = [];

    if (!title.trim()) {
      issues.push({
        id: 'missing-title',
        title: 'Add an assessment title',
        description: 'Give the activity a clear name so teachers and students can identify it immediately.',
        section: 'basics',
        severity: 'required',
        actionLabel: 'Open basics',
      });
    }

    if (!description.trim()) {
      issues.push({
        id: 'missing-description',
        title: 'Add teacher instructions or notes',
        description: 'A short note helps first-time teachers remember the purpose and context of this assessment.',
        section: 'basics',
        severity: 'recommended',
        actionLabel: 'Open basics',
      });
    }

    if (assessmentType === 'file_upload') {
      if (!fileUploadInstructions.trim()) {
        issues.push({
          id: 'missing-upload-instructions',
          title: 'Add upload instructions',
          description: 'Students need clear instructions before they can submit a file correctly.',
          section: 'content',
          severity: 'required',
          actionLabel: 'Open build content',
        });
      }

      if (allowedUploadExtensions.length === 0) {
        issues.push({
          id: 'missing-upload-policy',
          title: 'Choose at least one allowed file type',
          description: 'Select at least one file group so the submission form knows what to accept.',
          section: 'content',
          severity: 'required',
          actionLabel: 'Open build content',
        });
      }
    } else {
      if (questions.length === 0) {
        issues.push({
          id: 'missing-questions',
          title: 'Add at least one question',
          description: 'Question assessments need at least one item before students can take them.',
          section: 'content',
          severity: 'required',
          actionLabel: 'Open build content',
        });
      }

      questions.forEach((question, index) => {
        getQuestionValidationIssueTitles(question, index).forEach((issue, issueIndex) => {
          issues.push({
            id: `question-${index + 1}-${issueIndex}`,
            title: issue.title,
            description: issue.description,
            section: 'content',
            severity: 'required',
            actionLabel: 'Open build content',
          });
        });
      });
    }

    if (!dueDate) {
      issues.push({
        id: 'missing-due-date',
        title: 'Set a due date',
        description: 'A due date gives teachers and students a clear schedule for completion.',
        section: 'delivery',
        severity: 'recommended',
        actionLabel: 'Open delivery rules',
      });
    }

    if (!randomizeQuestions && !timedQuestionsEnabled && !strictMode) {
      issues.push({
        id: 'review-student-controls',
        title: 'Review student control rules',
        description: 'Decide whether this assessment should randomize, time, or lock question navigation.',
        section: 'delivery',
        severity: 'recommended',
        actionLabel: 'Open delivery rules',
      });
    }

    const publishReady = availability === 'given';
    const placementStarted = Boolean(category || quarter || selectedSlotId);
    const placementRequired = publishReady || placementStarted;

    if (placementRequired && !category) {
      issues.push({
        id: 'missing-placement-category',
        title: 'Choose a class record category',
        description: 'Publishing this assessment requires a class record category so grades land in the right bucket.',
        section: 'placement',
        severity: 'required',
        actionLabel: 'Open class record setup',
      });
    }

    if (placementRequired && !quarter) {
      issues.push({
        id: 'missing-placement-quarter',
        title: 'Choose a quarter',
        description: 'Pick the grading period before this assessment is released to students.',
        section: 'placement',
        severity: 'required',
        actionLabel: 'Open class record setup',
      });
    }

    if (placementMode === 'manual' && placementRequired && !selectedSlotId) {
      issues.push({
        id: 'missing-placement-slot',
        title: 'Select a class record slot',
        description: 'Manual placement needs a specific slot before the assessment can be published.',
        section: 'placement',
        severity: 'required',
        actionLabel: 'Open class record setup',
      });
    }

    if (publishReady && issues.some((issue) => issue.severity === 'required')) {
      issues.push({
        id: 'review-publish-readiness',
        title: 'Resolve required setup before publishing',
        description: 'The publish state is on, but at least one required setup item still needs attention.',
        section: 'review',
        severity: 'required',
        actionLabel: 'Open final review',
      });
    }

    return issues;
  }, [
    allowedUploadExtensions.length,
    assessmentType,
    availability,
    category,
    description,
    dueDate,
    fileUploadInstructions,
    placementMode,
    quarter,
    questions,
    randomizeQuestions,
    selectedSlotId,
    strictMode,
    timedQuestionsEnabled,
    title,
  ]);

  const requiredSetupIssues = setupIssues.filter((issue) => issue.severity === 'required');
  const publishBlocked = availability === 'given' && requiredSetupIssues.length > 0;
  const publishReady = availability === 'given' && requiredSetupIssues.length === 0;
  const groupedSetupIssues = useMemo(() => {
    return {
      basics: setupIssues.filter((issue) => issue.section === 'basics'),
      content: setupIssues.filter((issue) => issue.section === 'content'),
      delivery: setupIssues.filter((issue) => issue.section === 'delivery'),
      placement: setupIssues.filter((issue) => issue.section === 'placement'),
      review: setupIssues.filter((issue) => issue.section === 'review'),
    } satisfies Record<AssessmentSetupSectionId, AssessmentSetupIssue[]>;
  }, [setupIssues]);

  const guidePages = useMemo<AssessmentGuidePage[]>(
    () => [
      {
        title: 'Start with the top-right controls',
        description:
          'Use this header first. The warning button shows setup blockers, and the question mark opens the guided walkthrough.',
        screen: 'overview',
        reminder: 'Open warning first, then use the question mark for the full setup walkthrough.',
        steps: [
          {
            action: 'Check',
            body: 'Set the assessment title in the header so the activity is easy to recognize immediately.',
          },
          {
            action: 'Read',
            body: 'Open the warning button to review required and recommended setup items.',
          },
          {
            action: 'Open',
            body: 'Use this question-mark guide when you need the page flow explained step by step.',
            tone: 'caution',
          },
        ],
      },
      {
        title: 'Build the learner activity',
        description: 'This stage is where teachers write questions, preview content, and switch to file upload mode.',
        screen: 'build',
        reminder: 'Click the question card body to edit, then use duplicate or delete only when needed.',
        steps: [
          {
            action: 'Choose',
            body: 'Pick question mode or file upload mode before you build the rest of the activity.',
          },
          {
            action: 'Click',
            body: 'Select a question card to edit the full question body and answer choices.',
          },
          {
            action: 'Add',
            body: 'Use the add-question controls to keep the activity growing in the same flow.',
          },
        ],
      },
      {
        title: 'Set delivery rules',
        description: 'These controls shape timing, attempts, visibility, and how much freedom students get while answering.',
        screen: 'delivery',
        reminder: 'Open the Advanced tab when you need timing, attempt, timer, or feedback controls.',
        steps: [
          {
            action: 'Open',
            body: 'Go to the Advanced tab for due date, time limit, attempts, timers, and result release settings.',
          },
          {
            action: 'Review',
            body: 'Decide how many attempts students get and whether you want randomization or timers.',
          },
          {
            action: 'Confirm',
            body: 'Pick when results appear so the assessment matches your teaching plan.',
          },
        ],
      },
      {
        title: 'Connect it to class record',
        description: 'Publishing needs the grading category, quarter, and slot setup to be clear before scores should count.',
        screen: 'placement',
        reminder: 'Use the Advanced tab for class record placement, and use manual slot placement only when you know the exact record item.',
        steps: [
          {
            action: 'Choose',
            body: 'Select the category and quarter in Advanced before turning the assessment live.',
          },
          {
            action: 'Review',
            body: 'Stay on automatic placement if you want the system to choose the next open slot.',
          },
          {
            action: 'Assign',
            body: 'Pick a manual slot only when you need this activity to land in one exact record row.',
            tone: 'caution',
          },
        ],
      },
      {
        title: 'Finish with the warning and save actions',
        description: 'The final check lives in the header: review the warning list, preview if needed, then save with the correct publish state.',
        screen: 'review',
        reminder: 'Before leaving the page, review the warning dialog once and confirm the save state is healthy.',
        steps: [
          {
            action: 'Open',
            body: 'Use the warning button to review the latest missing items in plain teacher language.',
          },
          {
            action: 'Preview',
            body: 'Open preview if you want to inspect the student-facing flow before release.',
          },
          {
            action: 'Save',
            body: 'Use Save now after the required checklist is clear and the publish state matches your plan.',
            tone: 'success',
          },
        ],
      },
    ],
    [],
  );

  const handleAddQuestion = (type: QuestionType, afterIndex: number | null = null) => {
    if (isReadOnlyMode) return;
    if (assessmentType === 'file_upload') {
      toast.info('Switch to Question Assessment mode to add questions.');
      return;
    }
    const question = createAssessmentComposerQuestion(type, 1);
    setQuestions((current) => {
      const insertAt = afterIndex === null ? current.length : Math.min(afterIndex + 1, current.length);
      const next = current.slice();
      next.splice(insertAt, 0, question);
      return next;
    });
    setSelectedQuestionId(question.id);
    setAddQuestionDialogOpen(false);
    setInsertAfterQuestionIndex(null);
  };

  const openQuestionTypeDialog = (afterIndex: number | null = null) => {
    if (isReadOnlyMode) return;
    setInsertAfterQuestionIndex(afterIndex);
    setAddQuestionDialogOpen(true);
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    if (isReadOnlyMode) return;
    const fromIndex = questions.findIndex((question) => question.id === questionId);
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    if (toIndex >= questions.length) return;

    setQuestions((current) => reorderAssessmentComposerQuestions(current, fromIndex, toIndex));
  };

  const openPanelTab = (tab: RightTab) => {
    setRightTab(tab);
    setPanelOpen(true);
  };

  const focusSection = (section: AssessmentSetupSectionId) => {
    setWarningOpen(false);
    if (section === 'delivery' || section === 'placement') {
      setRightTab('advanced');
      setPanelOpen(true);
    }

    if (section === 'review') {
      window.requestAnimationFrame(() => {
        warningButtonRef.current?.focus();
      });
      return;
    }

    window.requestAnimationFrame(() => {
      const target = sectionRefs.current[section];
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target?.focus();
    });
  };

  const handleDuplicateQuestion = (questionId: string) => {
    if (isReadOnlyMode) return;
    setQuestions((current) => {
      const sourceIndex = current.findIndex((question) => question.id === questionId);
      if (sourceIndex === -1) return current;
      const duplicate = duplicateAssessmentComposerQuestion(current[sourceIndex]);
      const next = current.slice();
      next.splice(sourceIndex + 1, 0, duplicate);
      setSelectedQuestionId(duplicate.id);
      return next;
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (isReadOnlyMode) return;
    setConfirmation({
      title: 'Delete question?',
      description: 'This question will be removed from the assessment.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        const nextState = deleteAssessmentComposerQuestion(questions, questionId, selectedQuestionId);
        setQuestions(nextState.questions);
        setSelectedQuestionId(nextState.nextSelectedQuestionId);
        if (!questionId.startsWith('temp-')) {
          setDeletedQuestionIds((current) => [...current, questionId]);
        }
      },
    });
  };

  const replaceQuestionDraft = useCallback((previousQuestionId: string, nextQuestion: AssessmentQuestion) => {
    const normalized = normalizeQuestion(nextQuestion);
    setQuestions((current) =>
      current.map((entry) =>
        entry.id === previousQuestionId
          ? {
              ...normalized,
              isNew: false,
            }
          : entry,
      ),
    );
    setSelectedQuestionId((current) => (current === previousQuestionId ? normalized.id : current));
    return normalized;
  }, []);

  const buildQuestionWriteOptions = useCallback((question: QuestionDraft) => {
    if (question.type === 'fill_blank') {
      return question.options
        .map((option) => option.text.trim())
        .filter((answer) => answer.length > 0)
        .map((answer, answerIndex) => ({
          text: answer,
          isCorrect: true,
          order: answerIndex + 1,
        }));
    }

    if (!supportsOptions(question.type)) {
      return [];
    }

    return question.options.map((option, optionIndex) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
      order: optionIndex + 1,
      imageUrl: option.imageUrl || undefined,
      imageDisplayMode: option.imageDisplayMode || 'default',
      imageZoom: option.imageZoom ?? 100,
      imagePositionX: option.imagePositionX ?? 50,
      imagePositionY: option.imagePositionY ?? 50,
    }));
  }, []);

  const ensurePersistedQuestion = useCallback(
    async (questionId: string) => {
      if (!assessment) return null;
      const draftQuestion = questions.find((entry) => entry.id === questionId);
      if (!draftQuestion) return null;
      if (!draftQuestion.isNew && !draftQuestion.id.startsWith('temp-')) {
        return draftQuestion;
      }

      const questionIndex = questions.findIndex((entry) => entry.id === questionId);
      const isFillBlank = draftQuestion.type === 'fill_blank';
      const conceptTags = isFillBlank
        ? buildFillBlankConceptTags(
            draftQuestion.conceptTags,
            draftQuestion.fillBlankSmartCaseInsensitive,
            draftQuestion.fillBlankExperimentalSmartMatch,
          )
        : draftQuestion.conceptTags.filter(
            (tag) => !tag.startsWith(FILL_BLANK_META_TAG_PREFIX),
          );

      const created = await assessmentService.createQuestion({
        assessmentId: assessment.id,
        type: draftQuestion.type,
        content: draftQuestion.content.trim() || '<p></p>',
        points: Number(draftQuestion.points) || 1,
        order: questionIndex >= 0 ? questionIndex + 1 : questions.length + 1,
        isRequired: draftQuestion.isRequired,
        explanation: draftQuestion.explanation || undefined,
        imageUrl: draftQuestion.imageUrl || undefined,
        imageDisplayMode: draftQuestion.imageDisplayMode || 'default',
        imageZoom: draftQuestion.imageZoom ?? 100,
        imagePositionX: draftQuestion.imagePositionX ?? 50,
        imagePositionY: draftQuestion.imagePositionY ?? 50,
        conceptTags,
        options: buildQuestionWriteOptions(draftQuestion),
      });

      return replaceQuestionDraft(questionId, created.data);
    },
    [assessment, buildQuestionWriteOptions, questions, replaceQuestionDraft],
  );

  const handleUploadQuestionImage = useCallback(
    async (questionId: string, file: File) => {
      const persistedQuestion = await ensurePersistedQuestion(questionId);
      if (!persistedQuestion) {
        toast.error('Unable to prepare this question for image upload');
        return;
      }

      try {
        const response = await assessmentService.uploadQuestionImage(persistedQuestion.id, file);
        setQuestions((current) =>
          current.map((entry) =>
            entry.id === persistedQuestion.id
              ? {
                  ...entry,
                  imageUrl: response.data.imageUrl,
                  imageDisplayMode: entry.imageDisplayMode || 'default',
                  imageZoom: entry.imageZoom ?? 100,
                  imagePositionX: entry.imagePositionX ?? 50,
                  imagePositionY: entry.imagePositionY ?? 50,
                }
              : entry,
          ),
        );
      } catch {
        toast.error('Unable to upload question image');
      }
    },
    [ensurePersistedQuestion],
  );

  const handleUploadOptionImage = useCallback(
    async (questionId: string, optionId: string, file: File) => {
      const draftQuestion = questions.find((entry) => entry.id === questionId);
      const draftOptionIndex = draftQuestion?.options.findIndex((entry) => entry.id === optionId) ?? -1;
      const persistedQuestion = await ensurePersistedQuestion(questionId);
      if (!persistedQuestion || draftOptionIndex < 0) {
        toast.error('Unable to prepare this option for image upload');
        return;
      }

      const persistedOption = persistedQuestion.options[draftOptionIndex];
      if (!persistedOption?.id) {
        toast.error('Unable to locate the saved option for image upload');
        return;
      }

      try {
        const response = await assessmentService.uploadOptionImage(persistedOption.id, file);
        setQuestions((current) =>
          current.map((entry) =>
            entry.id === persistedQuestion.id
              ? {
                  ...entry,
                  options: entry.options.map((option, optionIndex) =>
                    optionIndex === draftOptionIndex
                      ? {
                          ...option,
                          imageUrl: response.data.imageUrl,
                          imageDisplayMode: option.imageDisplayMode || 'default',
                          imageZoom: option.imageZoom ?? 100,
                          imagePositionX: option.imagePositionX ?? 50,
                          imagePositionY: option.imagePositionY ?? 50,
                        }
                      : option,
                  ),
                }
              : entry,
          ),
        );
      } catch {
        toast.error('Unable to upload option image');
      }
    },
    [ensurePersistedQuestion, questions],
  );

  const syncQuestions = async () => {
    if (!assessment || isReadOnlyMode) return;

    for (const questionId of deletedQuestionIds) {
      await assessmentService.deleteQuestion(questionId);
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const content = question.content.trim();
      const points = Number(question.points);
      const isFillBlank = question.type === 'fill_blank';

      const fillBlankAnswerOptions = isFillBlank
        ? question.options
            .map((option) => option.text.trim())
            .filter((answer) => answer.length > 0)
            .map((answer, answerIndex) => ({
              text: answer,
              isCorrect: true,
              order: answerIndex + 1,
            }))
        : [];

      const options = supportsOptions(question.type)
        ? question.options.map((option, optionIndex) => ({
            text: option.text.trim(),
            isCorrect: option.isCorrect,
            order: optionIndex + 1,
            imageUrl: option.imageUrl || undefined,
            imageDisplayMode: option.imageDisplayMode || 'default',
            imageZoom: option.imageZoom ?? 100,
            imagePositionX: option.imagePositionX ?? 50,
            imagePositionY: option.imagePositionY ?? 50,
          }))
        : fillBlankAnswerOptions;

      const conceptTags = isFillBlank
        ? buildFillBlankConceptTags(
            question.conceptTags,
            question.fillBlankSmartCaseInsensitive,
            question.fillBlankExperimentalSmartMatch,
          )
        : question.conceptTags.filter((tag) => !tag.startsWith(FILL_BLANK_META_TAG_PREFIX));

      if (!content) {
        throw new Error(`Question ${index + 1} is empty`);
      }

      if (!Number.isInteger(points) || points < 1) {
        throw new Error(`Question ${index + 1} needs valid points`);
      }

      if (isFillBlank) {
        if (options.length === 0) {
          throw new Error(`Question ${index + 1} needs at least one correct answer`);
        }
      } else if (supportsOptions(question.type)) {
        if (options.some((option) => !optionHasAnswerContent(option))) {
          throw new Error(`Question ${index + 1} has empty answer choices`);
        }
        if (options.some((option) => typeof option.isCorrect !== 'boolean')) {
          throw new Error(`Question ${index + 1} has invalid answer choices`);
        }
        if (options.length < 2) {
          throw new Error(`Question ${index + 1} needs at least two answer choices`);
        }
        if (!options.some((option) => option.isCorrect)) {
          throw new Error(`Question ${index + 1} needs at least one correct answer`);
        }
      }

      const updatePayload: UpdateQuestionDto = {
        content,
        points,
        order: index + 1,
        isRequired: question.isRequired,
        explanation: question.explanation || undefined,
        imageUrl: question.imageUrl || undefined,
        imageDisplayMode: question.imageDisplayMode || 'default',
        imageZoom: question.imageZoom ?? 100,
        imagePositionX: question.imagePositionX ?? 50,
        imagePositionY: question.imagePositionY ?? 50,
        conceptTags,
        options,
      };

      if (question.isNew || question.id.startsWith('temp-')) {
        const createPayload: CreateQuestionDto = {
          assessmentId: assessment.id,
          type: question.type,
          content,
          points,
          order: index + 1,
          isRequired: question.isRequired,
          explanation: question.explanation || undefined,
          imageUrl: question.imageUrl || undefined,
          imageDisplayMode: question.imageDisplayMode || 'default',
          imageZoom: question.imageZoom ?? 100,
          imagePositionX: question.imagePositionX ?? 50,
          imagePositionY: question.imagePositionY ?? 50,
          conceptTags,
          options,
        };
        await assessmentService.createQuestion(createPayload);
      } else {
        await assessmentService.updateQuestion(question.id, updatePayload);
      }
    }
  };

  const handleTeacherAttachmentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!assessment) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploadingTeacherAttachment(true);
      const response = await assessmentService.uploadTeacherAttachment(assessment.id, file);
      setTeacherAttachmentFile(response.data);
      toast.success('Reference file uploaded');
    } catch {
      toast.error('Unable to upload reference file');
    } finally {
      setUploadingTeacherAttachment(false);
    }
  };

  const handleSave = async () => {
    if (!assessment || saving || isReadOnlyMode) return;

    if (availability === 'given' && quarterStatus !== 'ready') {
      toast.error('Verify the current quarter before publishing this assessment');
      return;
    }

    if (publishBlocked) {
      toast.error('Complete class record setup before publishing this assessment');
      setWarningOpen(true);
      return;
    }

    if (!title.trim()) {
      toast.error('Assessment title is required');
      focusSection('basics');
      return;
    }
    if (assessmentType !== 'file_upload' && questions.length === 0) {
      toast.error('Add at least one question');
      focusSection('content');
      return;
    }

    if (
      assessmentType === 'file_upload' &&
      !fileUploadInstructions.trim()
    ) {
      toast.error('File upload instructions are required');
      focusSection('content');
      return;
    }

    if (
      assessmentType === 'file_upload' &&
      allowedUploadExtensions.length === 0
    ) {
      toast.error('Select at least one allowed file type');
      focusSection('content');
      return;
    }

    if ((category && !quarter) || (!category && quarter)) {
      toast.error('Select both class record category and quarter');
      focusSection('placement');
      return;
    }

    if (placementMode === 'manual' && category && quarter && !selectedSlotId) {
      toast.error('Select a class record slot for manual placement');
      focusSection('placement');
      return;
    }

    try {
      setSaving(true);
      setSaveState('saving');
      const isCoreTemplateAssessment = Boolean(assessment.isCoreTemplateAsset);
      const targetPublishedState = availability === 'given';

      const classRecordPlacementPayload = {
        classRecordCategory: category || undefined,
        quarter: quarter || undefined,
        classRecordItemId:
          category && quarter
            ? placementMode === 'manual'
              ? selectedSlotId || null
              : null
            : null,
      };

      const updatePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: assessmentType,
        passingScore,
        maxAttempts:
          assessmentType === 'file_upload'
            ? DEFAULT_MAX_ATTEMPTS
            : toBoundedPositiveInteger(maxAttempts, MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS),
        timeLimitMinutes:
          assessmentType === 'file_upload'
            ? null
            : toBoundedPositiveInteger(
                timeLimitMinutes,
                MAX_TIME_LIMIT_MINUTES,
                DEFAULT_TIME_LIMIT_MINUTES,
              ),
        dueDate: fromDateInputValue(dueDate),
        closeWhenDue,
        randomizeQuestions: assessmentType === 'file_upload' ? false : randomizeQuestions,
        timedQuestionsEnabled: assessmentType === 'file_upload' ? false : timedQuestionsEnabled,
        questionTimeLimitSeconds:
          assessmentType !== 'file_upload' && timedQuestionsEnabled && questionTimeLimitSeconds
            ? Number(questionTimeLimitSeconds)
            : null,
        strictMode: assessmentType === 'file_upload' ? false : strictMode,
        feedbackLevel,
        feedbackDelayHours:
          resultReleaseMode === 'score_immediately' ? 0 : feedbackDelayHours,
        ...classRecordPlacementPayload,
        fileUploadInstructions:
          assessmentType === 'file_upload' ? fileUploadInstructions : undefined,
        teacherAttachmentFileId:
          assessmentType === 'file_upload' ? teacherAttachmentFile?.id ?? null : null,
        allowedUploadExtensions:
          assessmentType === 'file_upload' ? allowedUploadExtensions : undefined,
        allowedUploadMimeTypes:
          assessmentType === 'file_upload' ? allowedUploadMimeTypes : undefined,
        maxUploadSizeBytes:
          assessmentType === 'file_upload' ? maxUploadSizeBytes : undefined,
        ...(isCoreTemplateAssessment ? {} : { isPublished: targetPublishedState }),
      };

      if (!isCoreTemplateAssessment && assessmentType !== 'file_upload') {
        await syncQuestions();
      }

      await assessmentService.update(assessment.id, updatePayload);

      if (isCoreTemplateAssessment && assessment.isPublished !== targetPublishedState) {
        await assessmentService.releaseCore(assessment.id, {
          isPublished: targetPublishedState,
        });
      }

      toast.success('Assessment saved');
      await fetchAssessment();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Unable to save assessment';
      setSaveState('error');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRubric = async () => {
    if (!assessment || isReadOnlyMode) return;
    try {
      const normalized = rubricCriteria
        .map((criterion, index) => ({
          id: criterion.id?.trim() || `criterion-${index + 1}`,
          title: criterion.title.trim(),
          description: criterion.description?.trim() || undefined,
          points: Number(criterion.points) || 0,
        }))
        .filter((criterion) => criterion.title);

      if (normalized.length === 0) {
        toast.error('Add at least one rubric criterion');
        return;
      }

      const totalRubricPoints = normalized.reduce((sum, criterion) => sum + criterion.points, 0);
      if (totalRubricPoints !== RUBRIC_TOTAL_POINTS) {
        toast.error(`Rubric points must add up to ${RUBRIC_TOTAL_POINTS}`);
        return;
      }

      const response = await assessmentService.reviewRubric(assessment.id, normalized);
      setRubricCriteria(response.data.rubricCriteria || []);
      toast.success('Rubric saved');
    } catch {
      toast.error('Unable to save rubric');
    }
  };

  const toggleGroup = (groupKey: (typeof FILE_UPLOAD_TYPE_GROUPS)[number]['key']) => {
    const group = FILE_UPLOAD_TYPE_GROUPS.find((entry) => entry.key === groupKey);
    if (!group) return;
    const extensions = group.extensions as readonly string[];
    const mimeTypes = group.mimeTypes as readonly string[];
    const fullyEnabled = extensions.every((ext) => allowedUploadExtensions.includes(ext));
    if (fullyEnabled) {
      setAllowedUploadExtensions((current) =>
        current.filter((ext) => !extensions.includes(ext)),
      );
      setAllowedUploadMimeTypes((current) =>
        current.filter((mime) => !mimeTypes.includes(mime)),
      );
      return;
    }
    setAllowedUploadExtensions((current) => Array.from(new Set([...current, ...extensions])));
    setAllowedUploadMimeTypes((current) => Array.from(new Set([...current, ...mimeTypes])));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[42rem] rounded-xl" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Assessment not found.
      </div>
    );
  }

  const backHref = assessment.classId
    ? `/dashboard/teacher/classes/${assessment.classId}?view=assignments`
    : '/dashboard/teacher/assessments';

  const setupSections: Array<{
    id: AssessmentSetupSectionId;
    title: string;
    description: string;
  }> = [
    {
      id: 'basics',
      title: 'Assessment basics',
      description: 'Name the activity, choose the mode, and decide whether it stays draft or goes live.',
    },
    {
      id: 'content',
      title: 'Build content',
      description: 'Write the learner-facing questions or configure the file-upload activity.',
    },
    {
      id: 'delivery',
      title: 'Delivery rules',
      description: 'Set time, attempts, feedback timing, and student control rules.',
    },
    {
      id: 'placement',
      title: 'Class record setup',
      description: 'Connect the activity to the correct grading category, quarter, and slot.',
    },
    {
      id: 'review',
      title: 'Final review',
      description: 'Check readiness, preview the student flow, and save with confidence.',
  },
];

  const assessmentTypeSwitcher = (
    <div className="assessment-editor__inline-card">
      <p className="assessment-editor__kicker">Assessment format</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ASSESSMENT_TYPE_TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            aria-pressed={assessmentType === entry.value}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
              assessmentType === entry.value
                ? 'border-[#ef233c]/40 bg-[#fff5f5] text-[#9f1239]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
            onClick={() => {
              setAssessmentType(entry.value);
              if (entry.value === 'file_upload') {
                toast.info('File Upload mode enabled. Questions are preserved but hidden.');
              }
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );

  const rubricContent = (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
      <div className="assessment-editor__rubric-head">
        <div>
          <p className="text-sm font-black text-slate-900">Rubric rows</p>
          <p className="text-sm text-slate-500">Use this for file uploads or scored performance tasks.</p>
        </div>
        <div
          className="assessment-editor__rubric-meter"
          data-tone={rubricIsBalanced ? 'ready' : rubricRemainingPoints < 0 ? 'over' : 'pending'}
        >
          <div className="assessment-editor__rubric-meter-top">
            <small>Rubric total</small>
            <strong>
              {rubricTotalPoints}/{RUBRIC_TOTAL_POINTS}
            </strong>
          </div>
          <p className="assessment-editor__rubric-meter-copy">
            {rubricIsBalanced
              ? 'Ready for file upload scoring.'
              : rubricRemainingPoints > 0
                ? `${rubricRemainingPoints} point${rubricRemainingPoints === 1 ? '' : 's'} left to assign.`
                : `${Math.abs(rubricRemainingPoints)} point${Math.abs(rubricRemainingPoints) === 1 ? '' : 's'} over the limit.`}
          </p>
          <div className="assessment-editor__rubric-preview">
            {rubricCriteria.length === 0 ? (
              <span>No criteria yet.</span>
            ) : (
              rubricCriteria.slice(0, 3).map((criterion, index) => (
                <span key={criterion.id || index}>
                  {(criterion.title || `Criterion ${index + 1}`).trim()} · {Number(criterion.points) || 0}
                </span>
              ))
            )}
            {rubricCriteria.length > 3 ? <span>+{rubricCriteria.length - 3} more</span> : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rubricCriteria.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No rubric criteria yet.
          </p>
        ) : (
          rubricCriteria.map((criterion, index) => (
            <div
              key={criterion.id || index}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
            >
              <Input
                value={criterion.title}
                onChange={(event) =>
                  setRubricCriteria((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, title: event.target.value } : entry,
                    ),
                  )
                }
                placeholder="Criterion title"
                className="h-11 rounded-2xl border-slate-200 bg-white"
              />
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_92px_auto]">
                <Input
                  value={criterion.description || ''}
                  onChange={(event) =>
                    setRubricCriteria((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, description: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="Description"
                  className="h-11 rounded-2xl border-slate-200 bg-white"
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={criterion.points}
                  onChange={(event) => updateRubricPoints(index, event.target.value)}
                  placeholder="Points"
                  className="h-11 rounded-2xl border-slate-200 bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() =>
                    setRubricCriteria((current) =>
                      current.filter((_, entryIndex) => entryIndex !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          onClick={() =>
            setRubricCriteria((current) => [
              ...current,
              {
                id: createTempId(),
                title: '',
                points: 0,
                description: '',
              },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
        <Button
          type="button"
          className="rounded-2xl"
          onClick={() => void handleSaveRubric()}
          disabled={!rubricIsBalanced}
        >
          Save Rubric
        </Button>
      </div>
    </div>
  );

  const analyticsContent = analyticsLoading ? (
    <Skeleton className="h-24 rounded-xl" />
  ) : analytics ? (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
      <div>
        <p className="text-sm font-black text-slate-900">Assessment analytics</p>
        <p className="text-sm text-slate-500">Review response trends without leaving the composer.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total Responses: <strong>{analytics.totalResponses || 0}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total Attempts: <strong>{analytics.totalAttempts || 0}</strong>
        </div>
      </div>

      <div className="space-y-3">
        {analytics.questions.map((entry) => (
          <article
            key={entry.questionId}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
          >
            <h4 className="text-sm font-semibold text-slate-900">
              {entry.content || 'Untitled question'}
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Correct: {Math.round(entry.correctPercent || 0)}% | Avg:{' '}
              {entry.averagePoints.toFixed(1)} pts
            </p>
          </article>
        ))}
      </div>
    </div>
  ) : (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
      No analytics data yet.
    </p>
  );

  const settingsContent = (
    <div className="space-y-5">
      {assessmentTypeSwitcher}

      <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
        <div>
          <p className="text-sm font-black text-slate-900">Core settings</p>
          <p className="text-sm text-slate-500">Keep the high-level setup in one place while you build the assessment body on the page.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total: <strong>{totalPoints} points</strong> across{' '}
          <strong>{assessmentType === 'file_upload' ? 'file upload mode' : `${questions.length} question${questions.length === 1 ? '' : 's'}`}</strong>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Notes
          </label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            className="rounded-2xl"
            placeholder="Add notes or instructions for this assessment."
            minHeight={170}
          />
        </div>
      </div>
    </div>
  );

  const advancedContent = (
    <div className="space-y-5">
      {assessmentType === 'file_upload' ? (
        <section
          ref={(node) => {
            sectionRefs.current.placement = node;
          }}
          tabIndex={-1}
          className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 outline-none"
          aria-label="Class record setup"
        >
          <div>
            <p className="text-sm font-black text-slate-900">Class record setup</p>
            <p className="text-sm text-slate-500">Choose where file upload scores should land before the assessment is published.</p>
          </div>

          <div className="assessment-editor__advanced-inline">
            <div className="assessment-editor__field">
              <label>Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ClassRecordCategory)}
                disabled={isReadOnlyMode}
              >
                <option value="written_work">Written Work</option>
                <option value="performance_task">Performance Task</option>
                <option value="quarterly_assessment">Quarterly Assessment</option>
              </select>
            </div>
            <div className="assessment-editor__field">
              <label>Quarter</label>
              <select
                aria-label="Quarter"
                value={quarter}
                onChange={(event) => setQuarter(event.target.value as GradingPeriod)}
                disabled={
                  isReadOnlyMode ||
                  quarterStatus !== 'ready' ||
                  Boolean(lockedSystemQuarter)
                }
              >
                <option value="">Select quarter</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
          </div>
          {lockedSystemQuarter ? (
            <p className="text-xs text-slate-500">
              Quarter is locked to the current system quarter: {lockedSystemQuarter}.
            </p>
          ) : null}

          <div className="assessment-editor__placement-toggle">
            <button
              type="button"
              data-active={placementMode === 'automatic'}
              onClick={() => setPlacementMode('automatic')}
              disabled={isReadOnlyMode}
            >
              Automatic slot
            </button>
            <button
              type="button"
              data-active={placementMode === 'manual'}
              onClick={() => setPlacementMode('manual')}
              disabled={isReadOnlyMode}
            >
              Manual slot
            </button>
          </div>

          {!quarter ? (
            <p className="assessment-editor__empty-small">
              Pick a quarter to view available class record positions.
            </p>
          ) : slotOverviewLoading ? (
            <p className="assessment-editor__empty-small">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading slot overview...
            </p>
          ) : slotOverviewError ? (
            <p className="assessment-editor__empty-small">{slotOverviewError}</p>
          ) : selectedCategorySlots ? (
            <div className="assessment-editor__slots-grid">
              {(selectedCategorySlots?.slots ?? []).map((slot) => (
                <button
                  key={slot.itemId}
                  type="button"
                  className="assessment-editor__slot-card"
                  data-active={selectedSlotId === slot.itemId}
                  disabled={isReadOnlyMode || placementMode !== 'manual' || !slot.isSelectable}
                  onClick={() => {
                    if (placementMode !== 'manual' || !slot.isSelectable) return;
                    setSelectedSlotId(slot.itemId);
                  }}
                >
                  <strong>{slot.title}</strong>
                  <span>HPS {slot.maxScore}</span>
                  <small>Status: {slot.status.replace('_', ' ')}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="assessment-editor__empty-small">No slots found for selected category.</p>
          )}
        </section>
      ) : null}

      <section
        ref={(node) => {
          sectionRefs.current.delivery = node;
        }}
        tabIndex={-1}
        className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 outline-none"
      >
        <div>
          <p className="text-sm font-black text-slate-900">
            {assessmentType === 'file_upload' ? 'Submission and grading' : 'Delivery rules'}
          </p>
          <p className="text-sm text-slate-500">
            {assessmentType === 'file_upload'
              ? 'Keep file uploads simple: fixed scoring, due-date closure, result release, and teacher review flow.'
              : 'Control timing, attempts, result visibility, and how strict the assessment should feel.'}
          </p>
        </div>

        <div className="assessment-editor__field">
          <label>Due Date</label>
          <Input
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={isReadOnlyMode}
          />
        </div>

        {assessmentType === 'file_upload' ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Score is always 100 for file upload assessments.</p>
            <p className="mt-1">
              {rubricCriteria.length === 0
                ? 'No rubric yet. Teachers will grade the latest submission out of 100.'
                : `Rubric ready: ${rubricTotalPoints}/100 configured.`}
            </p>
          </div>
        ) : (
          <>
            <div className="assessment-editor__field">
              <label>Time Limit (minutes)</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={timeLimitMinutes}
                onChange={(event) =>
                  setTimeLimitMinutes(
                    sanitizeBoundedPositiveIntegerInput(event.target.value, MAX_TIME_LIMIT_MINUTES),
                  )
                }
                onBlur={() =>
                  setTimeLimitMinutes((current) =>
                    finalizeBoundedPositiveIntegerInput(
                      current,
                      MAX_TIME_LIMIT_MINUTES,
                      DEFAULT_TIME_LIMIT_MINUTES,
                    ),
                  )
                }
                disabled={isReadOnlyMode}
              />
            </div>
            <div className="assessment-editor__field">
              <label>Passing Score (%)</label>
              <select
                value={passingScore}
                onChange={(event) => setPassingScore(normalizePassingScore(Number(event.target.value)))}
                disabled={isReadOnlyMode}
              >
                {PASSING_SCORE_OPTIONS.map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>
            <div className="assessment-editor__field">
              <label>Max Attempts</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={maxAttempts}
                onChange={(event) =>
                  setMaxAttempts(sanitizeBoundedPositiveIntegerInput(event.target.value, MAX_ATTEMPTS))
                }
                onBlur={() =>
                  setMaxAttempts((current) =>
                    finalizeBoundedPositiveIntegerInput(current, MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS),
                  )
                }
                disabled={isReadOnlyMode}
              />
            </div>
          </>
        )}

        <label className="assessment-editor__checkbox-row">
          <input
            type="checkbox"
            checked={closeWhenDue}
            onChange={(event) => setCloseWhenDue(event.target.checked)}
            disabled={isReadOnlyMode}
          />
          Close assessment when due date passes
        </label>

        {assessmentType !== 'file_upload' ? (
          <>
            <label className="assessment-editor__checkbox-row">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(event) => setRandomizeQuestions(event.target.checked)}
                disabled={isReadOnlyMode}
              />
              Randomize questions and options per student
            </label>
            <label className="assessment-editor__checkbox-row">
              <input
                type="checkbox"
                checked={timedQuestionsEnabled}
                onChange={(event) => {
                  setTimedQuestionsEnabled(event.target.checked);
                  if (!event.target.checked) setQuestionTimeLimitSeconds('');
                }}
                disabled={isReadOnlyMode}
              />
              Enable per-question timer
            </label>
            {timedQuestionsEnabled ? (
              <div className="assessment-editor__field">
                <label>Question Time (seconds)</label>
                <Input
                  type="number"
                  min={5}
                  value={questionTimeLimitSeconds}
                  onChange={(event) => setQuestionTimeLimitSeconds(event.target.value)}
                  disabled={isReadOnlyMode}
                />
              </div>
            ) : null}
            <label className="assessment-editor__checkbox-row">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(event) => setStrictMode(event.target.checked)}
                disabled={isReadOnlyMode}
              />
              Strict no-return policy for previous questions
            </label>
          </>
        ) : null}

        <ResultReleaseSettings
          mode={resultReleaseMode}
          delayHours={feedbackDelayHours}
          assessmentType={assessmentType}
          disabled={isReadOnlyMode}
          onModeChange={(next) => {
            setResultReleaseMode(next);
            if (next === 'score_immediately') {
              setFeedbackDelayHours(0);
            } else if (feedbackDelayHours === 0) {
              setFeedbackDelayHours(DEFAULT_RESULT_RELEASE_DELAY_HOURS);
            }
          }}
          onDelayHoursChange={setFeedbackDelayHours}
        />
      </section>

      {assessmentType !== 'file_upload' ? (
        <section
          ref={(node) => {
            sectionRefs.current.placement = node;
          }}
          tabIndex={-1}
          className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 outline-none"
          aria-label="Class record setup"
        >
          <div>
            <p className="text-sm font-black text-slate-900">Class record setup</p>
            <p className="text-sm text-slate-500">Choose where scores should land before the assessment is published.</p>
          </div>

          <div className="assessment-editor__advanced-inline">
            <div className="assessment-editor__field">
              <label>Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ClassRecordCategory)}
                disabled={isReadOnlyMode}
              >
                <option value="written_work">Written Work</option>
                <option value="performance_task">Performance Task</option>
                <option value="quarterly_assessment">Quarterly Assessment</option>
              </select>
            </div>
            <div className="assessment-editor__field">
              <label>Quarter</label>
              <select
                aria-label="Quarter"
                value={quarter}
                onChange={(event) => setQuarter(event.target.value as GradingPeriod)}
                disabled={
                  isReadOnlyMode ||
                  quarterStatus !== 'ready' ||
                  Boolean(lockedSystemQuarter)
                }
              >
                <option value="">Select quarter</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
          </div>
          {lockedSystemQuarter ? (
            <p className="text-xs text-slate-500">
              Quarter is locked to the current system quarter: {lockedSystemQuarter}.
            </p>
          ) : null}

          <div className="assessment-editor__placement-toggle">
            <button
              type="button"
              data-active={placementMode === 'automatic'}
              onClick={() => setPlacementMode('automatic')}
              disabled={isReadOnlyMode}
            >
              Automatic slot
            </button>
            <button
              type="button"
              data-active={placementMode === 'manual'}
              onClick={() => setPlacementMode('manual')}
              disabled={isReadOnlyMode}
            >
              Manual slot
            </button>
          </div>

          {!quarter ? (
            <p className="assessment-editor__empty-small">
              Pick a quarter to view available class record positions.
            </p>
          ) : slotOverviewLoading ? (
            <p className="assessment-editor__empty-small">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading slot overview...
            </p>
          ) : slotOverviewError ? (
            <p className="assessment-editor__empty-small">{slotOverviewError}</p>
          ) : selectedCategorySlots ? (
            <div className="assessment-editor__slots-grid">
              {(selectedCategorySlots?.slots ?? []).map((slot) => (
                <button
                  key={slot.itemId}
                  type="button"
                  className="assessment-editor__slot-card"
                  data-active={selectedSlotId === slot.itemId}
                  disabled={isReadOnlyMode || placementMode !== 'manual' || !slot.isSelectable}
                  onClick={() => {
                    if (placementMode !== 'manual' || !slot.isSelectable) return;
                    setSelectedSlotId(slot.itemId);
                  }}
                >
                  <strong>{slot.title}</strong>
                  <span>HPS {slot.maxScore}</span>
                  <small>Status: {slot.status.replace('_', ' ')}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="assessment-editor__empty-small">No slots found for selected category.</p>
          )}
        </section>
      ) : null}
    </div>
  );

  const controlPanelContent =
    rightTab === 'settings'
      ? settingsContent
      : rightTab === 'advanced'
        ? advancedContent
        : rightTab === 'rubric'
          ? rubricContent
          : analyticsContent;

  const saveStateLabel =
    saveState === 'saving'
      ? 'Saving'
      : saveState === 'dirty'
        ? 'Unsaved'
        : saveState === 'error'
          ? 'Retry needed'
          : 'Saved';
  const quarterContextLabel =
    quarterStatus === 'loading'
      ? 'Checking quarter'
      : quarterStatus === 'error'
        ? 'Quarter unverified'
        : lockedSystemQuarter
          ? `Quarter ${lockedSystemQuarter}`
          : 'Quarter unavailable';

  const rubricDisabled = assessmentType !== 'file_upload';
  const warningButtonLabel =
    setupIssues.length === 1 ? 'View 1 setup issue' : `View ${setupIssues.length} setup issues`;
  const visibleWarningLabel =
    setupIssues.length === 1 ? '1 setup issue' : `${setupIssues.length} setup issues`;
  const panelTitle =
    rightTab === 'settings'
      ? 'Settings'
      : rightTab === 'advanced'
        ? 'Advanced'
        : rightTab === 'rubric'
          ? 'Rubric'
          : 'Analytics';
  const buildContentBody =
    assessmentType === 'file_upload' ? (
      <article className="assessment-editor__inline-card assessment-editor__file-mode">
        <div className="assessment-editor__file-mode-head">
          <h3>File Upload Assessment</h3>
          <p>
            Students submit files instead of answering question cards. Existing questions are kept for
            future mode switches.
          </p>
        </div>

        <div className="assessment-editor__field">
          <label>Upload Instructions</label>
          <RichTextEditor
            value={fileUploadInstructions}
            onChange={setFileUploadInstructions}
            className="assessment-editor__question-text"
            placeholder="Explain what students must upload and how they should format it."
            minHeight={190}
          />
        </div>

        <div className="assessment-editor__file-groups">
          {FILE_UPLOAD_TYPE_GROUPS.map((group) => {
            const enabled = group.extensions.every((ext) => allowedUploadExtensions.includes(ext));
            return (
              <label key={group.key} className="assessment-editor__file-group" data-active={enabled}>
                <input
                  type="checkbox"
                  className="assessment-editor__file-group-input"
                  checked={enabled}
                  onChange={() => toggleGroup(group.key)}
                  disabled={isReadOnlyMode}
                />
                <span className="assessment-editor__file-group-indicator" aria-hidden="true">
                  {enabled ? '✓' : ''}
                </span>
                <span>{group.label}</span>
              </label>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="assessment-editor__field">
            <label>Maximum upload size (MB)</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={Math.round(maxUploadSizeBytes / (1024 * 1024))}
              onChange={(event) => {
                const mb = Number(event.target.value) || 1;
                setMaxUploadSizeBytes(Math.min(Math.max(mb, 1), 100) * 1024 * 1024);
              }}
              disabled={isReadOnlyMode}
            />
          </div>
          <div className="assessment-editor__upload-policy">
            <p className="assessment-editor__upload-policy-title">Upload policy</p>
            <p className="assessment-editor__upload-policy-line">
              <strong>Allowed file types:</strong>{' '}
              {allowedUploadExtensions.length > 0 ? allowedUploadExtensions.join(', ') : 'none'}
            </p>
            <p className="assessment-editor__upload-policy-line">
              <strong>Reference file:</strong> Optional preview material for students before they submit.
            </p>
          </div>
        </div>

        <div className="assessment-editor__file-attachment">
          <div>
            <p>Reference file for students</p>
            <span>Upload an optional handout, sample, or guide that students can preview.</span>
          </div>
          <label className="assessment-editor__upload-btn">
            <Upload className="h-4 w-4" />
            {uploadingTeacherAttachment ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              className="hidden"
              onChange={handleTeacherAttachmentUpload}
              disabled={uploadingTeacherAttachment || isReadOnlyMode}
            />
          </label>
        </div>

        {teacherAttachmentFile ? (
          <div className="assessment-editor__attachment-card">
            <div>
              <strong>{teacherAttachmentFile.originalName}</strong>
              <p>{Math.round(teacherAttachmentFile.sizeBytes / 1024)} KB</p>
            </div>
            <div className="assessment-editor__attachment-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void assessmentService.downloadTeacherAttachment(
                    assessment.id,
                    teacherAttachmentFile.originalName,
                  )
                }
              >
                Download
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-rose-600"
                onClick={() => setTeacherAttachmentFile(null)}
                disabled={isReadOnlyMode}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : null}
      </article>
    ) : previewEnabled || isReadOnlyMode ? (
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
            No questions yet. Add one to preview the learner flow.
          </div>
        ) : (
          questions.map((question, index) => (
            <article
              key={question.id}
              className="rounded-[1.6rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Question {index + 1}
                </span>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
                  {ASSESSMENT_COMPOSER_LABELS[question.type]}
                </span>
                <span className="text-sm text-slate-500">
                  {question.points} pts {question.isRequired ? '| Required' : '| Optional'}
                </span>
              </div>

              <RichTextRenderer
                html={question.content || '<p>Untitled question</p>'}
                className="mt-4 text-base font-semibold leading-7 text-slate-900"
              />
            </article>
          ))
        )}
      </div>
    ) : questions.length === 0 ? (
      <div className="space-y-4 rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.25)]">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Quick start with</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ASSESSMENT_COMPOSER_QUESTION_TYPES.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.type}
                type="button"
                onClick={() => handleAddQuestion(entry.type)}
                disabled={isReadOnlyMode}
                className="flex min-h-[84px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/70"
              >
                <span className="rounded-xl bg-white p-2 text-sky-700 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-900">{entry.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        {questions.map((question, index) => {
          const isSelected = selectedQuestionId === question.id;
          const isLastQuestion = index === questions.length - 1;
          const canMoveUp = index > 0;
          const canMoveDown = index < questions.length - 1;
          return (
            <div key={question.id} className="group space-y-2">
              <article
                onClick={() => setSelectedQuestionId(question.id)}
                className={`rounded-[1.5rem] border bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.28)] ${
                  isSelected ? 'border-sky-300' : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Q{index + 1}
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
                      {ASSESSMENT_COMPOSER_LABELS[question.type]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      aria-label={`Move question ${index + 1} up`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleMoveQuestion(question.id, 'up');
                      }}
                      disabled={isReadOnlyMode || !canMoveUp}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      aria-label={`Move question ${index + 1} down`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleMoveQuestion(question.id, 'down');
                      }}
                      disabled={isReadOnlyMode || !canMoveDown}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDuplicateQuestion(question.id);
                      }}
                      disabled={isReadOnlyMode}
                    >
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteQuestion(question.id);
                      }}
                      disabled={isReadOnlyMode}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  {isSelected ? (
                    <AssessmentQuestionEditor
                      question={question}
                      questions={questions}
                      onQuestionsChange={setQuestions}
                      onUploadQuestionImage={handleUploadQuestionImage}
                      onUploadOptionImage={handleUploadOptionImage}
                      onOpenQuestionDetails={() => setQuestionDetailsOpen(true)}
                    />
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                      <RichTextRenderer
                        html={question.content || '<p>Untitled question</p>'}
                        className="text-base font-semibold leading-7 text-slate-900"
                      />
                      {question.imageUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                          <Image
                            src={question.imageUrl}
                            alt="Question image"
                            width={1200}
                            height={675}
                            unoptimized
                            className="max-h-[220px] w-full rounded-xl object-contain"
                          />
                        </div>
                      ) : null}
                      {supportsOptions(question.type) && question.options.length > 0 ? (
                        <div className="space-y-2">
                          {question.options.map((option) => (
                            <div
                              key={option.id}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span>{option.text || 'Untitled option'}</span>
                                {option.imageUrl ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Image</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </article>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => openQuestionTypeDialog(index)}
                  disabled={isReadOnlyMode}
                  className={`h-10 min-w-14 rounded-full border-sky-200 bg-white/95 px-4 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.42)] transition hover:scale-[1.03] hover:border-sky-300 hover:bg-sky-50 ${
                    isLastQuestion
                      ? ''
                      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <div ref={questionListBottomRef} className="h-2" />
      </div>
    );

  return (
    <div className="assessment-editor assessment-editor--flattened px-4 pb-8 pt-2 lg:px-6">
      <header className="assessment-editor__header assessment-editor__header--sticky assessment-editor__workspace-header">
        <div className="assessment-editor__workspace-main">
          <div className="assessment-editor__workspace-title-block">
            <div className="assessment-editor__workspace-title-field">
              <button
                type="button"
                className="assessment-editor__back"
                aria-label="Back to assessments"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                    return;
                  }
                  window.location.assign(backHref);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Input
                ref={(node) => {
                  sectionRefs.current.basics = node;
                }}
                aria-label="Assessment title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="assessment-editor__title-input assessment-editor__title-input--distinguished"
                placeholder="Untitled assessment"
                disabled={isReadOnlyMode}
              />
            </div>
            <div className="assessment-editor__workspace-context" aria-label="Assessment context">
              <span>{assessment.isCoreTemplateAsset ? 'Core template assessment' : 'Class assessment'}</span>
              <span aria-hidden="true">·</span>
              <span>{quarterContextLabel}</span>
            </div>
          </div>

          <div className="assessment-editor__header-tabbar" role="tablist" aria-label="Assessment editor tools">
            <Button
              type="button"
              variant="outline"
              className={`assessment-editor__header-tab ${
                panelOpen && rightTab === 'settings' ? 'is-active' : ''
              }`}
              onClick={() => openPanelTab('settings')}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`assessment-editor__header-tab ${
                panelOpen && rightTab === 'advanced' ? 'is-active' : ''
              }`}
              onClick={() => openPanelTab('advanced')}
            >
              Advanced
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={rubricDisabled}
              className={`assessment-editor__header-tab ${
                panelOpen && rightTab === 'rubric' ? 'is-active' : ''
              } ${rubricDisabled ? 'cursor-not-allowed opacity-55' : ''}`}
              onClick={() => {
                if (rubricDisabled) return;
                openPanelTab('rubric');
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Rubric
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`assessment-editor__header-tab ${
                panelOpen && rightTab === 'analytics' ? 'is-active' : ''
              }`}
              onClick={() => openPanelTab('analytics')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        <div className="assessment-editor__workspace-side">
          <div className="assessment-editor__header-helper-group">
            <div className="assessment-editor__header-score" aria-label={`Total score ${totalPoints} points`}>
              <span>Total score</span>
              <strong>{totalPoints} pts</strong>
            </div>
            <Button
              ref={warningButtonRef}
              type="button"
              variant="outline"
              className={`assessment-editor__warning-action ${
                setupIssues.length > 0
                  ? 'border-amber-300 text-amber-900'
                  : 'border-emerald-300 text-emerald-800'
              }`}
              onClick={() => setWarningOpen(true)}
              aria-label={warningButtonLabel}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{visibleWarningLabel}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="assessment-editor__icon-action"
              onClick={() => {
                setHelpPage(0);
                setHelpOpen(true);
              }}
              aria-label="Assessment help"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="assessment-editor__header-publish-group"
            role="group"
            aria-label="Assessment publishing controls"
          >
            <span className="assessment-editor__workbar-meta" aria-label="Assessment status">
              {isReadOnlyMode ? 'View only' : saveStateLabel}
            </span>
            <Button
              type="button"
              variant="outline"
              className="assessment-editor__preview-btn"
              onClick={() => setPreviewEnabled((current) => !current)}
              disabled={isReadOnlyMode}
            >
              <Eye className="mr-2 h-4 w-4" />
              {isReadOnlyMode ? 'Read-only preview' : previewEnabled ? 'Back to edit' : 'Preview'}
            </Button>
            <div
              className="assessment-editor__mode-switch assessment-editor__mode-switch--header"
              role="group"
              aria-label="Assessment availability"
            >
              <button
                type="button"
                data-active={availability === 'draft'}
                onClick={() => setAvailability('draft')}
                disabled={isReadOnlyMode}
              >
                Draft
              </button>
              <button
                type="button"
                data-active={availability === 'given'}
                onClick={() => setAvailability('given')}
                disabled={isReadOnlyMode || quarterStatus !== 'ready'}
              >
                Ready to give
              </button>
            </div>
            <Button
              type="button"
              className="assessment-editor__save-btn"
              onClick={() => void handleSave()}
              disabled={
                saving ||
                isReadOnlyMode ||
                (availability === 'given' && quarterStatus !== 'ready')
              }
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save now
            </Button>
          </div>
        </div>
      </header>
      {quarterStatus === 'error' ? (
        <section
          className="mx-1 mt-3 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
          role="status"
          aria-live="polite"
        >
          <div>
            <p className="text-sm font-semibold">Current quarter could not be verified</p>
            <p className="mt-1 text-sm text-amber-800">
              Drafts can still be saved, but publishing stays unavailable until the check succeeds.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-amber-300 bg-white"
            onClick={() => void loadCurrentAcademicQuarter()}
          >
            Retry quarter check
          </Button>
        </section>
      ) : null}
      <main
        ref={(node) => {
          sectionRefs.current.content = node;
        }}
        tabIndex={-1}
        role="region"
        aria-label="Build content"
        className="assessment-editor__editor-main"
      >
        {buildContentBody}
      </main>

      {assessmentType !== 'file_upload' && questions.length > 0 && !hideFloatingAdd && !isReadOnlyMode ? (
        <Button
          type="button"
          onClick={() => openQuestionTypeDialog(null)}
          className="fixed bottom-5 right-5 z-30 h-10 w-10 rounded-full p-0 shadow-[0_20px_36px_-20px_rgba(15,23,42,0.45)]"
        >
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}

      <Dialog
        open={addQuestionDialogOpen}
        onOpenChange={(open) => {
          setAddQuestionDialogOpen(open);
          if (!open) setInsertAfterQuestionIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl rounded-3xl border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-900">Add Question</DialogTitle>
            <DialogDescription className="text-slate-500">
              Choose the next question type for this assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ASSESSMENT_COMPOSER_QUESTION_TYPES.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={`${entry.type}-dialog`}
                    type="button"
                    onClick={() => handleAddQuestion(entry.type, insertAfterQuestionIndex)}
                    className="flex min-h-[84px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/70"
                  >
                    <span className="rounded-xl bg-white p-2 text-sky-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-black"
              onClick={() => {
                setAddQuestionDialogOpen(false);
                setInsertAfterQuestionIndex(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDetailsOpen} onOpenChange={setQuestionDetailsOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-900">Question details</DialogTitle>
            <DialogDescription className="text-slate-500">
              Keep explanation text here so the main question editor stays focused on the prompt, choices, and images.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            {selectedQuestion ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Selected question</p>
                  <RichTextRenderer
                    html={selectedQuestion.content || '<p>Untitled question</p>'}
                    className="mt-2 text-sm font-semibold leading-6 text-slate-900"
                  />
                </div>
                <RichTextEditor
                  value={selectedQuestion.explanation}
                  onChange={(value) =>
                    setQuestions((current) =>
                      current.map((entry) =>
                        entry.id === selectedQuestion.id
                          ? {
                              ...entry,
                              explanation: value,
                            }
                          : entry,
                      ),
                    )
                  }
                  minHeight={180}
                  placeholder="Explanation or teacher-only answer guidance"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Choose a question first.</p>
            )}
          </div>
          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setQuestionDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={`fixed inset-0 z-40 transition ${panelOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close panel"
          className={`absolute inset-0 bg-slate-900/35 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setPanelOpen(false)}
        />
        <aside
          aria-label={`${panelTitle} panel`}
          className={`absolute right-0 top-0 h-full w-full max-w-[440px] border-l border-slate-200 bg-white px-4 pb-4 pt-3 shadow-[0_28px_54px_-36px_rgba(15,23,42,0.42)] transition-transform duration-300 ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{panelTitle}</h3>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close editor panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100%-56px)] overflow-y-auto pr-1">
            {controlPanelContent}
          </div>
        </aside>
      </div>

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog assessment-editor__manual-dialog">
          <DialogHeader>
            <DialogTitle>Teacher guide: Assessment Setup Workspace</DialogTitle>
            <DialogDescription>
              Read this one page at a time. Each example points to the part of the assessment editor being explained.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>
              Page {helpPage + 1} of {guidePages.length}
            </span>
            <div>
              {guidePages.map((page, index) => (
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
            <AssessmentEditorGuideShot
              screen={guidePages[helpPage].screen}
              issueCount={setupIssues.length}
              fileUploadMode={assessmentType === 'file_upload'}
              publishReady={publishReady}
            />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Teacher instruction manual</p>
              <h3>{guidePages[helpPage].title}</h3>
              <p>{guidePages[helpPage].description}</p>
              <div className="route-guide-steps">
                {guidePages[helpPage].steps.map((step, index) => (
                  <div
                    key={`${step.action}-${step.body}`}
                    className={`route-guide-step ${step.tone ? `is-${step.tone}` : ''}`}
                  >
                    <span className="route-guide-step__index">{index + 1}</span>
                    <div>
                      <strong>{step.action}</strong>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="teacher-intervention-workspace__manual-reminder">
                {guidePages[helpPage].reminder}
              </p>
            </section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHelpPage((current) => Math.max(current - 1, 0))}
              disabled={helpPage === 0}
            >
              Previous page
            </Button>
            <Button type="button" onClick={() => setHelpOpen(false)}>
              Close guide
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (helpPage === guidePages.length - 1) {
                  setHelpOpen(false);
                  return;
                }
                setHelpPage((current) => Math.min(current + 1, guidePages.length - 1));
              }}
            >
              Next page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="assessment-editor__warning-dialog">
          <DialogHeader>
            <DialogTitle>Assessment setup checklist</DialogTitle>
            <DialogDescription>
              Use this checklist to see what is still missing and jump straight to the part of the page that needs attention.
            </DialogDescription>
          </DialogHeader>

          <div className="assessment-editor__warning-summary-line">
            <span>
              <strong>{requiredSetupIssues.length}</strong> required
            </span>
            <span>
              <strong>{setupIssues.length - requiredSetupIssues.length}</strong> recommended
            </span>
          </div>

          <div className="assessment-editor__warning-groups assessment-editor__warning-groups--plain">
            {setupSections.map((section) =>
              groupedSetupIssues[section.id].length > 0 ? (
                <section key={section.id} className="assessment-editor__warning-group">
                  <div className="assessment-editor__warning-group-head">
                    <p className="assessment-editor__kicker">{section.title}</p>
                    <span>{groupedSetupIssues[section.id].length} item{groupedSetupIssues[section.id].length === 1 ? '' : 's'}</span>
                  </div>
                  <ol className="assessment-editor__warning-list" role="list">
                    {groupedSetupIssues[section.id].map((issue) => (
                      <li key={issue.id} className="assessment-editor__warning-line" data-severity={issue.severity}>
                        <button
                          type="button"
                          className="assessment-editor__warning-item assessment-editor__warning-item--plain"
                          data-severity={issue.severity}
                          onClick={() => focusSection(issue.section)}
                          aria-label={issue.actionLabel || `Open ${section.title}`}
                        >
                          <span className="assessment-editor__warning-mark" aria-hidden="true">
                            {issue.severity === 'required' ? '!' : '•'}
                          </span>
                          <span className="assessment-editor__warning-copy">
                            <strong>{issue.title}</strong>
                            <p>{issue.description}</p>
                          </span>
                          <span className="assessment-editor__warning-open">
                            {issue.actionLabel || 'Open section'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null,
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
