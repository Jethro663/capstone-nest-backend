import { AppProviders } from "../providers/AppProviders";
import { AppNavigator } from "../navigation/AppNavigator";

export function AppRoot() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}
