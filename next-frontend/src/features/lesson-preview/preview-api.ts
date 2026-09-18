import { getServerApiOrigin } from '@/lib/api-origin';
import type { Lesson } from '@/types/lesson';

type LessonPreviewEnvelope = {
  success: boolean;
  data: Lesson;
};

export async function getLessonPreview(
  token: string,
  apiOrigin = getServerApiOrigin(),
): Promise<Lesson> {
  const response = await fetch(
    `${apiOrigin.replace(/\/$/, '')}/api/lessons/preview/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error('Lesson preview is unavailable or expired');
  }
  const payload = (await response.json()) as LessonPreviewEnvelope;
  if (!payload.success || !payload.data?.id) {
    throw new Error('Lesson preview is unavailable or expired');
  }
  return payload.data;
}
