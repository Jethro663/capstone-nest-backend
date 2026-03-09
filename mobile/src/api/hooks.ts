import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '@/api/services/announcements';
import { assessmentsApi } from '@/api/services/assessments';
import { authApi } from '@/api/services/auth';
import { classesApi } from '@/api/services/classes';
import { lessonsApi } from '@/api/services/lessons';
import { lxpApi } from '@/api/services/lxp';
import { performanceApi } from '@/api/services/performance';
import { profileApi } from '@/api/services/profile';

export const queryKeys = {
  classes: (studentId: string) => ['classes', studentId] as const,
  classDetail: (classId: string) => ['class-detail', classId] as const,
  lessons: (classId: string) => ['lessons', classId] as const,
  lessonDetail: (lessonId: string) => ['lesson-detail', lessonId] as const,
  lessonCompletions: (classId: string) => ['lesson-completions', classId] as const,
  lessonStatus: (lessonId: string) => ['lesson-status', lessonId] as const,
  assessments: (classId: string) => ['assessments', classId] as const,
  assessmentDetail: (assessmentId: string) => ['assessment-detail', assessmentId] as const,
  assessmentAttempts: (assessmentId: string) => ['assessment-attempts', assessmentId] as const,
  assessmentResult: (attemptId: string) => ['assessment-result', attemptId] as const,
  announcements: (classId: string) => ['announcements', classId] as const,
  performance: ['performance'] as const,
  lxpEligibility: ['lxp-eligibility'] as const,
  lxpPlaylist: (classId: string) => ['lxp-playlist', classId] as const,
  profile: ['profile'] as const,
};

export function useStudentClasses(studentId?: string) {
  return useQuery({
    queryKey: studentId ? queryKeys.classes(studentId) : ['classes', 'anonymous'],
    queryFn: () => classesApi.getStudentClasses(studentId!),
    enabled: !!studentId,
  });
}

export function useClassDetail(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.classDetail(classId) : ['class-detail', 'missing'],
    queryFn: () => classesApi.getById(classId!),
    enabled: !!classId,
  });
}

export function useLessons(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.lessons(classId) : ['lessons', 'missing'],
    queryFn: () => lessonsApi.getByClass(classId!),
    enabled: !!classId,
  });
}

export function useLessonCompletions(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.lessonCompletions(classId) : ['lesson-completions', 'missing'],
    queryFn: () => lessonsApi.getCompletedByClass(classId!),
    enabled: !!classId,
  });
}

export function useLessonDetail(lessonId?: string) {
  return useQuery({
    queryKey: lessonId ? queryKeys.lessonDetail(lessonId) : ['lesson-detail', 'missing'],
    queryFn: () => lessonsApi.getById(lessonId!),
    enabled: !!lessonId,
  });
}

export function useLessonStatus(lessonId?: string) {
  return useQuery({
    queryKey: lessonId ? queryKeys.lessonStatus(lessonId) : ['lesson-status', 'missing'],
    queryFn: () => lessonsApi.getCompletionStatus(lessonId!),
    enabled: !!lessonId,
  });
}

export function useAssessments(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.assessments(classId) : ['assessments', 'missing'],
    queryFn: () => assessmentsApi.getByClass(classId!),
    enabled: !!classId,
  });
}

export function useAssessmentDetail(assessmentId?: string) {
  return useQuery({
    queryKey: assessmentId ? queryKeys.assessmentDetail(assessmentId) : ['assessment-detail', 'missing'],
    queryFn: () => assessmentsApi.getById(assessmentId!),
    enabled: !!assessmentId,
  });
}

export function useAssessmentAttempts(assessmentId?: string) {
  return useQuery({
    queryKey: assessmentId ? queryKeys.assessmentAttempts(assessmentId) : ['assessment-attempts', 'missing'],
    queryFn: () => assessmentsApi.getStudentAttempts(assessmentId!),
    enabled: !!assessmentId,
  });
}

export function useAssessmentResult(attemptId?: string) {
  return useQuery({
    queryKey: attemptId ? queryKeys.assessmentResult(attemptId) : ['assessment-result', 'missing'],
    queryFn: () => assessmentsApi.getAttemptResults(attemptId!),
    enabled: !!attemptId,
  });
}

export function useAnnouncements(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.announcements(classId) : ['announcements', 'missing'],
    queryFn: () => announcementsApi.getByClass(classId!),
    enabled: !!classId,
  });
}

export function usePerformanceSummary() {
  return useQuery({
    queryKey: queryKeys.performance,
    queryFn: () => performanceApi.getStudentSummary(),
  });
}

export function useLxpEligibility() {
  return useQuery({
    queryKey: queryKeys.lxpEligibility,
    queryFn: () => lxpApi.getEligibility(),
  });
}

export function useLxpPlaylist(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.lxpPlaylist(classId) : ['lxp-playlist', 'missing'],
    queryFn: () => lxpApi.getPlaylist(classId!),
    enabled: !!classId,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => profileApi.getMine(),
  });
}

export function useLessonCompleteMutation(classId?: string, lessonId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => lessonsApi.complete(lessonId!),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lessonCompletions(classId) });
      }
      if (lessonId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lessonStatus(lessonId) });
      }
    },
  });
}

export function useAssessmentSubmitMutation(assessmentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assessmentsApi.submit,
    onSuccess: async () => {
      if (assessmentId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.assessmentAttempts(assessmentId) });
      }
    },
  });
}

export function useLxpCheckpointMutation(classId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId }: { assignmentId: string }) => lxpApi.completeCheckpoint(classId!, assignmentId),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lxpPlaylist(classId) });
      }
    },
  });
}

export function useProfileAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.uploadAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useProfileUpdateMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof profileApi.updateByUserId>[1]) => profileApi.updateByUserId(userId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: authApi.verifyEmail,
  });
}
