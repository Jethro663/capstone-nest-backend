import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, TextInput, View } from "react-native";
import { peekAppError } from "../api/http";
import { useTranscript } from "../api/hooks";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme } from "../theme/studentDark";

type Props = NativeStackScreenProps<RootStackParamList, "Transcript">;
type StatusTone = "blue" | "green" | "amber";

const PAGE_SIZE = 15;

function formatDate(value?: string) {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resolveStatusTone(status: string): StatusTone {
  if (status === "completed") return "green";
  if (status === "enrolled") return "blue";
  return "amber";
}

function resolveToneStyle(tone: StatusTone) {
  return {
    blue: { backgroundColor: theme.blueSoft, color: theme.blue },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
  }[tone];
}

function DarkPanel({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 14,
        paddingVertical: 14,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function ToneTag({ label, tone }: { label: string; tone: StatusTone }) {
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
      <Text style={{ color: toneStyle.color, fontSize: 10, fontWeight: "800", textTransform: "capitalize" }}>
        {label}
      </Text>
    </View>
  );
}

function PagerButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.active,
        paddingHorizontal: 12,
        paddingVertical: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: disabled ? theme.muted : theme.text, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
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
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={transcriptQuery.isRefetching}
          onRefresh={() => {
            void transcriptQuery.refetch();
          }}
        />
      }
    >
      <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}>
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
              <MaterialCommunityIcons name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>Student Records</Text>
              <Text style={{ marginTop: 4, color: theme.text, fontSize: 26, fontWeight: "900" }}>
                Subject Enrollment Transcript
              </Text>
              <Text style={{ marginTop: 6, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
                Every class you have enrolled in, grouped by school year.
              </Text>
            </View>
            <ToneTag label={pluralize(totalRows, "enrollment", "enrollments")} tone="blue" />
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
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search by subject, section, or school year"
              placeholderTextColor={theme.muted}
              style={{ color: theme.text, fontSize: 13, paddingVertical: 10 }}
            />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 10 }}>
        {transcriptQuery.error ? (
          <DarkPanel>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>
              Transcript data is temporarily unavailable
            </Text>
            <Text style={{ marginTop: 6, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
              {peekAppError(transcriptQuery.error).message}
            </Text>
          </DarkPanel>
        ) : null}

        {rows.length === 0 ? (
          <DarkPanel>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>No transcript rows found</Text>
            <Text style={{ marginTop: 6, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
              Try another search or wait for your academic enrollment history to sync.
            </Text>
          </DarkPanel>
        ) : (
          Object.entries(groupedRows).map(([schoolYear, schoolYearRows]) => (
            <DarkPanel key={schoolYear}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="school-outline" size={18} color={theme.blue} />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>{schoolYear}</Text>
              </View>

              <View style={{ marginTop: 12, gap: 10 }}>
                {schoolYearRows.map((row) => (
                  <View
                    key={row.id}
                    style={{
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900" }}>
                          {row.class?.subjectName || "Unlinked Subject"} ({row.class?.subjectCode || "--"})
                        </Text>
                        <Text style={{ marginTop: 5, color: theme.muted, fontSize: 12 }}>
                          Grade {row.section?.gradeLevel || "--"} / {row.section?.name || "No section"}
                        </Text>
                      </View>
                      <ToneTag label={row.status} tone={resolveStatusTone(row.status)} />
                    </View>

                    <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <View
                        style={{
                          minWidth: 112,
                          flex: 1,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 10,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "800" }}>ENROLLED</Text>
                        <Text style={{ marginTop: 6, color: theme.text, fontSize: 13, fontWeight: "800" }}>
                          {formatDate(row.enrolledAt)}
                        </Text>
                      </View>
                      <View
                        style={{
                          minWidth: 112,
                          flex: 1,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 10,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "800" }}>SECTION</Text>
                        <Text style={{ marginTop: 6, color: theme.text, fontSize: 13, fontWeight: "800" }}>
                          {row.section?.name || "No section"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </DarkPanel>
          ))
        )}

        <DarkPanel>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ flex: 1, color: theme.muted, fontSize: 12 }}>
              Showing page {page} of {totalPages} / {pluralize(totalRows, "total row", "total rows")}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <PagerButton
                label="Previous"
                disabled={page <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              />
              <PagerButton
                label="Next"
                disabled={page >= totalPages}
                onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
            </View>
          </View>
        </DarkPanel>
      </View>
    </ScreenScroll>
  );
}
