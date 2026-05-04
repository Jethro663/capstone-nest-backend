'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { getAccessToken } from '@/lib/api-client';
import { getBrowserSocketOrigin } from '@/lib/api-origin';
import {
  isTrackedExtractionTerminalStatus,
  readAllTrackedExtractionNotifications,
  upsertTrackedExtractionNotification,
} from '@/lib/extraction-notification-tracker';
import { extractionService } from '@/services/extraction-service';
import { normalizeNotification, notificationService } from '@/services/notification-service';
import type { ExtractionStatus } from '@/types/extraction';
import type { Notification } from '@/types/notification';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribe: (listener: (notification: Notification) => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  subscribe: () => () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, role } = useAuth();
  const sessionUserId = isAuthenticated ? user?.id ?? null : null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const subscribersRef = useRef(new Set<(notification: Notification) => void>());

  const subscribe = useCallback((listener: (notification: Notification) => void) => {
    subscribersRef.current.add(listener);
    return () => {
      subscribersRef.current.delete(listener);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, countRes] = await Promise.all([
        notificationService.getAll({ limit: 50 }),
        notificationService.getUnreadCount(),
      ]);
      if (listRes.data) {
        setNotifications(Array.isArray(listRes.data) ? listRes.data : []);
      }
      if (countRes.data) setUnreadCount(countRes.data.count ?? 0);
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // best-effort
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // best-effort
    }
  }, []);

  const syncTrackedExtractionNotifications = useCallback(async () => {
    if (!sessionUserId || role !== 'teacher') return;

    const tracked = readAllTrackedExtractionNotifications().filter(
      (entry) => !isTrackedExtractionTerminalStatus(entry.lastKnownStatus) || !entry.notifiedAt,
    );

    if (tracked.length === 0) return;

    await Promise.all(
      tracked.map(async (entry) => {
        try {
          const statusRes = await extractionService.getStatus(entry.extractionId);
          const nextStatus = statusRes.data.status as ExtractionStatus;
          const nextEntry = {
            ...entry,
            lastKnownStatus: nextStatus,
            lastKnownProgress: statusRes.data.progressPercent,
            updatedAt: new Date().toISOString(),
          };

          const shouldNotify =
            !entry.notifiedAt &&
            !isTrackedExtractionTerminalStatus(entry.lastKnownStatus) &&
            isTrackedExtractionTerminalStatus(nextStatus);

          if (shouldNotify) {
            nextEntry.notifiedAt = new Date().toISOString();
            if (nextStatus === 'completed' || nextStatus === 'applied') {
              toast.success('Extraction ready', {
                description: `${entry.originalName} finished processing and is ready for teacher review.`,
                action: {
                  label: 'View',
                  onClick: () => {
                    window.location.assign(`/dashboard/teacher/extractions/${entry.extractionId}`);
                  },
                },
              });
            } else if (nextStatus === 'failed') {
              toast.error('Extraction failed', {
                description:
                  statusRes.data.errorMessage ||
                  `${entry.originalName} could not be completed. Open the extraction history to review the error.`,
                action: {
                  label: 'History',
                  onClick: () => {
                    window.location.assign(`/dashboard/teacher/classes/${entry.classId}?view=extraction`);
                  },
                },
              });
            }
          }

          upsertTrackedExtractionNotification(entry.classId, nextEntry);
        } catch {
          // Keep the existing tracked state on transient polling failures.
        }
      }),
    );
  }, [role, sessionUserId]);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (sessionUserId) {
      void fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [fetchNotifications, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || role !== 'teacher') return;
    void syncTrackedExtractionNotifications();
    const interval = window.setInterval(() => {
      void syncTrackedExtractionNotifications();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [role, sessionUserId, syncTrackedExtractionNotifications]);

  // WebSocket connection
  useEffect(() => {
    if (!sessionUserId) return;

    const wsUrl = getBrowserSocketOrigin();
    const token = getAccessToken();
    if (!token) return;
    const activeUserId = sessionUserId;

    const socket = io(`${wsUrl}/notifications`, {
      auth: { token: `Bearer ${token}` },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[WS] Notifications connected');
    });

    socket.on('notification.new', (payload: {
      id: string;
      type: string;
      title: string;
      body: string;
      referenceId?: string;
      createdAt: string;
    }) => {
      const newNotification = normalizeNotification({
        id: payload.id,
        userId: activeUserId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        isRead: false,
        referenceId: payload.referenceId,
        createdAt: payload.createdAt,
      });
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      subscribersRef.current.forEach((listener) => {
        try {
          listener(newNotification);
        } catch {
          // best-effort fanout for page-level listeners
        }
      });
      toast(payload.title, {
        description: payload.body,
        action: {
          label: 'View',
          onClick: () => {
            window.location.assign('/dashboard/notifications');
          },
        },
      });
    });

    socket.on('error', (err: { message: string }) => {
      console.warn('[WS] Notification error:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[WS] Notifications disconnected:', reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionUserId]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        subscribe,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
