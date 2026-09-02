/**
 * Minimal fixtures copied from the current Nest response/DTO shapes. Keep these
 * at the transport boundary so web/mobile contract drift fails focused tests.
 */
export const teacherEvaluationDashboardFixture = {
  currentAcademicState: { schoolYear: "2026-2027", quarter: "Q2" as const },
  pending: [{
    classId: "class-1", gradingPeriod: "Q2" as const, schoolYear: "2026-2027", evaluationType: "teacher_class" as const,
    title: "Teacher and Class Evaluation", description: "Share constructive feedback.",
    class: { id: "class-1", subjectName: "Mathematics", subjectCode: "MATH7", section: { id: "section-1", name: "Bonifacio", gradeLevel: "7" } },
    questions: [{ key: "teaching_clarity", label: "Teaching Clarity" }, { key: "teacher_support", label: "Supportiveness" }],
  }],
  completed: [],
};

export const teacherEvaluationSummaryFixture = {
  classes: [{
    id: "class-1",
    subjectCode: "MATH7",
    subjectName: "Mathematics",
    section: { id: "section-1", name: "Bonifacio", gradeLevel: "7" },
  }],
  periods: ["Q2" as const],
  evaluationType: "teacher_class" as const,
  tabTitle: "Teacher and Class Evaluation",
  tabDescription: "Anonymous learner feedback for the selected classes.",
  overview: {
    responseCount: 12,
    eligibleCount: 15,
    responseRate: 80,
    averageOverall: 4.5,
    latestSubmittedAt: "2026-09-02T00:00:00.000Z",
  },
  categoryAverages: [{ key: "teaching_clarity", label: "Teaching Clarity", average: 4.6 }],
  comments: [{
    id: "evaluation-1",
    comment: "Clear examples.",
    submittedAt: "2026-09-02T00:00:00.000Z",
    gradingPeriod: "Q2" as const,
    classId: "class-1",
    classLabel: "Mathematics 7",
  }],
  trends: [{
    classId: "class-1",
    gradingPeriod: "Q2" as const,
    classLabel: "Mathematics 7",
    responseCount: 12,
    eligibleCount: 15,
  }],
};

export const assessmentAttemptFixture = {
  id: "attempt-1", assessmentId: "assessment-1", studentId: "student-1", status: "in_progress" as const,
  lastQuestionIndex: 1, questionOrder: ["question-2", "question-1"], currentQuestionStartedAt: "2026-09-02T00:00:00.000Z",
  currentQuestionDeadlineAt: "2026-09-02T00:00:45.000Z", startedAt: "2026-09-02T00:00:00.000Z", expiresAt: "2026-09-02T00:30:00.000Z", responses: [],
};

export const assessmentResultFixture = {
  score: null, passed: null, isReturned: false,
  responses: [{ questionId: "question-1", isCorrect: null, pointsEarned: null, hint: "Review the worked example." }],
  feedbackStatus: { level: "detailed", unlocked: false, hoursRemaining: 12, message: "Detailed feedback unlocks after the delay." },
  rubricScores: [{ criterionId: "criterion-1", pointsEarned: 8, feedback: "Clear." }],
};

export const aiAssessmentSettingsFixture = {
  title: "Quarter 2 mastery check", description: "Explain each answer.", type: "exam" as const,
  dueDate: "2026-10-20T09:00:00.000Z", closeWhenDue: false, randomizeQuestions: true, timedQuestionsEnabled: true,
  questionTimeLimitSeconds: 45, strictMode: true, feedbackLevel: "detailed" as const, feedbackDelayHours: 36,
  passingScore: 82, maxAttempts: 3, timeLimitMinutes: 50, classRecordCategory: "quarterly_assessment", quarter: "Q2" as const,
};

export function paginatedFixture<T>(data: T[], page: number, limit: number, total: number) {
  return { success: true, data, count: data.length, total, page, limit, totalPages: Math.ceil(total / limit) };
}
