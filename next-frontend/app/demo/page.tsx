'use client';

import Image from 'next/image';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, ListChecks, Sparkles, Volume2, VolumeX, RotateCcw, ArrowRight, ArrowLeft, Bot, BookOpen, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SharedAnswerInput } from '@/components/assessment/shared-answer-input';
import { SharedQuestionNavigator } from '@/components/assessment/shared-question-navigator';
import { createInitialDemoState, advanceDemoState, determineOutcomeBand } from '@/lib/demo-engine';
import { getDemoSubject } from '@/lib/demo-content';
import { generateDemoAiPlan } from '@/services/demo-ai-plan-service';
import { useDemoSfx } from '@/hooks/use-demo-sfx';
import type { DemoAiPlan, DemoQuestion, DemoSceneId, DemoState, DemoSubjectTrack } from '@/types/demo';
import './demo.css';

const STORAGE_KEY = 'nexora.demo.state.v1';
type LessonTab = 'explain' | 'example' | 'try_it' | 'sources';

function loadInitialState(): DemoState {
  if (typeof window === 'undefined') return createInitialDemoState();
  const saved = window.sessionStorage.getItem(STORAGE_KEY);
  if (!saved) return createInitialDemoState();
  try {
    const parsed = JSON.parse(saved) as DemoState;
    return { ...createInitialDemoState(), ...parsed };
  } catch {
    return createInitialDemoState();
  }
}

function scoreFromAnswers(questions: DemoQuestion[], answers: Record<string, string>): number {
  if (questions.length === 0) return 0;
  const correct = questions.reduce((acc, question) => {
    const selected = answers[question.id];
    if (!selected) return acc;
    return Number(selected) === question.correctIndex ? acc + 1 : acc;
  }, 0);
  return Math.round((correct / questions.length) * 100);
}

function deriveWeakConcepts(questions: DemoQuestion[], answers: Record<string, string>): string[] {
  const concepts = new Set<string>();
  questions.forEach((question) => {
    const picked = answers[question.id];
    if (picked === undefined || Number(picked) === question.correctIndex) return;
    if (/main idea|summary|paragraph|context clue/i.test(question.prompt)) {
      concepts.add('Reading comprehension and paragraph coherence');
    } else if (/variable|ecosystem|cell|scientific/i.test(question.prompt)) {
      concepts.add('Scientific reasoning and concept transfer');
    } else {
      concepts.add('Assessment reasoning and evidence usage');
    }
  });
  return Array.from(concepts).slice(0, 4);
}

function sceneProgress(scene: DemoSceneId): number {
  const map: Record<DemoSceneId, number> = {
    intro: 8,
    subject_select: 16,
    module_lessons: 32,
    module_quiz: 48,
    quarter_exam: 62,
    outcome: 72,
    teacher_plan: 82,
    lxp_session: 90,
    completed_high: 100,
    completed_pass: 100,
    completed_fail: 100,
  };
  return map[scene] ?? 0;
}

function targetForScene(scene: DemoSceneId): string {
  switch (scene) {
    case 'intro':
      return 'Click Start Demo to begin the guided journey.';
    case 'subject_select':
      return 'Choose a subject track to enter the student simulation.';
    case 'module_lessons':
      return 'Review this lesson tab-by-tab, then continue.';
    case 'module_quiz':
      return 'Answer each question and submit the module assessment.';
    case 'quarter_exam':
      return 'Complete the quarter exam. This decides your branch.';
    case 'outcome':
      return 'Continue to your next branch based on the score.';
    case 'teacher_plan':
      return 'Generate and review an AI remediation plan.';
    case 'lxp_session':
      return 'Take the LXP remediation assessment.';
    default:
      return 'Review the final summary and reset to replay.';
  }
}

function formatBand(score: number): string {
  const band = determineOutcomeBand(score);
  if (band === 'excellent') return 'Excellent Job';
  if (band === 'good') return 'Good Job';
  return 'Nice Try';
}

