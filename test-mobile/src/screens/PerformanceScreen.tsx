import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { peekAppError } from "../api/http";
import { usePerformanceSummary } from "../api/hooks";
import { Card, EmptyState, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Performance">;

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "--";
  }

  return `${Math.round(value)}%`;
}

function formatComputedAt(value: string | Date | undefined) {
  if (!value) {
    return "Awaiting performance sync";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Awaiting performance sync";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PerformanceScreen(_: Props) {
  const performanceQuery = usePerformanceSummary();
  const classes = performanceQuery.data?.classes ?? [];
  const averageScore = performanceQuery.data?.overall.averageBlendedScore ?? null;
  const atRiskClasses = performanceQuery.data?.overall.atRiskClasses ?? 0;
  const classesWithData = performanceQuery.data?.overall.classesWithData ?? 0;

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={performanceQuery.isRefetching}
          onRefresh={() => {
            void performanceQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader colors={gradients.progress} eyebrow="Student Analytics" title="Performance overview">
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
          Track blended scores, at-risk classes, and the latest subject-level performance snapshots.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 16 }}>
        {performanceQuery.error ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Performance data is partially unavailable
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {peekAppError(performanceQuery.error).message}
            </Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>Overall average</Text>
              <Text style={{ marginTop: 8, fontSize: 28, fontWeight: "900", color: colors.text }}>
                {formatScore(averageScore)}
              </Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>At risk</Text>
              <Text style={{ marginTop: 8, fontSize: 28, fontWeight: "900", color: colors.text }}>
                {atRiskClasses}
              </Text>
            </Card>
          </View>
        </View>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle title="Subject breakdown" />
            <Pill
              label={`${classesWithData}/${performanceQuery.data?.overall.totalClasses ?? classes.length} synced`}
              backgroundColor={colors.paleIndigo}
              color={colors.indigo}
            />
          </View>
          {classes.length === 0 ? (
            <EmptyState
              emoji="📈"
              title="No class performance yet"
              subtitle="Your subject breakdown will appear once the backend computes class performance."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {classes.map((entry) => (
                <Card key={entry.classId} style={{ backgroundColor: colors.surface }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>
                        {entry.class?.subjectName || entry.class?.subjectCode || entry.classId}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                        {entry.class?.subjectCode || "Subject code unavailable"}
                      </Text>
                    </View>
                    <Pill
                      label={entry.isAtRisk ? "At Risk" : "Stable"}
                      backgroundColor={entry.isAtRisk ? colors.paleRed : colors.paleGreen}
                      color={entry.isAtRisk ? colors.red : colors.green}
                    />
                  </View>

                  <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>Blended</Text>
                      <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: colors.text }}>
                        {formatScore(entry.blendedScore)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>Assessment</Text>
                      <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: colors.text }}>
                        {formatScore(entry.assessmentAverage)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>Class record</Text>
                      <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: colors.text }}>
                        {formatScore(entry.classRecordAverage)}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ marginTop: 12, fontSize: 11, color: colors.textSecondary }}>
                    Last computed: {formatComputedAt(entry.lastComputedAt)}
                  </Text>
                </Card>
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScreenScroll>
  );
}
