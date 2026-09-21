import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  mobileBrand,
  mobileRadii,
  mobileSpacing,
} from "../../theme/mobileBrand";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type StudentNextMoveTone = "info" | "warning" | "success";

function tonePalette(tone: StudentNextMoveTone) {
  if (tone === "warning") {
    return { foreground: mobileBrand.warning, surface: mobileBrand.warningSoft };
  }
  if (tone === "success") {
    return { foreground: mobileBrand.success, surface: mobileBrand.successSoft };
  }
  return { foreground: mobileBrand.info, surface: mobileBrand.infoSoft };
}

export function StudentNextMoveRow({
  icon,
  label,
  title,
  subtitle,
  tone = "info",
  onPress,
}: {
  icon: IconName;
  label: string;
  title: string;
  subtitle: string;
  tone?: StudentNextMoveTone;
  onPress?: () => void;
}) {
  const palette = tonePalette(tone);
  const content = (
    <>
      <View
        testID="student-next-move-icon"
        style={[styles.icon, { backgroundColor: palette.surface }]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={palette.foreground} />
      </View>
      <View testID="student-next-move-copy" style={styles.copy}>
        <Text maxFontSizeMultiplier={1.25} style={styles.label}>
          {label}
        </Text>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {onPress ? (
        <MaterialCommunityIcons
          name="arrow-top-right"
          size={18}
          color={mobileBrand.dim}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View testID="student-next-move-row" style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID="student-next-move-row"
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${title}`}
      onPress={onPress}
      style={styles.row}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    minHeight: 88,
    borderTopWidth: 1,
    borderTopColor: mobileBrand.border,
    backgroundColor: mobileBrand.surface,
    paddingHorizontal: 14,
    paddingVertical: mobileSpacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: mobileSpacing.sm,
  },
  icon: {
    width: mobileBrand.minTarget,
    height: mobileBrand.minTarget,
    flexShrink: 0,
    borderRadius: mobileRadii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  label: {
    color: mobileBrand.red,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 3,
    color: mobileBrand.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: mobileBrand.muted,
    fontSize: 11,
    lineHeight: 16,
  },
});
