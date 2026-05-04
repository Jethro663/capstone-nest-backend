'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CircleHelp,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Settings2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { AssessmentQuestionEditor } from '@/features/assessment-composer/AssessmentQuestionEditor';
import {
  ASSESSMENT_COMPOSER_LABELS,
  ASSESSMENT_COMPOSER_QUESTION_TYPES,
} from '@/features/assessment-composer/question-config';
import {
  createAssessmentComposerQuestion,
  deleteAssessmentComposerQuestion,
  duplicateAssessmentComposerQuestion,
  reorderAssessmentComposerQuestions,
  supportsAssessmentComposerOptions,
} from '@/features/assessment-composer/reducer';
import type { AssessmentComposerQuestionDraft } from '@/features/assessment-composer/types';
import {
  clearTemplateEditorDraft,
  createTemplateAssessmentDraft,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  resolveIndexKey,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import { classTemplateService } from '@/services/class-template-service';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
  ClassTemplateQuestion,
  ClassTemplateQuestionOption,
} from '@/types/class-template';
import type { QuestionType } from '@/utils/constants';
import '../../../../../../teacher/assessments/[id]/edit/assessment-editor.css';

type RightTab = 'settings' | 'template';
type AssessmentComposerSaveState = 'saved' | 'saving' | 'dirty' | 'error';
type ComposerImageDisplayMode = 'default' | 'expanded';
type TemplateSetupSeverity = 'required' | 'recommended';
type TemplateSetupSectionId = 'basics' | 'content' | 'settings' | 'review';

type TemplateSetupIssue = {
  id: string;
  title: string;
  description: string;
  section: TemplateSetupSectionId;
  severity: TemplateSetupSeverity;
  actionLabel?: string;
};

type TemplateGuideScreen = 'overview' | 'build' | 'delivery' | 'review';

type TemplateGuidePage = {
  title: string;
  description: string;
  screen: TemplateGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
  }>;
};

const QUESTION_ASSESSMENT_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'activity', label: 'Activity' },
] as const;
const FILE_UPLOAD_FIXED_SCORE = 100;

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

function normalizeTemplateQuestion(
  question: ClassTemplateQuestion,
  index: number,
): AssessmentComposerQuestionDraft {
  const type = (question.type || 'multiple_choice') as QuestionType;
  const fallbackQuestion = createAssessmentComposerQuestion(type, question.points ?? 1);
  const normalizedOptions =
    supportsAssessmentComposerOptions(type) && (question.options?.length ?? 0) > 0
      ? (question.options ?? []).map((option, optionIndex) => ({
          id: option.id ?? `template-option-${index + 1}-${optionIndex + 1}`,
          text: option.text ?? '',
          isCorrect: Boolean(option.isCorrect),
          order: option.order ?? optionIndex + 1,
          imageUrl: option.imageUrl ?? '',
          imageDisplayMode: normalizeImageDisplayMode(option.imageDisplayMode),
          imageZoom: normalizeImageZoom(option.imageZoom),
          imagePositionX: normalizeImagePosition(option.imagePositionX),
          imagePositionY: normalizeImagePosition(option.imagePositionY),
        }))
      : type === 'fill_blank' && (question.options?.length ?? 0) > 0
        ? (question.options ?? []).map((option, optionIndex) => ({
            id: option.id ?? `template-option-${index + 1}-${optionIndex + 1}`,
            text: option.text ?? '',
            isCorrect: true,
            order: option.order ?? optionIndex + 1,
            imageUrl: option.imageUrl ?? '',
            imageDisplayMode: normalizeImageDisplayMode(option.imageDisplayMode),
            imageZoom: normalizeImageZoom(option.imageZoom),
            imagePositionX: normalizeImagePosition(option.imagePositionX),
            imagePositionY: normalizeImagePosition(option.imagePositionY),
          }))
        : fallbackQuestion.options;

  return {
    id: question.id ?? `template-question-${index + 1}`,
    type,
    content: question.content ?? '',
    points: question.points ?? 1,
    isRequired: question.isRequired ?? true,
    explanation: question.explanation ?? '',
    imageUrl: question.imageUrl ?? '',
    imageDisplayMode: normalizeImageDisplayMode(question.imageDisplayMode),
    imageZoom: normalizeImageZoom(question.imageZoom),
    imagePositionX: normalizeImagePosition(question.imagePositionX),
    imagePositionY: normalizeImagePosition(question.imagePositionY),
    conceptTags: [],
    fillBlankSmartCaseInsensitive: true,
    fillBlankExperimentalSmartMatch: false,
    options: normalizedOptions,
  };
}

