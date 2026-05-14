import { api } from '@/lib/api-client';
import type {
  AcademicStateCurrent,
  AcademicStateImpactPreview,
} from '@/types/academic-state';

export const academicStateService = {
  async getCurrent() {
    const { data } = await api.get('/academic-state/current');
    return data as {
      success: boolean;
      message: string;
      data: AcademicStateCurrent;
    };
  },

  async getImpactPreview(payload: { schoolYear: string }) {
    const { data } = await api.get('/academic-state/impact-preview', {
      params: payload,
    });
    return data as {
      success: boolean;
      message: string;
      data: AcademicStateImpactPreview;
    };
  },

  async transition(payload: {
    schoolYear: string;
    currentPassword: string;
    confirmationText: string;
  }) {
    const { data } = await api.post('/academic-state/transition', payload);
    return data as {
      success: boolean;
      message: string;
      data: {
        state: AcademicStateCurrent;
        impact: {
          classRecordsFinalized: number;
          enrollmentsCompleted: number;
          classesArchived: number;
          sectionsArchived: number;
          schoolEventsArchived: number;
          reusableSectionsCreated: number;
          reusableClassesCreated: number;
          classSchedulesCloned: number;
          classSchedulesCleared: boolean;
          reusableContentCloned: {
            assessmentsCreated: number;
            assessmentQuestionsCreated: number;
            lessonsCreated: number;
            lessonBlocksCreated: number;
            modulesCreated: number;
            moduleSectionsCreated: number;
            moduleItemsCreated: number;
            moduleGradingScaleEntriesCreated: number;
          };
        };
      };
    };
  },
};
