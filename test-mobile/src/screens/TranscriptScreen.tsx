import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, TextInput, View } from "react-native";
import { toAppError } from "../api/http";
import { useTranscript } from "../api/hooks";
import { Card, EmptyState, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Transcript">;

const PAGE_SIZE = 15;

function formatDate(value?: string) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusPillColors(status: string) {
  if (status === "completed") {
    return { backgroundColor: colors.paleGreen, color: colors.green };
  }

  if (status === "enrolled") {
    return { backgroundColor: colors.paleBlue, color: colors.blueDeep };
  }

  return { backgroundColor: colors.paleAmber, color: colors.orange };
}

export function TranscriptScreen({ navigation }: Props) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const transcriptQuery = useTranscript({
    page,
    limit: PAGE_SIZE,
    status: "all",
    search: search || undefined,
  });
  const rows = transcriptQuery.data?.data ?? [];
  const totalPages = Math.max(transcriptQuery.data?.totalPages ?? 1, 1);
  const totalRows = transcriptQuery.data?.total ?? rows.length;

  const groupedRows = useMemo(() => {
    return rows.reduce<Record<string, typeof rows>>((accumulator, row) => {
      const schoolYear = row.class?.schoolYear || row.section?.schoolYear || "Unknown School Year";
      if (!accumulator[schoolYear]) {
        accumulator[schoolYear] = [];
      }
      accumulator[schoolYear].push(row);
      return accumulator;
    }, {});
  }, [rows]);

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={transcriptQuery.isRefetching}
          onRefresh={() => {
            void transcriptQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader
        colors={gradients.profile}
        eyebrow="Student Records"
        title="Transcript"
        rightContent={
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
            <MaterialCommunityIcons name="chevron-left" size={20} color={colors.white} />
          </Pressable>
        }
      >
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
          Subject enrollment history grouped by school year and backed by the live transcript endpoint.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        <Card>
          <SectionTitle title="Search transcript" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by subject, section, or school year"
            placeholderTextColor={colors.muted}
            style={{
              marginTop: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
            }}
          />
        </Card>

        {transcriptQuery.error ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Transcript data is temporarily unavailable
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(transcriptQuery.error).message}
            </Text>
          </Card>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            emoji="🎓"
            title="No transcript rows found"
            subtitle="Try another search or wait for your academic enrollment history to sync."
          />
        ) : (
          Object.entries(groupedRows).map(([schoolYear, schoolYearRows]) => (
            <Card key={schoolYear}>
              <SectionTitle title={schoolYear} />
              <View style={{ marginTop: 12, gap: 10 }}>
                {schoolYearRows.map((row) => {
                  const pillColors = getStatusPillColors(row.status);
                  return (
                    <Card key={row.id} style={{ backgroundColor: colors.surface }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>
                            {row.class?.subjectName || "Unlinked Subject"} ({row.class?.subjectCode || "--"})
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                            Grade {row.section?.gradeLevel || "--"} • {row.section?.name || "No section"}
                          </Text>
                        </View>
                        <Pill
                          label={row.status}
                          backgroundColor={pillColors.backgroundColor}
                          color={pillColors.color}
                        />
                      </View>
                      <Text style={{ marginTop: 10, fontSize: 11, color: colors.textSecondary }}>
                        Enrolled: {formatDate(row.enrolledAt)}
                      </Text>
                    </Card>
                  );
                })}
              </View>
            </Card>
          ))
        )}

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Showing page {page} of {totalPages} • {totalRows} total rows
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                disabled={page <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>Previous</Text>
              </Pressable>
              <Pressable
                disabled={page >= totalPages}
                onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>Next</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>
    </ScreenScroll>
  );
}
