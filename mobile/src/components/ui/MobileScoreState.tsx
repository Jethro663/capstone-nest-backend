import { Text, View } from "react-native";
import { mobileBrand, mobileRadii } from "../../theme/mobileBrand";

export type MobileScoreStatus = "draft" | "submitted" | "returned" | "missing" | "graded" | string;

function scoreColors(state: MobileScoreStatus) {
  if (state === "returned" || state === "graded") return { color: mobileBrand.success, background: mobileBrand.successSoft };
  if (state === "missing") return { color: mobileBrand.danger, background: mobileBrand.dangerSoft };
  if (state === "submitted") return { color: mobileBrand.navy, background: mobileBrand.navySoft };
  return { color: mobileBrand.warning, background: mobileBrand.warningSoft };
}

export function MobileScoreState({
  score,
  maximum,
  state,
  label,
}: {
  score: number | string | null | undefined;
  maximum: number | string | null | undefined;
  state: MobileScoreStatus;
  label?: string;
}) {
  const colors = scoreColors(state);
  const scoreLabel = score === null || score === undefined || score === "" ? "—" : String(score);
  const maximumLabel = maximum === null || maximum === undefined || maximum === "" ? "—" : String(maximum);
  return (
    <View testID="mobile-score-state" accessibilityLabel={`${label ?? "Score"}: ${scoreLabel} of ${maximumLabel}, ${state}`} style={{ minHeight: 44, borderRadius: mobileRadii.control, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, alignItems: "flex-end", justifyContent: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "900", color: colors.color }}>{scoreLabel}/{maximumLabel}</Text>
      <Text style={{ marginTop: 2, fontSize: 10, fontWeight: "800", color: colors.color, textTransform: "uppercase" }}>{label ?? state}</Text>
    </View>
  );
}

