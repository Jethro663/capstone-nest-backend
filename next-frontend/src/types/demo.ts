export type DemoSceneId =
  | 'intro'
  | 'subject_select'
  | 'module_lessons'
  | 'module_quiz'
  | 'quarter_exam'
  | 'outcome'
  | 'teacher_plan'
  | 'lxp_session'
  | 'completed_high'
  | 'completed_pass'
  | 'completed_fail';

export type DemoOutcomeBand = 'excellent' | 'good' | 'nice_try';

export interface DemoQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DemoLesson {
  id: string;
  title: string;
  overview?: string;
  summary?: string;
  learningObjectives?: string[];
  keyPoints: string[];
  workedExample?: {
    prompt: string;
    explanation: string;
  };
  miniCheck?: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  imageBlocks?: Array<{
    src: string;
    alt: string;
    caption: string;
    sourceTitle: string;
    sourceUrl: string;
    license: string;
  }>;
  citations?: Array<{
    title: string;
    url: string;
    license: string;
  }>;
}

export interface DemoModule {
  id: string;
  title: string;
  lessons: DemoLesson[];
  assessment: {
    id: string;
    title: string;
    questions: DemoQuestion[];
  };
}

export interface DemoSubjectTrack {
  id: 'english' | 'science';
  label: string;
  overview: string;
  modules: DemoModule[];
  quarterExam: {
    id: string;
    title: string;
    questions: DemoQuestion[];
  };
}

export interface DemoAiPlan {
  source: 'live' | 'fallback';
  weakConcepts: string[];
  recommendedModules: string[];
  teacherSummary: string;
  lxpQuestions: DemoQuestion[];
}

export interface DemoState {
  scene: DemoSceneId;
  subjectId: DemoSubjectTrack['id'] | null;
  moduleIndex: number;
  lessonIndex: number;
  moduleAssessmentScores: number[];
  quarterExamScore: number | null;
  outcomeBand: DemoOutcomeBand | null;
  aiPlan: DemoAiPlan | null;
  lxpScore: number | null;
}
