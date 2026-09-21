import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { mobileBrand, mobileRadii } from "../../theme/mobileBrand";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function MobileFilterSheet<Key extends string>({
  label,
  activeKey,
  options,
  onSelect,
  resultCount,
  icon = "filter-variant",
  compact = false,
}: {
  label: string;
  activeKey: Key;
  options: Array<{ key: Key; label: string; count?: number }>;
  onSelect: (key: Key) => void;
  resultCount?: number;
  icon?: IconName;
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const active = options.find((option) => option.key === activeKey) ?? options[0];
  const activeLabel = active?.label ?? "Choose";
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${activeLabel}`}
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(true)}
        style={{
          minHeight: mobileBrand.minTarget,
          borderRadius: mobileRadii.control,
          borderWidth: 1,
          borderColor: mobileBrand.borderStrong,
          backgroundColor: mobileBrand.surface,
          paddingHorizontal: compact ? 12 : 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={mobileBrand.navy} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {!compact ? <Text style={{ fontSize: 10, fontWeight: "800", color: mobileBrand.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text> : null}
          <Text numberOfLines={1} style={{ marginTop: compact ? 0 : 2, fontSize: 13, fontWeight: "800", color: mobileBrand.text }}>{activeLabel}</Text>
        </View>
        {resultCount !== undefined ? <Text style={{ fontSize: 11, fontWeight: "800", color: mobileBrand.muted }}>{resultCount}</Text> : null}
        <MaterialCommunityIcons name="chevron-down" size={20} color={mobileBrand.muted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: mobileBrand.scrim }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${label}`} onPress={() => setVisible(false)} style={{ flex: 1 }} />
          <View style={{ maxHeight: "78%", borderTopLeftRadius: mobileRadii.sheet, borderTopRightRadius: mobileRadii.sheet, backgroundColor: mobileBrand.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }}>
            <View style={{ width: 40, height: 4, borderRadius: mobileRadii.pill, backgroundColor: mobileBrand.borderStrong, alignSelf: "center", marginBottom: 10 }} />
            <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: mobileBrand.text }}>{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Close ${label}`} onPress={() => setVisible(false)} style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: mobileBrand.surfaceMuted }}>
                <MaterialCommunityIcons name="close" size={20} color={mobileBrand.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const selected = option.key === activeKey;
                const countLabel = option.count === undefined ? option.label : `${option.label}, ${option.count} ${option.count === 1 ? "result" : "results"}`;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityLabel={countLabel}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(option.key);
                      setVisible(false);
                    }}
                    style={{ minHeight: 52, borderBottomWidth: 1, borderBottomColor: mobileBrand.border, flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? mobileBrand.red : mobileBrand.borderStrong, alignItems: "center", justifyContent: "center" }}>
                      {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: mobileBrand.red }} /> : null}
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? "900" : "700", color: selected ? mobileBrand.navy : mobileBrand.text }}>{option.label}</Text>
                    {option.count !== undefined ? <Text style={{ fontSize: 12, color: mobileBrand.muted }}>{option.count}</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