function normalizeOptionsForQuestionType(
  type: QuestionType,
  options: ClassTemplateQuestionOption[] | undefined,
): ClassTemplateQuestionOption[] {
  const base = (options ?? []).map((option, index) => ({
    ...option,
    order: index + 1,
    imageUrl: option.imageUrl ?? '',
    imageDisplayMode: normalizeImageDisplayMode(option.imageDisplayMode),
    imageZoom: normalizeImageZoom(option.imageZoom),
    imagePositionX: normalizeImagePosition(option.imagePositionX),
    imagePositionY: normalizeImagePosition(option.imagePositionY),
  }));

  if (type === 'multiple_select') {
    return base;
  }

  if (type === 'fill_blank') {
    if (base.length === 0) {
      return [{ text: '', isCorrect: true, order: 1 }];
    }

    return base.map((option, index) => ({
      ...option,
      isCorrect: true,
      order: index + 1,
    }));
  }

  if (base.length === 0) {
    return createAssessmentComposerQuestion(type).options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
      imageUrl: option.imageUrl,
      imageDisplayMode: option.imageDisplayMode,
      imageZoom: option.imageZoom,
      imagePositionX: option.imagePositionX,
      imagePositionY: option.imagePositionY,
    }));
  }

  const firstCorrectIndex = base.findIndex((option) => Boolean(option.isCorrect));
  if (firstCorrectIndex < 0) {
    return base.map((option, index) => ({
      ...option,
      isCorrect: index === 0,
    }));
  }

  return base.map((option, index) => ({
    ...option,
    isCorrect: index === firstCorrectIndex,
  }));
}

function reindexTemplateAssessments(assessments: ClassTemplateAssessment[]) {
  return assessments.map((assessment, assessmentIndex) => ({
    ...assessment,
    order: assessmentIndex + 1,
    questions: (assessment.questions ?? []).map((question, questionIndex) => ({
      ...question,
      order: questionIndex + 1,
      options: (question.options ?? []).map((option, optionIndex) => ({
        ...option,
        order: optionIndex + 1,
      })),
    })),
  }));
}

function upsertTemplateAssessment(
  assessments: ClassTemplateAssessment[],
  assessmentIndex: number,
  draftPayload: ClassTemplateAssessment,
) {
  const nextAssessments = assessments.slice();
  if (assessmentIndex >= 0 && nextAssessments[assessmentIndex]) {
    nextAssessments[assessmentIndex] = {
      ...nextAssessments[assessmentIndex],
      ...draftPayload,
    };
  } else {
    nextAssessments.push(draftPayload);
  }

  return reindexTemplateAssessments(nextAssessments);
}

function optionHasAnswerContent(option: {
  text?: string | null;
  imageUrl?: string | null;
}) {
  return Boolean(option.text?.trim() || option.imageUrl?.trim());
}

function validateTemplateQuestions(questions: AssessmentComposerQuestionDraft[]) {
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const content = question.content.trim();
    const points = Number(question.points);

    if (!content) {
      throw new Error(`Question ${index + 1} is empty`);
    }

    if (!Number.isInteger(points) || points < 1) {
      throw new Error(`Question ${index + 1} needs valid points`);
    }

    if (question.type === 'fill_blank') {
      const answers = question.options
        .map((option) => option.text.trim())
        .filter((answer) => answer.length > 0);

      if (answers.length === 0) {
        throw new Error(`Question ${index + 1} needs at least one correct answer`);
      }
      continue;
    }

    if (!supportsAssessmentComposerOptions(question.type)) {
      continue;
    }

    if (question.options.length < 2) {
      throw new Error(`Question ${index + 1} needs at least two answer choices`);
    }

    if (question.options.some((option) => !optionHasAnswerContent(option))) {
      throw new Error(`Question ${index + 1} has empty answer choices`);
    }

    if (!question.options.some((option) => option.isCorrect)) {
      throw new Error(`Question ${index + 1} needs at least one correct answer`);
    }
  }
}

function getTemplateQuestionValidationIssues(
  question: AssessmentComposerQuestionDraft,
  index: number,
) {
  const issuePrefix = `Question ${index + 1}`;
  const issues: Array<{ title: string; description: string }> = [];
  const content = question.content.trim();
  const points = Number(question.points);

  if (!content) {
    issues.push({
      title: `${issuePrefix} is empty`,
      description: 'Add the question body so template users know what students should answer.',
    });
  }

  if (!Number.isInteger(points) || points < 1) {
    issues.push({
      title: `${issuePrefix} needs valid points`,
      description: 'Set at least 1 point so the generated class assessment can score this item.',
    });
  }

  if (question.type === 'fill_blank') {
    const answers = question.options
      .map((option) => option.text.trim())
      .filter((answer) => answer.length > 0);

    if (answers.length === 0) {
      issues.push({
        title: `${issuePrefix} needs at least one correct answer`,
        description: 'Fill-in-the-blank items need at least one accepted answer before saving the template.',
      });
    }

    return issues;
  }

  if (!supportsAssessmentComposerOptions(question.type)) {
    return issues;
  }

  if (question.options.length < 2) {
    issues.push({
      title: `${issuePrefix} needs at least two answer choices`,
      description: 'Add at least two visible choices so the generated assessment can render properly.',
    });
  }

  if (question.options.some((option) => !optionHasAnswerContent(option))) {
    issues.push({
      title: `${issuePrefix} has empty answer choices`,
      description: 'Each visible choice needs text or an image before the template is ready.',
    });
  }

  if (!question.options.some((option) => option.isCorrect)) {
    issues.push({
      title: `${issuePrefix} needs at least one correct answer`,
      description: 'Mark the correct answer so the generated assessment can score the question.',
    });
  }

  return issues;
}

