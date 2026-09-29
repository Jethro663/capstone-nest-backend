import { api } from '@/lib/api-client';
import type { SystemCapabilitiesSnapshot } from '@/types/system-capabilities';

export const systemCapabilitiesService = {
  async getSnapshot(): Promise<SystemCapabilitiesSnapshot> {
    const response = await api.get('/system/capabilities');
    return response.data.data;
  },
};
