export type QuietNotificationPresentation = {
  visible: boolean;
  count: number;
};

export const EMPTY_QUIET_NOTIFICATION_PRESENTATION: QuietNotificationPresentation = {
  visible: false,
  count: 0,
};

export function addQuietNotifications(
  current: QuietNotificationPresentation,
  incoming: number,
): QuietNotificationPresentation {
  const safeIncoming = Math.floor(incoming);
  if (!Number.isFinite(incoming) || safeIncoming <= 0) return current;

  return {
    visible: true,
    count: Math.max(0, current.count) + safeIncoming,
  };
}

export function dismissQuietNotifications(): QuietNotificationPresentation {
  return EMPTY_QUIET_NOTIFICATION_PRESENTATION;
}
