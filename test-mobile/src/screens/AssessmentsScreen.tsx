import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, EmptyState, FloatingIconButton, GradientHeader, Pill, ScreenScroll } from "../components/ui/primitives";
import { assessments, subjects } from "../data/mockData";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;
type FilterType = "all" | "pending" | "late" | "missing" | "completed";

const filterColors: Record<FilterType, { bg: string; text: string; border: string }> = {
  all: { bg: colors.amber, text: colors.white, border: colors.amber },
  pending: { bg: colors.blue, text: colors.white, border: colors.blue },
  late: { bg: colors.red, text: colors.white, border: colors.red },
  missing: { bg: colors.orange, text: colors.white, border: colors.orange },
  completed: { bg: colors.green, text: colors.white, border: colors.green },
};

const statusConfig = {
  pending: { icon: "clock-outline", color: colors.blue, bg: colors.paleBlue, label: "Pending" },
  late: { icon: "alert-circle", color: colors.red, bg: colors.paleRed, label: "Late" },
  missing: { icon: "close-circle", color: colors.orange, bg: colors.paleOrange, label: "Missing" },
  completed: { icon: "check-circle", color: colors.green, bg: colors.paleGreen, label: "Completed" },
} as const;

export function AssessmentsScreen(_: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filters: FilterType[] = ["all", "pending", "late", "missing", "completed"];
  const pendingCount = useMemo(() => assessments.filter((entry) => entry.status === "pending").length, []);
  const lateCount = useMemo(() => assessments.filter((entry) => entry.status === "late").length, []);
  const missingCount = useMemo(() => assessments.filter((entry) => entry.status === "missing").length, []);
  const filtered = activeFilter === "all" ? assessments : assessments.filter((entry) => entry.status === activeFilter);

  return (
    <ScreenScroll>
      <GradientHeader
        colors={gradients.assessments}
        eyebrow="Track your work 📝"
        title="Assessments"
        rightContent={
          <FloatingIconButton
            icon="bell-outline"
            badge={
              pendingCount + lateCount + missingCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    paddingHorizontal: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#EF4444",
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 10, fontWeight: "900" }}>
                    {pendingCount + lateCount + missingCount}
                  </Text>
                </View>
              ) : null
            }
          />
        }
      >
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {[
            { label: "Pending", count: pendingCount, color: colors.blue },
            { label: "Late", count: lateCount, color: colors.red },
            { label: "Missing", count: missingCount, color: colors.orange },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "rgba(255,255,255,0.24)",
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: item.color }} />
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>
                {item.count} {item.label}
              </Text>
            </View>
          ))}
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            const config = filterColors[filter];
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: isActive ? config.bg : colors.white,
                  borderWidth: 2,
                  borderColor: isActive ? config.border : colors.border,
                }}
              >
                <Text
                  style={{
                    color: isActive ? config.text : colors.muted,
                    fontSize: 13,
                    fontWeight: "800",
                    textTransform: "capitalize",
                  }}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: 8, gap: 12 }}>
          {filtered.length === 0 ? (
            <EmptyState emoji="🎉" title="All clear!" subtitle={`No ${activeFilter} assessments`} />
          ) : (
            filtered.map((assessment) => {
              const config = statusConfig[assessment.status];
              const subject = subjects.find((entry) => entry.id === assessment.subjectId);
              const isUrgent = assessment.status === "late" || assessment.status === "missing";

              return (
                <Card key={assessment.id} style={{ overflow: "hidden", padding: 0 }}>
                  {isUrgent ? (
                    <View style={{ height: 3, backgroundColor: config.color, width: "100%" }} />
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
                    <View
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: subject?.bgColor ?? "#F3F4F6",
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{assessment.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
                          {assessment.title}
                        </Text>
                        {isUrgent ? (
                          <Pill label={`⚠️ ${config.label}`} backgroundColor={config.bg} color={config.color} />
                        ) : null}
                      </View>
                      <Text style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>{assessment.subject}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color={colors.muted} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
                            Due: {assessment.dueDate}
                          </Text>
                        </View>
                        {assessment.status === "completed" && assessment.score ? (
                          <Pill
                            label={`${assessment.score}/${assessment.totalScore} ✓`}
                            backgroundColor={colors.paleGreen}
                            color={colors.green}
                          />
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: "center", justifyContent: "space-between" }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: config.bg,
                        }}
                      >
                        <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
                      </View>
                      {assessment.status !== "completed" ? (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: subject?.color ?? colors.amber,
                          }}
                        >
                          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.white} />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </View>
    </ScreenScroll>
  );
}
