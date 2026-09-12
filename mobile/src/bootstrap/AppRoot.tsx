import { AppProviders } from "../providers/AppProviders";
import { AppNavigator } from "../navigation/AppNavigator";
import { SystemResetProvider } from "../providers/SystemResetProvider";
import { SystemResetProgressGate } from "../screens/SystemResetProgressGate";

export function AppRoot() {
  return (
    <AppProviders>
      <SystemResetProvider>
        <SystemResetProgressGate>
          <AppNavigator />
        </SystemResetProgressGate>
      </SystemResetProvider>
    </AppProviders>
  );
}
