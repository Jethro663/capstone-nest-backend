import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  PanResponder,
  Platform,
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
import { colors, modernAcademic, radii, shadow, skillStream } from "../../theme/tokens";

type RefreshControlState = {
  refreshing: boolean;
  onRefresh?: () => void;
};

function resolveRefreshControlState(refreshControl?: React.ComponentProps<typeof ScrollView>["refreshControl"]) {
  if (!refreshControl) {
    return null;
  }

  const props = (refreshControl as { props?: { refreshing?: boolean; onRefresh?: () => void } }).props;
  if (!props) {
    return null;
  }

  return {
    refreshing: !!props.refreshing,
    onRefresh: typeof props.onRefresh === "function" ? props.onRefresh : undefined,
  } satisfies RefreshControlState;
}

function RefreshActivityOverlay({
  refreshing,
  pullDistance = 0,
  onRefresh,
}: RefreshControlState & { pullDistance?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const visible = refreshing || pullDistance > 0;
  const triggerDistance = 72;
  const armed = pullDistance >= triggerDistance;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(-10);
      rotate.stopAnimation(() => rotate.setValue(0));
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(translateY, {
        toValue: refreshing ? 0 : Math.min(20, pullDistance / 5),
        duration: refreshing ? 180 : 80,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();

    if (!refreshing) {
      rotate.stopAnimation(() => rotate.setValue(0));
      return;
    }

    rotate.setValue(0);
    const spin = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 900,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    spin.start();

    return () => {
      spin.stop();
      rotate.stopAnimation(() => rotate.setValue(0));
    };
  }, [opacity, pullDistance, refreshing, rotate, translateY, visible]);

  if (!visible) {
    return null;
  }

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        top: 12,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: refreshing ? modernAcademic.primary : colors.border,
          backgroundColor: skillStream.elevated,
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity,
          transform: [{ translateY }, { scale: 1 }],
        }}
      >
        {refreshing ? (
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <MaterialCommunityIcons name="sync" size={15} color={colors.primary} />
          </Animated.View>
        ) : (
          <MaterialCommunityIcons
            name={armed ? "arrow-down-bold-circle" : "arrow-down-circle-outline"}
            size={15}
            color={armed ? modernAcademic.primary : colors.muted}
          />
        )}
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: colors.textSecondary,
            letterSpacing: 0.3,
          }}
        >
          {refreshing ? "Refreshing" : armed ? "Release to refresh" : "Pull down to refresh"}
        </Text>
      </Animated.View>
    </View>
  );
}

export function ScreenScroll({
  children,
  refreshControl,
  backgroundColor,
}: PropsWithChildren<{
  refreshControl?: React.ComponentProps<typeof ScrollView>["refreshControl"];
  backgroundColor?: string;
}>) {
  const refreshState = resolveRefreshControlState(refreshControl);
  const isAndroidCustomRefresh = Platform.OS === "android" && !!refreshState?.onRefresh;
  const resolvedBackground = backgroundColor ?? colors.surface;
  const [pullDistance, setPullDistance] = useState(0);
  const scrollOffsetRef = useRef(0);

  const resetPull = () => setPullDistance(0);

  const panResponder = useMemo(() => {
    if (!isAndroidCustomRefresh || !refreshState?.onRefresh) {
      return null;
    }

    const triggerDistance = 72;
    const maxPullDistance = 118;

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !refreshState.refreshing &&
        scrollOffsetRef.current <= 0 &&
        gestureState.dy > 8 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        const nextDistance = Math.max(0, Math.min(maxPullDistance, gestureState.dy));
        setPullDistance(nextDistance);
      },
      onPanResponderRelease: (_, gestureState) => {
        const releasedDistance = Math.max(0, Math.min(maxPullDistance, gestureState.dy));
        if (releasedDistance >= triggerDistance) {
          refreshState.onRefresh?.();
        }
        resetPull();
      },
      onPanResponderTerminate: resetPull,
      onPanResponderTerminationRequest: () => false,
    });
  }, [isAndroidCustomRefresh, refreshState]);

  useEffect(() => {
    if (refreshState?.refreshing) {
      return;
    }

    resetPull();
  }, [refreshState?.refreshing]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: resolvedBackground }} edges={["left", "right"]}>
      <View style={{ flex: 1 }} {...(panResponder?.panHandlers ?? {})}>
        <ScrollView
          bounces
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 112 }}
          refreshControl={isAndroidCustomRefresh ? undefined : refreshControl}
          style={{ flex: 1, backgroundColor: resolvedBackground }}
          onScroll={
            isAndroidCustomRefresh
              ? (event) => {
                  scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
                }
              : undefined
          }
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
        {refreshState ? (
          <RefreshActivityOverlay
            refreshing={refreshState.refreshing}
            onRefresh={refreshState.onRefresh}
            pullDistance={pullDistance}
          />
        ) : null}
      </View>
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
      colors={[gradientColors[0] ?? colors.primary, gradientColors[1] ?? colors.primaryContainer]}
      style={{
        paddingTop: Math.max(insets.top, 24) + 8,
        paddingBottom: 22,
        paddingHorizontal: 20,
        borderBottomLeftRadius: radii.header,
        borderBottomRightRadius: radii.header,
        overflow: "hidden",
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" }}>{eyebrow}</Text>
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
        minWidth: 44,
        minHeight: 44,
        width: 44,
        height: 44,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.28)",
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
          backgroundColor: colors.card,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          ...shadow.card,
        },
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
    <View style={{ height, borderRadius: 999, backgroundColor: trackColor === "#E5E7EB" ? modernAcademic.surfaceContainerHigh : trackColor, overflow: "hidden" }}>
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
        minHeight: 48,
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: radii.md,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
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
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary, colors.primaryContainer]}
      progressBackgroundColor={colors.card}
    />
  );
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
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        delay,
        useNativeDriver: Platform.OS !== "web",
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
          backgroundColor: modernAcademic.surfaceContainer,
          borderWidth: 1,
          borderColor: colors.border,
        },
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
        borderWidth: translucent ? 0 : 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: "center",
        backgroundColor: translucent ? "rgba(255,255,255,0.2)" : colors.card,
        ...(!translucent ? shadow.card : {}),
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
          color: translucent ? "rgba(255,255,255,0.82)" : colors.muted,
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