function DemoAssessmentStage({
  title,
  subtitle,
  questions,
  scene,
  onSubmit,
  highlighted,
  sfx,
}: {
  title: string;
  subtitle: string;
  questions: DemoQuestion[];
  scene: DemoSceneId;
  onSubmit: (payload: { scorePercent: number; answers: Record<string, string> }) => void;
  highlighted: boolean;
  sfx: ReturnType<typeof useDemoSfx>;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startedAtMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const durationSeconds = scene === 'quarter_exam' ? 15 * 60 : scene === 'lxp_session' ? 8 * 60 : 6 * 60;
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== '').length,
    [answers, questions],
  );
  const progressValue = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const current = questions[currentIdx];
  const currentAnswered = Boolean(answers[current?.id ?? '']);

  if (!current) return <p className="demo-muted">No questions available.</p>;

  return (
    <div className="demo-stage">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className="demo-assessment-shell">
        <div className="demo-assessment-head">
          <div>
            <p className="demo-assessment-title">{title}</p>
            <p className="demo-muted">Question {currentIdx + 1} of {questions.length}</p>
          </div>
          <div className="demo-chip-row">
            <Badge variant="secondary" className="demo-chip">
              <ListChecks className="h-3.5 w-3.5" />
              {answeredCount}/{questions.length} answered
            </Badge>
            <Badge variant="secondary" className="demo-chip">
              <Clock3 className="h-3.5 w-3.5" />
              {Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:
              {(remainingSeconds % 60).toString().padStart(2, '0')}
            </Badge>
          </div>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="demo-assessment-grid">
          <div className="demo-assessment-card">
            <div className="demo-question-meta">
              <Badge variant="outline">multiple choice</Badge>
              <Badge variant="secondary">1 pt</Badge>
            </div>
            <h3>{current.prompt}</h3>
            <div className="demo-answer-wrap">
              <SharedAnswerInput
                question={{
                  id: current.id,
                  type: 'multiple_choice',
                  options: current.options.map((option, optionIndex) => ({
                    id: String(optionIndex),
                    text: option,
                  })),
                }}
                value={answers[current.id]}
                onChange={(value) => {
                  sfx.playClick();
                  if (Array.isArray(value)) return;
                  setAnswers((prev) => ({ ...prev, [current.id]: value }));
                }}
              />
            </div>
            <div className="demo-assessment-actions">
              <Button
                variant="outline"
                disabled={currentIdx === 0}
                onClick={() => {
                  sfx.playClick();
                  setCurrentIdx((prev) => Math.max(0, prev - 1));
                }}
              >
                Previous
              </Button>
              {currentIdx < questions.length - 1 ? (
                <Button
                  className="demo-button demo-button-primary"
                  disabled={!currentAnswered}
                  onClick={() => {
                    sfx.playTransition();
                    setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1));
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  className={`demo-button demo-button-primary ${highlighted ? 'demo-target' : ''}`}
                  disabled={!currentAnswered}
                  onClick={() => {
                    sfx.playClick();
                    setShowConfirm(true);
                  }}
                >
                  Submit Assessment
                </Button>
              )}
            </div>
            {!currentAnswered ? (
              <p className="demo-answer-required">Please select an answer before continuing.</p>
            ) : null}
          </div>
          <div className="demo-assessment-side">
            <SharedQuestionNavigator
              questionIds={questions.map((question) => question.id)}
              currentIdx={currentIdx}
              answeredById={Object.fromEntries(
                questions.map((question) => [question.id, Boolean(answers[question.id])]),
              )}
              navigationLocked={false}
              onNavigate={(index) => {
                if (index > currentIdx && !currentAnswered) return;
                sfx.playClick();
                setCurrentIdx(index);
              }}
            />
          </div>
        </div>
      </div>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              You answered {answeredCount} of {questions.length} items. You can still review before final submit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Keep Working
            </Button>
            <Button
              className="demo-button demo-button-primary"
              onClick={() => {
                const scorePercent = scoreFromAnswers(questions, answers);
                sfx.playSuccess();
                setShowConfirm(false);
                onSubmit({ scorePercent, answers });
              }}
            >
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DemoPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(advanceDemoState, undefined, loadInitialState);
  const [activeLessonTab, setActiveLessonTab] = useState<LessonTab>('explain');
  const [miniCheckSelection, setMiniCheckSelection] = useState<number | null>(null);
  const [miniCheckFeedback, setMiniCheckFeedback] = useState<string>('');
  const [quarterExamAnswers, setQuarterExamAnswers] = useState<Record<string, string>>({});
  const [planDraft, setPlanDraft] = useState<DemoAiPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const sfx = useDemoSfx(Boolean(reduceMotion));

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    setActiveLessonTab('explain');
    setMiniCheckSelection(null);
    setMiniCheckFeedback('');
  }, [state.moduleIndex, state.lessonIndex, state.scene]);

  useEffect(() => {
    setPlanDraft(state.aiPlan);
  }, [state.aiPlan]);

  const subject = useMemo(() => getDemoSubject(state.subjectId), [state.subjectId]);
  const moduleEntry = subject?.modules[state.moduleIndex] ?? null;
  const lesson = moduleEntry?.lessons[state.lessonIndex] ?? null;
  const timeline = [
    'intro',
    'subject_select',
    'module_lessons',
    'module_quiz',
    'quarter_exam',
    'outcome',
    'teacher_plan',
    'lxp_session',
    'completed_high',
    'completed_pass',
    'completed_fail',
  ] as DemoSceneId[];
  const highlighted = (scene: DemoSceneId) => state.scene === scene;

  const handleReset = () => {
    sfx.playClick();
    dispatch({ type: 'reset_demo' });
    window.sessionStorage.removeItem(STORAGE_KEY);
    setPlanDraft(null);
    setQuarterExamAnswers({});
  };

  const handleBack = () => {
    sfx.playClick();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  const handleQuarterSubmit = (payload: { scorePercent: number; answers: Record<string, string> }) => {
    setQuarterExamAnswers(payload.answers);
    dispatch({ type: 'submit_quarter_exam', scorePercent: payload.scorePercent });
  };

  const renderScene = () => {
    if (state.scene === 'intro') {
      return (
        <div className="demo-stage">
          <p className="demo-kicker">Nexora Guided Demo</p>
          <h2>LMS + LXP + AI Guided Journey</h2>
          <p>
            This public walkthrough simulates the student learning path, branching exam outcomes, teacher-side AI
            planning, and remediation loop while keeping official records untouched.
          </p>
          <div className="demo-hero-art">
            <Image src="/images/JA/ja_wave.png" alt="JA welcoming" width={240} height={240} priority />
          </div>
          <Button
            className={`demo-button demo-button-primary ${highlighted('intro') ? 'demo-target' : ''}`}
            onClick={() => {
              sfx.playTransition();
              dispatch({ type: 'begin_demo' });
            }}
          >
            Start Demo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (state.scene === 'subject_select') {
      return (
        <div className="demo-stage">
          <p className="demo-kicker">Student Simulation</p>
          <h2>Choose a Subject Track</h2>
          <p>Pick one subject. Each track includes three modules, three lessons per module, and a quarter exam.</p>
          <div className="demo-subject-grid">
            {(['english', 'science'] as DemoSubjectTrack['id'][]).map((subjectId) => {
              const track = getDemoSubject(subjectId);
              if (!track) return null;
              return (
                <button
                  key={track.id}
                  type="button"
                  className={`demo-subject ${highlighted('subject_select') ? 'demo-target' : ''}`}
                  onClick={() => {
                    sfx.playTransition();
                    dispatch({ type: 'select_subject', subjectId: track.id });
                  }}
                >
                  <strong>{track.label}</strong>
                  <span>{track.overview}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (state.scene === 'module_lessons' && moduleEntry && lesson) {
      return (
        <div className="demo-stage">
          <p className="demo-kicker">{moduleEntry.title}</p>
          <h2>{lesson.title}</h2>
          <p>{lesson.overview ?? lesson.summary}</p>
          <div className="demo-tab-row" role="tablist" aria-label="Lesson sections">
            <button type="button" className={`demo-tab ${activeLessonTab === 'explain' ? 'active' : ''}`} onClick={() => { sfx.playClick(); setActiveLessonTab('explain'); }}>Explain</button>
            <button type="button" className={`demo-tab ${activeLessonTab === 'example' ? 'active' : ''}`} onClick={() => { sfx.playClick(); setActiveLessonTab('example'); }}>Example</button>
            <button type="button" className={`demo-tab ${activeLessonTab === 'try_it' ? 'active' : ''}`} onClick={() => { sfx.playClick(); setActiveLessonTab('try_it'); }}>Try It</button>
            <button type="button" className={`demo-tab ${activeLessonTab === 'sources' ? 'active' : ''}`} onClick={() => { sfx.playClick(); setActiveLessonTab('sources'); }}>Sources</button>
          </div>
          {activeLessonTab === 'explain' && (
            <div className="demo-lesson-panel">
              <h3>Learning Objectives</h3>
              <ul>{(lesson.learningObjectives ?? []).map((objective) => (<li key={objective}>{objective}</li>))}</ul>
              <h3>Key Points</h3>
              <ul>{lesson.keyPoints.map((point) => (<li key={point}>{point}</li>))}</ul>
            </div>
          )}
          {activeLessonTab === 'example' && (
            <div className="demo-lesson-panel">
              <h3>{lesson.workedExample?.prompt}</h3>
              <p>{lesson.workedExample?.explanation}</p>
              <div className="demo-image-grid">
                {(lesson.imageBlocks ?? []).map((image) => (
                  <figure key={image.src} className="demo-image-card">
                    <Image src={image.src} alt={image.alt} width={640} height={360} unoptimized />
                    <figcaption>
                      <span>{image.caption}</span>
                      <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                        {image.sourceTitle}
                      </a>
                      <small>{image.license}</small>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          {activeLessonTab === 'try_it' && (
            <div className="demo-lesson-panel">
              <h3>{lesson.miniCheck?.prompt}</h3>
              <div className="demo-mini-options">
                {(lesson.miniCheck?.options ?? []).map((option, idx) => (
                  <button
                    key={option}
                    type="button"
                    className={`demo-mini-option ${miniCheckSelection === idx ? 'selected' : ''}`}
                    onClick={() => {
                      sfx.playClick();
                      setMiniCheckSelection(idx);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <Button
                className="demo-button demo-button-ghost"
                disabled={miniCheckSelection === null}
                onClick={() => {
                  if (miniCheckSelection === null || !lesson.miniCheck) return;
                  const passed = miniCheckSelection === lesson.miniCheck.correctIndex;
                  if (passed) sfx.playSuccess();
                  setMiniCheckFeedback(
                    passed ? `Correct: ${lesson.miniCheck.explanation}` : `Review: ${lesson.miniCheck.explanation}`,
                  );
                }}
              >
                Check Answer
              </Button>
              {miniCheckFeedback ? <p className="demo-mini-feedback">{miniCheckFeedback}</p> : null}
            </div>
          )}
          {activeLessonTab === 'sources' && (
            <div className="demo-lesson-panel">
              <h3>References</h3>
              <ul className="demo-source-list">
                {(lesson.citations ?? []).map((citation) => (
                  <li key={citation.url}>
                    <a href={citation.url} target="_blank" rel="noreferrer">
                      {citation.title}
                    </a>
                    <span>{citation.license}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button
            className={`demo-button demo-button-primary ${highlighted('module_lessons') ? 'demo-target' : ''}`}
            onClick={() => {
              sfx.playTransition();
              dispatch({ type: 'next_lesson', lessonCount: moduleEntry.lessons.length });
            }}
          >
            {state.lessonIndex + 1 < moduleEntry.lessons.length ? 'Next Lesson' : 'Go to Module Assessment'}
          </Button>
        </div>
      );
    }

    if (state.scene === 'module_quiz' && moduleEntry) {
      return (
        <DemoAssessmentStage
          key={moduleEntry.assessment.id}
          title={moduleEntry.assessment.title}
          subtitle="Complete the 5-item module check."
          questions={moduleEntry.assessment.questions}
          scene={state.scene}
          highlighted={highlighted('module_quiz')}
          sfx={sfx}
          onSubmit={({ scorePercent }) => {
            dispatch({ type: 'submit_module_assessment', scorePercent });
          }}
        />
      );
    }

    if (state.scene === 'quarter_exam' && subject) {
      return (
        <DemoAssessmentStage
          key={subject.quarterExam.id}
          title={subject.quarterExam.title}
          subtitle="This 15-item exam is harder and uses new items not reused from modules."
          questions={subject.quarterExam.questions}
          scene={state.scene}
          highlighted={highlighted('quarter_exam')}
          sfx={sfx}
          onSubmit={handleQuarterSubmit}
        />
      );
    }

    if (state.scene === 'outcome' && state.quarterExamScore !== null) {
      const highBranch = state.outcomeBand === 'excellent' || state.outcomeBand === 'good';
      return (
        <div className="demo-stage demo-outcome">
          <h2>{formatBand(state.quarterExamScore)}</h2>
          <p>
            Quarter exam score: <strong>{state.quarterExamScore}%</strong>
          </p>
          <p>
            {highBranch
              ? 'You passed this checkpoint. LXP remediation is not required, but the chatbot remains available for questions on covered modules.'
              : 'You are below the threshold. Continue to teacher simulation to generate an AI remediation plan.'}
          </p>
          <Image
            src={highBranch ? '/images/JA/ja_cheer.png' : '/images/JA/ja_thinking.png'}
            alt="JA reaction"
            width={220}
            height={220}
          />
          <Button
            className={`demo-button demo-button-primary ${highlighted('outcome') ? 'demo-target' : ''}`}
            onClick={() => {
              sfx.playTransition();
              dispatch({ type: 'continue_from_outcome' });
            }}
          >
            Continue Branch
          </Button>
        </div>
      );
    }

    if (state.scene === 'teacher_plan' && subject) {
      return (
        <div className="demo-stage">
          <p className="demo-kicker">Teacher Simulation</p>
          <h2>Generate AI Remediation Plan</h2>
          <p>
            Review low-performing areas, inspect generated questions, edit if needed, then apply to return to student
            LXP.
          </p>
          <div className="demo-teacher-metrics">
            <Badge variant="secondary">Quarter Exam: {state.quarterExamScore ?? 0}%</Badge>
            <Badge variant="secondary">Subject: {subject.label}</Badge>
          </div>
          <Button
            className={`demo-button demo-button-primary ${highlighted('teacher_plan') ? 'demo-target' : ''}`}
            disabled={isGeneratingPlan}
            onClick={async () => {
              sfx.playClick();
              setIsGeneratingPlan(true);
              try {
                const weakConcepts = deriveWeakConcepts(subject.quarterExam.questions, quarterExamAnswers);
                const plan = await generateDemoAiPlan({
                  subjectId: subject.id,
                  quarterExamScore: state.quarterExamScore ?? 0,
                  weakConcepts,
                  moduleScores: state.moduleAssessmentScores,
                });
                dispatch({ type: 'save_ai_plan', plan });
                setPlanDraft(plan);
                sfx.playSuccess();
              } finally {
                setIsGeneratingPlan(false);
              }
            }}
          >
            <Sparkles className="h-4 w-4" /> {isGeneratingPlan ? 'Generating...' : 'Create AI Plan'}
          </Button>
          {planDraft ? (
            <div className="demo-plan">
              <p className={`demo-plan-source ${planDraft.source === 'live' ? 'live' : 'fallback'}`}>
                {planDraft.source === 'live'
                  ? 'Live AI plan generated in real time.'
                  : 'Fallback plan generated because live AI is currently unavailable.'}
              </p>
              <div className="demo-plan-block">
                <h3>Teacher Summary</h3>
                <textarea
                  className="demo-input"
                  value={planDraft.teacherSummary}
                  onChange={(event) => setPlanDraft({ ...planDraft, teacherSummary: event.target.value })}
                />
              </div>
              <div className="demo-plan-block">
                <h3>Recommended Modules</h3>
                <ul>
                  {planDraft.recommendedModules.map((moduleTitle, index) => (
                    <li key={`${moduleTitle}-${index}`}>
                      <input
                        className="demo-input"
                        value={moduleTitle}
                        onChange={(event) => {
                          const next = [...planDraft.recommendedModules];
                          next[index] = event.target.value;
                          setPlanDraft({ ...planDraft, recommendedModules: next });
                        }}
                      />
                      <button
                        type="button"
                        className="demo-inline-remove"
                        onClick={() => {
                          const next = planDraft.recommendedModules.filter((_, itemIndex) => itemIndex !== index);
                          setPlanDraft({ ...planDraft, recommendedModules: next });
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="demo-plan-block">
                <h3>LXP Questions</h3>
                <ul>
                  {planDraft.lxpQuestions.map((question, index) => (
                    <li key={question.id}>
                      <textarea
                        className="demo-input"
                        value={question.prompt}
                        onChange={(event) => {
                          const next = [...planDraft.lxpQuestions];
                          next[index] = { ...question, prompt: event.target.value };
                          setPlanDraft({ ...planDraft, lxpQuestions: next });
                        }}
                      />
                      <button
                        type="button"
                        className="demo-inline-remove"
                        onClick={() => {
                          const next = planDraft.lxpQuestions.filter((_, itemIndex) => itemIndex !== index);
                          setPlanDraft({ ...planDraft, lxpQuestions: next });
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                className="demo-button demo-button-primary"
                disabled={planDraft.lxpQuestions.length === 0}
                onClick={() => {
                  sfx.playTransition();
                  dispatch({ type: 'apply_ai_plan', plan: planDraft });
                }}
              >
                Apply Plan and Start LXP
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    if (state.scene === 'lxp_session' && state.aiPlan) {
      return (
        <DemoAssessmentStage
          key={`lxp-${state.aiPlan.source}-${state.aiPlan.lxpQuestions.length}`}
          title="LXP Remediation Session"
          subtitle="Answer AI-selected remediation items. Passing score is 75%."
          questions={state.aiPlan.lxpQuestions}
          scene={state.scene}
          highlighted={highlighted('lxp_session')}
          sfx={sfx}
          onSubmit={({ scorePercent }) => {
            dispatch({ type: 'submit_lxp', scorePercent });
          }}
        />
      );
    }

    if (state.scene === 'completed_high') {
      return (
        <div className="demo-stage">
          <h2>Demo Completed: High Performance Path</h2>
          <p>You passed the exam branch. LXP was not required, and chatbot support remains available for module Q&A.</p>
          <Image src="/images/JA/ja_cheer.png" alt="JA celebrate" width={220} height={220} />
          <div className="demo-finish-actions">
            <Button className="demo-button demo-button-primary" onClick={handleReset}>
              Replay Demo
            </Button>
          </div>
        </div>
      );
    }

    if (state.scene === 'completed_pass') {
      return (
        <div className="demo-stage">
          <h2>Demo Completed: LXP Recovery Success</h2>
          <p>You improved through the teacher-guided AI remediation path and passed the LXP checkpoint.</p>
          <Image src="/images/JA/ja_cheer.png" alt="JA celebrate" width={220} height={220} />
          <div className="demo-finish-actions">
            <Button className="demo-button demo-button-primary" onClick={handleReset}>
              Replay Demo
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="demo-stage">
        <h2>Demo Completed: End of Theoretical Path</h2>
        <p>The demo ends here to emphasize that sustained student practice drives real outcomes.</p>
        <Image src="/images/JA/ja_sad.png" alt="JA final note" width={220} height={220} />
        <div className="demo-finish-actions">
          <Button className="demo-button demo-button-primary" onClick={handleReset}>
            Replay Demo
          </Button>
        </div>
      </div>
    );
  };

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <div>
          <h1>Nexora LXP + AI Guided Demo</h1>
          <p className="demo-muted">Public simulation only. No official academic records are modified.</p>
        </div>
        <div className="demo-header-actions">
          <Button variant="outline" className="demo-button demo-button-ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="outline" className="demo-button demo-button-ghost" onClick={() => sfx.toggle()}>
            {sfx.enabled ? (
              <>
                <Volume2 className="h-4 w-4" /> SFX On
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" /> SFX Off
              </>
            )}
          </Button>
          <Button variant="outline" className="demo-button demo-button-ghost" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" /> Reset Demo
          </Button>
        </div>
      </header>
      <section className="demo-layout">
        <aside className="demo-sidebar">
          <article className="demo-card">
            <p className="demo-kicker">Progress</p>
            <div className="demo-progress-track">
              <div className="demo-progress-fill" style={{ width: `${sceneProgress(state.scene)}%` }} />
            </div>
            <p className="demo-muted">{sceneProgress(state.scene)}% complete</p>
          </article>
          <article className="demo-card">
            <p className="demo-kicker">Flow Timeline</p>
            <ul className="demo-timeline">
              {timeline.map((scene) => (
                <li key={scene} className={scene === state.scene ? 'active' : ''}>
                  {scene.replaceAll('_', ' ')}
                </li>
              ))}
            </ul>
          </article>
          <article className="demo-card demo-guide" role="status" aria-live="polite">
            <Sparkles className="h-4 w-4" />
            <p>{targetForScene(state.scene)}</p>
          </article>
          <article className="demo-card demo-ja-art">
            <Image
              src={
                state.scene === 'teacher_plan'
                  ? '/images/JA/ja_thinking.png'
                  : state.scene.startsWith('completed')
                    ? '/images/JA/ja_cheer.png'
                    : '/images/JA/ja_wave.png'
              }
              alt="JA guide"
              width={160}
              height={160}
            />
            <div className="demo-ja-icons">
              <BookOpen className="h-4 w-4" />
              <Bot className="h-4 w-4" />
              <GraduationCap className="h-4 w-4" />
            </div>
          </article>
          {state.quarterExamScore !== null ? (
            <article className="demo-card">
              <p className="demo-kicker">Quarter Exam</p>
              <p className="demo-score">{state.quarterExamScore}%</p>
              <p className="demo-muted">Band: {formatBand(state.quarterExamScore)}</p>
            </article>
          ) : null}
          {state.lxpScore !== null ? (
            <article className="demo-card">
              <p className="demo-kicker">LXP Score</p>
              <p className="demo-score">{state.lxpScore}%</p>
              <p className="demo-muted">{state.lxpScore >= 75 ? 'Pass' : 'Needs more practice'}</p>
              {state.lxpScore >= 75 ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
            </article>
          ) : null}
        </aside>
        <article className="demo-card demo-main-stage">{renderScene()}</article>
      </section>
    </main>
  );
}
