import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { sectionsApi } from "../api/services/sections";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminDataRow,
  AdminEmpty,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AdminSectionDetail">;

export function AdminSectionDetailScreen({ navigation, route }: Props) {
  const { sectionId } = route.params;
  const section = useQuery({
    queryKey: ["admin-section-detail", sectionId],
    queryFn: () => sectionsApi.getById(sectionId),
  });
  const roster = useQuery({
    queryKey: ["admin-section-roster", sectionId],
    queryFn: () => sectionsApi.getRoster(sectionId),
  });
  const error = section.error ?? roster.error;

  return (
    <AdminScreen
      title={
        section.data
          ? `Grade ${section.data.gradeLevel} · ${section.data.name}`
          : "Section detail"
      }
      subtitle={
        section.data
          ? `${section.data.schoolYear} · capacity ${section.data.capacity ?? "—"}`
          : "Roster and governed learner actions"
      }
      showBackButton
      onBackPress={navigation.goBack}
      refreshing={section.isRefetching || roster.isRefetching}
      onRefresh={() => void Promise.all([section.refetch(), roster.refetch()])}
    >
      {error ? (
        <AdminNotice
          title="Section unavailable"
          description={toAppError(error).message}
          tone="red"
        />
      ) : null}
      {section.data ? (
        <AdminSection title="Section context">
          <AdminDataRow
            title="Status"
            status={section.data.isActive ? "Active" : "Archived"}
            statusTone={section.data.isActive ? "green" : "neutral"}
          />
          <AdminDataRow
            title="Room"
            status={section.data.roomNumber || "Not set"}
          />
          <AdminDataRow
            title="Learners"
            status={String(
              roster.data?.length ??
                section.data.studentCount ??
                section.data.enrollmentCount ??
                0,
            )}
          />
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <AdminButton
              label="Add learners"
              icon="account-plus-outline"
              onPress={() =>
                navigation.navigate("TeacherSectionAddStudents", { sectionId })
              }
            />
            <AdminButton
              label="Roster import"
              icon="file-upload-outline"
              onPress={() =>
                navigation.navigate("MainTabs", { screen: "AdminRoster" })
              }
            />
          </View>
        </AdminSection>
      ) : null}
      <AdminSection
        title="Active roster"
        subtitle="Each lifecycle action opens the backend-governed review and receipt flow"
      >
        {(roster.data ?? []).map((student) => {
          const studentId = student.studentId ?? student.id;
          const label =
            `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
            student.email ||
            studentId;
          return (
            <View
              key={studentId}
              style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
            >
              <AdminDataRow
                title={label}
                subtitle={student.lrn ? `LRN ${student.lrn}` : student.email}
                meta={student.email}
              />
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingBottom: 10,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <AdminButton
                  label="View profile"
                  variant="text"
                  onPress={() =>
                    navigation.navigate("TeacherSectionStudentProfile", {
                      sectionId,
                      studentId,
                    })
                  }
                />
                <AdminButton
                  label="Review lifecycle"
                  variant="text"
                  tone="red"
                  onPress={() =>
                    navigation.navigate("AdminLifecycleReview", {
                      targetType: "STUDENT",
                      targetId: studentId,
                      targetLabel: label,
                      isActive: true,
                      sectionId,
                    })
                  }
                />
              </View>
            </View>
          );
        })}
        {!roster.isLoading && !(roster.data ?? []).length ? (
          <AdminEmpty
            title="No active learners"
            subtitle="Add a learner or import a roster to populate this section."
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
