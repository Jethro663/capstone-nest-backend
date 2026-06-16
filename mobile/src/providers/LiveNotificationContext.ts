import { createContext, useContext } from "react";

export type LiveNotificationContextValue = {
  unreadCount: number;
  dismissActive: () => void;
};

export const LiveNotificationContext = createContext<LiveNotificationContextValue>({
  unreadCount: 0,
  dismissActive: () => undefined,
});

export function useLiveNotifications() {
  return useContext(LiveNotificationContext);
}
