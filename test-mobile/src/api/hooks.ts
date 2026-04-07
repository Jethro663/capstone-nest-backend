import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "./services/ai";
import { announcementsApi } from "./services/announcements";
import { assessmentsApi } from "./services/assessments";
import { classesApi } from "./services/classes";
import { jaApi } from "./services/ja";
import { lessonsApi } from "./services/lessons";
import { lxpApi } from "./services/lxp";
import { modulesApi } from "./services/modules";
import { performanceApi } from "./services/performance";
import { profileApi } from "./services/profile";

export const queryKeys = {
  classes: (studentId: string) => ["classes", studentId] as const,
  classDetail: (classId: string) => ["class-detail", classId] as const,
  classModules: (classId: string) => ["class-modules", classId] as const,
  lessons: (classId: string) => ["lessons", classId] as const,
  lessonCompletions: (classId: string) => ["lesson-completions", classId] as const,
  assessments: (classId: string) => ["assessments", classId] as const,
  assessmentDetail: (assessmentId: string) => ["assessment-detail", assessmentId] as const,
  assessmentAttempts: (assessmentId: string) => ["assessment-attempts", assessmentId] as const,
  assessmentResult: (attemptId: string) => ["assessment-result", attemptId] as const,
  announcements: (classId: string) => ["announcements", classId] as const,
  performance: ["performance"] as const,
  lxpEligibility: ["lxp-eligibility"] as const,
  lxpPlaylist: (classId: string) => ["lxp-playlist", classId] as const,
  profile: ["profile"] as const,
  tutorBootstrap: (classId?: string) => ["tutor-bootstrap", classId ?? "all"] as const,
  tutorSession: (sessionId?: string) => ["tutor-session", sessionId ?? "missing"] as const,
  jaHub: (classId?: string) => ["ja-hub", classId ?? "all"] as const,
  jaAskThread: (threadId?: string) => ["ja-ask-thread", threadId ?? "missing"] as const,
};

export const useStudentClasses = (studentId?: string) =>
  useQuery({
    queryKey: studentId ? queryKeys.classes(studentId) : ["classes", "anonymous"],
    queryFn: () => classesApi.getStudentClasses(studentId!),
    enabled: !!studentId,
  });

export const useClassDetail = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.classDetail(classId) : ["class-detail", "missing"],
    queryFn: () => classesApi.getById(classId!),
    enabled: !!classId,
  });

export const useLessons = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.lessons(classId) : ["lessons", "missing"],
    queryFn: () => lessonsApi.getByClass(classId!),
    enabled: !!classId,
  });

export const useClassModules = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.classModules(classId) : ["class-modules", "missing"],
    queryFn: () => modulesApi.getByClass(classId!),
    enabled: !!classId,
  });

export const useLessonCompletions = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.lessonCompletions(classId) : ["lesson-completions", "missing"],
    queryFn: () => lessonsApi.getCompletedByClass(classId!),
    enabled: !!classId,
  });

export const useAssessments = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.assessments(classId) : ["assessments", "missing"],
    queryFn: () => assessmentsApi.getByClass(classId!),
    enabled: !!classId,
  });

export const useAssessmentDetail = (assessmentId?: string) =>
  useQuery({
    queryKey: assessmentId ? queryKeys.assessmentDetail(assessmentId) : ["assessment-detail", "missing"],
    queryFn: () => assessmentsApi.getById(assessmentId!),
    enabled: !!assessmentId,
  });

export const useAssessmentAttempts = (assessmentId?: string) =>
  useQuery({
    queryKey: assessmentId ? queryKeys.assessmentAttempts(assessmentId) : ["assessment-attempts", "missing"],
    queryFn: () => assessmentsApi.getStudentAttempts(assessmentId!),
    enabled: !!assessmentId,
  });

export const useAssessmentResult = (attemptId?: string) =>
  useQuery({
    queryKey: attemptId ? queryKeys.assessmentResult(attemptId) : ["assessment-result", "missing"],
    queryFn: () => assessmentsApi.getAttemptResults(attemptId!),
    enabled: !!attemptId,
  });

export const useAnnouncements = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.announcements(classId) : ["announcements", "missing"],
    queryFn: () => announcementsApi.getByClass(classId!),
    enabled: !!classId,
  });

export const usePerformanceSummary = () =>
  useQuery({
    queryKey: queryKeys.performance,
    queryFn: () => performanceApi.getStudentSummary(),
  });

export const useLxpEligibility = () =>
  useQuery({
    queryKey: queryKeys.lxpEligibility,
    queryFn: () => lxpApi.getEligibility(),
  });

export const useLxpPlaylist = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.lxpPlaylist(classId) : ["lxp-playlist", "missing"],
    queryFn: () => lxpApi.getPlaylist(classId!),
    enabled: !!classId,
  });

export const useProfile = () =>
  useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => profileApi.getMine(),
  });

export const useTutorBootstrap = (classId?: string) =>
  useQuery({
    queryKey: queryKeys.tutorBootstrap(classId),
    queryFn: () => aiApi.getTutorBootstrap(classId),
  });

export const useTutorSession = (sessionId?: string) =>
  useQuery({
    queryKey: queryKeys.tutorSession(sessionId),
    queryFn: () => aiApi.getTutorSession(sessionId!),
    enabled: !!sessionId,
  });

export const useJaHub = (classId?: string) =>
  useQuery({
    queryKey: queryKeys.jaHub(classId),
    queryFn: () => jaApi.getHub(classId),
  });

export const useJaAskThread = (threadId?: string) =>
  useQuery({
    queryKey: queryKeys.jaAskThread(threadId),
    queryFn: () => jaApi.getAskThread(threadId!),
    enabled: !!threadId,
  });

export function useLessonCompleteMutation(classId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => lessonsApi.complete(lessonId),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lessonCompletions(classId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.lessons(classId) });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.performance });
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
        await queryClient.invalidateQueries({ queryKey: queryKeys.assessmentDetail(assessmentId) });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.performance });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.lxpEligibility });
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

export function useProfileAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.uploadAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
