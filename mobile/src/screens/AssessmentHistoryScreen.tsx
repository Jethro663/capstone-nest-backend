import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, TextInput, View } from "react-native";
import { peekAppError } from "../api/http";
import { useAssessmentHistory } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme } from "../theme/studentDark";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import { presentAcademicScore } from "../lib/academicScore";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentHistory">;
type SubmissionFilter = "all" | "submitted" | "in_progress";
type Tone = "blue" | "green" | "amber" | "red" | "purple";

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

function resolveToneStyle(tone: Tone) {
  return {
    blue: { backgroundColor: theme.blueSoft, color: theme.blue },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    red: { backgroundColor: theme.redSoft, color: theme.red },
    purple: { backgroundColor: theme.purpleSoft, color: theme.purple },
  }[tone];
}

function DarkPanel({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      {children}
    </View>
  );
}

function ToneTag({ label, tone }: { label: string; tone: Tone }) {
  const toneStyle = resolveToneStyle(tone);

  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: toneStyle.backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: toneStyle.color }}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const primary = variant === "primary";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 12,
        borderWidth: primary ? 0 : 1,
        borderColor: primary ? "transparent" : theme.border,
        backgroundColor: disabled
          ? theme.active
          : primary
            ? theme.red
            : theme.surface,
        paddingHorizontal: 14,
        paddingVertical: 11,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: disabled ? theme.muted : primary ? "#FFFFFF" : theme.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
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
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={historyQuery.isRefetching}
          onRefresh={() => {
            void historyQuery.refetch();
          }}
        />
      }
    >
      <View
        style={{
          backgroundColor: theme.header,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View
          style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.active,
              }}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color={theme.text}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}
              >
                Student Records
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: theme.text,
                  fontSize: 28,
                  fontWeight: "800",
                }}
              >
                Assessment History
              </Text>
            </View>
            <ToneTag
              label={`${historyQuery.data?.total ?? filteredRows.length} attempts`}
              tone="blue"
            />
          </View>

          <View
            style={{
              marginTop: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.active,
              paddingHorizontal: 14,
              paddingVertical: 4,
            }}
          >
            <TextInput
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search by assessment or class"
              placeholderTextColor={theme.muted}
              style={{ color: theme.text, fontSize: 13, paddingVertical: 10 }}
            />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 10 }}>
        <DarkPanel>
          <Text style={{ fontSize: 15, fontWeight: "800", color: theme.text }}>
            Filter attempts
          </Text>
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
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
                    borderColor: active ? theme.amber : theme.border,
                    backgroundColor: active ? theme.amberSoft : theme.active,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      color: active ? theme.amber : theme.text,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {value === "in_progress"
                      ? "In Progress"
                      : value === "submitted"
                        ? "Submitted"
                        : "All"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </DarkPanel>

        {historyQuery.error ? (
          <DarkPanel>
            <Text
              style={{ fontSize: 14, fontWeight: "800", color: theme.text }}
            >
              Assessment history is unavailable
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 18,
                color: theme.muted,
              }}
            >
              {peekAppError(historyQuery.error).message}
            </Text>
          </DarkPanel>
        ) : null}

        {filteredRows.length === 0 ? (
          <DarkPanel>
            <Text
              style={{ fontSize: 14, fontWeight: "800", color: theme.text }}
            >
              No attempts found
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 18,
                color: theme.muted,
              }}
            >
              Try a different search or filter to find a previous attempt.
            </Text>
          </DarkPanel>
        ) : (
          filteredRows.map((row) => {
            const isSubmitted = row.isSubmitted !== false;
            const actionLabel = isSubmitted
              ? "View Results"
              : "Continue Attempt";
            const statusLabel = isSubmitted ? "Submitted" : "In Progress";
            const statusTone = isSubmitted ? "green" : "blue";
            const subjectLabel =
              row.assessment?.class?.subjectName &&
              row.assessment?.class?.subjectCode
                ? `${row.assessment.class.subjectName} (${row.assessment.class.subjectCode})`
                : row.assessment?.class?.subjectName || "Class";
            const scoreLabel =
              presentAcademicScore(row).scorePercent !== null
                ? presentAcademicScore(row).compactLabel
                : "Checking";

            if (isSubmitted) {
              return (
                <DarkPanel key={row.id}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate("AssessmentResults", {
                        attemptId: row.id,
                        assessmentId: row.assessmentId,
                      } as never)
                    }
                    style={{
                      minHeight: 72,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 68,
                        minHeight: 58,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.greenLine,
                        backgroundColor: theme.greenSoft,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "800",
                          letterSpacing: 0.5,
                          color: theme.green,
                        }}
                      >
                        RESULT
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 18,
                          fontWeight: "900",
                          color: theme.green,
                        }}
                      >
                        {scoreLabel}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: theme.blue,
                        }}
                      >
                        {subjectLabel}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{
                          marginTop: 3,
                          fontSize: 15,
                          lineHeight: 20,
                          fontWeight: "900",
                          color: theme.text,
                        }}
                      >
                        {row.assessment?.title || "Quiz"}
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: theme.muted,
                        }}
                      >
                        Submitted {formatDate(row.submittedAt)} · Attempt #
                        {row.attemptNumber}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <ToneTag label="Submitted" tone="green" />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: theme.blue,
                        }}
                      >
                        View Results
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={theme.dim}
                      />
                    </View>
                  </Pressable>
                </DarkPanel>
              );
            }

            return (
              <DarkPanel key={row.id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate("AssessmentDetail", {
                          assessmentId: row.assessmentId,
                          classId:
                            row.assessment?.classId || routeClassId || "",
                        })
                      }
                    >
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "800",
                          color: theme.text,
                        }}
                      >
                        {row.assessment?.title || "Assessment"}
                      </Text>
                    </Pressable>
                    <Text
                      style={{ marginTop: 4, fontSize: 12, color: theme.muted }}
                    >
                      {subjectLabel} • Attempt #{row.attemptNumber}
                    </Text>
                  </View>
                  <ToneTag label={statusLabel} tone={statusTone} />
                </View>

                <View
                  style={{
                    marginTop: 14,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      minWidth: 110,
                      flex: 1,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: theme.muted,
                      }}
                    >
                      STARTED
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        fontWeight: "800",
                        color: theme.text,
                      }}
                    >
                      {formatDate(row.startedAt)}
                    </Text>
                  </View>
                  <View
                    style={{
                      minWidth: 110,
                      flex: 1,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: theme.muted,
                      }}
                    >
                      SUBMITTED
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        fontWeight: "800",
                        color: theme.text,
                      }}
                    >
                      {formatDate(row.submittedAt)}
                    </Text>
                  </View>
                  <View
                    style={{
                      minWidth: 110,
                      flex: 1,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: theme.muted,
                      }}
                    >
                      SCORE
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 22,
                        lineHeight: 26,
                        fontWeight: "900",
                        color: theme.text,
                      }}
                    >
                      {row.score ?? "--"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{ marginTop: 12, fontSize: 12, color: theme.muted }}
                >
                  Due:{" "}
                  <Text style={{ color: theme.text, fontWeight: "700" }}>
                    {formatDate(row.assessment?.dueDate)}
                  </Text>
                </Text>

                <View
                  style={{
                    marginTop: 14,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <ActionButton
                    label={actionLabel}
                    onPress={() => {
                      if (isSubmitted) {
                        navigation.navigate("AssessmentResults", {
                          attemptId: row.id,
                          assessmentId: row.assessmentId,
                        } as never);
                        return;
                      }

                      navigation.navigate("AssessmentTake", {
                        assessmentId: row.assessmentId,
                      });
                    }}
                  />
                  <ActionButton
                    label="Open Assessment"
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate("AssessmentDetail", {
                        assessmentId: row.assessmentId,
                        classId: row.assessment?.classId || routeClassId || "",
                      })
                    }
                  />
                </View>
              </DarkPanel>
            );
          })
        )}

        {!isScopedHistory && (historyQuery.data?.totalPages ?? 1) > 1 ? (
          <DarkPanel>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.muted }}>
                Page {historyQuery.data?.page ?? page} of{" "}
                {historyQuery.data?.totalPages ?? 1}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <ActionButton
                  label="Previous"
                  variant="secondary"
                  disabled={page <= 1}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                />
                <ActionButton
                  label="Next"
                  variant="secondary"
                  disabled={page >= (historyQuery.data?.totalPages ?? 1)}
                  onPress={() =>
                    setPage((current) =>
                      Math.min(
                        historyQuery.data?.totalPages ?? current,
                        current + 1,
                      ),
                    )
                  }
                />
              </View>
            </View>
          </DarkPanel>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
