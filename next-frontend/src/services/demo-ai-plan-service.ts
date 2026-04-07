import { getDemoSubject } from '@/lib/demo-content';
import axios from 'axios';
import type { DemoAiPlan, DemoQuestion, DemoSubjectTrack } from '@/types/demo';

export interface DemoAiPlanInput {
  subjectId: DemoSubjectTrack['id'];
  quarterExamScore: number;
  weakConcepts: string[];
  moduleScores?: number[];
}

type LivePlanRequester = (input: DemoAiPlanInput) => Promise<DemoAiPlan | null>;

function normalizeWeakConcepts(input: DemoAiPlanInput): string[] {
  if (input.weakConcepts.length > 0) return input.weakConcepts;
  return ['Core concept mastery', 'Reading and interpretation accuracy'];
}

function buildQuestionFromConcept(concept: string, index: number): DemoQuestion {
  const options = [
    `Apply ${concept} with evidence and clear reasoning.`,
    `Skip planning and answer immediately without checking.`,
    `Use unrelated examples from another topic.`,
    `Memorize one sentence without understanding.`,
  ];
  return {
    id: `fallback-lxp-${index + 1}`,
    prompt: `Which strategy best improves your understanding of "${concept}"?`,
    options,
    correctIndex: 0,
    explanation: `The strongest strategy is to practice ${concept} with evidence-based reasoning.`,
  };
}

function buildFallbackPlan(input: DemoAiPlanInput): DemoAiPlan {
  const subject = getDemoSubject(input.subjectId);
  const concepts = normalizeWeakConcepts(input);
  const recommendedModules = (subject?.modules ?? [])
    .slice(0, 2)
    .map((moduleEntry) => moduleEntry.title);

  const seedQuestions = concepts.flatMap((concept, conceptIndex) => {
    return [buildQuestionFromConcept(concept, conceptIndex * 2), buildQuestionFromConcept(concept, conceptIndex * 2 + 1)];
  });

  const subjectExamQuestions = (subject?.quarterExam.questions ?? []).slice(0, 6).map((question, idx) => ({
    ...question,
    id: `fallback-${question.id}-${idx}`,
  }));

  const lxpQuestions = [...seedQuestions, ...subjectExamQuestions].slice(0, 10);

  return {
    source: 'fallback',
    weakConcepts: concepts,
    recommendedModules,
    teacherSummary:
      input.quarterExamScore <= 74
        ? 'Student needs guided remediation. Prioritize weak concepts, then check mastery with short formative items.'
        : 'Student shows recovery progress. Reinforce remaining weak concepts and verify with targeted practice.',
    lxpQuestions,
  };
}

function normalizeLivePlanPayload(payload: unknown): DemoAiPlan | null {
  const maybeEnvelope =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload;
  if (!maybeEnvelope || typeof maybeEnvelope !== 'object') return null;
  const record = maybeEnvelope as Record<string, unknown>;
  if (!Array.isArray(record.lxpQuestions)) return null;

  const questions = record.lxpQuestions
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => {
      const row = entry as Record<string, unknown>;
      const options = Array.isArray(row.options)
        ? row.options.filter((opt): opt is string => typeof opt === 'string')
        : [];
      return {
        id: typeof row.id === 'string' ? row.id : `live-question-${index + 1}`,
        prompt: typeof row.prompt === 'string' ? row.prompt : `Live question ${index + 1}`,
        options,
        correctIndex:
          typeof row.correctIndex === 'number' &&
          Number.isFinite(row.correctIndex) &&
          row.correctIndex >= 0
            ? row.correctIndex
            : 0,
        explanation:
          typeof row.explanation === 'string'
            ? row.explanation
            : 'Use evidence-based reasoning based on reviewed lessons.',
      } satisfies DemoQuestion;
    })
    .filter((question) => question.options.length >= 2);

  if (questions.length === 0) return null;

  return {
    source:
      typeof record.source === 'string' &&
      (record.source === 'live' || record.source === 'fallback')
        ? record.source
        : 'live',
    weakConcepts: Array.isArray(record.weakConcepts)
      ? record.weakConcepts.filter((entry): entry is string => typeof entry === 'string')
      : [],
    recommendedModules: Array.isArray(record.recommendedModules)
      ? record.recommendedModules.filter((entry): entry is string => typeof entry === 'string')
      : [],
    teacherSummary:
      typeof record.teacherSummary === 'string'
        ? record.teacherSummary
        : 'Live demo AI plan generated.',
    lxpQuestions: questions,
  };
}

async function requestLiveDemoPlan(input: DemoAiPlanInput): Promise<DemoAiPlan | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await axios.post(
        '/api/ai/demo/intervention-plan',
        {
          subjectId: input.subjectId,
          quarterExamScore: input.quarterExamScore,
          weakConcepts: input.weakConcepts,
          moduleScores: input.moduleScores ?? [],
        },
        {
          withCredentials: false,
          timeout: 15000,
        },
      );
      const normalized = normalizeLivePlanPayload(response.data);
      if (!normalized) {
        console.warn(
          `[demo-ai] Live plan payload was not usable (attempt ${attempt}).`,
          response.data,
        );
      }
      if (normalized) return normalized;
    } catch (error) {
      const status =
        axios.isAxiosError(error) && error.response
          ? error.response.status
          : undefined;
      const reason =
        axios.isAxiosError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      console.warn(
        `[demo-ai] Live plan request failed (attempt ${attempt})${status ? ` status=${status}` : ''}: ${reason}`,
      );
    }
  }
  return null;
}

export async function generateDemoAiPlan(
  input: DemoAiPlanInput,
  options?: { requestLivePlan?: LivePlanRequester },
): Promise<DemoAiPlan> {
  const requestLivePlan = options?.requestLivePlan ?? requestLiveDemoPlan;
  let livePlan: DemoAiPlan | null = null;
  try {
    livePlan = await requestLivePlan(input);
  } catch {
    livePlan = null;
  }
  if (livePlan && livePlan.lxpQuestions.length > 0) {
    return livePlan;
  }
  return buildFallbackPlan(input);
}
