import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "./services/ai";
import { announcementsApi } from "./services/announcements";
import { assessmentsApi } from "./services/assessments";
import { classesApi } from "./services/classes";
import { discussionBoardApi } from "./services/discussion-board";
import { jaApi } from "./services/ja";
import { lessonsApi } from "./services/lessons";
import { lxpApi } from "./services/lxp";
import { modulesApi } from "./services/modules";
import { performanceApi } from "./services/performance";
import { profileApi } from "./services/profile";
import { reportsApi } from "./services/reports";
import { schoolEventsApi } from "./services/school-events";
import { teacherProfileApi } from "./services/teacher-profile";
import type { AssessmentHistoryQuery, TranscriptQuery } from "../types/report";
import type { CreateDiscussionCommentDto, DiscussionReactionType } from "../types/discussion";
import type { BulkLessonDraftStateDto } from "../types/lesson";
import type { UpdateTeacherProfileDto } from "../types/profile";
import type { SchoolEventQuery } from "../types/school-event";

export const queryKeys = {
  classes: (studentId: string) => ["classes", studentId] as const,
  teacherClasses: (teacherId: string, status = "active") =>
    ["teacher-classes", teacherId, status] as const,
  classDetail: (classId: string) => ["class-detail", classId] as const,
  teacherEnrollments: (classId: string) => ["teacher-enrollments", classId] as const,
  classModules: (classId: string) => ["class-modules", classId] as const,
  moduleDetailsByClass: (classId: string) => ["module-detail", classId] as const,
  lessons: (classId: string) => ["lessons", classId] as const,
  lessonCompletions: (classId: string) => ["lesson-completions", classId] as const,
  lessonCompletionStatus: (lessonId?: string) =>
    ["lesson-completion-status", lessonId ?? "missing"] as const,
  lessonDetail: (lessonId?: string) => ["lesson-detail", lessonId ?? "missing"] as const,
  assessments: (classId: string) => ["assessments", classId] as const,
  assessmentDetail: (assessmentId: string) => ["assessment-detail", assessmentId] as const,
  assessmentAttempts: (assessmentId: string) => ["assessment-attempts", assessmentId] as const,
  teacherAssessmentSubmissions: (assessmentId: string) =>
    ["teacher-assessment-submissions", assessmentId] as const,
  assessmentResult: (attemptId: string) => ["assessment-result", attemptId] as const,
  assessmentHistory: (query?: AssessmentHistoryQuery) =>
    ["assessment-history", query ?? "all"] as const,
  announcements: (classId: string) => ["announcements", classId] as const,
  discussionThreads: (classId?: string) => ["discussion-threads", classId ?? "missing"] as const,
  discussionThread: (classId?: string, threadId?: string) =>
    ["discussion-thread", classId ?? "missing", threadId ?? "missing"] as const,
  schoolEvents: (query?: SchoolEventQuery) => ["school-events", query ?? "all"] as const,
  transcript: (query?: TranscriptQuery) => ["transcript", query ?? "all"] as const,
  performance: ["performance"] as const,
  lxpEligibility: ["lxp-eligibility"] as const,
  lxpPlaylist: (classId: string) => ["lxp-playlist", classId] as const,
  lxpOverview: (classId?: string) => ["lxp-overview", classId ?? "missing"] as const,
  profile: ["profile"] as const,
  teacherProfile: ["teacher-profile"] as const,
  tutorBootstrap: (classId?: string) => ["tutor-bootstrap", classId ?? "all"] as const,
  tutorSession: (sessionId?: string) => ["tutor-session", sessionId ?? "missing"] as const,
  jaHub: (classId?: string) => ["ja-hub", classId ?? "all"] as const,
  jaAskThread: (threadId?: string) => ["ja-ask-thread", threadId ?? "missing"] as const,
  moduleDetail: (classId?: string, moduleId?: string) =>
    ["module-detail", classId ?? "missing", moduleId ?? "missing"] as const,
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

export const useTeacherClasses = (teacherId?: string, status = "active") =>
  useQuery({
    queryKey: teacherId ? queryKeys.teacherClasses(teacherId, status) : ["teacher-classes", "missing", status],
    queryFn: () => classesApi.getTeacherClasses(teacherId!, status as never),
    enabled: !!teacherId,
  });

export const useTeacherEnrollments = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.teacherEnrollments(classId) : ["teacher-enrollments", "missing"],
    queryFn: () => classesApi.getEnrollments(classId!),
    enabled: !!classId,
  });

export const useLessons = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.lessons(classId) : ["lessons", "missing"],
    queryFn: () => lessonsApi.getByClass(classId!),
    enabled: !!classId,
  });

export const useLessonDetail = (lessonId?: string) =>
  useQuery({
    queryKey: queryKeys.lessonDetail(lessonId),
    queryFn: () => lessonsApi.getById(lessonId!),
    enabled: !!lessonId,
  });

export const useLessonCompletionStatus = (lessonId?: string) =>
  useQuery({
    queryKey: queryKeys.lessonCompletionStatus(lessonId),
    queryFn: () => lessonsApi.getCompletionStatus(lessonId!),
    enabled: !!lessonId,
  });

export const useClassModules = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.classModules(classId) : ["class-modules", "missing"],
    queryFn: () => modulesApi.getByClass(classId!),
    enabled: !!classId,
  });

export const useModuleDetail = (classId?: string, moduleId?: string) =>
  useQuery({
    queryKey: queryKeys.moduleDetail(classId, moduleId),
    queryFn: () => modulesApi.getByClassAndModule(classId!, moduleId!),
    enabled: !!classId && !!moduleId,
  });

export const useLessonCompletions = (classId?: string) =>
  useQuery({
    queryKey: classId ? queryKeys.lessonCompletions(classId) : ["lesson-completions", "missing"],
    queryFn: () => lessonsApi.getCompletedByClass(classId!),
    enabled: !!classId,
  });

