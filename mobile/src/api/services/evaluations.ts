import { apiClient } from '../client';
import { unwrapEnvelope } from '../http';
import type { ApiEnvelope } from '../../types/api';

export type AcademicPeriodKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type TeacherEvaluationType =
  | 'teacher_class'
  | 'ja_hub'
  | 'learners_path';

export type TeacherEvaluationQuestion = {
  key: string;
  label: string;
};

export type TeacherEvaluationClass = {
  id: string;
  subjectName: string;
  subjectCode: string;
  section?: {
    id: string;
    name: string;
    gradeLevel: string;
  } | null;
};

export type PendingTeacherEvaluation = {
  classId: string;
  gradingPeriod: AcademicPeriodKey;
  schoolYear: string;
  evaluationType: TeacherEvaluationType;
  title: string;
  description: string;
  class: TeacherEvaluationClass;
  questions: TeacherEvaluationQuestion[];
};

export type CompletedTeacherEvaluation = {
  id: string;
  classId: string;
  gradingPeriod: AcademicPeriodKey;
  evaluationType: TeacherEvaluationType;
  title: string;
  class: TeacherEvaluationClass | null;
  submittedAt: string;
};

export type TeacherEvaluationDashboard = {
  currentAcademicState: {
    schoolYear: string;
    quarter: AcademicPeriodKey;
  };
  pending: PendingTeacherEvaluation[];
  completed: CompletedTeacherEvaluation[];
};

export type SubmitTeacherEvaluationDto = {
  classId: string;
  gradingPeriod: AcademicPeriodKey;
  evaluationType: TeacherEvaluationType;
  ratings: Record<string, number>;
  comment?: string;
};

export type SystemEvaluationTargetModule =
  | 'lms'
  | 'lxp'
  | 'ai_mentor'
  | 'intervention'
  | 'overall';
export type SystemEvaluationFormType = 'system' | 'ja_hub';
export type SystemEvaluationAudienceRole = 'student' | 'teacher';
export type SystemEvaluationAssignmentStatus =
  | 'pending'
  | 'submitted'
  | 'expired';

export type AssignedSystemEvaluation = {
  id: string;
  campaignId: string;
  formType: SystemEvaluationFormType;
  targetModule: SystemEvaluationTargetModule;
  title: string;
  description: string;
  audienceRole: SystemEvaluationAudienceRole;
  classId: string | null;
  class?: TeacherEvaluationClass | null;
  startsAt: string;
  endsAt: string;
  status: SystemEvaluationAssignmentStatus;
  submittedAt?: string | null;
  questions: TeacherEvaluationQuestion[];
};

export type SystemEvaluationDashboard = {
  pending: AssignedSystemEvaluation[];
  completed: AssignedSystemEvaluation[];
};

export type SubmitAssignedSystemEvaluationDto = {
  questionRatings: Record<string, number>;
  feedback?: string;
};

export type SystemEvaluationCampaignStatus = 'draft' | 'active' | 'closed';
export type SystemEvaluationCampaign = {
  id: string;
  formType: SystemEvaluationFormType;
  targetModule: SystemEvaluationTargetModule;
  audienceRole: SystemEvaluationAudienceRole;
  classId: string | null;
  class?: TeacherEvaluationClass | null;
  title: string;
  startsAt: string;
  endsAt: string;
  status: SystemEvaluationCampaignStatus;
  createdAt: string;
  updatedAt: string;
  assignmentCount: number;
  submittedCount: number;
};

export type CreateSystemEvaluationCampaignDto = {
  formType: SystemEvaluationFormType;
  audienceRole: SystemEvaluationAudienceRole;
  classId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status?: SystemEvaluationCampaignStatus;
};

export const evaluationsApi = {
  async getStudentInbox(): Promise<TeacherEvaluationDashboard> {
    const response = await apiClient.get<ApiEnvelope<TeacherEvaluationDashboard>>(
      '/lxp/me/teacher-evaluations',
    );
    return unwrapEnvelope(response.data);
  },

  async submitEvaluation(payload: SubmitTeacherEvaluationDto) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(
      '/lxp/me/teacher-evaluations',
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async getMySystemEvaluations(): Promise<SystemEvaluationDashboard> {
    const response = await apiClient.get<ApiEnvelope<SystemEvaluationDashboard>>(
      '/lxp/me/system-evaluations',
    );
    return unwrapEnvelope(response.data);
  },

  async submitAssignedSystemEvaluation(
    assignmentId: string,
    payload: SubmitAssignedSystemEvaluationDto,
  ) {
    const response = await apiClient.post<ApiEnvelope<AssignedSystemEvaluation>>(
      `/lxp/me/system-evaluations/${assignmentId}/submit`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async getCampaigns(filters?: { formType?: SystemEvaluationFormType; audienceRole?: SystemEvaluationAudienceRole; status?: SystemEvaluationCampaignStatus; classId?: string }) {
    const response = await apiClient.get<ApiEnvelope<{ campaigns: SystemEvaluationCampaign[]; count: number }>>('/lxp/system-evaluation-campaigns', { params: filters });
    return unwrapEnvelope(response.data);
  },

  async createCampaign(payload: CreateSystemEvaluationCampaignDto) {
    const response = await apiClient.post<ApiEnvelope<SystemEvaluationCampaign>>('/lxp/system-evaluation-campaigns', payload);
    return unwrapEnvelope(response.data);
  },

  async updateCampaignStatus(id: string, status: SystemEvaluationCampaignStatus) {
    const response = await apiClient.patch<ApiEnvelope<SystemEvaluationCampaign>>(`/lxp/system-evaluation-campaigns/${id}/status`, { status });
    return unwrapEnvelope(response.data);
  },
};
