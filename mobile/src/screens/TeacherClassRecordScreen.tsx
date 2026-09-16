import { useState } from "react";
import { useTeacherClasses } from "../api/hooks";
import { useAuth } from "../providers/AuthProvider";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import { AcademicWorkbook } from "../components/academic/AcademicWorkbook";
import {
  TeacherScreen,
  TeacherEmpty,
  TeacherSelectMenu,
} from "../components/teacher/TeacherMobilePrimitives";
import { TeacherContextStrip } from "../components/teacher/TeacherWorkspacePrimitives";
export function TeacherClassRecordScreen({
  navigation,
}: TeacherDrawerScreenProps<"TeacherClassRecord">) {
  const { user } = useAuth();
  const classes = useTeacherClasses(user?.userId || user?.id);
  const [classId, setClassId] = useState("");
  const selected =
    classes.data?.find((c) => c.id === classId) ?? classes.data?.[0];
  return (
    <TeacherScreen
      title="Academic class records"
      subtitle="Policy periods, eligibility, score evidence and official annual results."
      onBackPress={() => navigation.goBack()}
      onRefresh={() => void classes.refetch()}
      refreshing={classes.isFetching}
    >
      <TeacherSelectMenu
        label="Class"
        selectedValue={selected?.id ?? ""}
        options={(classes.data ?? []).map((entry) => ({
          value: entry.id,
          label: `${entry.subjectName} · ${entry.schoolYear}`,
        }))}
        onSelect={setClassId}
      />
      {selected ? (
        <>
          <TeacherContextStrip
            title={selected.subjectName}
            subtitle={`${selected.subjectCode} · ${selected.schoolYear}`}
            status={`${selected.enrollmentCount ?? selected.enrollments?.length ?? 0} learners`}
            icon="table-account"
          />
          <AcademicWorkbook key={selected.id} classId={selected.id} />
        </>
      ) : (
        <TeacherEmpty
          title={classes.isLoading ? "Loading class records" : "No assigned classes"}
          subtitle={classes.isError ? "Classes could not be loaded. Pull to refresh." : "Your evidence-bearing class record will appear after a class is assigned."}
          icon="table-account"
        />
      )}
    </TeacherScreen>
  );
}