export const useSchoolEvents = (query?: SchoolEventQuery) =>
  useQuery({
    queryKey: queryKeys.schoolEvents(query),
    queryFn: () => schoolEventsApi.getAll(query),
  });

export const useTranscript = (query?: TranscriptQuery) =>
  useQuery({
    queryKey: queryKeys.transcript(query),
    queryFn: () => reportsApi.getTranscript(query),
  });

export const useAssessmentHistory = (query?: AssessmentHistoryQuery) =>
  useQuery({
    queryKey: queryKeys.assessmentHistory(query),
    queryFn: () => assessmentsApi.getAssessmentHistory(query),
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

export const useTeacherAssessmentSubmissions = (assessmentId?: string) =>
  useQuery({
    queryKey: assessmentId
      ? queryKeys.teacherAssessmentSubmissions(assessmentId)
      : ["teacher-assessment-submissions", "missing"],
    queryFn: () => assessmentsApi.getTeacherSubmissions(assessmentId!),
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

export const useDiscussionThreads = (classId?: string) =>
  useQuery({
    queryKey: queryKeys.discussionThreads(classId),
    queryFn: () => discussionBoardApi.listThreads(classId!),
    enabled: !!classId,
  });

export const useDiscussionThread = (classId?: string, threadId?: string) =>
  useQuery({
    queryKey: queryKeys.discussionThread(classId, threadId),
    queryFn: () => discussionBoardApi.getThread(classId!, threadId!),
    enabled: !!classId && !!threadId,
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

export const useLxpOverview = (classId?: string) =>
  useQuery({
    queryKey: queryKeys.lxpOverview(classId),
    queryFn: () => lxpApi.getOverview(classId!),
    enabled: !!classId,
  });

export const useProfile = () =>
  useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => profileApi.getMine(),
  });

export const useTeacherProfile = () =>
  useQuery({
    queryKey: queryKeys.teacherProfile,
    queryFn: () => teacherProfileApi.getMine(),
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
        await queryClient.invalidateQueries({ queryKey: queryKeys.classDetail(classId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.classModules(classId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.moduleDetailsByClass(classId) });
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

export function useTeacherProfileUpdateMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTeacherProfileDto) => teacherProfileApi.updateByUserId(userId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacherProfile });
    },
  });
}

export function useTeacherProfileAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherProfileApi.uploadAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacherProfile });
    },
  });
}

export function useTeacherAnnouncementMutation(classId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      announcementId,
      payload,
    }: {
      announcementId?: string;
      payload: Parameters<typeof announcementsApi.create>[1];
    }) =>
      announcementId
        ? announcementsApi.update(classId!, announcementId, payload)
        : announcementsApi.create(classId!, payload),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.announcements(classId) });
      }
    },
  });
}

export function useTeacherDeleteAnnouncementMutation(classId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => announcementsApi.delete(classId!, announcementId),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.announcements(classId) });
      }
    },
  });
}

export function useTeacherModuleUpdateMutation(classId?: string, moduleId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof modulesApi.update>[1]) => modulesApi.update(moduleId!, payload),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.classModules(classId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.moduleDetail(classId, moduleId) });
      }
    },
  });
}

export function useTeacherModuleItemUpdateMutation(classId?: string, moduleId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: Parameters<typeof modulesApi.updateItem>[1];
    }) => modulesApi.updateItem(itemId, payload),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.classModules(classId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.moduleDetail(classId, moduleId) });
      }
    },
  });
}

export function useTeacherLessonDraftStateMutation(classId?: string, lessonId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkLessonDraftStateDto) => lessonsApi.setDraftState(classId!, payload),
    onSuccess: async () => {
      if (classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lessons(classId) });
      }
      if (lessonId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lessonDetail(lessonId) });
      }
    },
  });
}

export function useTeacherAssessmentUpdateMutation(assessmentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof assessmentsApi.update>[1]) => assessmentsApi.update(assessmentId!, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessmentDetail(assessmentId!) });
      if (data.classId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.assessments(data.classId) });
      }
    },
  });
}

export function useTeacherReturnGradeMutation(assessmentId?: string, attemptId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof assessmentsApi.returnGrade>[1]) =>
      assessmentsApi.returnGrade(attemptId!, payload),
    onSuccess: async () => {
      if (assessmentId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.teacherAssessmentSubmissions(assessmentId) });
      }
      if (attemptId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.assessmentResult(attemptId) });
      }
    },
  });
}

export function useTeacherUnreturnGradeMutation(assessmentId?: string, attemptId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => assessmentsApi.unreturnGrade(attemptId!),
    onSuccess: async () => {
      if (assessmentId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.teacherAssessmentSubmissions(assessmentId) });
      }
      if (attemptId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.assessmentResult(attemptId) });
      }
    },
  });
}

export function useDiscussionCommentMutation(classId?: string, threadId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDiscussionCommentDto) =>
      discussionBoardApi.createComment(classId!, threadId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussionThreads(classId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussionThread(classId, threadId) });
    },
  });
}

export function useDiscussionDeleteCommentMutation(classId?: string, threadId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => discussionBoardApi.deleteComment(classId!, threadId!, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussionThreads(classId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussionThread(classId, threadId) });
    },
  });
}

export function useDiscussionReactionMutation(classId?: string, threadId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { commentId: string; reactionType: DiscussionReactionType | null }) => {
      if (payload.reactionType) {
        return discussionBoardApi.setReaction(classId!, threadId!, payload.commentId, payload.reactionType);
      }
      return discussionBoardApi.removeReaction(classId!, threadId!, payload.commentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussionThreads(classId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussionThread(classId, threadId) });
    },
  });
}