function AdminTemplateAssessmentGuideShot({
  screen,
  issueCount,
  totalScore,
}: {
  screen: TemplateGuideScreen;
  issueCount: number;
  totalScore: number;
}) {
  return (
    <div className={`assessment-editor__guide-shot assessment-editor__guide-shot--${screen}`}>
      <div className="assessment-editor__guide-window">
        <span />
        <span />
        <span />
      </div>
      <div className="assessment-editor__guide-topbar">
        <div>
          <small>Template status</small>
          <strong>{issueCount === 0 ? 'Ready to save' : 'Needs review'}</strong>
        </div>
        <div>
          <small>Total score</small>
          <strong>{totalScore} pts</strong>
        </div>
      </div>
      <div className="assessment-editor__guide-canvas">
        <div className="assessment-editor__guide-header-shell">
          <div className="assessment-editor__guide-title-shell">
            <div className="assessment-editor__workspace-title-meta">
              <span className="assessment-editor__workspace-kicker">Assessment name</span>
              <span className="assessment-editor__workspace-editable">Editable</span>
            </div>
            <div className="assessment-editor__workspace-title-field">
              <span className="assessment-editor__guide-back" />
              <div className="assessment-editor__title-input assessment-editor__title-input--distinguished assessment-editor__guide-title-input">
                Module quiz template
              </div>
            </div>
          </div>
          <div className="assessment-editor__header-helper-group assessment-editor__guide-helper-shell">
            <span className="assessment-editor__header-score">
              <span>Total score</span>
              <strong>{totalScore} pts</strong>
            </span>
            <span className="assessment-editor__icon-action assessment-editor__guide-icon" />
            <span className="assessment-editor__icon-action assessment-editor__guide-icon" />
          </div>
        </div>
        <div className="assessment-editor__header-tabbar assessment-editor__guide-tabbar">
          <span className={`assessment-editor__header-tab ${screen === 'overview' ? 'is-active' : ''}`}>Settings</span>
          <span className={`assessment-editor__header-tab ${screen === 'delivery' ? 'is-active' : ''}`}>Template</span>
        </div>
        <div className={`assessment-editor__guide-scene assessment-editor__guide-scene--${screen}`}>
          {screen === 'overview' ? (
            <div className="assessment-editor__guide-summary">
              <div>
                <strong>Header actions</strong>
                <p>Title, score, helper buttons, preview, and save stay together in one top bar.</p>
              </div>
              <div>
                <strong>Open issues</strong>
                <p>{issueCount} checklist item{issueCount === 1 ? '' : 's'} to review.</p>
              </div>
            </div>
          ) : null}
          {screen === 'build' ? (
            <div className="assessment-editor__guide-question-card">
              <div className="assessment-editor__guide-question-head">
                <span>Q1</span>
                <span>CHOICE</span>
              </div>
              <div className="assessment-editor__guide-option-list">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          {screen === 'delivery' ? (
            <div className="assessment-editor__guide-form-grid">
              <div className="assessment-editor__guide-field">
                <span>Assessment format</span>
                <strong>Question or file upload</strong>
              </div>
              <div className="assessment-editor__guide-field">
                <span>Template defaults</span>
                <strong>Attempts, score, randomize</strong>
              </div>
            </div>
          ) : null}
          {screen === 'review' ? (
            <div className="assessment-editor__guide-checklist-preview">
              <div>
                <strong>Template checklist</strong>
                <p>Use the warning button to resolve missing title, questions, and template defaults.</p>
              </div>
              <ul>
                <li>Review the checklist first</li>
                <li>Preview the learner flow</li>
                <li>Save when the required items are clear</li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplateAssessmentEditorPage() {
  const params = useParams<{ id: string; assessmentKey: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');
  const assessmentKey = String(params?.assessmentKey ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<AssessmentComposerSaveState>('saved');
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('settings');
  const [addQuestionDialogOpen, setAddQuestionDialogOpen] = useState(false);
  const [insertAfterQuestionIndex, setInsertAfterQuestionIndex] = useState<number | null>(null);
  const [hideFloatingAdd, setHideFloatingAdd] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const [title, setTitle] = useState('Untitled Assessment');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState<string>('quiz');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [questions, setQuestions] = useState<AssessmentComposerQuestionDraft[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionDetailsOpen, setQuestionDetailsOpen] = useState(false);

  const assessmentIndex = useMemo(
    () => (assessmentKey === 'new' ? -1 : resolveIndexKey(assessmentKey)),
    [assessmentKey],
  );

  const initializedDraftRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const lastQuestionAssessmentTypeRef = useRef('quiz');
  const questionListBottomRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const selectedQuestion = useMemo(
    () => questions.find((entry) => entry.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        const cached = readTemplateEditorDraft(templateId);

        if (!mounted) return;

        setTemplate(workspace.template);
        setModules(cached?.modules ?? workspace.state.modules);
        setAssessments(cached?.assessments ?? workspace.state.assessments);
        setAnnouncements(cached?.announcements ?? workspace.state.announcements);
      } catch {
        toast.error('Failed to load assessment studio');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (loading) return;

    const existing = assessmentIndex >= 0 ? assessments[assessmentIndex] : undefined;
    const fallbackAssessment = createTemplateAssessmentDraft(
      assessmentIndex >= 0 ? assessmentIndex + 1 : assessments.length + 1,
    );
    const sourceAssessment = existing ?? fallbackAssessment;
    const normalizedQuestions = (sourceAssessment.questions ?? [])
      .slice()
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map(normalizeTemplateQuestion);
    const nextType = sourceAssessment.type ?? 'quiz';

    setTitle(sourceAssessment.title || 'Untitled Assessment');
    setDescription(sourceAssessment.description ?? '');
    setAssessmentType(nextType);
    if (nextType !== 'file_upload') {
      lastQuestionAssessmentTypeRef.current = nextType;
    }
    setMaxAttempts(sourceAssessment.settings?.maxAttempts ?? 1);
    setPassingScore(sourceAssessment.settings?.passingScore ?? 60);
    setRandomizeQuestions(Boolean(sourceAssessment.settings?.randomizeQuestions));
    setCloseWhenDue(Boolean(sourceAssessment.settings?.closeWhenDue));
    setQuestions(normalizedQuestions);
    setSelectedQuestionId(normalizedQuestions[0]?.id ?? null);
    initializedDraftRef.current = false;
  }, [assessmentIndex, assessments, loading]);

  useEffect(() => {
    if (assessmentType !== 'file_upload') {
      lastQuestionAssessmentTypeRef.current = assessmentType;
    }
  }, [assessmentType]);

  useEffect(() => {
    const observerTarget = questionListBottomRef.current;
    if (!observerTarget || assessmentType === 'file_upload') return;

    const observer = new IntersectionObserver(
      (entries) => {
        setHideFloatingAdd(Boolean(entries[0]?.isIntersecting));
      },
      { root: null, threshold: 0.12 },
    );
    observer.observe(observerTarget);
    return () => observer.disconnect();
  }, [assessmentType, previewEnabled, questions.length]);

  const questionPointsTotal = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );
  const totalScore = assessmentType === 'file_upload' ? FILE_UPLOAD_FIXED_SCORE : questionPointsTotal;

  const draftPayload = useMemo<ClassTemplateAssessment>(() => {
    const safeTitle = title.trim() || 'Untitled Assessment';
    const normalizedQuestions: ClassTemplateQuestion[] = questions.map((question, index) => ({
      id: question.id.startsWith('temp-') ? undefined : question.id,
      type: question.type,
      content: question.content || `Question ${index + 1}`,
      points: Number(question.points) || 1,
      order: index + 1,
      isRequired: question.isRequired,
      explanation: question.explanation || undefined,
      imageUrl: question.imageUrl || undefined,
      imageDisplayMode: question.imageDisplayMode || 'default',
      imageZoom: question.imageZoom ?? 100,
      imagePositionX: question.imagePositionX ?? 50,
      imagePositionY: question.imagePositionY ?? 50,
      options:
        supportsAssessmentComposerOptions(question.type) || question.type === 'fill_blank'
          ? normalizeOptionsForQuestionType(question.type, question.options)
          : [],
    }));

    return {
      id: assessmentIndex >= 0 ? assessments[assessmentIndex]?.id : undefined,
      title: safeTitle,
      description,
      type: assessmentType,
      totalPoints: assessmentType === 'file_upload' ? FILE_UPLOAD_FIXED_SCORE : questionPointsTotal,
      settings: {
        maxAttempts,
        passingScore,
        randomizeQuestions,
        closeWhenDue,
      },
      order:
        assessmentIndex >= 0
          ? assessments[assessmentIndex]?.order ?? assessmentIndex + 1
          : assessments.length + 1,
      questions: normalizedQuestions,
    };
  }, [
    assessmentIndex,
    assessmentType,
    assessments,
    closeWhenDue,
    description,
    maxAttempts,
    passingScore,
    questionPointsTotal,
    questions,
    randomizeQuestions,
    title,
  ]);

  const serializedDraft = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        assessmentType,
        totalScore,
        maxAttempts,
        passingScore,
        randomizeQuestions,
        closeWhenDue,
        questions,
      }),
    [
      assessmentType,
      closeWhenDue,
      description,
      maxAttempts,
      passingScore,
      questions,
      randomizeQuestions,
      title,
      totalScore,
    ],
  );

  useEffect(() => {
    if (loading || !templateId) return;

    if (!initializedDraftRef.current) {
      initializedDraftRef.current = true;
      lastSavedFingerprintRef.current = serializedDraft;
      setSaveState('saved');
      return;
    }

    if (serializedDraft === lastSavedFingerprintRef.current) {
      return;
    }

    setSaveState('dirty');
    const handle = window.setTimeout(() => {
      try {
        setSaveState('saving');
        const nextAssessments = upsertTemplateAssessment(
          assessments,
          assessmentIndex,
          draftPayload,
        );
        writeTemplateEditorDraft(templateId, {
          modules,
          assessments: nextAssessments,
          announcements,
        });
        lastSavedFingerprintRef.current = serializedDraft;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 700);

    return () => window.clearTimeout(handle);
  }, [
    announcements,
    assessmentIndex,
    assessments,
    draftPayload,
    loading,
    modules,
    serializedDraft,
    templateId,
  ]);

  const openPanelTab = (tab: RightTab) => {
    setRightTab(tab);
    setPanelOpen(true);
  };

  const handleAddQuestion = (type: QuestionType, afterIndex: number | null = null) => {
    if (assessmentType === 'file_upload') {
      toast.info('Switch to Question Assessment mode to add questions.');
      return;
    }

    const question = createAssessmentComposerQuestion(type, questions.length + 1);
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
    setInsertAfterQuestionIndex(afterIndex);
    setAddQuestionDialogOpen(true);
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const fromIndex = questions.findIndex((question) => question.id === questionId);
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    if (toIndex >= questions.length) return;

    setQuestions((current) => reorderAssessmentComposerQuestions(current, fromIndex, toIndex));
  };

  const handleDuplicateQuestion = (questionId: string) => {
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
    setConfirmation({
      title: 'Delete question?',
      description: 'This question will be removed from the template assessment draft.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        const nextState = deleteAssessmentComposerQuestion(questions, questionId, selectedQuestionId);
        setQuestions(nextState.questions);
        setSelectedQuestionId(nextState.nextSelectedQuestionId);
      },
    });
  };

  const handleUploadQuestionImage = async (questionId: string, file: File) => {
    try {
      const response = await classTemplateService.uploadAssessmentImage(templateId, file);
      setQuestions((current) =>
        current.map((entry) =>
          entry.id === questionId
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
  };

  const handleUploadOptionImage = async (questionId: string, optionId: string, file: File) => {
    try {
      const response = await classTemplateService.uploadAssessmentImage(templateId, file);
      setQuestions((current) =>
        current.map((entry) =>
          entry.id === questionId
            ? {
                ...entry,
                options: entry.options.map((option) =>
                  option.id === optionId
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
  };

  const handleSave = async () => {
    if (saving) return;
    if (!title.trim()) {
      toast.error('Assessment title is required');
      return;
    }

    if (assessmentType !== 'file_upload' && questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    try {
      if (assessmentType !== 'file_upload') {
        validateTemplateQuestions(questions);
      }

      setSaving(true);
      setSaveState('saving');
      const nextAssessments = upsertTemplateAssessment(assessments, assessmentIndex, draftPayload);
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules,
        assessments: nextAssessments,
        announcements,
      });

      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      lastSavedFingerprintRef.current = serializedDraft;
      setSaveState('saved');
      toast.success('Assessment saved');
      router.push(`/dashboard/admin/class-templates/${templateId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save assessment';
      setSaveState('error');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const backHref = `/dashboard/admin/class-templates/${templateId}`;
  const saveStateMeta: { label: string; className: string } = (() => {
    if (saveState === 'saving') {
      return { label: 'Saving', className: 'border-amber-200 bg-amber-50 text-amber-700' };
    }
    if (saveState === 'dirty') {
      return { label: 'Unsaved', className: 'border-slate-200 bg-slate-100 text-slate-700' };
    }
    if (saveState === 'error') {
      return { label: 'Retry needed', className: 'border-rose-200 bg-rose-50 text-rose-700' };
    }
    return { label: 'Saved', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  })();
  const templateSetupIssues = useMemo<TemplateSetupIssue[]>(() => {
    const issues: TemplateSetupIssue[] = [];

    if (!title.trim()) {
      issues.push({
        id: 'missing-title',
        title: 'Add an assessment title',
        description: 'Templates should have a clear title before they are saved or reused in a class.',
        section: 'basics',
        severity: 'required',
        actionLabel: 'Open title',
      });
    }

    if (!description.trim()) {
      issues.push({
        id: 'missing-description',
        title: 'Add template instructions',
        description: 'A short description helps future teachers understand what this assessment is for.',
        section: 'basics',
        severity: 'recommended',
        actionLabel: 'Open title',
      });
    }

    if (assessmentType !== 'file_upload') {
      if (questions.length === 0) {
        issues.push({
          id: 'missing-questions',
          title: 'Add at least one question',
          description: 'Question templates need at least one item before they can be reused in a class.',
          section: 'content',
          severity: 'required',
          actionLabel: 'Open content',
        });
      }

      questions.forEach((question, index) => {
        getTemplateQuestionValidationIssues(question, index).forEach((issue, issueIndex) => {
          issues.push({
            id: `question-${index + 1}-${issueIndex}`,
            title: issue.title,
            description: issue.description,
            section: 'content',
            severity: 'required',
            actionLabel: 'Open content',
          });
        });
      });
    }

    if (assessmentType !== 'file_upload' && (maxAttempts < 1 || passingScore < 1)) {
      issues.push({
        id: 'review-template-defaults',
        title: 'Review template defaults',
        description: 'Check the saved defaults so generated class assessments start with sensible rules.',
        section: 'settings',
        severity: 'recommended',
        actionLabel: 'Open settings',
      });
    }

    if (issues.some((issue) => issue.severity === 'required')) {
      issues.push({
        id: 'review-before-save',
        title: 'Resolve the required checklist items',
        description: 'Clear the required items first, then preview and save the assessment template.',
        section: 'review',
        severity: 'recommended',
        actionLabel: 'Open checklist',
      });
    }

    return issues;
  }, [assessmentType, description, maxAttempts, passingScore, questions, title]);
  const requiredTemplateSetupIssues = templateSetupIssues.filter((issue) => issue.severity === 'required');
  const warningButtonLabel =
    templateSetupIssues.length > 0
      ? `Open assessment setup checklist. ${templateSetupIssues.length} item${templateSetupIssues.length === 1 ? '' : 's'} need review.`
      : 'Open assessment setup checklist. No issues found.';
  const groupedTemplateSetupIssues = useMemo(() => ({
    basics: templateSetupIssues.filter((issue) => issue.section === 'basics'),
    content: templateSetupIssues.filter((issue) => issue.section === 'content'),
    settings: templateSetupIssues.filter((issue) => issue.section === 'settings'),
    review: templateSetupIssues.filter((issue) => issue.section === 'review'),
  }), [templateSetupIssues]);
  const templateGuidePages = useMemo<TemplateGuidePage[]>(() => [
    {
      title: 'Start with the header',
      description: 'The admin template editor now follows the teacher structure: title first, tabs below it, and quick actions on the right.',
      screen: 'overview',
      reminder: 'Use the top bar first. It keeps the template title, checklist, preview, and save flow in one predictable place.',
      steps: [
        {
          action: 'Name the template',
          body: 'Set the assessment title in the large editable field so it is easy to spot in the template library.',
        },
        {
          action: 'Check the score pill',
          body: 'The total score stays visible in the header so you can review the assessment weight without scrolling.',
        },
      ],
    },
    {
      title: 'Build the assessment body',
      description: 'Question cards stay in the main canvas, just like on the teacher side, with add, move, duplicate, and delete actions.',
      screen: 'build',
      reminder: 'Keep the editing focus in the main canvas. Use preview only when you want to check the learner-facing flow.',
      steps: [
        {
          action: 'Add question',
          body: 'Use the floating add button or the quick-start area when the assessment is empty.',
        },
        {
          action: 'Edit in place',
          body: 'Question content, options, images, and points stay on the card instead of being split into a separate structure.',
        },
      ],
    },
    {
      title: 'Use the side tabs for template rules',
      description: 'Settings and Template stay as the admin-specific side tabs, but they now live under the same teacher-style top shell.',
      screen: 'delivery',
      reminder: 'Open Settings for format and defaults. Open Template for the class-template note and publishing context.',
      steps: [
        {
          action: 'Settings',
          body: 'Use this tab for assessment format, attempts, passing score, and other defaults.',
        },
        {
          action: 'Template',
          body: 'Use this tab for template-only guidance so admins know what carries over to live class assessments later.',
        },
      ],
    },
    {
      title: 'Use the checklist before saving',
      description: 'The warning button now mirrors the teacher workflow and lists what is still missing in plain language.',
      screen: 'review',
      reminder: 'If the checklist is clear, preview the assessment once and then use Save now.',
      steps: [
        {
          action: 'Warning button',
          body: 'Open the triangle button to review the missing title, question, or template-default issues.',
        },
        {
          action: 'Save now',
          body: 'Use Save now only after the required checklist items are resolved.',
        },
      ],
    },
  ], []);

  const focusTemplateSection = (section: TemplateSetupSectionId) => {
    setWarningOpen(false);
    if (section === 'basics') {
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (section === 'settings') {
      openPanelTab('settings');
      return;
    }
    if (section === 'review') {
      return;
    }
    setPreviewEnabled(false);
    questionListBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[42rem] rounded-xl" />
      </div>
    );
  }

  const assessmentTypeSwitcher = (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        Assessment format
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
            assessmentType !== 'file_upload'
              ? 'border-sky-300 bg-sky-50 text-sky-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
          onClick={() => setAssessmentType(lastQuestionAssessmentTypeRef.current || 'quiz')}
        >
          Question Assessment
        </button>
        <button
          type="button"
          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
            assessmentType === 'file_upload'
              ? 'border-sky-300 bg-sky-50 text-sky-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
          onClick={() => {
            if (assessmentType !== 'file_upload') {
              lastQuestionAssessmentTypeRef.current = assessmentType || 'quiz';
            }
            setAssessmentType('file_upload');
          }}
        >
          File Upload Assessment
        </button>
      </div>
    </div>
  );

  const settingsContent = (
    <div className="space-y-5">
      {assessmentTypeSwitcher}

      <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
        <div>
          <p className="text-sm font-black text-slate-900">Template settings</p>
          <p className="text-sm text-slate-500">
            Configure the default rules this assessment should carry into generated classes.
          </p>
        </div>

        {assessmentType !== 'file_upload' ? (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Question assessment type
            </label>
            <select
              value={assessmentType}
              onChange={(event) => setAssessmentType(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800"
            >
              {QUESTION_ASSESSMENT_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Score is always 100 for file upload assessments.</p>
            <p className="mt-1">
              Teachers grade the latest submission out of 100. If they add a rubric later in a live class,
              it should still total 100.
            </p>
          </div>
        )}

        {assessmentType !== 'file_upload' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Max attempts
              </label>
              <Input
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(event) => setMaxAttempts(Number(event.target.value || 1))}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Passing score
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(event) => setPassingScore(Number(event.target.value || 0))}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/60 px-4 py-4">
          {assessmentType !== 'file_upload' ? (
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(event) => setRandomizeQuestions(event.target.checked)}
              />
              Randomize questions
            </label>
          ) : (
            <p className="text-sm text-slate-600">
              File upload templates keep only the due-date closure rule here. Timing, attempts, and grading details
              are handled on the live class assessment.
            </p>
          )}
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={closeWhenDue}
              onChange={(event) => setCloseWhenDue(event.target.checked)}
            />
            Close assessment when due
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Total: <strong>{assessmentType === 'file_upload' ? FILE_UPLOAD_FIXED_SCORE : questionPointsTotal} points</strong>
          {' '}across <strong>{assessmentType === 'file_upload' ? 'file upload mode' : `${questions.length} question${questions.length === 1 ? '' : 's'}`}</strong>
        </div>

        {assessmentType !== 'file_upload' ? (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Notes
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              className="rounded-2xl"
              placeholder="Add setup notes or guidance for teachers who will reuse this template assessment."
              minHeight={170}
            />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Upload instructions are edited directly in the main canvas for file upload assessments.
          </p>
        )}
      </div>
    </div>
  );

  const templateInfoContent = (
    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
      <div>
        <p className="text-sm font-black text-slate-900">Template context</p>
        <p className="text-sm text-slate-500">
          This assessment is embedded inside the template workspace, not stored as a live class assessment.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Template: <strong>{template?.name ?? 'Untitled Template'}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Subject: <strong>{template?.subjectCode ?? 'Unknown'}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Grade: <strong>{template?.subjectGradeLevel ?? 'Unknown'}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Status: <strong>{template?.status ?? 'draft'}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Template-safe parity</p>
        <p className="mt-2">
          This editor matches the teacher assessment flow and layout, but keeps template-only persistence.
          Class-specific scheduling, analytics, rubric workflows, and upload policy details still belong to live class assessments.
        </p>
      </div>
    </div>
  );

  return (
    <div className="assessment-editor assessment-editor--flattened px-4 pb-10 pt-3 lg:px-6">
      <header className="assessment-editor__header assessment-editor__header--sticky assessment-editor__workspace-header">
        <div className="assessment-editor__workspace-main">
          <div className="assessment-editor__workspace-title-block">
            <div className="assessment-editor__workspace-title-meta">
              <span className="assessment-editor__workspace-kicker">Assessment name</span>
              <span className="assessment-editor__workspace-editable">Editable</span>
            </div>
            <div className="assessment-editor__workspace-title-field">
              <button
                type="button"
                className="assessment-editor__back"
                aria-label="Back to template"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                    return;
                  }
                  router.push(backHref);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Input
                ref={titleInputRef}
                aria-label="Assessment title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="assessment-editor__title-input assessment-editor__title-input--distinguished"
                placeholder="Untitled assessment"
              />
            </div>
          </div>

          <div className="assessment-editor__header-tabbar" role="tablist" aria-label="Template assessment tools">
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
                panelOpen && rightTab === 'template' ? 'is-active' : ''
              }`}
              onClick={() => openPanelTab('template')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>
        </div>

        <div className="assessment-editor__workspace-side">
          <div className="assessment-editor__header-helper-group">
            <div className="assessment-editor__header-score" aria-label={`Total score ${totalScore} points`}>
              <span>Total score</span>
              <strong>{totalScore} pts</strong>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`assessment-editor__icon-action ${
                templateSetupIssues.length > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
              onClick={() => setWarningOpen(true)}
              aria-label={warningButtonLabel}
            >
              <AlertTriangle className="h-4 w-4" />
              {templateSetupIssues.length > 0 ? (
                <span className="assessment-editor__icon-badge">{templateSetupIssues.length}</span>
              ) : null}
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
              aria-label="Template assessment guide"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </div>

          <div className="assessment-editor__header-publish-group">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${saveStateMeta.className}`}>
              {saveStateMeta.label}
            </span>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white"
              onClick={() => setPreviewEnabled((current) => !current)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {previewEnabled ? 'Back to edit' : 'Preview'}
            </Button>
            <Button
              type="button"
              className="assessment-editor__save-btn"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save now
            </Button>
          </div>
        </div>
      </header>

      <main className="mt-5 space-y-4">
        {assessmentType === 'file_upload' ? (
          <article className="space-y-6 rounded-[1.7rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.25)]">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">File Upload Assessment</h3>
              <p className="text-sm text-slate-500">
                Students upload a file instead of answering question cards. Existing questions stay preserved
                if you switch back to a question assessment later.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Upload instructions
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  className="rounded-2xl"
                  placeholder="Explain what teachers and students should submit once this template is used in a class."
                  minHeight={220}
                />
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                <div>
                  <p className="text-sm font-black text-slate-900">Template-safe file mode</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload limits, accepted file types, attachments, and release timing are configured later
                    on the live class assessment.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Current defaults</p>
                  <p className="mt-2">Score: 100 points</p>
                  <p>Grading target: latest submission only</p>
                  <p>{closeWhenDue ? 'Closes when due' : 'Stays open until class rules change'}</p>
                </div>
              </div>
            </div>
          </article>
        ) : previewEnabled ? (
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
                            handleMoveQuestion(question.id, 'up');
                          }}
                          disabled={!canMoveUp}
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
                            handleMoveQuestion(question.id, 'down');
                          }}
                          disabled={!canMoveDown}
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
                          {supportsAssessmentComposerOptions(question.type) && question.options.length > 0 ? (
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
        )}
      </main>

      {assessmentType !== 'file_upload' && questions.length > 0 && !hideFloatingAdd ? (
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
              Choose the next question type for this template assessment.
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
              Keep explanation text in a separate surface so the main editor stays focused on the prompt, options, and images.
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
                  placeholder="Explanation or author note"
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
              The admin template editor now follows the teacher structure. Read this one page at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>
              Page {helpPage + 1} of {templateGuidePages.length}
            </span>
            <div>
              {templateGuidePages.map((page, index) => (
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
            <AdminTemplateAssessmentGuideShot
              screen={templateGuidePages[helpPage].screen}
              issueCount={templateSetupIssues.length}
              totalScore={totalScore}
            />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Template instruction manual</p>
              <h3>{templateGuidePages[helpPage].title}</h3>
              <p>{templateGuidePages[helpPage].description}</p>
              <div className="route-guide-steps">
                {templateGuidePages[helpPage].steps.map((step, index) => (
                  <div key={`${step.action}-${step.body}`} className="route-guide-step">
                    <span className="route-guide-step__index">{index + 1}</span>
                    <div>
                      <strong>{step.action}</strong>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="teacher-intervention-workspace__manual-reminder">
                {templateGuidePages[helpPage].reminder}
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
                if (helpPage === templateGuidePages.length - 1) {
                  setHelpOpen(false);
                  return;
                }
                setHelpPage((current) => Math.min(current + 1, templateGuidePages.length - 1));
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
              Review the same checklist flow used on the teacher side before saving this template.
            </DialogDescription>
          </DialogHeader>

          <div className="assessment-editor__warning-summary-line">
            <span>
              <strong>{requiredTemplateSetupIssues.length}</strong> required
            </span>
            <span>
              <strong>{templateSetupIssues.length - requiredTemplateSetupIssues.length}</strong> recommended
            </span>
          </div>

          <div className="assessment-editor__warning-groups assessment-editor__warning-groups--plain">
            {[
              { id: 'basics', title: 'Basics' },
              { id: 'content', title: 'Content' },
              { id: 'settings', title: 'Template settings' },
              { id: 'review', title: 'Final review' },
            ].map((section) =>
              groupedTemplateSetupIssues[section.id as TemplateSetupSectionId].length > 0 ? (
                <section key={section.id} className="assessment-editor__warning-group">
                  <div className="assessment-editor__warning-group-head">
                    <p className="assessment-editor__kicker">{section.title}</p>
                    <span>
                      {groupedTemplateSetupIssues[section.id as TemplateSetupSectionId].length} item
                      {groupedTemplateSetupIssues[section.id as TemplateSetupSectionId].length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ol className="assessment-editor__warning-list" role="list">
                    {groupedTemplateSetupIssues[section.id as TemplateSetupSectionId].map((issue) => (
                      <li key={issue.id} className="assessment-editor__warning-line" data-severity={issue.severity}>
                        <button
                          type="button"
                          className="assessment-editor__warning-item assessment-editor__warning-item--plain"
                          data-severity={issue.severity}
                          onClick={() => focusTemplateSection(issue.section)}
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

      <div className={`fixed inset-0 z-40 transition ${panelOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close panel"
          className={`absolute inset-0 bg-slate-900/35 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setPanelOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-[440px] border-l border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_28px_54px_-36px_rgba(15,23,42,0.42)] transition-transform duration-300 ${
            panelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">
              {rightTab === 'settings' ? 'Settings' : 'Template'}
            </h3>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100%-56px)] overflow-y-auto pr-1">
            {rightTab === 'settings' ? settingsContent : templateInfoContent}
          </div>
        </aside>
      </div>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
