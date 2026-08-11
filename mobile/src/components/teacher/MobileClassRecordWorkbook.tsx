import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import type { SpreadsheetCategory, SpreadsheetData, SpreadsheetStudentRow } from "../../types/class-record";
import { TeacherActionButton, TeacherEmpty, TeacherPanel, teacherTheme as theme } from "./TeacherMobilePrimitives";
import { toAppError } from "../../api/http";

type Props = {
  workbook?: SpreadsheetData | null;
  students?: SpreadsheetStudentRow[];
};

type SheetColumn = {
  key: string;
  label: string;
  width: number;
  getValue: (student: SpreadsheetStudentRow) => string;
  tone?: "default" | "score" | "summary" | "warning";
};

function formatNumber(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toFixed(digits);
}

function getStudentName(student: SpreadsheetStudentRow) {
  return [student.lastName, student.firstName].filter(Boolean).join(", ").trim() || "Learner";
}

function buildCategoryColumns(category: SpreadsheetCategory, categoryIndex: number): SheetColumn[] {
  const itemColumns = category.items.map((item, itemIndex) => ({
    key: `${category.id}:${item.id}`,
    label: `${item.title || `Item ${itemIndex + 1}`}\nHPS ${item.hps ?? "--"}`,
    width: 82,
    tone: "score" as const,
    getValue: (student: SpreadsheetStudentRow) => {
      const categoryScores = student.categories.find((entry) => entry.categoryId === category.id);
      const score = categoryScores?.scores?.[itemIndex];
      return typeof score === "number" ? formatNumber(score, 1) : "--";
    },
  }));

  return [
    ...itemColumns,
    {
      key: `${category.id}:total`,
      label: `${category.name}\nTotal`,
      width: 78,
      tone: "summary",
      getValue: (student) => {
        const categoryScores = student.categories.find((entry) => entry.categoryId === category.id);
        return formatNumber(categoryScores?.total, 1);
      },
    },
    {
      key: `${category.id}:ps`,
      label: `${category.name}\nPS`,
      width: 72,
      tone: "summary",
      getValue: (student) => {
        const categoryScores = student.categories.find((entry) => entry.categoryId === category.id);
        return formatNumber(categoryScores?.ps, 1);
      },
    },
    {
      key: `${category.id}:ws`,
      label: `${category.weight || 0}%\nWS`,
      width: 72,
      tone: "summary",
      getValue: (student) => {
        const categoryScores = student.categories.find((entry) => entry.categoryId === category.id);
        return formatNumber(categoryScores?.ws, 1);
      },
    },
    {
      key: `${category.id}:divider:${categoryIndex}`,
      label: "",
      width: 8,
      getValue: () => "",
    },
  ];
}

function buildColumns(workbook: SpreadsheetData): SheetColumn[] {
  return [
    {
      key: "lrn",
      label: "LRN",
      width: 104,
      getValue: (student) => student.lrn || "--",
    },
    {
      key: "learner",
      label: "Learner Name",
      width: 170,
      getValue: getStudentName,
    },
    ...workbook.categories.flatMap(buildCategoryColumns),
    {
      key: "initial-grade",
      label: "Initial\nGrade",
      width: 88,
      tone: "summary",
      getValue: (student) => formatNumber(student.initialGrade, 2),
    },
    {
      key: "quarterly-grade",
      label: "Quarterly\nGrade",
      width: 92,
      tone: "summary",
      getValue: (student) => formatNumber(student.quarterlyGrade, 0),
    },
    {
      key: "remarks",
      label: "Remarks",
      width: 132,
      tone: "warning",
      getValue: (student) => student.remarks || "--",
    },
  ];
}

function getCellTextColor(column: SheetColumn, value: string) {
  if (column.key === "quarterly-grade") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && numeric < 75) return theme.amber;
    return theme.green;
  }
  if (column.tone === "warning" && value.toLowerCase().includes("intervention")) return theme.amber;
  if (column.tone === "summary") return theme.red;
  return theme.text;
}

