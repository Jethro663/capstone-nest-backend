import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { colors, radii, shadow } from "../../theme/tokens";

export function ScreenScroll({
  children,
  refreshControl,
}: PropsWithChildren<{ refreshControl?: React.ComponentProps<typeof ScrollView>["refreshControl"] }>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["left", "right"]}>
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 }}
        refreshControl={refreshControl}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function GradientHeader({
  colors: gradientColors,
  eyebrow,
  title,
  rightContent,
  children,
}: {
  colors: readonly [string, string] | string[];
  eyebrow?: string;
  title: string;
  rightContent?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[gradientColors[0] ?? colors.indigo, gradientColors[1] ?? colors.violet]}
      style={{
        paddingTop: Math.max(insets.top, 24) + 8,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: radii.header,
        borderBottomRightRadius: radii.header,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -36,
          right: -36,
          width: 144,
          height: 144,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.18)",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -28,
          left: -24,
          width: 96,
          height: 96,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      />
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "700" }}>{eyebrow}</Text>
          ) : null}
          {title ? (
            <Text style={{ color: colors.white, fontSize: 24, fontWeight: "900", marginTop: eyebrow ? 2 : 0 }}>
              {title}
            </Text>
          ) : null}
        </View>
        {rightContent}
      </View>
      {children}
    </LinearGradient>
  );
}

export function FloatingIconButton({
  icon,
  badge,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  badge?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={colors.white} />
      {badge}
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderRadius: radii.xl,
          padding: 16,
        },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{title}</Text>
      {right}
    </View>
  );
}

export function Pill({
  label,
  backgroundColor,
  color,
}: {
  label: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <View style={{ backgroundColor, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({
  value,
  color,
  trackColor = "#E5E7EB",
  height = 8,
}: {
  value: number;
  color: string;
  trackColor?: string;
  height?: number;
}) {
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: trackColor, overflow: "hidden" }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View
      style={{
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 18,
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <MaterialCommunityIcons name="magnify" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }}
      />
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="items-center py-12">
      <Text style={{ fontSize: 56 }}>{emoji}</Text>
      <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "800", color: colors.text }}>{title}</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: colors.muted }}>{subtitle}</Text>
    </View>
  );
}

export function Refreshable({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />;
}

export function AnimatedEntrance({
  children,
  delay = 0,
  style,
}: PropsWithChildren<{ delay?: number; style?: object }>) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export function LoadingCard({ height = 120 }: { height?: number }) {
  return (
    <View
      style={[
        {
          height,
          borderRadius: radii.xl,
          backgroundColor: "#ECEFF6",
        },
        shadow.card,
      ]}
    />
  );
}

export function StatCard({
  icon,
  iconColor,
  value,
  label,
  translucent,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  value: string | number;
  label: string;
  translucent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.xl,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: "center",
        backgroundColor: translucent ? "rgba(255,255,255,0.2)" : colors.white,
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "900", color: translucent ? colors.white : colors.text }}>
        {value}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: 11,
          fontWeight: "700",
          color: translucent ? "rgba(255,255,255,0.85)" : colors.muted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type ChartDatum = {
  label: string;
  value: number;
  color: string;
};

export function SimpleBarChart({
  data,
  minValue = 0,
  maxValue = 100,
  height = 180,
}: {
  data: ChartDatum[];
  minValue?: number;
  maxValue?: number;
  height?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(windowWidth - 88, 240);
  const chartHeight = height;
  const baselineY = chartHeight - 24;
  const topPadding = 12;
  const barWidth = Math.min(28, Math.max(18, chartWidth / (data.length * 2.6)));
  const gap = barWidth * 0.8;

  const bars = useMemo(
    () =>
      data.map((item, index) => {
        const range = maxValue - minValue || 1;
        const normalized = (item.value - minValue) / range;
        const barHeight = Math.max(4, normalized * (baselineY - topPadding));
        const x = 20 + index * (barWidth + gap);
        const y = baselineY - barHeight;
        return { ...item, x, y, barHeight };
      }),
    [barWidth, baselineY, data, gap, maxValue, minValue]
  );

  return (
    <View style={{ marginTop: 4 }}>
      <Svg width={chartWidth} height={chartHeight}>
        {[0, 1, 2].map((lineIndex) => {
          const y = topPadding + ((baselineY - topPadding) / 3) * lineIndex;
          return <Line key={lineIndex} x1="8" y1={y} x2={chartWidth - 8} y2={y} stroke="#F3F4F6" strokeDasharray="4 4" />;
        })}
        {bars.map((bar) => (
          <Rect
            key={bar.label}
            x={bar.x}
            y={bar.y}
            width={barWidth}
            height={bar.barHeight}
            rx="8"
            fill={bar.color}
          />
        ))}
        {bars.map((bar) => (
          <SvgText
            key={`${bar.label}-label`}
            x={bar.x + barWidth / 2}
            y={chartHeight - 6}
            fill={colors.muted}
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            {bar.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
