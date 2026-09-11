import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { academicStateService } from "../api/services/academic-state";
import {
  AdminAdaptiveColumns,
  AdminDataRow,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "AdminSettings">;

export function AdminSettingsOverviewScreen({ navigation }: Props) {
  const current = useQuery({
    queryKey: ["academic", "current"],
    queryFn: async () => (await academicStateService.getCurrent()).data,
  });
  const readiness = useQuery({
    queryKey: ["academic", "readiness"],
    queryFn: async () => (await academicStateService.getReadiness()).data,
  });
  const root = navigation.getParent() as unknown as {
    navigate: <Name extends keyof RootStackParamList>(
      name: Name,
      params?: RootStackParamList[Name],
    ) => void;
  };
  const open = (
    name:
      | "AdminSettingsAcademicYear"
      | "AdminSettingsAssessmentsGrading"
      | "AdminSettingsYearTransition"
      | "AdminSettingsLearnerCompletion"
      | "AdminSettingsAuditRecovery"
      | "AdminSettingsDemoMode"
      | "AdminStudentReadiness",
  ) => root.navigate(name);
  const blockers = readiness.data?.blockers.length ?? 0;
  return (
    <AdminScreen
      title="System Settings"
      subtitle="Start with the current academic state, then enter one bounded task"
      refreshing={current.isRefetching || readiness.isRefetching}
      onRefresh={() => {
        void current.refetch();
        void readiness.refetch();
      }}
    >
      {current.isError ? (
        <AdminNotice
          title="Academic state unavailable"
          description="Open Audit & Recovery to inspect duplicate or invalid state evidence."
          tone="red"
        />
      ) : (
        <AdminNotice
          title={
            current.data
              ? `${current.data.schoolYear} · ${current.data.periods.find((period) => period.key === current.data?.quarter)?.label ?? current.data?.quarter}`
              : "Loading current state"
          }
          description={`${blockers} readiness blocker${blockers === 1 ? "" : "s"}. No setting changes from this overview.`}
          tone={blockers ? "amber" : "green"}
        />
      )}
      <AdminAdaptiveColumns
        primary={
          <AdminSection
            title="Routine settings"
            subtitle="Review before changing the active academic context"
          >
            <AdminDataRow
              title="Academic Year"
              subtitle="Review the current policy periods and activate a verified grading period"
              onPress={() => open("AdminSettingsAcademicYear")}
            />
            <AdminDataRow
              title="Assessments & Grading"
              subtitle="Open class workbooks and grading evidence"
              onPress={() => open("AdminSettingsAssessmentsGrading")}
            />
            <AdminDataRow
              title="Student Academic Readiness"
              subtitle="Review each learner's complete annual evidence and blockers"
              onPress={() => open("AdminStudentReadiness")}
            />
          </AdminSection>
        }
        secondary={
          <AdminSection
            title="Consequential settings"
            subtitle="Preview and evidence are required before mutations"
          >
            <AdminDataRow
              title="Year Transition"
              subtitle="Preview blockers, authenticate, confirm, then execute"
              status={blockers ? `${blockers} blockers` : "Ready to review"}
              statusTone={blockers ? "amber" : "green"}
              onPress={() => open("AdminSettingsYearTransition")}
            />
            <AdminDataRow
              title="Learner Completion"
              subtitle="Schedule back subjects, record clearance, and verify Grade 10 completion"
              onPress={() => open("AdminSettingsLearnerCompletion")}
            />
            <AdminDataRow
              title="Audit & Recovery"
              subtitle="Audit first; repair only from manifest-bound evidence"
              onPress={() => open("AdminSettingsAuditRecovery")}
            />
            <AdminDataRow
              title="Demo Mode"
              subtitle="Start a time-bound, audited evaluator walkthrough window"
              status="Advanced"
              statusTone="red"
              onPress={() => open("AdminSettingsDemoMode")}
            />
          </AdminSection>
        }
      />
    </AdminScreen>
  );
}
