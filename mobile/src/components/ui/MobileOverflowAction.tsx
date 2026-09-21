import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { mobileBrand, mobileRadii } from "../../theme/mobileBrand";

export function MobileOverflowAction({
  accessibilityLabel,
  onPress,
  disabled = false,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: mobileBrand.minTarget,
        height: mobileBrand.minTarget,
        opacity: disabled ? 0.45 : 1,
        borderRadius: mobileRadii.control,
        borderWidth: 1,
        borderColor: mobileBrand.border,
        backgroundColor: mobileBrand.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name="dots-horizontal" size={22} color={mobileBrand.navy} />
    </Pressable>
  );
}

