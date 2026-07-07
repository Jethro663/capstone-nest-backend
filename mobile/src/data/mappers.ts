import type { Announcement } from "../types/announcement";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { ClassItem } from "../types/class";
import type { Lesson, LessonCompletion } from "../types/lesson";
import type { PlaylistResponse } from "../types/lxp";
import type { StudentOwnClassPerformance, StudentOwnPerformanceSummary } from "../types/performance";
import type { StudentProfile } from "../types/profile";
import type { User } from "../types/user";
import type {
  Achievement,
  AnnouncementPreview,
  AssessmentCard,
  LessonCard,
  SubjectCard,
  TutorRecommendationCard,
  UserProfileSummary,
} from "./types";
import { colors, gradients } from "../theme/tokens";

const subjectVisuals = [
  { match: ["math", "algebra", "geometry", "statistics"], emoji: "📐", color: colors.red, bgColor: colors.paleRed, gradient: gradients.assessments },
  { match: ["science", "biology", "chemistry", "physics"], emoji: "🔬", color: colors.green, bgColor: colors.paleGreen, gradient: gradients.announcements },
  { match: ["english", "reading", "literature"], emoji: "📚", color: colors.blue, bgColor: colors.paleBlue, gradient: gradients.classes },
  { match: ["history", "social", "civics"], emoji: "🏛️", color: colors.orange, bgColor: colors.paleOrange, gradient: gradients.classes },
  { match: ["filipino", "language"], emoji: "🌺", color: colors.purple, bgColor: colors.palePurple, gradient: gradients.profile },
];

const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();

export function getVisualForSubject(subjectName: string) {
  return (
    subjectVisuals.find((entry) => entry.match.some((keyword) => normalize(subjectName).includes(keyword))) ??
    subjectVisuals[0]
  );
}

export function formatDisplayDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function toSubjectCard(
  classItem: ClassItem,
  lessons: Lesson[],
  completions: LessonCompletion[],
  performance?: StudentOwnClassPerformance | null,
): SubjectCard {
  const subjectName = classItem.subjectName || classItem.className || classItem.name || "Untitled Subject";
  const subjectCode = classItem.subjectCode || "CLASS";
  const visual = getVisualForSubject(subjectName);
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeCompletions = Array.isArray(completions) ? completions : [];
  const completedCount = safeCompletions.filter((entry) => entry.completed).length;
  const totalLessons = safeLessons.length;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const teacherName = [classItem.teacher?.firstName, classItem.teacher?.lastName].filter(Boolean).join(" ");
  const sectionName = classItem.section?.name || classItem.className || classItem.name || `${subjectCode} Section`;

  return {
    id: classItem.id,
    name: subjectName,
    emoji: visual.emoji,
    color: visual.color,
    bgColor: visual.bgColor,
    progress: performance?.blendedScore != null ? Math.round(performance.blendedScore) : progress,
    totalLessons,
    completedLessons: completedCount,
    section: sectionName,
    teacherName: teacherName || "Assigned teacher",
    subjectCode,
  };
}

export function toLessonCards(lessons: Lesson[], completions: LessonCompletion[], subject: SubjectCard): LessonCard[] {
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeCompletions = Array.isArray(completions) ? completions : [];
  const completedIds = new Set(safeCompletions.filter((entry) => entry.completed).map((entry) => entry.lessonId));
  const ordered = [...safeLessons].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  const firstIncompleteIndex = ordered.findIndex((lesson) => !completedIds.has(lesson.id));

  return ordered.map((lesson, index) => ({
    id: lesson.id,
    subjectId: subject.id,
    title: lesson.title || "Untitled lesson",
    description: lesson.description ?? "Lesson content is available in the class module.",
    status: completedIds.has(lesson.id) ? "completed" : firstIncompleteIndex === -1 || index === firstIncompleteIndex ? "ongoing" : "locked",
    duration: `${Math.max((lesson.contentBlocks?.length ?? 3) * 5, 10)} min`,
    xp: Math.max((lesson.contentBlocks?.length ?? 0) * 10, 40),
    order: lesson.order,
  }));
}

export function findContinueLearning(subjects: SubjectCard[], lessonMap: Record<string, LessonCard[]>) {
  return subjects.flatMap((subject) =>
    (lessonMap[subject.id] ?? []).filter((lesson) => lesson.status === "ongoing").map((lesson) => ({ lesson, subject })),
  ).slice(0, 2);
}

export function toAssessmentCard(assessment: Assessment, subject: SubjectCard, attempts: AssessmentAttempt[]): AssessmentCard {
  const latestAttempt = [...attempts].sort(
    (left, right) =>
      new Date(right.submittedAt || right.startedAt || 0).getTime() -
      new Date(left.submittedAt || left.startedAt || 0).getTime(),
  )[0];
  const dueTime = assessment.dueDate ? new Date(assessment.dueDate).getTime() : null;
  let status: AssessmentCard["status"] = "pending";

  if (latestAttempt?.isSubmitted) {
    status = "completed";
  } else if (dueTime && dueTime < Date.now()) {
    status = latestAttempt ? "late" : "missing";
  }

  return {
    id: assessment.id,
    subjectId: subject.id,
    title: assessment.title,
    subject: subject.name,
    dueDate: formatDisplayDate(assessment.dueDate),
    status,
    score: latestAttempt?.score,
    totalScore: assessment.totalPoints ?? 100,
    emoji: subject.emoji,
    classId: assessment.classId,
    attempts,
    raw: assessment as unknown as Record<string, unknown>,
  };
}

