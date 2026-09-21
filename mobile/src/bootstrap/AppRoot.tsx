import { StatusBar } from "react-native";
import { AppProviders } from "../providers/AppProviders";
import { AppNavigator } from "../navigation/AppNavigator";
import { SystemResetProvider } from "../providers/SystemResetProvider";
import { SystemResetProgressGate } from "../screens/SystemResetProgressGate";
import { mobileBrand } from "../theme/mobileBrand";

export function AppRoot() {
  return (
    <AppProviders>
      <StatusBar barStyle="light-content" backgroundColor={mobileBrand.navy} />
      <SystemResetProvider>
        <SystemResetProgressGate>
          <AppNavigator />
        </SystemResetProgressGate>
      </SystemResetProvider>
    </AppProviders>
  );
}
