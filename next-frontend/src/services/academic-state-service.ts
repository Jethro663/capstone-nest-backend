import { api } from '@/lib/api-client';
import type {
  AcademicQuarter,
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

  async getImpactPreview(payload: { schoolYear: string; quarter: AcademicQuarter }) {
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
    quarter: AcademicQuarter;
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
          schoolEventsArchived: number;
        };
      };
    };
  },
};