export function toAnnouncementPreview(announcement: Announcement, subject: SubjectCard): AnnouncementPreview {
  return {
    id: announcement.id,
    classId: announcement.classId,
    title: announcement.title || "Untitled announcement",
    content: announcement.content || "No announcement details were provided.",
    subject: subject.name,
    emoji: subject.emoji,
    isPinned: announcement.isPinned,
    createdAt: formatDisplayDate(announcement.createdAt),
  };
}

export function toTutorRecommendationCards(playlist: PlaylistResponse | undefined, subject: SubjectCard | undefined): TutorRecommendationCard[] {
  if (!playlist || !subject) return [];
  return playlist.checkpoints.map((checkpoint) => ({
    id: checkpoint.id,
    type: checkpoint.type === "assessment_retry" ? "retry" : "lesson",
    title: checkpoint.lesson?.title || checkpoint.assessment?.title || checkpoint.label,
    subject: subject.name,
    reason: checkpoint.label,
    emoji: subject.emoji,
    xp: checkpoint.xpAwarded,
    urgent: !checkpoint.isCompleted,
    completed: checkpoint.isCompleted,
  }));
}

export function buildAchievements(
  performance: StudentOwnPerformanceSummary | undefined,
  subjects: SubjectCard[],
  assessments: AssessmentCard[],
  playlist: PlaylistResponse | undefined,
): Achievement[] {
  const completedAssessments = assessments.filter((entry) => entry.status === "completed");
  const totalCompletedLessons = subjects.reduce((total, subject) => total + subject.completedLessons, 0);

  return [
    { id: "first-lesson", title: "First Steps", description: "Complete your first lesson", emoji: "👣", earned: totalCompletedLessons > 0, earnedDate: totalCompletedLessons > 0 ? "Derived from lesson completions" : undefined },
    { id: "assessment-finisher", title: "Assessment Finisher", description: "Submit at least one assessment attempt", emoji: "📝", earned: completedAssessments.length > 0, earnedDate: completedAssessments.length > 0 ? "Derived from submitted attempts" : undefined },
    { id: "steady-climber", title: "Steady Climber", description: "Reach 60% average class progress", emoji: "📈", earned: subjects.length > 0 && Math.round(subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length) >= 60, earnedDate: "Derived from class progress" },
    { id: "lxp-runner", title: "LXP Runner", description: "Complete a remedial checkpoint", emoji: "🚀", earned: (playlist?.progress.checkpointsCompleted ?? 0) > 0, earnedDate: (playlist?.progress.checkpointsCompleted ?? 0) > 0 ? "Derived from LXP checkpoints" : undefined },
    { id: "risk-reducer", title: "Risk Reducer", description: "Keep your at-risk classes below two", emoji: "🛡️", earned: (performance?.overall.atRiskClasses ?? 0) < 2, earnedDate: "Derived from performance snapshot" },
  ];
}

export function toUserProfileSummary(
  user: User | null,
  profile: StudentProfile | null | undefined,
  subjects: SubjectCard[],
  performance: StudentOwnPerformanceSummary | undefined,
  assessments: AssessmentCard[],
  playlist: PlaylistResponse | undefined,
): UserProfileSummary {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "Student";
  const totalLessonsCompleted = subjects.reduce((total, subject) => total + subject.completedLessons, 0);
  const completedAssessments = assessments.filter((entry) => entry.status === "completed");
  const averageScore =
    completedAssessments.length > 0
      ? Math.round(completedAssessments.reduce((total, assessment) => total + (((assessment.score ?? 0) / Math.max(assessment.totalScore, 1)) * 100), 0) / completedAssessments.length)
      : Math.round(performance?.overall.averageBlendedScore ?? 0);
  const xp = totalLessonsCompleted * 45 + completedAssessments.length * 60 + (playlist?.progress.xpTotal ?? 0);

  return {
    name: fullName,
    grade: profile?.gradeLevel || user?.gradeLevel || "Assigned grade",
    section: subjects[0]?.section || "Assigned section",
    avatar: profile?.profilePicture || user?.profilePicture || "🎓",
    xp,
    level: Math.max(1, Math.ceil(xp / 250)),
    streak: playlist?.progress.streakDays ?? Math.max(1, subjects.filter((entry) => entry.progress > 0).length),
    joinDate: formatDisplayDate(user?.createdAt),
    totalLessonsCompleted,
    averageScore,
    studyHours: Math.max(2, Math.round(totalLessonsCompleted * 0.6)),
  };
}
