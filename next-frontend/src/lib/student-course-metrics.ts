import type { Assessment } from '@/types/assessment';
import type { ClassModule } from '@/types/module';

export interface StudentCourseMetrics {
  totalLessons: number;
  completedCount: number;
  totalAssessments: number;
  pendingCount: number;
  progress: number;
}

interface DeriveStudentCourseMetricsInput {
  modules: ClassModule[];
  assessments: Assessment[];
  completedLessonIds: string[];
}

export function deriveStudentCourseMetrics({
  modules,
  assessments,
  completedLessonIds,
}: DeriveStudentCourseMetricsInput): StudentCourseMetrics {
  const completedLessonIdSet = new Set(completedLessonIds);
  const publishedAssessmentIds = new Set(
    assessments.filter((assessment) => assessment.isPublished).map((assessment) => assessment.id),
  );
  const attachedAssessmentIds = new Set<string>();
  const visibleLessonIds = new Set<string>();
  const completedVisibleLessonIds = new Set<string>();
  const visibleGivenAssessmentIds = new Set<string>();

  for (const classModule of modules) {
    for (const section of classModule.sections ?? []) {
      for (const item of section.items ?? []) {
        if (item.itemType === 'assessment' && item.assessmentId) {
          attachedAssessmentIds.add(item.assessmentId);
        }

        if (!classModule.isVisible || !item.isVisible) {
          continue;
        }

        if (item.itemType === 'lesson' && item.lessonId && !item.lesson?.isDraft) {
          visibleLessonIds.add(item.lessonId);
          if (completedLessonIdSet.has(item.lessonId) || item.completed) {
            completedVisibleLessonIds.add(item.lessonId);
          }
          continue;
        }

        if (
          item.itemType === 'assessment' &&
          item.assessmentId &&
          item.isGiven &&
          publishedAssessmentIds.has(item.assessmentId)
        ) {
          visibleGivenAssessmentIds.add(item.assessmentId);
        }
      }
    }
  }

  const standalonePublishedAssessmentCount = assessments.filter(
    (assessment) =>
      assessment.isPublished && !attachedAssessmentIds.has(assessment.id),
  ).length;

  const totalLessons = visibleLessonIds.size;
  const completedCount = completedVisibleLessonIds.size;
  const totalAssessments =
    visibleGivenAssessmentIds.size + standalonePublishedAssessmentCount;
  const pendingCount = Math.max(totalLessons - completedCount, 0) + totalAssessments;
  const progress =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return {
    totalLessons,
    completedCount,
    totalAssessments,
    pendingCount,
    progress,
  };
}
