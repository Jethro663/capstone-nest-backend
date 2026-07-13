'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDiscussionRealtimeRefresh } from '@/hooks/use-discussion-realtime-refresh';
import { getApiErrorMessage } from '@/lib/api-error';
import { discussionBoardService } from '@/services/discussion-board-service';
import type {
  DiscussionThreadDetail,
  DiscussionThreadSummary,
} from '@/types/discussion';

export function sortDiscussionThreads(threads: DiscussionThreadSummary[]) {
  return [...threads].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aTs = new Date(a.publishedAt || a.createdAt || 0).getTime();
    const bTs = new Date(b.publishedAt || b.createdAt || 0).getTime();
    return bTs - aTs;
  });
}

export function useTeacherDiscussionWorkspace({
  classId,
  classIdValid,
  enabled,
}: {
  classId: string;
  classIdValid: boolean;
  enabled: boolean;
}) {
  const [discussionThreads, setDiscussionThreads] = useState<
    DiscussionThreadSummary[]
  >([]);
  const [selectedDiscussionThreadId, setSelectedDiscussionThreadIdState] =
    useState<string | null>(null);
  const [selectedDiscussionThread, setSelectedDiscussionThread] =
    useState<DiscussionThreadDetail | null>(null);

  const setSelectedDiscussionThreadId = useCallback(
    (threadId: string | null) => {
      setSelectedDiscussionThreadIdState(threadId);
      if (threadId === null) setSelectedDiscussionThread(null);
    },
    [],
  );

  const resetDiscussionWorkspace = useCallback(() => {
    setDiscussionThreads([]);
    setSelectedDiscussionThreadIdState(null);
    setSelectedDiscussionThread(null);
  }, []);

  const loadDiscussionThreads = useCallback(async () => {
    if (!classIdValid) {
      resetDiscussionWorkspace();
      return;
    }
    try {
      const response = await discussionBoardService.listThreads(classId, {
        limit: 50,
      });
      setDiscussionThreads(sortDiscussionThreads(response.data.items || []));
    } catch (error) {
      resetDiscussionWorkspace();
      toast.error(
        getApiErrorMessage(error, 'Failed to load discussion threads'),
      );
    }
  }, [classId, classIdValid, resetDiscussionWorkspace]);

  const loadDiscussionThreadDetail = useCallback(
    async (threadId: string) => {
      try {
        const response = await discussionBoardService.getThread(
          classId,
          threadId,
        );
        setSelectedDiscussionThread(response.data);
      } catch (error) {
        setSelectedDiscussionThread(null);
        toast.error(
          getApiErrorMessage(error, 'Failed to load discussion thread'),
        );
      }
    },
    [classId],
  );

  useEffect(() => {
    if (!enabled || !classIdValid) return;
    let active = true;
    void discussionBoardService
      .listThreads(classId, { limit: 50 })
      .then((response) => {
        if (active) {
          setDiscussionThreads(
            sortDiscussionThreads(response.data.items || []),
          );
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        resetDiscussionWorkspace();
        toast.error(
          getApiErrorMessage(error, 'Failed to load discussion threads'),
        );
      });
    return () => {
      active = false;
    };
  }, [classId, classIdValid, enabled, resetDiscussionWorkspace]);

  useEffect(() => {
    if (!selectedDiscussionThreadId) return;
    let active = true;
    void discussionBoardService
      .getThread(classId, selectedDiscussionThreadId)
      .then((response) => {
        if (active) setSelectedDiscussionThread(response.data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSelectedDiscussionThread(null);
        toast.error(
          getApiErrorMessage(error, 'Failed to load discussion thread'),
        );
      });
    return () => {
      active = false;
    };
  }, [classId, selectedDiscussionThreadId]);

  useDiscussionRealtimeRefresh({
    enabled,
    selectedThreadId: selectedDiscussionThreadId,
    refreshThreads: loadDiscussionThreads,
    refreshThread: loadDiscussionThreadDetail,
  });

  return {
    discussionThreads,
    setDiscussionThreads,
    selectedDiscussionThreadId,
    setSelectedDiscussionThreadId,
    selectedDiscussionThread,
    setSelectedDiscussionThread,
    loadDiscussionThreads,
    loadDiscussionThreadDetail,
    resetDiscussionWorkspace,
  };
}