export function MobileClassRecordWorkbook({ workbook, students }: Props) {
  const rows = students ?? workbook?.students ?? [];

  if (!workbook) {
    return (
      <TeacherPanel title="Class Record Workbook" subtitle="The spreadsheet view will appear after a record is selected.">
        <TeacherEmpty
          title="No workbook loaded"
          subtitle="Select or create a class record, then refresh to load the full grade sheet."
          icon="file-table-outline"
        />
      </TeacherPanel>
    );
  }

  const columns = buildColumns(workbook);
  const sheetWidth = columns.reduce((total, column) => total + column.width, 0);

  const handleExportWorkbook = async () => {
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const { openLocalFile } = await import("../../api/services/protected-files");

      const headerRow = columns.map((col) => `"${col.label.replace(/\n/g, " ")}"`).join(",");
      const dataRows = rows.map((student) =>
        columns.map((col) => `"${String(col.getValue(student)).replace(/"/g, '""')}"`).join(","),
      );

      const csvContent = [headerRow, ...dataRows].join("\n");
      const fileName = `Class_Record_${workbook.header.subjectCode || "Grade"}_Q${workbook.header.quarter || "1"}.csv`;
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${baseDir}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const Sharing = await import("expo-sharing");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export DepEd Class Record Workbook",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        await openLocalFile(fileUri);
      }

      Alert.alert("Workbook Exported Successfully", `The Class Record CSV (${fileName}) has been generated and saved.`);
    } catch (err) {
      Alert.alert("Export Failed", toAppError(err).message);
    }
  };

  return (
    <TeacherPanel
      title="Class Record Workbook"
      subtitle="Swipe sideways to inspect item scores, percentage scores, weighted scores, and transmuted grades."
      action={
        <TeacherActionButton
          label="Export Workbook"
          icon="file-download-outline"
          tone="green"
          onPress={() => void handleExportWorkbook()}
        />
      }
    >
      <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: "#07182C",
            padding: 12,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", color: "#67E8F9" }}>
            {workbook.header.workbookSheetName || workbook.header.quarter}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 17, fontWeight: "900", color: theme.text }}>
            {workbook.header.workbookTitle || "DepEd Class Record"}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: theme.subtext }}>
            {workbook.header.subject || workbook.header.subjectCode || "Subject"} | {workbook.header.section || "Section"}
          </Text>
        </View>
      </View>

      {rows.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <View style={{ width: sheetWidth, borderWidth: 1, borderColor: theme.border, borderRadius: 18, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", backgroundColor: "#0B2440" }}>
              {columns.map((column) => (
                <View
                  key={column.key}
                  style={{
                    width: column.width,
                    minHeight: 56,
                    justifyContent: "center",
                    borderRightWidth: 1,
                    borderRightColor: "rgba(255,255,255,0.10)",
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 10, lineHeight: 14, fontWeight: "900", color: "#CDEBFF" }}>{column.label}</Text>
                </View>
              ))}
            </View>

            {rows.map((student, rowIndex) => (
              <View
                key={student.studentId}
                style={{
                  flexDirection: "row",
                  backgroundColor: rowIndex % 2 === 0 ? "#FFFFFF" : "#F7FBFF",
                  borderTopWidth: 1,
                  borderTopColor: "#D8E6F5",
                }}
              >
                {columns.map((column) => {
                  const value = column.getValue(student);
                  return (
                    <View
                      key={`${student.studentId}:${column.key}`}
                      style={{
                        width: column.width,
                        minHeight: 46,
                        justifyContent: "center",
                        borderRightWidth: 1,
                        borderRightColor: "#D8E6F5",
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: column.key === "learner" ? 11 : 10,
                          lineHeight: 15,
                          fontWeight: column.tone === "summary" || column.tone === "warning" ? "900" : "700",
                          color: getCellTextColor(column, value),
                        }}
                      >
                        {value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <TeacherEmpty
          title="No learners in this workbook"
          subtitle="Students and computed grades will appear here after scores are synced."
          icon="account-school-outline"
        />
      )}
    </TeacherPanel>
  );
}
