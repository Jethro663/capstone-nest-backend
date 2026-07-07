import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../api/queryClient";
import { AuthProvider } from "./AuthProvider";
import { ErrorModalProvider } from "./ErrorModalProvider";
import { LiveNotificationProvider } from "./LiveNotificationProvider";
import { StudentInterventionAlertProvider } from "./StudentInterventionAlertProvider";
import { UpdateProvider } from "./UpdateProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorModalProvider>
            <AuthProvider>
              <StudentInterventionAlertProvider>
                <UpdateProvider>
                  <LiveNotificationProvider>{children}</LiveNotificationProvider>
                </UpdateProvider>
              </StudentInterventionAlertProvider>
            </AuthProvider>
          </ErrorModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
