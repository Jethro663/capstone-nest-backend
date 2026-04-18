import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { Card, EmptyState, GradientHeader, Pill, Refreshable, ScreenScroll, SearchField, SectionTitle } from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { useAssessmentHistory } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentHistory">;
type SubmissionFilter = "all" | "submitted" | "in_progress";

function formatDate(value?: string | null) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AssessmentHistoryScreen({ route, navigation }: Props) {
  const routeAssessmentId = route.params?.assessmentId;
  const routeClassId = route.params?.classId;
  const isScopedHistory = !!routeAssessmentId || !!routeClassId;
  const [search, setSearch] = useState("");
  const [submission, setSubmission] = useState<SubmissionFilter>("all");
  const [page, setPage] = useState(1);

  const historyQuery = useAssessmentHistory({
    page: isScopedHistory ? 1 : page,
    limit: isScopedHistory ? 1000 : 10,
    submission,
    search: search.trim() || undefined,
  });

  const filteredRows = useMemo(() => {
    const rows = historyQuery.data?.data ?? [];

    return rows.filter((row) => {
      if (routeAssessmentId && row.assessmentId !== routeAssessmentId) {
        return false;
      }

      if (routeClassId && row.assessment?.classId !== routeClassId) {
        return false;
      }

      return true;
    });
  }, [historyQuery.data?.data, routeAssessmentId, routeClassId]);

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={historyQuery.isRefetching}
          onRefresh={() => {
            void historyQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader colors={gradients.assessments} eyebrow="Student Records" title="Assessment History">
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.white} />
          </Pressable>
          <Pill
            label={`${historyQuery.data?.total ?? filteredRows.length} attempts`}
            backgroundColor="rgba(255,255,255,0.18)"
            color={colors.white}
          />
        </View>

        <SearchField
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by assessment or class"
        />
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        <Card>
          <SectionTitle title="Filter Attempts" />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(["all", "submitted", "in_progress"] as const).map((value) => {
              const active = submission === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setSubmission(value);
                    setPage(1);
                  }}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? colors.amber : colors.border,
                    backgroundColor: active ? colors.paleAmber : colors.white,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: active ? colors.text : colors.textSecondary, fontSize: 12, fontWeight: "800" }}>
                    {value === "in_progress" ? "In Progress" : value === "submitted" ? "Submitted" : "All"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {historyQuery.error ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Assessment history is unavailable
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(historyQuery.error).message}
            </Text>
          </Card>
        ) : null}

        {filteredRows.length === 0 ? (
          <EmptyState
            emoji="ðŸ“š"
            title="No attempts found"
            subtitle="Try a different search or filter to find a previous attempt."
          />
        ) : (
          filteredRows.map((row) => {
            const isSubmitted = row.isSubmitted !== false;
            const actionLabel = isSubmitted ? "View Results" : "Continue Attempt";
            const statusLabel = isSubmitted ? "Submitted" : "In Progress";
            const subjectLabel =
              row.assessment?.class?.subjectName && row.assessment?.class?.subjectCode
                ? `${row.assessment.class.subjectName} (${row.assessment.class.subjectCode})`
                : row.assessment?.class?.subjectName || "Class";

            return (
              <Card key={row.id}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate("AssessmentDetail", {
                          assessmentId: row.assessmentId,
                          classId: row.assessment?.classId || routeClassId || "",
                        })
                      }
                    >
                      <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                        {row.assessment?.title || "Assessment"}
                      </Text>
                    </Pressable>
                    <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                      {subjectLabel} • Attempt #{row.attemptNumber}
                    </Text>
                  </View>
                  <Pill
                    label={statusLabel}
                    backgroundColor={isSubmitted ? colors.paleGreen : colors.paleBlue}
                    color={isSubmitted ? colors.green : colors.blueDeep}
                  />
                </View>

                <View style={{ marginTop: 12, gap: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Started: <Text style={{ color: colors.text, fontWeight: "800" }}>{formatDate(row.startedAt)}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Submitted: <Text style={{ color: colors.text, fontWeight: "800" }}>{formatDate(row.submittedAt)}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Due: <Text style={{ color: colors.text, fontWeight: "800" }}>{formatDate(row.assessment?.dueDate)}</Text>
                  </Text>
                </View>

                <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>
                    Score: {row.score ?? "--"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Pressable
                      onPress={() => {
                        if (isSubmitted) {
                          navigation.navigate("AssessmentResults", {
                            attemptId: row.id,
                            assessmentId: row.assessmentId,
                          } as never);
                          return;
                        }

                        navigation.navigate("AssessmentTake", { assessmentId: row.assessmentId });
                      }}
                      style={{
                        borderRadius: 16,
                        backgroundColor: colors.text,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>{actionLabel}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        navigation.navigate("AssessmentDetail", {
                          assessmentId: row.assessmentId,
                          classId: row.assessment?.classId || routeClassId || "",
                        })
                      }
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.white,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>Open Assessment</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {!isScopedHistory && (historyQuery.data?.totalPages ?? 1) > 1 ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Page {historyQuery.data?.page ?? page} of {historyQuery.data?.totalPages ?? 1}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  style={{
                    borderRadius: 14,
                    backgroundColor: page <= 1 ? colors.border : colors.white,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: page <= 1 ? colors.muted : colors.text, fontSize: 12, fontWeight: "800" }}>Previous</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setPage((current) => Math.min(historyQuery.data?.totalPages ?? current, current + 1))
                  }
                  disabled={page >= (historyQuery.data?.totalPages ?? 1)}
                  style={{
                    borderRadius: 14,
                    backgroundColor: page >= (historyQuery.data?.totalPages ?? 1) ? colors.border : colors.white,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: page >= (historyQuery.data?.totalPages ?? 1) ? colors.muted : colors.text, fontSize: 12, fontWeight: "800" }}>Next</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
