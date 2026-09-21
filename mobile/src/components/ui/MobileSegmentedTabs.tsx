import { Pressable, Text, View } from "react-native";
import { mobileBrand, mobileRadii } from "../../theme/mobileBrand";

export function MobileSegmentedTabs<Key extends string>({
  items,
  activeKey,
  onSelect,
  accessibilityLabel,
}: {
  items: Array<{ key: Key; label: string; count?: string | number }>;
  activeKey: Key;
  onSelect: (key: Key) => void;
  accessibilityLabel: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={{ flexDirection: "row", borderRadius: mobileRadii.control, backgroundColor: mobileBrand.surfaceMuted, padding: 4, gap: 3 }}>
      {items.map((item) => {
        const selected = item.key === activeKey;
        const label = item.count === undefined ? item.label : `${item.label}, ${item.count}`;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(item.key)}
            style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 9, backgroundColor: selected ? mobileBrand.surface : "transparent", borderWidth: selected ? 1 : 0, borderColor: mobileBrand.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 7 }}
          >
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, fontWeight: selected ? "900" : "700", color: selected ? mobileBrand.navy : mobileBrand.muted }}>{item.label}</Text>
            {item.count !== undefined ? <Text style={{ fontSize: 10, fontWeight: "900", color: selected ? mobileBrand.red : mobileBrand.dim }}>{item.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

