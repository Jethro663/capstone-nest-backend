import type { DemoAiPlan, DemoOutcomeBand, DemoState, DemoSubjectTrack } from '@/types/demo';

export type DemoAction =
  | { type: 'begin_demo' }
  | { type: 'start_modules' }
  | { type: 'select_subject'; subjectId: DemoSubjectTrack['id'] }
  | { type: 'next_lesson'; lessonCount: number }
  | { type: 'submit_module_assessment'; scorePercent: number }
  | { type: 'submit_quarter_exam'; scorePercent: number }
  | { type: 'continue_from_outcome' }
  | { type: 'save_ai_plan'; plan: DemoAiPlan }
  | { type: 'apply_ai_plan'; plan: DemoAiPlan }
  | { type: 'remove_ai_plan_module'; moduleTitle: string }
  | { type: 'remove_ai_plan_question'; questionId: string }
  | { type: 'submit_lxp'; scorePercent: number }
  | { type: 'reset_demo' };

export function determineOutcomeBand(scorePercent: number): DemoOutcomeBand {
  if (scorePercent >= 90) return 'excellent';
  if (scorePercent >= 75) return 'good';
  return 'nice_try';
}

export function createInitialDemoState(): DemoState {
  return {
    scene: 'intro',
    subjectId: null,
    moduleIndex: 0,
    lessonIndex: 0,
    moduleAssessmentScores: [],
    quarterExamScore: null,
    outcomeBand: null,
    aiPlan: null,
    lxpScore: null,
  };
}

function clampScore(scorePercent: number): number {
  if (!Number.isFinite(scorePercent)) return 0;
  return Math.max(0, Math.min(100, Math.round(scorePercent)));
}

export function advanceDemoState(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'reset_demo':
      return createInitialDemoState();
    case 'begin_demo':
      if (state.scene !== 'intro') return state;
      return { ...state, scene: 'subject_select' };
    case 'start_modules':
      if (state.scene !== 'subject_select' || !state.subjectId) return state;
      return { ...state, scene: 'module_lessons', lessonIndex: 0 };
    case 'select_subject':
      if (state.scene !== 'subject_select') return state;
      return {
        ...state,
        subjectId: action.subjectId,
        scene: 'module_lessons',
        moduleIndex: 0,
        lessonIndex: 0,
      };
    case 'next_lesson':
      if (state.scene !== 'module_lessons') return state;
      if (state.lessonIndex + 1 < action.lessonCount) {
        return { ...state, lessonIndex: state.lessonIndex + 1 };
      }
      return { ...state, scene: 'module_quiz' };
    case 'submit_module_assessment':
      if (state.scene !== 'module_quiz') return state;
      const moduleAssessmentScores = [...state.moduleAssessmentScores, clampScore(action.scorePercent)];
      if (state.moduleIndex < 2) {
        return {
          ...state,
          moduleAssessmentScores,
          moduleIndex: state.moduleIndex + 1,
          lessonIndex: 0,
          scene: 'module_lessons',
        };
      }
      return {
        ...state,
        moduleAssessmentScores,
        scene: 'quarter_exam',
      };
    case 'submit_quarter_exam':
      if (state.scene !== 'quarter_exam') return state;
      const quarterExamScore = clampScore(action.scorePercent);
      return {
        ...state,
        quarterExamScore,
        outcomeBand: determineOutcomeBand(quarterExamScore),
        scene: 'outcome',
      };
    case 'continue_from_outcome':
      if (state.scene !== 'outcome' || !state.outcomeBand) return state;
      return {
        ...state,
        scene: state.outcomeBand === 'nice_try' ? 'teacher_plan' : 'completed_high',
      };
    case 'save_ai_plan':
      if (state.scene !== 'teacher_plan') return state;
      return { ...state, aiPlan: action.plan };
    case 'apply_ai_plan':
      if (state.scene !== 'teacher_plan') return state;
      return { ...state, aiPlan: action.plan, scene: 'lxp_session' };
    case 'remove_ai_plan_module':
      if (!state.aiPlan) return state;
      return {
        ...state,
        aiPlan: {
          ...state.aiPlan,
          recommendedModules: state.aiPlan.recommendedModules.filter(
            (title) => title !== action.moduleTitle,
          ),
        },
      };
    case 'remove_ai_plan_question':
      if (!state.aiPlan) return state;
      return {
        ...state,
        aiPlan: {
          ...state.aiPlan,
          lxpQuestions: state.aiPlan.lxpQuestions.filter((question) => question.id !== action.questionId),
        },
      };
    case 'submit_lxp':
      if (state.scene !== 'lxp_session') return state;
      const lxpScore = clampScore(action.scorePercent);
      return {
        ...state,
        lxpScore,
        scene: lxpScore >= 75 ? 'completed_pass' : 'completed_fail',
      };
    default:
      return state;
  }
}
