import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateFromOutsideNavigator<RouteName extends keyof RootStackParamList>(
  routeName: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (!rootNavigationRef.isReady()) return false;
  (rootNavigationRef.navigate as unknown as (name: string, params?: unknown) => void)(String(routeName), params);
  return true;
}
