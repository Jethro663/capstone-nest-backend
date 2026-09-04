import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { getInstalledNativeVersionInfo } from "../services/update/version-identity";

type Props = {
  color: string;
  style?: StyleProp<ViewStyle>;
};

export function AppVersionInfo({ color, style }: Props) {
  const { currentNativeVersion, currentVersionCode } =
    getInstalledNativeVersionInfo();
  const versionLabel = `Nexora Mobile · v${currentNativeVersion} (build ${currentVersionCode})`;

  return (
    <View
      accessibilityLabel={versionLabel}
      accessible
      style={[
        {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        color={color}
        name="information-outline"
        size={14}
      />
      <Text
        style={{
          color,
          fontSize: 11,
          marginLeft: 6,
          textAlign: "center",
        }}
      >
        {versionLabel}
      </Text>
    </View>
  );
}
