'use client';

import { useEffect, useState } from 'react';
import { discussionBoardService } from '@/services/discussion-board-service';

export interface DiscussionAttachmentObjectUrlState {
  objectUrl: string | null;
  loading: boolean;
  failed: boolean;
}

interface LoadedDiscussionAttachmentState
  extends DiscussionAttachmentObjectUrlState {
  sourceUrl: string | null;
}

export function useDiscussionAttachmentObjectUrl(
  sourceUrl: string | null | undefined,
): DiscussionAttachmentObjectUrlState {
  const normalizedSourceUrl = sourceUrl ?? null;
  const [loadedState, setLoadedState] =
    useState<LoadedDiscussionAttachmentState>(() => ({
      sourceUrl: normalizedSourceUrl,
      objectUrl: null,
      loading: Boolean(normalizedSourceUrl),
      failed: false,
    }));

  useEffect(() => {
    let cancelled = false;
    let activeObjectUrl: string | null = null;

    if (!sourceUrl) return undefined;

    void discussionBoardService
      .loadAttachment(sourceUrl)
      .then((blob) => {
        const nextObjectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }

        activeObjectUrl = nextObjectUrl;
        setLoadedState({
          sourceUrl,
          objectUrl: nextObjectUrl,
          loading: false,
          failed: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedState({
            sourceUrl,
            objectUrl: null,
            loading: false,
            failed: true,
          });
        }
      });

    return () => {
      cancelled = true;
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [sourceUrl]);

  if (loadedState.sourceUrl !== normalizedSourceUrl) {
    return {
      objectUrl: null,
      loading: Boolean(normalizedSourceUrl),
      failed: false,
    };
  }

  return {
    objectUrl: loadedState.objectUrl,
    loading: loadedState.loading,
    failed: loadedState.failed,
  };
}
