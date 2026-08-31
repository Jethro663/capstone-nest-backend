import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTeacherClasses } from "../api/hooks";
import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import { AcademicWorkbook } from "../components/academic/AcademicWorkbook";
import {
  TeacherScreen,
  TeacherChip,
  teacherTheme,
} from "../components/teacher/TeacherMobilePrimitives";
export function TeacherClassRecordScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "TeacherClassRecord">) {
  const { user } = useAuth();
  const classes = useTeacherClasses(user?.userId || user?.id);
  const [classId, setClassId] = useState("");
  const selected =
    classes.data?.find((c) => c.id === classId) ?? classes.data?.[0];
  return (
    <TeacherScreen
      title="Academic class records"
      subtitle="Policy periods, eligibility, score evidence and official annual results."
      showBackButton
      onBackPress={() => navigation.goBack()}
      onRefresh={() => void classes.refetch()}
      refreshing={classes.isFetching}
    >
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {classes.data?.map((c) => (
            <TeacherChip
              key={c.id}
              label={`${c.subjectName} · ${c.schoolYear}`}
              active={selected?.id === c.id}
              onPress={() => setClassId(c.id)}
            />
          ))}
        </View>
        {selected ? (
          <AcademicWorkbook key={selected.id} classId={selected.id} />
        ) : (
          <Text style={{ color: teacherTheme.text }}>
            {classes.isError
              ? "Classes could not be loaded. Pull to refresh."
              : classes.isLoading
                ? "Loading classes…"
                : "No assigned classes."}
          </Text>
        )}
      </View>
    </TeacherScreen>
  );
}
