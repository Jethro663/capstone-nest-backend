import { useEffect } from "react";
import type { AdminToolSection } from "../navigation/types";
import { legacyAdminRouteForSection } from "../navigation/admin-route-manifest";
import {
  AdminButton,
  AdminNotice,
  AdminScreen,
} from "../components/admin/AdminMobilePrimitives";

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: unknown) => void;
  };
  route: { params?: { section?: AdminToolSection } };
};

export function AdminToolsScreen({ navigation, route }: Props) {
  const section = route.params?.section ?? "users";
  const destination = legacyAdminRouteForSection(section);
  const openDestination = () =>
    navigation.navigate("MainTabs", { screen: destination });

  useEffect(() => {
    openDestination();
  }, [destination]);

  return (
    <AdminScreen
      title="Opening admin workspace"
      subtitle="This saved link now routes to its dedicated administrator screen"
      showBackButton
      onBackPress={navigation.goBack}
    >
      <AdminNotice
        title="Workspace moved"
        description="Administrator domains now keep independent navigation, filters, loading, and form state."
        tone="primary"
      />
      <AdminButton
        label="Continue"
        icon="arrow-right"
        variant="solid"
        onPress={openDestination}
      />
    </AdminScreen>
  );
}
