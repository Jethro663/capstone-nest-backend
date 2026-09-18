'use client';

import { useEffect, useState } from 'react';
import { fileService } from '@/services/file-service';

export function useLibraryFileObjectUrl(
  fileId?: string | null,
  previewFileUrl?: string,
) {
  const [objectUrl, setObjectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setObjectUrl('');
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    let url = '';

    const load = async () => {
      try {
        setLoading(true);
        setFailed(false);
        const blob = previewFileUrl
          ? await fetch(previewFileUrl, { cache: 'no-store' }).then(
              async (response) => {
                if (!response.ok) throw new Error('Preview file unavailable');
                return response.blob();
              },
            )
          : await fileService.download(fileId);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      } catch {
        if (!cancelled) {
          setObjectUrl('');
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [fileId, previewFileUrl]);

  return { objectUrl, loading, failed };
}
